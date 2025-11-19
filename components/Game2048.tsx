import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { RefreshCw, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface Game2048Props {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const SIZE = 4;
const getEmptyBoard = () => Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));

const Game2048: React.FC<Game2048Props> = ({ onGameOver, language }) => {
  const [board, setBoard] = useState<number[][]>(getEmptyBoard());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const autoIntervalRef = useRef<number | null>(null);

  const addRandomTile = (currentBoard: number[][]) => {
    const emptyTiles: { r: number; c: number }[] = [];
    currentBoard.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val === 0) emptyTiles.push({ r, c });
      });
    });

    if (emptyTiles.length === 0) return currentBoard;

    const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    const newBoard = currentBoard.map(row => [...row]);
    newBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  };

  const initGame = (auto: boolean = false) => {
    let newBoard = getEmptyBoard();
    newBoard = addRandomTile(newBoard);
    newBoard = addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
    setIsAuto(auto);
    soundService.playMove();
  };

  useEffect(() => {
    initGame();
  }, []);

  const compress = (row: number[]) => {
    const newRow = row.filter(val => val !== 0);
    while (newRow.length < SIZE) newRow.push(0);
    return newRow;
  };

  const merge = (row: number[], currentScore: number): { row: number[], gainedScore: number } => {
    let gainedScore = 0;
    for (let i = 0; i < SIZE - 1; i++) {
      if (row[i] !== 0 && row[i] === row[i + 1]) {
        row[i] *= 2;
        gainedScore += row[i];
        row[i + 1] = 0;
      }
    }
    return { row, gainedScore };
  };

  const moveLeft = (currentBoard: number[][]) => {
    let gainedScore = 0;
    const newBoard = currentBoard.map(row => {
      let compressed = compress(row);
      const mergedRes = merge(compressed, gainedScore);
      gainedScore += mergedRes.gainedScore;
      return compress(mergedRes.row);
    });
    return { newBoard, gainedScore };
  };

  const rotateRight = (matrix: number[][]) => {
    const newMatrix = getEmptyBoard();
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        newMatrix[i][j] = matrix[SIZE - 1 - j][i];
      }
    }
    return newMatrix;
  };

  const rotateLeft = (matrix: number[][]) => {
    const newMatrix = getEmptyBoard();
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        newMatrix[i][j] = matrix[j][SIZE - 1 - i];
      }
    }
    return newMatrix;
  };

  const checkGameOver = (currentBoard: number[][]) => {
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        if (currentBoard[i][j] === 0) return false;
        if (i < SIZE - 1 && currentBoard[i][j] === currentBoard[i + 1][j]) return false;
        if (j < SIZE - 1 && currentBoard[i][j] === currentBoard[i][j + 1]) return false;
      }
    }
    return true;
  };

  const move = useCallback((direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameOver) return false;

    let moved = false;
    setBoard(prevBoard => {
      let rotatedBoard = [...prevBoard];
      let rotations = 0;

      if (direction === 'UP') {
        rotatedBoard = rotateLeft(rotatedBoard);
        rotations = 1;
      } else if (direction === 'RIGHT') {
        rotatedBoard = rotateLeft(rotateLeft(rotatedBoard));
        rotations = 2;
      } else if (direction === 'DOWN') {
        rotatedBoard = rotateRight(rotatedBoard);
        rotations = 3;
      }

      const { newBoard: movedBoard, gainedScore } = moveLeft(rotatedBoard);

      let finalBoard = movedBoard;
      if (rotations === 1) finalBoard = rotateRight(finalBoard);
      if (rotations === 2) finalBoard = rotateRight(rotateRight(finalBoard));
      if (rotations === 3) finalBoard = rotateLeft(finalBoard);

      if (JSON.stringify(prevBoard) !== JSON.stringify(finalBoard)) {
        moved = true;
        if (!isAuto) soundService.playMove();
        if (gainedScore > 0 && !isAuto) soundService.playScore();
        
        const boardWithTile = addRandomTile(finalBoard);
        setScore(s => s + gainedScore);
        
        if (checkGameOver(boardWithTile)) {
          setGameOver(true);
          setIsAuto(false);
          soundService.playExplosion();
          if (!isAuto) {
              onGameOver({ game: '2048', gameId: GameType.GAME2048, score: score + gainedScore });
          }
        }
        
        return boardWithTile;
      }
      
      return prevBoard;
    });
    return moved;
  }, [gameOver, onGameOver, score, language, isAuto]);

  // Auto Logic
  useEffect(() => {
    if (isAuto && !gameOver) {
        autoIntervalRef.current = window.setInterval(() => {
            // Simple heuristic: Try Down, then Right, then Left, then Up
            const dirs: ('DOWN' | 'RIGHT' | 'LEFT' | 'UP')[] = ['DOWN', 'RIGHT', 'LEFT', 'UP'];
            
            // In a real implementation, we would test which move gives best score/free space
            // For demo, random-ish preference works okay
            const pick = dirs[Math.floor(Math.random() * 4)];
            move(pick);
            
        }, 200);
    } else {
        if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    }

    return () => {
        if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    }
  }, [isAuto, gameOver, move]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAuto) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') move('UP');
        if (e.key === 'ArrowDown') move('DOWN');
        if (e.key === 'ArrowLeft') move('LEFT');
        if (e.key === 'ArrowRight') move('RIGHT');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, isAuto]);

  const getTileColor = (value: number) => {
    const colors: Record<number, string> = {
      2: 'bg-gray-200 text-gray-800',
      4: 'bg-gray-300 text-gray-800',
      8: 'bg-orange-200 text-white',
      16: 'bg-orange-400 text-white',
      32: 'bg-orange-500 text-white',
      64: 'bg-orange-600 text-white',
      128: 'bg-yellow-400 text-white shadow-[0_0_10px_#FBBF24]',
      256: 'bg-yellow-500 text-white shadow-[0_0_10px_#F59E0B]',
      512: 'bg-yellow-600 text-white shadow-[0_0_15px_#D97706]',
      1024: 'bg-yellow-700 text-white shadow-[0_0_20px_#B45309]',
      2048: 'bg-arcade-primary text-white shadow-[0_0_25px_#E94560]',
    };
    return colors[value] || 'bg-black text-white';
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="flex justify-between w-full mb-4 px-2 items-center">
        <div className="bg-arcade-secondary px-4 py-2 rounded">
          <span className="text-gray-400 text-xs block">SCORE</span>
          <span className="text-xl font-bold text-white">{score}</span>
        </div>
        <div className="flex gap-2">
            <button onClick={() => initGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
            </button>
            <button onClick={() => initGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
                <RefreshCw size={20} />
            </button>
        </div>
      </div>

      <div className="bg-gray-800 p-2 rounded-lg relative">
        <div className="grid grid-cols-4 gap-2">
          {board.map((row, r) => (
            row.map((val, c) => (
              <div
                key={`${r}-${c}`}
                className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-2xl font-bold rounded transition-all duration-200 ${val === 0 ? 'bg-gray-700' : getTileColor(val)}`}
              >
                {val !== 0 ? val : ''}
              </div>
            ))
          ))}
        </div>
        
        {gameOver && (
           <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
              <span className="text-3xl font-pixel text-arcade-neon">GAME OVER</span>
           </div>
        )}
      </div>

      {!isAuto && (
        <div className="grid grid-cols-3 gap-2 mt-6 md:hidden">
            <div />
            <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary font-bold" onClick={() => move('UP')}>↑</button>
            <div />
            <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary font-bold" onClick={() => move('LEFT')}>←</button>
            <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary font-bold" onClick={() => move('DOWN')}>↓</button>
            <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary font-bold" onClick={() => move('RIGHT')}>→</button>
        </div>
      )}
    </div>
  );
};

export default Game2048;