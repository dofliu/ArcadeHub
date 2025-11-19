
import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface GomokuProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const BOARD_SIZE = 15;

const GomokuGame: React.FC<GomokuProps> = ({ onGameOver, language }) => {
  const [board, setBoard] = useState<string[][]>([]);
  const [turn, setTurn] = useState<'BLACK' | 'WHITE'>('BLACK');
  const [gameOver, setGameOver] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  
  const autoTimerRef = useRef<number | null>(null);

  const initGame = (auto: boolean = false) => {
      const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
      setBoard(newBoard);
      setTurn('BLACK');
      setGameOver(false);
      setIsAuto(auto);
      soundService.playMove();
  };

  useEffect(() => {
      initGame();
  }, []);

  const checkWin = (currBoard: string[][], x: number, y: number, player: string) => {
      const dirs = [
          [1, 0], [0, 1], [1, 1], [1, -1]
      ];
      
      for (const [dx, dy] of dirs) {
          let count = 1;
          // Check forward
          let i = 1;
          while (true) {
              const nx = x + dx * i;
              const ny = y + dy * i;
              if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || currBoard[ny][nx] !== player) break;
              count++;
              i++;
          }
          // Check backward
          i = 1;
          while (true) {
              const nx = x - dx * i;
              const ny = y - dy * i;
              if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || currBoard[ny][nx] !== player) break;
              count++;
              i++;
          }
          
          if (count >= 5) return true;
      }
      return false;
  };

  const placePiece = (x: number, y: number) => {
      if (gameOver || board[y][x]) return;

      const newBoard = board.map(row => [...row]);
      newBoard[y][x] = turn;
      setBoard(newBoard);
      soundService.playMove(); // Stone sound

      if (checkWin(newBoard, x, y, turn)) {
          setGameOver(true);
          soundService.playWin();
          if (!isAuto) {
               // Score based on moves? Or just fixed
               onGameOver({ game: language === 'zh' ? '五子棋' : 'Gomoku', gameId: GameType.GOMOKU, score: 1000 });
          } else {
               setIsAuto(false);
          }
      } else {
          setTurn(prev => prev === 'BLACK' ? 'WHITE' : 'BLACK');
      }
  };

  // Auto AI
  useEffect(() => {
      if (isAuto && !gameOver) {
          autoTimerRef.current = window.setTimeout(() => {
               // Very basic logic: fill near center or near existing pieces
               // Gather valid empty spots
               const candidates: {x: number, y: number, weight: number}[] = [];
               
               for(let y=0; y<BOARD_SIZE; y++) {
                   for(let x=0; x<BOARD_SIZE; x++) {
                       if (!board[y][x]) {
                           let weight = 0;
                           // Higher weight if near existing pieces
                           for(let dy=-1; dy<=1; dy++) {
                               for(let dx=-1; dx<=1; dx++) {
                                   if (dx===0 && dy===0) continue;
                                   const nx = x+dx, ny = y+dy;
                                   if(nx>=0 && nx<BOARD_SIZE && ny>=0 && ny<BOARD_SIZE && board[ny][nx]) {
                                       weight += 10;
                                       if (board[ny][nx] === turn) weight += 5; // Attack
                                       else weight += 4; // Defend
                                   }
                               }
                           }
                           // Center bias
                           const centerDist = Math.abs(x - 7) + Math.abs(y - 7);
                           weight -= centerDist;
                           
                           candidates.push({x, y, weight});
                       }
                   }
               }
               
               candidates.sort((a, b) => b.weight - a.weight);
               
               if (candidates.length > 0) {
                   // Pick top with some randomness
                   const pick = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
                   placePiece(pick.x, pick.y);
               } else {
                   placePiece(7, 7); // First move
               }
          }, 500);
      }
      return () => {
          if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      }
  }, [isAuto, board, turn, gameOver]);

  return (
    <div className="flex flex-col items-center">
       <div className="flex justify-between w-full max-w-[340px] mb-4 px-2 items-center">
         <div className={`font-pixel text-sm ${turn === 'BLACK' ? 'text-gray-800 bg-white px-2 rounded' : 'text-white bg-black px-2 rounded border border-gray-600'}`}>
             {turn === 'BLACK' ? 'BLACK TURN' : 'WHITE TURN'}
         </div>
         <div className="flex gap-2">
             <button onClick={() => initGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
            </button>
            <button onClick={() => initGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
               {gameOver ? <RefreshCw size={20} /> : <Play size={20} />}
            </button>
         </div>
       </div>

       <div className="bg-[#e6b380] p-4 rounded shadow-2xl border-8 border-[#8b5a2b] relative">
           <div className="relative" style={{ width: '300px', height: '300px' }}>
               {/* Grid Lines */}
               {Array.from({ length: BOARD_SIZE }).map((_, i) => (
                   <React.Fragment key={i}>
                       <div className="absolute bg-black/40" style={{ top: `${(i / (BOARD_SIZE - 1)) * 100}%`, left: 0, right: 0, height: '1px' }}></div>
                       <div className="absolute bg-black/40" style={{ left: `${(i / (BOARD_SIZE - 1)) * 100}%`, top: 0, bottom: 0, width: '1px' }}></div>
                   </React.Fragment>
               ))}
               
               {/* Clickable Areas & Pieces */}
               <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)` }}>
                   {board.map((row, y) => 
                       row.map((cell, x) => (
                           <div 
                               key={`${x}-${y}`}
                               onClick={() => !isAuto && placePiece(x, y)}
                               className="cursor-pointer flex items-center justify-center"
                           >
                               {cell && (
                                   <div className={`w-4 h-4 rounded-full shadow-sm ${cell === 'BLACK' ? 'bg-black radial-gradient-black' : 'bg-white radial-gradient-white'}`} style={{ boxShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}></div>
                               )}
                               {!cell && !isAuto && !gameOver && (
                                   <div className="w-4 h-4 rounded-full hover:bg-black/10 transition-colors"></div>
                               )}
                           </div>
                       ))
                   )}
               </div>
           </div>
       </div>

       {gameOver && (
           <div className="mt-4 text-arcade-neon font-pixel animate-bounce text-xl">
               {turn === 'BLACK' ? 'WHITE WINS!' : 'BLACK WINS!'}
           </div>
       )}
    </div>
  );
};

export default GomokuGame;
