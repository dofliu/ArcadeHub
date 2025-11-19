
import React, { useRef, useEffect, useState } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface PixelJumpProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.3; // Reduced from 0.4 for floatier feel
const JUMP = -5; // Reduced from -6 to match new gravity
const PIPE_SPEED = 1.5; // Reduced from 2
const PIPE_WIDTH = 40;
const PIPE_GAP = 140; // Increased from 110 to make it easier
const BIRD_SIZE = 20;

const PixelJumpGame: React.FC<PixelJumpProps> = ({ onGameOver, language }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [isAuto, setIsAuto] = useState(false);
  const requestRef = useRef<number>(0);
  
  const state = useRef({
    birdY: CANVAS_HEIGHT / 2,
    birdVelocity: 0,
    pipes: [] as { x: number, gapY: number, passed: boolean }[],
    frameCount: 0
  });

  const initGame = (auto: boolean = false) => {
    state.current = {
      birdY: CANVAS_HEIGHT / 2,
      birdVelocity: 0,
      pipes: [],
      frameCount: 0
    };
    setScore(0);
    setIsPlaying(true);
    setIsAuto(auto);
    soundService.playMove();
  };

  const jump = () => {
    if (!isPlaying) return;
    state.current.birdVelocity = JUMP;
    if (!isAuto) soundService.playMove(); // Using move sound as jump
  };

  // Auto Pilot Logic
  const updateAutoPilot = () => {
    const { birdY, pipes } = state.current;
    
    // Find the next pipe
    const nextPipe = pipes.find(p => p.x + PIPE_WIDTH > 50); // 50 is bird X position approx
    
    if (nextPipe) {
      const targetY = nextPipe.gapY + PIPE_GAP / 2; // Aim for center of gap
      
      // Simple physics anticipation
      // If bird is below target or falling too fast below target
      if (birdY > targetY + 10 || (birdY > targetY - 20 && state.current.birdVelocity > 2)) {
         jump();
      }
    } else {
       // No pipe, keep middle
       if (birdY > CANVAS_HEIGHT / 2) jump();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      if (!isPlaying) return;

      // Auto Bot
      if (isAuto) updateAutoPilot();

      state.current.frameCount++;

      // Physics
      state.current.birdVelocity += GRAVITY;
      state.current.birdY += state.current.birdVelocity;

      // Spawn Pipes
      if (state.current.frameCount % 120 === 0) { // Increased interval (was 100)
         const minGapY = 50;
         const maxGapY = CANVAS_HEIGHT - 50 - PIPE_GAP;
         const gapY = Math.floor(Math.random() * (maxGapY - minGapY + 1)) + minGapY;
         state.current.pipes.push({ x: CANVAS_WIDTH, gapY, passed: false });
      }

      // Move Pipes
      state.current.pipes.forEach(p => p.x -= PIPE_SPEED);
      
      // Remove off-screen pipes
      if (state.current.pipes.length > 0 && state.current.pipes[0].x < -PIPE_WIDTH) {
        state.current.pipes.shift();
      }

      // Collision Detection
      const hitPadding = 4; // Forgive some pixel overlaps
      const birdRect = { 
        x: 50 + hitPadding, 
        y: state.current.birdY + hitPadding, 
        w: BIRD_SIZE - hitPadding*2, 
        h: BIRD_SIZE - hitPadding*2
      };
      
      // Floor/Ceiling
      if (state.current.birdY + BIRD_SIZE > CANVAS_HEIGHT || state.current.birdY < 0) {
         endGame();
         return;
      }

      // Pipes
      for (const p of state.current.pipes) {
         // Check X overlap (using original rect for pipe matching logic ease, but visualizing padding)
         if (50 + BIRD_SIZE > p.x && 50 < p.x + PIPE_WIDTH) {
            // Check Y overlap (hit top pipe OR hit bottom pipe)
            if (birdRect.y < p.gapY || birdRect.y + birdRect.h > p.gapY + PIPE_GAP) {
               endGame();
               return;
            }
         }

         // Score
         if (!p.passed && 50 > p.x + PIPE_WIDTH) {
            p.passed = true;
            setScore(s => s + 1);
            if(!isAuto) soundService.playScore();
         }
      }

      // Draw
      ctx.fillStyle = '#1a1a2e'; // Background
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Pipes
      ctx.fillStyle = '#22c55e'; // Green
      state.current.pipes.forEach(p => {
         // Top Pipe
         ctx.fillRect(p.x, 0, PIPE_WIDTH, p.gapY);
         // Bottom Pipe
         ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - (p.gapY + PIPE_GAP));
         
         // Pipe Caps (Retro look)
         ctx.fillStyle = '#166534'; // Darker Green border
         ctx.fillRect(p.x + 2, 0, PIPE_WIDTH - 4, p.gapY);
         ctx.fillRect(p.x + 2, p.gapY + PIPE_GAP, PIPE_WIDTH - 4, CANVAS_HEIGHT);
         ctx.fillStyle = '#22c55e';
      });

      // Draw Bird
      ctx.fillStyle = isAuto ? '#ef4444' : '#fbbf24'; // Yellow (or Red for bot)
      ctx.fillRect(50, state.current.birdY, BIRD_SIZE, BIRD_SIZE);
      // Bird Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(64, state.current.birdY + 4, 4, 4);
      // Bird Wing
      ctx.fillStyle = '#fff';
      ctx.fillRect(54, state.current.birdY + 10, 8, 4);

      // Ground
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);

      requestRef.current = requestAnimationFrame(update);
    };

    const endGame = () => {
      setIsPlaying(false);
      soundService.playExplosion();
      if (!isAuto) {
         onGameOver({ game: language === 'zh' ? '像素跳躍' : 'Pixel Jump', gameId: GameType.PIXELJUMP, score });
      } else {
         setIsAuto(false);
      }
    };

    if (isPlaying) {
       requestRef.current = requestAnimationFrame(update);
    } else {
       // Static Draw
       ctx.fillStyle = '#1a1a2e';
       ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
       ctx.fillStyle = '#fbbf24';
       ctx.fillRect(50, CANVAS_HEIGHT/2, BIRD_SIZE, BIRD_SIZE);
       
       ctx.fillStyle = '#fff';
       ctx.font = '16px monospace';
       ctx.fillText(language === 'zh' ? '點擊或按空白鍵跳躍' : 'Press Space/Click to Jump', 40, CANVAS_HEIGHT/2 + 40);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, score, isAuto, onGameOver, language]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAuto) return;
      if (e.code === 'Space') {
         e.preventDefault();
         jump();
      }
    };
    const handleTouch = (e: TouchEvent) => {
        if (isAuto) return;
        e.preventDefault();
        jump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch, { passive: false });
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('touchstart', handleTouch);
    };
  }, [isPlaying, isAuto]);

  return (
    <div className="flex flex-col items-center">
       <div className="flex justify-between w-full max-w-[320px] mb-4 px-2 items-center">
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
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={() => !isAuto && jump()}
          className="bg-gray-900 border-4 border-arcade-secondary rounded shadow-lg cursor-pointer"
       />

       <p className="mt-4 text-sm text-gray-500">
          {t('pixelJumpControls', language)}
       </p>
    </div>
  );
};

export default PixelJumpGame;
