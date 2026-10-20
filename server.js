const http = require("http");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT || 2567);
const MAX_PLAYERS = 8;
const rooms = new Map();
const colors = ["#9de4ff", "#ffbd79", "#b8ffa5", "#e4a8ff", "#ff9fa8", "#a9b9ff", "#ffd878", "#82e8d4"];

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, {"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
    res.end(JSON.stringify({service:"monster-arena-multiplayer",version:86,ok:true,rooms:rooms.size,maxPlayers:MAX_PLAYERS})+"\\n");
    return;
  }
  res.writeHead(404, {"content-type":"text/plain; charset=utf-8"});
  res.end("Not found\\n");
});
const wss = new WebSocket.Server({ server, maxPayload: 16 * 1024 });

function cleanText(value, max=18) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0,max) || "Aventureiro";
}
function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function roomPlayers(room) {
  const out = {};
  let i=0;
  for (const [id, client] of room.players) {
    out[id] = {...client.state, id, color: colors[i++ % colors.length]};
  }
  return out;
}
function broadcast(room, obj, except=null) {
  for (const client of room.players.values()) if (client.ws !== except) send(client.ws, obj);
}
function removeClient(ws) {
  const id = ws.playerId, code = ws.roomCode;
  if (!id || !code) return;
  const room = rooms.get(code);
  ws.playerId = null; ws.roomCode = null;
  if (!room) return;
  room.players.delete(id);
  broadcast(room, {type:"left", id});
  if (room.players.size === 0) rooms.delete(code);
  else broadcast(room, {type:"roster", players: roomPlayers(room)});
}
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries=0; tries<100; tries++) {
    let code="";
    for(let i=0;i<5;i++) code += alphabet[crypto.randomInt(alphabet.length)];
    if(!rooms.has(code)) return code;
  }
  throw new Error("Não foi possível criar um código de sala.");
}
function fail(ws, message) { send(ws, {type:"error", message}); }
wss.on("connection", (ws) => {
  ws.lastMessageAt = 0;
  ws.on("message", (raw) => {
    const now=Date.now();
    if(now-ws.lastMessageAt < 20) return;
    ws.lastMessageAt=now;
    let m;
    try { m=JSON.parse(raw.toString()); } catch { return fail(ws,"Mensagem inválida."); }
    if(!m || typeof m.type!=="string") return;
    if(m.type==="ping") { send(ws,{type:"pong",at:Date.now()}); return; }
    if(m.type==="create") {
      if(ws.roomCode) return fail(ws,"Você já está em uma sala.");
      const code=makeCode(), id=crypto.randomUUID();
      const room={players:new Map(),createdAt:now};
      rooms.set(code,room);
      const state={name:cleanText(m.name),hero:cleanText(m.hero,20),x:100,y:100,level:1,wave:1,hp:100,maxHp:100};
      room.players.set(id,{ws,state}); ws.playerId=id;ws.roomCode=code;
      send(ws,{type:"joined",room:code,id,players:roomPlayers(room)});
      broadcast(room,{type:"roster",players:roomPlayers(room)});
      return;
    }
    if(m.type==="join") {
      if(ws.roomCode) return fail(ws,"Você já está em uma sala.");
      const code=String(m.room||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
      const room=rooms.get(code);
      if(!room) return fail(ws,"Sala não encontrada. Confira o código e tente novamente.");
      if(room.players.size>=MAX_PLAYERS) return fail(ws,`Esta sala já tem ${MAX_PLAYERS} jogadores.`);
      const id=crypto.randomUUID();
      const state={name:cleanText(m.name),hero:cleanText(m.hero,20),x:100,y:100,level:1,wave:1,hp:100,maxHp:100};
      room.players.set(id,{ws,state});ws.playerId=id;ws.roomCode=code;
      send(ws,{type:"joined",room:code,id,players:roomPlayers(room)});
      broadcast(room,{type:"roster",players:roomPlayers(room)});
      return;
    }
    if(!ws.roomCode || !ws.playerId) return fail(ws,"Crie ou entre em uma sala primeiro.");
    const room=rooms.get(ws.roomCode), client=room?.players.get(ws.playerId);
    if(!room||!client) return fail(ws,"A sala não está mais disponível.");
    if(m.type==="state") {
      const num=(v,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(v))?Number(v):lo));
      client.state={...client.state,
        x:num(m.x,0,100000),y:num(m.y,0,100000),
        hero:cleanText(m.hero,20),level:num(m.level,1,999),
        wave:num(m.wave,1,999),hp:num(m.hp,0,1000000),maxHp:num(m.maxHp,1,1000000)};
      broadcast(room,{type:"state",player:{...client.state,id:ws.playerId}},ws);
      return;
    }
    if(m.type==="chat") {
      const text=cleanText(m.text,180);
      if(text) broadcast(room,{type:"chat",name:client.state.name,text});
      return;
    }
    if(m.type==="coopEvent") {
      if(typeof m.event!=="string" || !["ready","boss-request","emote"].includes(m.event))
        return fail(ws,"Evento cooperativo não permitido.");
      broadcast(room,{type:"coop",event:m.event,message:cleanText(m.message,100),from:ws.playerId,at:Date.now()});
      return;
    }
    if(m.type==="leave") { removeClient(ws); return; }
  });
  ws.on("close",()=>removeClient(ws));
  ws.on("error",()=>removeClient(ws));
});
server.listen(PORT,"0.0.0.0",()=>console.log(`Monster Arena multiplayer listening on ${PORT}`));
