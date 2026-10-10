import { claudeOpponent } from './claude.js';
import { randomOpponent } from './random.js';

/**
 * Dificuldades da IA. O time do oponente também muda por dificuldade (vem do
 * Laravel); aqui fica só quem decide as jogadas.
 */
export const PROFILES = {
  easy: { id: 'easy' },
  // Médio sem thinking: o mais barato e rápido (o Haiku 5.5 aceita desligar no esforço low).
  medium: { id: 'medium', model: process.env.AI_MODEL_MEDIUM ?? 'claude-haiku-5-5', effort: 'low', thinking: false, timeoutMs: 15_000 },
  // Difícil pensa, mas no esforço mais baixo pra gastar o mínimo de tokens.
  hard: {
    id: 'hard',
    model: process.env.AI_MODEL_HARD ?? 'claude-sonnet-5-5',
    effort: 'low',
    thinking: true,
    // Com 1 nova tentativa, o pior caso (2 × 20 s) cabe nos 45 s do Laravel.
    timeoutMs: 20_000,
    serverFallback: true,
  },
};

export function createOpponent(difficulty) {
  const profile = PROFILES[difficulty] ?? PROFILES.easy;
  // Sem chave da API, médio e difícil jogam no aleatório em vez de falhar.
  if (profile.id === 'easy' || !process.env.ANTHROPIC_API_KEY) return randomOpponent;
  return claudeOpponent(profile);
}
