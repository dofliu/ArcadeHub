import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { Smile, Frown, Flag, Bomb, RefreshCw, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface MinesweeperProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const GRID_SIZE = 10;
const MINES_COUNT = 15;

interface Cell {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborCount: number;
}

const MinesweeperGame: React.FC<MinesweeperProps> = ({ onGameOver, language }) => {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'PLAYING' | 'WON' | 'LOST'>('PLAYING');
  const [score, setScore] = useState(0);
  const [isAuto, setIsAuto] = useState(false);
  const autoIntervalRef = useRef<number | null>(null);

  const initGame = (auto: boolean = false) => {
    let newGrid: Cell[][] = [];
    // Create empty grid
    for (let y = 0; y < GRID_SIZE; y++) {
      newGrid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        newGrid[y][x] = {
          x, y, isMine: false, isRevealed: false, isFlagged: false, neighborCount: 0
        };
      }
    }

    // Place Mines
    let minesPlaced = 0;
    while (minesPlaced < MINES_COUNT) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      if (!newGrid[y][x].isMine) {
        newGrid[y][x].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate neighbors
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!newGrid[y][x].isMine) {
          let count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE && newGrid[ny][nx].isMine) {
                count++;
              }
            }
          }
          newGrid[y][x].neighborCount = count;
        }
      }
    }

    setGrid(newGrid);
    setGameState('PLAYING');
    setScore(0);
    setIsAuto(auto);
  };

  useEffect(() => {
    initGame();
  }, []);

  const revealCell = (x: number, y: number) => {
    if (gameState !== 'PLAYING' || grid[y][x].isFlagged || grid[y][x].isRevealed) return;

    const newGrid = [...grid];
    const cell = newGrid[y][x];

    if (cell.isMine) {
      cell.isRevealed = true;
      setGameState('LOST');
      setIsAuto(false);
      soundService.playExplosion();
      setGrid(newGrid);
      if (!isAuto) {
        onGameOver({ game: language === 'zh' ? '踩地雷' : 'Minesweeper', gameId: GameType.MINESWEEPER, score });
      }
      return;
    }

    // Flood fill
    const floodFill = (currX: number, currY: number) => {
       if (currX < 0 || currX >= GRID_SIZE || currY < 0 || currY >= GRID_SIZE) return;
       if (newGrid[currY][currX].isRevealed || newGrid[currY][currX].isFlagged) return;

       newGrid[currY][currX].isRevealed = true;
       setScore(s => s + 10);

       if (newGrid[currY][currX].neighborCount === 0) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
               floodFill(currX + dx, currY + dy);
            }
          }
       }
    };

    floodFill(x, y);
    if (!isAuto) soundService.playMove();
    setGrid(newGrid);

    // Check Win
    const revealedCount = newGrid.flat().filter(c => c.isRevealed).length;
    if (revealedCount === (GRID_SIZE * GRID_SIZE) - MINES_COUNT) {
      setGameState('WON');
      setIsAuto(false);
      soundService.playWin();
      if(!isAuto) {
          onGameOver({ game: language === 'zh' ? '踩地雷' : 'Minesweeper', gameId: GameType.MINESWEEPER, score: score + 500 });
      }
    }
  };

  // Auto Logic (God Mode / Solver Demo)
  useEffect(() => {
    if (isAuto && gameState === 'PLAYING') {
        autoIntervalRef.current = window.setInterval(() => {
            // Simple strategy: Find a safe unrevealed cell and click it
            const flatGrid = grid.flat();
            const safeCells = flatGrid.filter(c => !c.isMine && !c.isRevealed);
            
            if (safeCells.length > 0) {
               // Pick random safe cell to make it look like it's "searching"
               const target = safeCells[Math.floor(Math.random() * safeCells.length)];
               revealCell(target.x, target.y);
            } else {
               // Should be won by now
            }
        }, 300);
    } else {
        if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    }
    return () => {
         if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    }
  }, [isAuto, gameState, grid]); // Dependency on grid is key to next step

  const toggleFlag = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    if (isAuto) return;
    if (gameState !== 'PLAYING' || grid[y][x].isRevealed) return;
    const newGrid = [...grid];
    newGrid[y][x].isFlagged = !newGrid[y][x].isFlagged;
    setGrid(newGrid);
    soundService.playRotate();
  };

  const getCellContent = (cell: Cell) => {
    if (cell.isFlagged) return <Flag size={16} className="text-red-500" />;
    if (!cell.isRevealed) return null;
    if (cell.isMine) return <Bomb size={16} className="text-black animate-pulse" />;
    if (cell.neighborCount > 0) {
       const colors = ['text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-yellow-400'];
       return <span className={`font-bold ${colors[cell.neighborCount-1] || 'text-white'}`}>{cell.neighborCount}</span>;
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[300px] mb-4 items-center bg-gray-800 p-2 rounded">
         <div className="text-arcade-neon font-pixel">SCORE: {score}</div>
         <div className="flex gap-2">
            <button onClick={() => initGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
            </button>
            <button onClick={() => initGame(false)} className="text-yellow-400 hover:text-white">
                {gameState === 'PLAYING' ? <Smile size={28} /> : (gameState === 'WON' ? <RefreshCw className="animate-spin" /> : <Frown size={28} />)}
            </button>
         </div>
      </div>

      <div 
        className="bg-gray-700 p-1 grid gap-1 rounded shadow-xl border-4 border-arcade-secondary"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
      >
        {grid.map((row, y) => (
           row.map((cell, x) => (
             <div
               key={`${x}-${y}`}
               className={`
                 w-8 h-8 flex items-center justify-center cursor-pointer select-none transition-colors
                 ${cell.isRevealed 
                    ? (cell.isMine ? 'bg-red-500' : 'bg-gray-900') 
                    : 'bg-gray-400 hover:bg-gray-300 shadow-inner'}
               `}
               onClick={() => !isAuto && revealCell(x, y)}
               onContextMenu={(e) => toggleFlag(e, x, y)}
             >
               {getCellContent(cell)}
             </div>
           ))
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">
        {language === 'zh' ? '左鍵揭開，右鍵(或長按)插旗' : 'Left click reveal, Right click flag'}
      </p>
    </div>
  );
};

export default MinesweeperGame;