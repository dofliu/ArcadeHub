
export enum GameType {
  MENU = 'MENU',
  SNAKE = 'SNAKE',
  TETRIS = 'TETRIS',
  GAME2048 = 'GAME2048',
  BREAKOUT = 'BREAKOUT',
  MINESWEEPER = 'MINESWEEPER',
  MEMORY = 'MEMORY',
  WHACKAMOLE = 'WHACKAMOLE',
  SPACEINVADERS = 'SPACEINVADERS',
  SIMONSAYS = 'SIMONSAYS',
  DINO = 'DINO',
  FROGGER = 'FROGGER',
  REVERSI = 'REVERSI',
  GOMOKU = 'GOMOKU',
  PIXELJUMP = 'PIXELJUMP',
  MAHJONG = 'MAHJONG',
  CUBE = 'CUBE',
  ADVENTURE = 'ADVENTURE',
  LEADERBOARD = 'LEADERBOARD'
}

export type Language = 'zh' | 'en';
export type AIPersona = 'sarcastic' | 'encouraging' | 'pirate';

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface GameResult {
  game: string; // Display name
  gameId: GameType; // ID for leaderboard
  score: number;
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  date: string;
}

export interface Tetromino {
  shape: number[][];
  color: string;
  type: string;
}

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';