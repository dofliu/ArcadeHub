
import React, { useEffect, useRef, useState } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface FroggerProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const GRID_SIZE = 30;
const ROWS = 11;
const COLS = 11;
const WIDTH = COLS * GRID_SIZE;
const HEIGHT = ROWS * GRID_SIZE;

interface ObjectEntity {
    x: number;
    y: number;
    width: number;
    speed: number;
    color: string;
    type: 'CAR' | 'LOG' | 'TURTLE';
}

const FroggerGame: React.FC<FroggerProps> = ({ onGameOver, language }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const requestRef = useRef<number>(0);
  
  // Level definition
  // Rows: 0(Goal), 1(Water), 2(Water), 3(Water), 4(Water), 5(Safe), 6(Road), 7(Road), 8(Road), 9(Road), 10(Start)
  
  const state = useRef({
    frog: { x: 5 * GRID_SIZE, y: 10 * GRID_SIZE },
    rows: [
        { type: 'GOAL', y: 0, objects: [] as ObjectEntity[] },
        { type: 'WATER', y: 1 * GRID_SIZE, speed: 1.0, objects: [] as ObjectEntity[] }, // Logs (Was 2)
        { type: 'WATER', y: 2 * GRID_SIZE, speed: -0.8, objects: [] as ObjectEntity[] }, // Turtles (Was -1.5)
        { type: 'WATER', y: 3 * GRID_SIZE, speed: 1.2, objects: [] as ObjectEntity[] }, // Logs (Was 2.5)
        { type: 'WATER', y: 4 * GRID_SIZE, speed: -1.0, objects: [] as ObjectEntity[] }, // Turtles (Was -2)
        { type: 'SAFE', y: 5 * GRID_SIZE, objects: [] as ObjectEntity[] },
        { type: 'ROAD', y: 6 * GRID_SIZE, speed: -1.0, objects: [] as ObjectEntity[] }, // Cars (Was -2)
        { type: 'ROAD', y: 7 * GRID_SIZE, speed: 1.5, objects: [] as ObjectEntity[] }, // (Was 3)
        { type: 'ROAD', y: 8 * GRID_SIZE, speed: -1.2, objects: [] as ObjectEntity[] }, // (Was -2.5)
        { type: 'ROAD', y: 9 * GRID_SIZE, speed: 0.8, objects: [] as ObjectEntity[] }, // (Was 1.5)
        { type: 'START', y: 10 * GRID_SIZE, objects: [] as ObjectEntity[] },
    ],
    level: 1,
    lives: 3
  });

  const initLevel = () => {
     // Spawn objects
     const s = state.current;
     s.rows.forEach(row => {
         row.objects = [];
         if (row.type === 'ROAD') {
             const count = Math.floor(Math.random() * 2) + 2;
             for(let i=0; i<count; i++) {
                 row.objects.push({
                     x: Math.random() * WIDTH,
                     y: row.y,
                     width: GRID_SIZE,
                     speed: row.speed!,
                     color: '#ef4444', // Red Car
                     type: 'CAR'
                 });
             }
         } else if (row.type === 'WATER') {
             const count = Math.floor(Math.random() * 2) + 2;
             const isLog = row.speed! > 0;
             for(let i=0; i<count; i++) {
                 row.objects.push({
                     x: Math.random() * WIDTH,
                     y: row.y,
                     width: isLog ? GRID_SIZE * 3 : GRID_SIZE * 2,
                     speed: row.speed!,
                     color: isLog ? '#854d0e' : '#16a34a', // Brown Log or Green Turtle
                     type: isLog ? 'LOG' : 'TURTLE'
                 });
             }
         }
     });
  };

  const initGame = (auto: boolean = false) => {
      state.current.frog = { x: 5 * GRID_SIZE, y: 10 * GRID_SIZE };
      state.current.lives = 3;
      state.current.level = 1;
      initLevel();
      setScore(0);
      setIsPlaying(true);
      setIsAuto(auto);
      soundService.playMove();
  };

  const moveFrog = (dx: number, dy: number) => {
      const s = state.current;
      const nx = s.frog.x + dx * GRID_SIZE;
      const ny = s.frog.y + dy * GRID_SIZE;
      
      if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT) {
          s.frog.x = nx;
          s.frog.y = ny;
          if (!isAuto) soundService.playMove();
      }
  };

  // Auto Pilot Logic
  const updateAuto = () => {
      // Very simple forward logic, check if death immediately ahead
      const s = state.current;
      const frog = s.frog;
      
      // Check forward
      const nextY = frog.y - GRID_SIZE;
      
      if (nextY < 0) {
         // Win condition
         moveFrog(0, -1);
         return;
      }

      // Is next Y safe?
      // Find row
      const rowIdx = Math.floor(nextY / GRID_SIZE);
      const row = s.rows[rowIdx];
      
      let isSafe = true;
      const frogRect = { x: frog.x, y: nextY, w: GRID_SIZE, h: GRID_SIZE };
      
      if (row.type === 'ROAD') {
         // Check cars
         for(const obj of row.objects) {
             if (frogRect.x < obj.x + obj.width && frogRect.x + frogRect.w > obj.x) {
                 isSafe = false; // Hit car
             }
         }
      } else if (row.type === 'WATER') {
         // Needs log
         let onLog = false;
         for(const obj of row.objects) {
             if (frogRect.x + GRID_SIZE/2 > obj.x && frogRect.x + GRID_SIZE/2 < obj.x + obj.width) {
                 onLog = true;
             }
         }
         if (!onLog) isSafe = false;
      }
      
      if (isSafe) {
          moveFrog(0, -1);
      } else {
          // Try waiting or moving side?
          // Simple wiggle
          if (Math.random() > 0.5 && frog.x < WIDTH - GRID_SIZE) moveFrog(1, 0);
          else if (frog.x > 0) moveFrog(-1, 0);
      }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const update = () => {
      if (!isPlaying) return;
      frameCount++;
      
      const s = state.current;

      // Slow down auto moves
      if (isAuto && frameCount % 30 === 0) {
          updateAuto();
      }

      // Move Objects
      s.rows.forEach(row => {
          if (row.objects.length > 0) {
              row.objects.forEach(obj => {
                  obj.x += obj.speed * (1 + s.level * 0.05); // Reduce level scaling speed
                  // Wrap
                  if (obj.speed > 0 && obj.x > WIDTH) obj.x = -obj.width;
                  if (obj.speed < 0 && obj.x + obj.width < 0) obj.x = WIDTH;
              });
          }
      });

      // Frog Interaction
      // Find current row
      const rIdx = Math.floor(s.frog.y / GRID_SIZE);
      const currentRow = s.rows[rIdx];

      let dead = false;
      const frogCenter = s.frog.x + GRID_SIZE/2;

      if (currentRow.type === 'ROAD') {
          for(const obj of currentRow.objects) {
              // Slightly smaller hitbox for frog vs car
              const padding = 4;
              if (s.frog.x + padding < obj.x + obj.width && s.frog.x + GRID_SIZE - padding > obj.x) {
                  dead = true; // Squish
              }
          }
      } else if (currentRow.type === 'WATER') {
          // Must be on object
          let safe = false;
          let rideSpeed = 0;
          for(const obj of currentRow.objects) {
               // More lenient collision for logs
               if (frogCenter > obj.x && frogCenter < obj.x + obj.width) {
                   safe = true;
                   rideSpeed = obj.speed * (1 + s.level * 0.05);
               }
          }
          if (!safe) dead = true; // Drown
          else {
              s.frog.x += rideSpeed;
              // Clamp screen
              if (s.frog.x < 0 || s.frog.x + GRID_SIZE > WIDTH) dead = true;
          }
      } else if (currentRow.type === 'GOAL') {
          // Win level
          soundService.playWin();
          setScore(prev => prev + 100 * s.level);
          s.level++;
          s.frog = { x: 5 * GRID_SIZE, y: 10 * GRID_SIZE };
          // Respawn new pattern? Keep same for simplicity but speed up
      }

      if (dead) {
          soundService.playExplosion();
          s.lives--;
          if (s.lives <= 0) {
              setIsPlaying(false);
              if (!isAuto) {
                  onGameOver({ game: language === 'zh' ? '青蛙過河' : 'Frogger', gameId: GameType.FROGGER, score });
              } else {
                  setIsAuto(false);
              }
              return;
          } else {
              // Reset pos
              s.frog = { x: 5 * GRID_SIZE, y: 10 * GRID_SIZE };
          }
      }

      // Draw
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Draw Rows
      s.rows.forEach(row => {
          if (row.type === 'WATER') {
              ctx.fillStyle = '#1e3a8a'; // Blue
              ctx.fillRect(0, row.y, WIDTH, GRID_SIZE);
          } else if (row.type === 'ROAD') {
              ctx.fillStyle = '#374151'; // Gray
              ctx.fillRect(0, row.y, WIDTH, GRID_SIZE);
          } else if (row.type === 'GOAL') {
              ctx.fillStyle = '#065f46'; // Dark Green
              ctx.fillRect(0, row.y, WIDTH, GRID_SIZE);
              // Goal slots
              for(let i=0; i<COLS; i+=2) {
                 ctx.fillStyle = '#10b981';
                 ctx.fillRect(i*GRID_SIZE, row.y, GRID_SIZE, GRID_SIZE);
              }
          }
          
          // Draw Objects
          row.objects.forEach(obj => {
              ctx.fillStyle = obj.color;
              ctx.fillRect(obj.x, obj.y + 2, obj.width, GRID_SIZE - 4);
          });
      });

      // Draw Frog
      ctx.fillStyle = isAuto ? '#f43f5e' : '#22c55e';
      ctx.fillRect(s.frog.x + 2, s.frog.y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
      // Eyes
      ctx.fillStyle = 'black';
      ctx.fillRect(s.frog.x + 4, s.frog.y + 4, 4, 4);
      ctx.fillRect(s.frog.x + GRID_SIZE - 8, s.frog.y + 4, 4, 4);

      requestRef.current = requestAnimationFrame(update);
    };

    if (isPlaying) {
        requestRef.current = requestAnimationFrame(update);
    } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(0,0,WIDTH,HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        ctx.fillText(language === 'zh' ? '青蛙過河' : 'FROGGER', 100, 100);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, score, isAuto]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAuto) return;
      if (e.key === 'ArrowUp') moveFrog(0, -1);
      if (e.key === 'ArrowDown') moveFrog(0, 1);
      if (e.key === 'ArrowLeft') moveFrog(-1, 0);
      if (e.key === 'ArrowRight') moveFrog(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuto]);

  return (
    <div className="flex flex-col items-center">
       <div className="flex justify-between w-full max-w-[330px] mb-4 px-2 items-center">
         <div className="font-pixel text-arcade-neon">SCORE: {score}</div>
         <div className="flex gap-2">
             <button onClick={() => initGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
            </button>
            <button onClick={() => initGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
              {isPlaying ? <RefreshCw size={20} /> : <Play size={20} />}
            </button>
         </div>
       </div>

       <canvas 
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="bg-black border-4 border-arcade-secondary rounded shadow-lg"
       />

        {!isAuto && (
        <div className="grid grid-cols-3 gap-2 mt-4 md:hidden w-[250px]">
            <div />
            <button className="p-3 bg-arcade-secondary rounded active:bg-arcade-primary flex justify-center" onClick={() => moveFrog(0,-1)}><ArrowUp /></button>
            <div />
            <button className="p-3 bg-arcade-secondary rounded active:bg-arcade-primary flex justify-center" onClick={() => moveFrog(-1,0)}><ArrowLeft /></button>
            <button className="p-3 bg-arcade-secondary rounded active:bg-arcade-primary flex justify-center" onClick={() => moveFrog(0,1)}><ArrowDown /></button>
            <button className="p-3 bg-arcade-secondary rounded active:bg-arcade-primary flex justify-center" onClick={() => moveFrog(1,0)}><ArrowRight /></button>
        </div>
       )}
    </div>
  );
};

export default FroggerGame;
