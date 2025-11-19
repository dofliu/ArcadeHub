import React, { useRef, useEffect, useState } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, ArrowLeft, ArrowRight, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface BreakoutGameProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 75;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 4;
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 6;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 30;
const BRICK_OFFSET_LEFT = 20;
const INITIAL_SPEED = 2;
const MAX_SPEED = 5;

const BRICK_WIDTH = (CANVAS_WIDTH - (BRICK_OFFSET_LEFT * 2) - (BRICK_PADDING * (BRICK_COLUMN_COUNT - 1))) / BRICK_COLUMN_COUNT;

const BreakoutGame: React.FC<BreakoutGameProps> = ({ onGameOver, language }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [score, setScore] = useState(0);
  const requestRef = useRef<number>(0);
  
  const state = useRef({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 30,
    dx: INITIAL_SPEED,
    dy: -INITIAL_SPEED,
    paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    bricks: [] as { x: number, y: number, status: number }[],
    speedMultiplier: 1
  });

  const initBricks = () => {
    const newBricks = [];
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
      for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        newBricks.push({ x: 0, y: 0, status: 1 });
      }
    }
    state.current.bricks = newBricks;
  };

  const startGame = (auto: boolean = false) => {
    state.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 30,
      dx: INITIAL_SPEED,
      dy: -INITIAL_SPEED,
      paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
      bricks: [],
      speedMultiplier: 1
    };
    initBricks();
    setScore(0);
    setIsPlaying(true);
    setIsAuto(auto);
    soundService.playMove();
  };

  const drawBall = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.arc(state.current.x, state.current.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isAuto ? "#ff00ff" : "#00fff5";
    ctx.fill();
    ctx.closePath();
  };

  const drawPaddle = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.rect(state.current.paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = "#e94560";
    ctx.fill();
    ctx.closePath();
  };

  const drawBricks = (ctx: CanvasRenderingContext2D) => {
    state.current.bricks.forEach((brick, i) => {
      if (brick.status === 1) {
        const c = Math.floor(i / BRICK_ROW_COUNT);
        const r = i % BRICK_ROW_COUNT;
        
        const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
        const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        brick.x = brickX;
        brick.y = brickY;
        
        ctx.beginPath();
        ctx.rect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
        ctx.fillStyle = colors[r % colors.length];
        ctx.fill();
        ctx.closePath();
      }
    });
  };

  const movePaddle = (direction: 'LEFT' | 'RIGHT') => {
     if (isAuto) return;
     if (direction === 'LEFT') {
        state.current.paddleX = Math.max(0, state.current.paddleX - 25);
     } else {
        state.current.paddleX = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, state.current.paddleX + 25);
     }
  };

  const increaseSpeed = () => {
    const currentSpeed = Math.sqrt(state.current.dx ** 2 + state.current.dy ** 2);
    if (currentSpeed < MAX_SPEED) {
      state.current.dx *= 1.05;
      state.current.dy *= 1.05;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      if (!isPlaying) return;

      // --- Auto Play Logic ---
      if (isAuto) {
        // Paddle centers on ball
        const targetX = state.current.x - PADDLE_WIDTH / 2;
        // Lerp for smoothness
        state.current.paddleX += (targetX - state.current.paddleX) * 0.1;
        // Clamp
        state.current.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, state.current.paddleX));
      }

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawBricks(ctx);
      drawBall(ctx);
      drawPaddle(ctx);

      let activeBricks = 0;
      state.current.bricks.forEach((b) => {
        if (b.status === 1) {
          activeBricks++;
          if (
            state.current.x > b.x && 
            state.current.x < b.x + BRICK_WIDTH && 
            state.current.y > b.y && 
            state.current.y < b.y + BRICK_HEIGHT
          ) {
            state.current.dy = -state.current.dy;
            b.status = 0;
            setScore(s => {
              const newScore = s + 10;
              if (newScore % 50 === 0) increaseSpeed();
              return newScore;
            });
            soundService.playScore();
          }
        }
      });

      if (activeBricks === 0) {
        setIsPlaying(false);
        soundService.playWin();
        if (!isAuto) {
           onGameOver({ game: language === 'zh' ? '打磚塊' : 'Breakout', gameId: GameType.BREAKOUT, score: score + 1000 });
        } else {
           setIsAuto(false);
        }
        return;
      }

      if (state.current.x + state.current.dx > CANVAS_WIDTH - BALL_RADIUS || state.current.x + state.current.dx < BALL_RADIUS) {
        state.current.dx = -state.current.dx;
        soundService.playMove();
      }
      if (state.current.y + state.current.dy < BALL_RADIUS) {
        state.current.dy = -state.current.dy;
        soundService.playMove();
      } else if (state.current.y + state.current.dy > CANVAS_HEIGHT - BALL_RADIUS) {
        if (state.current.x > state.current.paddleX && state.current.x < state.current.paddleX + PADDLE_WIDTH) {
           state.current.dy = -state.current.dy;
           const hitPoint = state.current.x - (state.current.paddleX + PADDLE_WIDTH / 2);
           const normalizedHit = hitPoint / PADDLE_WIDTH;
           state.current.dx = normalizedHit * 8;
           soundService.playRotate();
        } else {
           setIsPlaying(false);
           soundService.playExplosion();
           if (!isAuto) {
               onGameOver({ game: language === 'zh' ? '打磚塊' : 'Breakout', gameId: GameType.BREAKOUT, score });
           } else {
               setIsAuto(false);
           }
           return;
        }
      }

      state.current.x += state.current.dx;
      state.current.y += state.current.dy;

      requestRef.current = requestAnimationFrame(update);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (score === 0) initBricks();
      drawBricks(ctx);
      drawPaddle(ctx);
      drawBall(ctx);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, score, onGameOver, language, isAuto]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAuto) return;
      if (e.key === 'ArrowRight') {
        state.current.paddleX = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, state.current.paddleX + 20);
      } else if (e.key === 'ArrowLeft') {
        state.current.paddleX = Math.max(0, state.current.paddleX - 20);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuto]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[320px] mb-4 px-2">
        <div className="font-pixel text-arcade-neon">SCORE: {score}</div>
        {!isPlaying && (
           <div className="flex gap-2">
              <button onClick={() => startGame(true)} className="flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon">
                 <Bot size={14} /> {t('autoMode', language)}
              </button>
              <button onClick={() => startGame(false)} className="flex items-center gap-2 text-sm bg-arcade-primary px-3 py-1 rounded hover:bg-red-600 transition">
                 {score > 0 ? <RefreshCw size={16}/> : <Play size={16} />} {score > 0 ? (language === 'zh' ? '重來' : 'Retry') : (language === 'zh' ? '開始' : 'Start')}
              </button>
           </div>
        )}
        {isPlaying && isAuto && (
             <button onClick={() => { setIsPlaying(false); setIsAuto(false); }} className="text-xs bg-red-500 px-3 py-1 rounded animate-pulse text-white">
                {t('stopAuto', language)}
             </button>
        )}
      </div>
      
      <canvas 
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="bg-gray-900 border-4 border-arcade-secondary rounded shadow-lg cursor-none"
      />

      {!isAuto && (
        <div className="grid grid-cols-2 gap-4 mt-6 md:hidden w-[320px]">
            <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center" onClick={() => movePaddle('LEFT')}><ArrowLeft /></button>
            <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center" onClick={() => movePaddle('RIGHT')}><ArrowRight /></button>
        </div>
      )}
    </div>
  );
};

export default BreakoutGame;