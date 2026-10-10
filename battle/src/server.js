import { createServer } from 'node:http';
import { Match } from './battle.js';
import { createOpponent } from './ai/profiles.js';

// shortcut: batalhas só em memória (somem se o container reiniciar) e nunca
// são apagadas; trocar por Battle.toJSON() num banco se precisar persistir.
const matches = new Map();

/**
 * API interna, chamada só pelo Laravel (que já autenticou o usuário e
 * conferiu o dono dos times). Não é exposta fora da rede do Docker.
 *
 *   POST /battles               { owner_id, player_team, opponent_team, difficulty: easy|medium|hard }
 *   GET  /battles/:id?owner_id=
 *   POST /battles/:id/choice    { owner_id, choice }
 */
const server = createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  try {
    const url = new URL(req.url, 'http://battle');
    const body = req.method === 'POST' ? await readJson(req) : {};
    const ownerId = Number(body.owner_id ?? url.searchParams.get('owner_id'));
    const [, resource, id, action] = url.pathname.split('/');

    if (resource !== 'battles') return send(404, { message: 'Rota não encontrada.' });

    if (req.method === 'POST' && !id) {
      const match = await Match.create({
        ownerId,
        playerTeam: body.player_team,
        opponentTeam: body.opponent_team,
        opponent: createOpponent(body.difficulty),
      });
      matches.set(match.id, match);
      return send(201, match.state());
    }

    const match = matches.get(id);
    // Batalha de outro usuário responde 404, como os times no Laravel.
    if (!match || match.ownerId !== ownerId) return send(404, { message: 'Batalha não encontrada.' });

    if (req.method === 'GET' && !action) return send(200, match.state());

    if (req.method === 'POST' && action === 'choice') {
      if (match.thinking) return send(409, { message: 'O oponente ainda está decidindo.' });
      const error = await match.choose(String(body.choice ?? ''));
      // Custo real de cada batalha com IA, pra comparar com a estimativa.
      if (match.ended && match.opponent.usage) {
        console.log(`[battle ${match.id}] fim; uso da API: ${JSON.stringify(match.opponent.usage)}`);
      }
      return error ? send(422, { message: error }) : send(200, match.state());
    }

    return send(404, { message: 'Rota não encontrada.' });
  } catch (error) {
    // Time com pokémon/golpe que o simulador não conhece cai aqui.
    console.error(error);
    return send(422, { message: error.message });
  }
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });
  });
}

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`battle service ouvindo na porta ${server.address().port}`);
});
