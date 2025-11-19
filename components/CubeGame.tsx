
import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot, RotateCw, RotateCcw, Box } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface CubeProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

// Colors
const C = {
  W: '#ffffff', // Up
  Y: '#ffd500', // Down
  G: '#009e60', // Front
  B: '#0051ba', // Back
  R: '#c41e3a', // Right
  O: '#ff5800'  // Left
};

// Initial state: 6 faces, 9 stickes each
// Faces: U, D, F, B, L, R
const INITIAL_STATE = {
    U: Array(9).fill(C.W),
    D: Array(9).fill(C.Y),
    F: Array(9).fill(C.G),
    B: Array(9).fill(C.B),
    L: Array(9).fill(C.O),
    R: Array(9).fill(C.R)
};

const CubeGame: React.FC<CubeProps> = ({ onGameOver, language }) => {
  const [cube, setCube] = useState<Record<string, string[]>>(JSON.parse(JSON.stringify(INITIAL_STATE)));
  const [rotX, setRotX] = useState(-30);
  const [rotY, setRotY] = useState(45);
  const [isAuto, setIsAuto] = useState(false);
  const [moves, setMoves] = useState(0);
  const autoTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rotation Logic
  const rotateFaceClockwise = (face: string[]) => {
      const n = [...face];
      // Corners
      n[0]=face[6]; n[2]=face[0]; n[8]=face[2]; n[6]=face[8];
      // Edges
      n[1]=face[3]; n[5]=face[1]; n[7]=face[5]; n[3]=face[7];
      // Center [4] unchanged
      return n;
  };
  
  const rotateFaceCounterClockwise = (face: string[]) => {
      const n = [...face];
      n[0]=face[2]; n[2]=face[8]; n[8]=face[6]; n[6]=face[0];
      n[1]=face[5]; n[5]=face[7]; n[7]=face[3]; n[3]=face[1];
      return n;
  };

  // Rotate a layer
  const moveLayer = (layer: string, clockwise: boolean) => {
      const next = JSON.parse(JSON.stringify(cube));
      
      /*
        Indices map:
        0 1 2
        3 4 5
        6 7 8
      */
     
      if (layer === 'U') {
          // Rotate Top Face
          next.U = clockwise ? rotateFaceClockwise(cube.U) : rotateFaceCounterClockwise(cube.U);
          // Sides: F012 -> L012 -> B012 -> R012 -> F012
          const rowF = [cube.F[0], cube.F[1], cube.F[2]];
          const rowL = [cube.L[0], cube.L[1], cube.L[2]];
          const rowB = [cube.B[0], cube.B[1], cube.B[2]];
          const rowR = [cube.R[0], cube.R[1], cube.R[2]];
          
          if (clockwise) {
              [0,1,2].forEach(i => {
                  next.F[i] = rowR[i];
                  next.R[i] = rowB[i];
                  next.B[i] = rowL[i];
                  next.L[i] = rowF[i];
              });
          } else {
              [0,1,2].forEach(i => {
                  next.F[i] = rowL[i];
                  next.L[i] = rowB[i];
                  next.B[i] = rowR[i];
                  next.R[i] = rowF[i];
              });
          }
      } else if (layer === 'D') {
          next.D = clockwise ? rotateFaceClockwise(cube.D) : rotateFaceCounterClockwise(cube.D);
          // F678 -> R678 -> B678 -> L678
          const rowF = [cube.F[6], cube.F[7], cube.F[8]];
          const rowR = [cube.R[6], cube.R[7], cube.R[8]];
          const rowB = [cube.B[6], cube.B[7], cube.B[8]];
          const rowL = [cube.L[6], cube.L[7], cube.L[8]];

          if (clockwise) {
             [6,7,8].forEach((idx, i) => {
                 next.F[idx] = rowL[i];
                 next.L[idx] = rowB[i];
                 next.B[idx] = rowR[i];
                 next.R[idx] = rowF[i];
             });
          } else {
             [6,7,8].forEach((idx, i) => {
                 next.F[idx] = rowR[i];
                 next.R[idx] = rowB[i];
                 next.B[idx] = rowL[i];
                 next.L[idx] = rowF[i];
             });
          }
      } else if (layer === 'L') {
          next.L = clockwise ? rotateFaceClockwise(cube.L) : rotateFaceCounterClockwise(cube.L);
          // U036 -> F036 -> D036 -> B852 (Back is inverted vertically relative to front ring?)
          // Standard orientation: B0 is top-right looking from back?
          // Let's assume standard ring: U(L) -> F(L) -> D(L) -> B(R inverted)
          // Indices: col 0 for U,F,D. col 2 for B (indices 2,5,8)
          
          const colU = [cube.U[0], cube.U[3], cube.U[6]];
          const colF = [cube.F[0], cube.F[3], cube.F[6]];
          const colD = [cube.D[0], cube.D[3], cube.D[6]];
          const colB = [cube.B[8], cube.B[5], cube.B[2]]; // Inverted order 

          if (clockwise) {
              [0,3,6].forEach((idx, i) => {
                  next.F[idx] = colU[i];
                  next.D[idx] = colF[i];
                  next.U[idx] = colB[i]; 
              });
              next.B[8] = colD[0]; next.B[5] = colD[1]; next.B[2] = colD[2];
          } else {
              [0,3,6].forEach((idx, i) => {
                  next.U[idx] = colF[i];
                  next.F[idx] = colD[i];
              });
              // D gets B
              next.D[0] = colB[0]; next.D[3] = colB[1]; next.D[6] = colB[2];
              // B gets U
              next.B[8] = colU[0]; next.B[5] = colU[1]; next.B[2] = colU[2];
          }
      } else if (layer === 'R') {
          next.R = clockwise ? rotateFaceClockwise(cube.R) : rotateFaceCounterClockwise(cube.R);
          // U258 -> B630 -> D258 -> F258
          const colU = [cube.U[2], cube.U[5], cube.U[8]];
          const colB = [cube.B[6], cube.B[3], cube.B[0]];
          const colD = [cube.D[2], cube.D[5], cube.D[8]];
          const colF = [cube.F[2], cube.F[5], cube.F[8]];

          if (clockwise) {
              [2,5,8].forEach((idx, i) => {
                  next.F[idx] = colU[i];
                  next.D[idx] = colF[i];
              });
              next.B[6] = colD[0]; next.B[3] = colD[1]; next.B[0] = colD[2];
              next.U[2] = colB[0]; next.U[5] = colB[1]; next.U[8] = colB[2]; // Wait, colB goes to U
              // Correct cycle: U -> B(inv) -> D -> F -> U
              // Clockwise R moves U pieces to B? No. R moves F to U to B to D to F?
              // Standard R: F -> U -> B -> D -> F
              // Wait, U258 -> B630 -> D258 -> F258 is backwards?
              // Let's visualize R move (up): F right side goes UP to U.
              // Correct: F -> U -> B(inv) -> D -> F
              
              // My previous U -> B was wrong logic for R.
              // Let's re-do R clockwise (Right face moves up relative to front)
              // F258 -> U258
              // U258 -> B630
              // B630 -> D258
              // D258 -> F258
              
              next.U[2] = colF[0]; next.U[5] = colF[1]; next.U[8] = colF[2];
              next.B[6] = colU[0]; next.B[3] = colU[1]; next.B[0] = colU[2];
              next.D[2] = colB[0]; next.D[5] = colB[1]; next.D[8] = colB[2];
              next.F[2] = colD[0]; next.F[5] = colD[1]; next.F[8] = colD[2];

          } else {
              // R': F -> D -> B -> U -> F
              next.D[2] = colF[0]; next.D[5] = colF[1]; next.D[8] = colF[2];
              next.B[6] = colD[0]; next.B[3] = colD[1]; next.B[0] = colD[2];
              next.U[2] = colB[0]; next.U[5] = colB[1]; next.U[8] = colB[2];
              next.F[2] = colU[0]; next.F[5] = colU[1]; next.F[8] = colU[2];
          }
      }
      // Implement F and B similarly if needed, but U D L R is enough for basic scramble fun.
      // Adding F for completeness.
      else if (layer === 'F') {
          next.F = clockwise ? rotateFaceClockwise(cube.F) : rotateFaceCounterClockwise(cube.F);
          // U678 -> R036 -> D210 -> L852
          const rowU = [cube.U[6], cube.U[7], cube.U[8]];
          const colR = [cube.R[0], cube.R[3], cube.R[6]];
          const rowD = [cube.D[2], cube.D[1], cube.D[0]];
          const colL = [cube.L[8], cube.L[5], cube.L[2]];

          if (clockwise) {
              next.R[0]=rowU[0]; next.R[3]=rowU[1]; next.R[6]=rowU[2];
              next.D[2]=colR[0]; next.D[1]=colR[1]; next.D[0]=colR[2];
              next.L[8]=rowD[0]; next.L[5]=rowD[1]; next.L[2]=rowD[2];
              next.U[6]=colL[0]; next.U[7]=colL[1]; next.U[8]=colL[2];
          } else {
              next.L[8]=rowU[0]; next.L[5]=rowU[1]; next.L[2]=rowU[2];
              next.D[2]=colL[0]; next.D[1]=colL[1]; next.D[0]=colL[2];
              next.R[0]=rowD[0]; next.R[3]=rowD[1]; next.R[6]=rowD[2];
              next.U[6]=colR[0]; next.U[7]=colR[1]; next.U[8]=colR[2];
          }
      }

      setCube(next);
      setMoves(m => m + 1);
      soundService.playRotate();
  };

  const scramble = () => {
      const moves = ['U', 'D', 'L', 'R', 'F'];
      const randMove = moves[Math.floor(Math.random() * moves.length)];
      const randDir = Math.random() > 0.5;
      moveLayer(randMove, randDir);
  };

  const resetGame = (auto: boolean) => {
      setCube(JSON.parse(JSON.stringify(INITIAL_STATE)));
      setMoves(0);
      setIsAuto(auto);
      setRotX(-30);
      setRotY(45);
      soundService.playMove();
  };

  useEffect(() => {
      if (isAuto) {
          autoTimerRef.current = window.setInterval(() => {
              scramble();
          }, 300);
      } else {
          if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      }
      return () => {
          if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      };
  }, [isAuto, cube]);

  // Interaction
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (isAuto) return;
      
      const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const startRotX = rotX;
      const startRotY = rotY;

      const handleMove = (ev: MouseEvent | TouchEvent) => {
          const cx = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
          const cy = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
          
          const dx = cx - startX;
          const dy = cy - startY;
          
          setRotY(startRotY + dx * 0.5);
          setRotX(startRotX - dy * 0.5);
      };

      const handleUp = () => {
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('touchmove', handleMove);
          window.removeEventListener('mouseup', handleUp);
          window.removeEventListener('touchend', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
  };

  // Render Face
  const renderFace = (faceData: string[], transform: string) => {
      return (
          <div 
            className="absolute grid grid-cols-3 gap-1 bg-black p-1 border border-black"
            style={{
                width: 150, height: 150,
                transform: transform,
                backfaceVisibility: 'hidden' // actually we want to see back if transparent, but here solid
            }}
          >
              {faceData.map((c, i) => (
                  <div key={i} className="w-full h-full rounded-[2px]" style={{ backgroundColor: c, boxShadow: 'inset 0 0 5px rgba(0,0,0,0.2)' }} />
              ))}
          </div>
      );
  };

  return (
    <div className="flex flex-col items-center overflow-hidden">
       <div className="flex justify-between w-full max-w-[320px] mb-4 px-2 items-center">
         <div className="font-pixel text-arcade-neon text-xs">MOVES: {moves}</div>
         <div className="flex gap-2">
             <button onClick={() => resetGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
            </button>
            <button onClick={() => resetGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
               <RefreshCw size={20} />
            </button>
         </div>
       </div>

       {/* 3D Scene */}
       <div 
         className="relative w-[200px] h-[200px] mb-6 cursor-grab active:cursor-grabbing"
         onMouseDown={handleMouseDown}
         onTouchStart={handleMouseDown}
         style={{ perspective: 800 }}
       >
           <div 
              className="w-full h-full relative transition-transform duration-75 ease-linear"
              style={{ 
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`
              }}
           >
               {/* Faces. Translate 75px (half of 150) */}
               {renderFace(cube.F, 'translateZ(75px)')}
               {renderFace(cube.B, 'rotateY(180deg) translateZ(75px)')}
               {renderFace(cube.R, 'rotateY(90deg) translateZ(75px)')}
               {renderFace(cube.L, 'rotateY(-90deg) translateZ(75px)')}
               {renderFace(cube.U, 'rotateX(90deg) translateZ(75px)')}
               {renderFace(cube.D, 'rotateX(-90deg) translateZ(75px)')}
           </div>
       </div>

       {/* Controls */}
       {!isAuto && (
           <div className="grid grid-cols-5 gap-2 p-2 bg-gray-800 rounded-lg">
               {['L', 'R', 'U', 'D', 'F'].map(face => (
                   <div key={face} className="flex flex-col gap-1 items-center">
                       <button onClick={() => moveLayer(face, true)} className="p-2 bg-arcade-secondary hover:bg-arcade-primary rounded text-xs font-bold w-10 flex justify-center"><RotateCw size={16}/></button>
                       <span className="text-gray-400 text-[10px] font-bold">{face}</span>
                       <button onClick={() => moveLayer(face, false)} className="p-2 bg-arcade-secondary hover:bg-arcade-primary rounded text-xs font-bold w-10 flex justify-center"><RotateCcw size={16}/></button>
                   </div>
               ))}
           </div>
       )}
       <p className="mt-4 text-xs text-gray-400 max-w-[300px] text-center">
           {t('cubeControls', language)}
       </p>
    </div>
  );
};

export default CubeGame;
