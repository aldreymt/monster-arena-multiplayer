# Monster Arena Multiplayer V88 — até 8 jogadores

## Incluído
- Cliente HTML V86 preservando o RPG e o salvamento local anterior.
- Salas privadas para até 8 jogadores.
- Sincronização de presença e posição, lista de participantes e chat.
- Servidor WebSocket com endpoint de saúde, validação básica, limite de tamanho de mensagem e eventos cooperativos permitidos.
- Configuração para rede Wi-Fi local e instruções para hospedagem com WSS na internet.

## Como executar no computador
1. Instale Node.js 18+.
2. Extraia o pacote ZIP.
3. Na pasta `monster_arena_v86_multiplayer`, execute `npm install` e depois `npm start`.
4. Verifique `http://localhost:2567/health`.
5. No jogo, abra Multiplayer. Para o mesmo Wi-Fi, use `ws://IP-DO-COMPUTADOR:2567` e crie uma sala. Compartilhe o código com os demais.

## Pela internet
Hospede o servidor num serviço Node.js com TLS/WebSocket e use o endereço `wss://...`. Este pacote não implanta servidor público.

## Limitação importante
Esta entrega sincroniza salas, jogadores, posições e chat. **O combate, os inimigos/chefes, dano, domação, recompensas e salvamentos continuam locais em cada aparelho.** O evento cooperativo é apenas retransmitido pelo servidor e não aplica dano nem concede recompensa. Não seria correto declarar combate cooperativo completo sem integrar e testar o ciclo de combate do jogo com estado autoritativo no servidor.

## Segurança / teste
- Salas temporárias; não há conta, banco de dados nem persistência após todos saírem.
- Não use dados pessoais como apelido.
- Faça backup do jogo e do progresso antes de testar.
- Não exponha `ws://` sem TLS diretamente à internet.


## Publicar pelo celular usando GitHub + Render
1. Entre no GitHub pelo navegador e crie um repositório novo, por exemplo `monster-arena-multiplayer`.
2. Envie os arquivos desta pasta para a raiz do repositório: `server.js`, `package.json`, `render.yaml` e `README.md`. O HTML pode ficar no repositório, mas não é necessário para executar o servidor.
3. No Render, escolha **New + → Web Service** e conecte o repositório GitHub.
4. Se o Render detectar o `render.yaml`, confira as configurações; se pedir manualmente, use Runtime `Node`, Build Command `npm install`, Start Command `npm start`, plano `Free`.
5. Aguarde o deploy terminar e abra `https://NOME-DO-SERVICO.onrender.com/health`. Deve aparecer JSON com `ok:true`.
6. No jogo, informe `wss://NOME-DO-SERVICO.onrender.com` (sem `/health`) como endereço do servidor.
7. Crie uma sala e compartilhe o código com os demais jogadores.

**Atenção:** nunca compartilhe sua senha do GitHub ou Render no chat. O Render gratuito pode dormir após 15 minutos sem tráfego e a primeira conexão depois disso pode demorar. Esta versão sincroniza salas/posições/chat; combate compartilhado ainda exige desenvolvimento adicional.
