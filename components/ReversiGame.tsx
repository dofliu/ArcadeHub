
import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface ReversiProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const BOARD_SIZE = 8;
type Player = 'BLACK' | 'WHITE' | null;

const ReversiGame: React.FC<ReversiProps> = ({ onGameOver, language }) => {
  const [board, setBoard] = useState<Player[][]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<'BLACK' | 'WHITE'>('BLACK');
  const [score, setScore] = useState({ black: 2, white: 2 });
  const [gameOver, setGameOver] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  
  const autoTimerRef = useRef<number | null>(null);

  const initGame = (auto: boolean = false) => {
      const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
      // Initial setup
      newBoard[3][3] = 'WHITE';
      newBoard[3][4] = 'BLACK';
      newBoard[4][3] = 'BLACK';
      newBoard[4][4] = 'WHITE';
      
      setBoard(newBoard);
      setCurrentPlayer('BLACK');
      setScore({ black: 2, white: 2 });
      setGameOver(false);
      setIsAuto(auto);
      soundService.playMove();
  };

  useEffect(() => {
      initGame();
  }, []);

  const isValidMove = (currentBoard: Player[][], player: 'BLACK' | 'WHITE', x: number, y: number): boolean => {
      if (currentBoard[y][x] !== null) return false;
      
      const opponent = player === 'BLACK' ? 'WHITE' : 'BLACK';
      const directions = [
          [0, 1], [1, 0], [0, -1], [-1, 0],
          [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      
      for (const [dx, dy] of directions) {
          let nx = x + dx;
          let ny = y + dy;
          let hasOpponent = false;
          
          while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
              if (currentBoard[ny][nx] === opponent) {
                  hasOpponent = true;
              } else if (currentBoard[ny][nx] === player) {
                  if (hasOpponent) return true;
                  break;
              } else {
                  break;
              }
              nx += dx;
              ny += dy;
          }
      }
      return false;
  };

  const makeMove = (x: number, y: number) => {
      if (gameOver) return;
      
      if (!isValidMove(board, currentPlayer, x, y)) {
          if(!isAuto) soundService.playExplosion(); // Invalid move sound
          return;
      }
      
      const newBoard = board.map(row => [...row]);
      newBoard[y][x] = currentPlayer;
      const opponent = currentPlayer === 'BLACK' ? 'WHITE' : 'BLACK';
      const directions = [
          [0, 1], [1, 0], [0, -1], [-1, 0],
          [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      
      for (const [dx, dy] of directions) {
          let nx = x + dx;
          let ny = y + dy;
          let piecesToFlip = [];
          
          while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
              if (newBoard[ny][nx] === opponent) {
                  piecesToFlip.push({x: nx, y: ny});
              } else if (newBoard[ny][nx] === currentPlayer) {
                  piecesToFlip.forEach(p => {
                      newBoard[p.y][p.x] = currentPlayer;
                  });
                  break;
              } else {
                  break;
              }
              nx += dx;
              ny += dy;
          }
      }
      
      soundService.playMove();
      setBoard(newBoard);
      
      // Update Score
      let b = 0, w = 0;
      newBoard.forEach(row => row.forEach(cell => {
          if (cell === 'BLACK') b++;
          else if (cell === 'WHITE') w++;
      }));
      setScore({ black: b, white: w });
      
      // Switch Turn
      const nextPlayer = currentPlayer === 'BLACK' ? 'WHITE' : 'BLACK';
      
      // Check if next player has moves
      if (hasValidMoves(newBoard, nextPlayer)) {
          setCurrentPlayer(nextPlayer);
      } else {
          // Check if original player has moves
          if (hasValidMoves(newBoard, currentPlayer)) {
             // Keep turn
             alert(language === 'zh' ? '對手無步可走，繼續由你下' : 'Opponent has no moves, play again');
          } else {
             // Game Over
             setGameOver(true);
             const finalScore = b > w ? b : w;
             const winner = b > w ? 'Black' : 'White';
             soundService.playWin();
             if (!isAuto) {
                 // Only submit score if player won (assuming player is Black usually, or just winner score)
                 onGameOver({ game: language === 'zh' ? '黑白棋' : 'Reversi', gameId: GameType.REVERSI, score: Math.max(b, w) * 10 });
             } else {
                 setIsAuto(false);
             }
          }
      }
  };
  
  const hasValidMoves = (currentBoard: Player[][], player: 'BLACK' | 'WHITE') => {
      for(let y=0; y<BOARD_SIZE; y++) {
          for(let x=0; x<BOARD_SIZE; x++) {
              if (isValidMove(currentBoard, player, x, y)) return true;
          }
      }
      return false;
  };

  // Auto AI
  useEffect(() => {
      if (isAuto && !gameOver) {
          autoTimerRef.current = window.setTimeout(() => {
              // Simple Greedy AI
              let bestMove = null;
              let bestScore = -1;
              
              for(let y=0; y<BOARD_SIZE; y++) {
                for(let x=0; x<BOARD_SIZE; x++) {
                    if (isValidMove(board, currentPlayer, x, y)) {
                         // Heuristic: Corners best, then edges, then count
                         let s = 0;
                         if ((x===0||x===7) && (y===0||y===7)) s += 100;
                         else if (x===0||x===7||y===0||y===7) s += 10;
                         else s += 1;
                         
                         if (s > bestScore) {
                             bestScore = s;
                             bestMove = {x, y};
                         }
                    }
                }
              }
              
              if (bestMove) {
                  makeMove(bestMove.x, bestMove.y);
              }
          }, 500);
      }
      return () => {
          if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      }
  }, [isAuto, board, currentPlayer, gameOver]);

  return (
    <div className="flex flex-col items-center">
       <div className="flex justify-between w-full max-w-[320px] mb-4 px-2 items-center">
         <div className="flex gap-4 font-pixel text-sm">
            <div className={`flex items-center gap-1 ${currentPlayer === 'BLACK' ? 'text-arcade-neon animate-pulse' : 'text-gray-400'}`}>
                <div className="w-3 h-3 rounded-full bg-black border border-white"></div> {score.black}
            </div>
            <div className={`flex items-center gap-1 ${currentPlayer === 'WHITE' ? 'text-arcade-neon animate-pulse' : 'text-gray-400'}`}>
                <div className="w-3 h-3 rounded-full bg-white"></div> {score.white}
            </div>
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

       <div className="bg-green-800 p-2 rounded shadow-2xl border-4 border-arcade-secondary">
          <div className="grid grid-cols-8 gap-0.5 bg-green-900 border border-green-900">
             {board.map((row, y) => 
                 row.map((cell, x) => (
                     <div 
                        key={`${x}-${y}`}
                        onClick={() => !isAuto && makeMove(x, y)}
                        className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600 hover:bg-green-500 flex items-center justify-center cursor-pointer relative"
                     >
                         {isValidMove(board, currentPlayer, x, y) && !isAuto && !gameOver && (
                             <div className="w-2 h-2 rounded-full bg-black/20"></div>
                         )}
                         {cell && (
                             <div className={`w-3/4 h-3/4 rounded-full shadow-md transition-all duration-300 ${cell === 'BLACK' ? 'bg-black' : 'bg-white'}`}></div>
                         )}
                     </div>
                 ))
             )}
          </div>
       </div>
       
       {gameOver && (
           <div className="mt-4 text-arcade-neon font-pixel animate-bounce">
               {score.black > score.white ? 'BLACK WINS!' : (score.white > score.black ? 'WHITE WINS!' : 'DRAW!')}
           </div>
       )}
    </div>
  );
};

export default ReversiGame;
