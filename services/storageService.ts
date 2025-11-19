import { GameType, LeaderboardEntry } from "../types";

const STORAGE_KEY = 'arcade_ai_leaderboard';

type AllLeaderboards = Record<string, LeaderboardEntry[]>;

export const saveScore = (gameId: GameType, playerName: string, score: number) => {
  const existing = localStorage.getItem(STORAGE_KEY);
  let data: AllLeaderboards = existing ? JSON.parse(existing) : {};

  if (!data[gameId]) {
    data[gameId] = [];
  }

  data[gameId].push({
    playerName,
    score,
    date: new Date().toISOString()
  });

  // Sort desc by score
  data[gameId].sort((a, b) => b.score - a.score);

  // Keep top 10
  data[gameId] = data[gameId].slice(0, 10);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getLeaderboard = (gameId: GameType): LeaderboardEntry[] => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) return [];
  
  const data: AllLeaderboards = JSON.parse(existing);
  return data[gameId] || [];
};