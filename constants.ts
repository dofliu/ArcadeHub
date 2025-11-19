import { Tetromino, TetrominoType } from './types';

export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: {
    shape: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    color: 'bg-cyan-400',
    type: 'I',
  },
  J: {
    shape: [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
    color: 'bg-blue-500',
    type: 'J',
  },
  L: {
    shape: [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    color: 'bg-orange-500',
    type: 'L',
  },
  O: {
    shape: [[1, 1], [1, 1]],
    color: 'bg-yellow-400',
    type: 'O',
  },
  S: {
    shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    color: 'bg-green-500',
    type: 'S',
  },
  T: {
    shape: [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    color: 'bg-purple-500',
    type: 'T',
  },
  Z: {
    shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    color: 'bg-red-500',
    type: 'Z',
  },
};

export const SNAKE_GRID_SIZE = 20;
export const TETRIS_WIDTH = 10;
export const TETRIS_HEIGHT = 20;
