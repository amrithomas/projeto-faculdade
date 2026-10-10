import { api } from './client';
import type { BattleState } from '../types/battle';

export type Difficulty = 'easy' | 'medium' | 'hard';

// opponentTeamId "random" = time pronto da IA sorteado na dificuldade.
export async function startBattle(teamId: number, opponentTeamId: number | 'random', difficulty: Difficulty): Promise<BattleState> {
  const { data } = await api.post<BattleState>('/battles', {
    team_id: teamId,
    opponent_team_id: opponentTeamId,
    difficulty,
  });
  return data;
}

export async function fetchBattle(id: string): Promise<BattleState> {
  const { data } = await api.get<BattleState>(`/battles/${id}`);
  return data;
}

// `choice` no formato do Showdown: "team 1234", "move 1 2, switch 3"...
export async function sendChoice(id: string, choice: string): Promise<BattleState> {
  const { data } = await api.post<BattleState>(`/battles/${id}/choice`, { choice });
  return data;
}
