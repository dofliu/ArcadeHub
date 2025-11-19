
import React, { useEffect, useRef, useState } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface DinoGameProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;
const GROUND_Y = 170;
const DINO_WIDTH = 40;
const DINO_HEIGHT = 40;
const GRAVITY = 0.5; // Reduced from 0.6
const JUMP_FORCE = -9; // Reduced from -10 to match gravity

const DinoGame: React.FC<DinoGameProps> = ({ onGameOver, language }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const requestRef = useRef<number>(0);
  
  const state = useRef({
    dinoY: GROUND_Y - DINO_HEIGHT,
    dinoVy: 0,
    isJumping: false,
    obstacles: [] as { x: number, type: 'CACTUS' | 'BIRD', width: number, height: number, y: number }[],
    gameSpeed: 3.5, // Reduced from 5
    scoreFloat: 0
  });

  const initGame = (auto: boolean = false) => {
    state.current = {
      dinoY: GROUND_Y - DINO_HEIGHT,
      dinoVy: 0,
      isJumping: false,
      obstacles: [],
      gameSpeed: 3.5,
      scoreFloat: 0
    };
    setScore(0);
    setIsPlaying(true);
    setIsAuto(auto);
    soundService.playMove();
  };

  const jump = () => {
    if (!state.current.isJumping) {
      state.current.dinoVy = JUMP_FORCE;
      state.current.isJumping = true;
      if (!isAuto) soundService.playMove();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      if (!isPlaying) return;

      const s = state.current;

      // 1. Physics
      s.dinoVy += GRAVITY;
      s.dinoY += s.dinoVy;

      if (s.dinoY >= GROUND_Y - DINO_HEIGHT) {
        s.dinoY = GROUND_Y - DINO_HEIGHT;
        s.dinoVy = 0;
        s.isJumping = false;
      }

      // 2. Obstacles
      // Spawn logic: Ensure min distance (300px) so it's not impossible
      if (Math.random() < 0.015 && (s.obstacles.length === 0 || CANVAS_WIDTH - s.obstacles[s.obstacles.length - 1].x > 300)) {
         const type = Math.random() > 0.8 ? 'BIRD' : 'CACTUS';
         const obs = {
            x: CANVAS_WIDTH,
            type: type as 'CACTUS' | 'BIRD',
            width: type === 'CACTUS' ? 20 : 30,
            height: type === 'CACTUS' ? 30 + Math.random() * 20 : 20,
            y: type === 'CACTUS' ? GROUND_Y - (30 + Math.random() * 20) : GROUND_Y - DINO_HEIGHT - 20 - Math.random() * 30
         };
         // Correct Cactus Y
         if (type === 'CACTUS') obs.y = GROUND_Y - obs.height;
         
         s.obstacles.push(obs);
      }

      s.obstacles.forEach(o => o.x -= s.gameSpeed);
      s.obstacles = s.obstacles.filter(o => o.x + o.width > 0);

      // 3. Collision
      // Make hitbox smaller than sprite for forgiving gameplay
      const hitBoxPadding = 8;
      const dinoRect = { 
        x: 50 + hitBoxPadding, 
        y: s.dinoY + hitBoxPadding, 
        w: DINO_WIDTH - (hitBoxPadding * 2), 
        h: DINO_HEIGHT - (hitBoxPadding * 2) 
      };

      for (const o of s.obstacles) {
         // Make obstacle hitbox slightly smaller too
         const obsPadding = 4;
         if (
            dinoRect.x < o.x + o.width - obsPadding &&
            dinoRect.x + dinoRect.w > o.x + obsPadding &&
            dinoRect.y < o.y + o.height - obsPadding &&
            dinoRect.y + dinoRect.h > o.y + obsPadding
         ) {
            setIsPlaying(false);
            soundService.playExplosion();
            if (!isAuto) {
                onGameOver({ game: language === 'zh' ? '恐龍快跑' : 'Dino Run', gameId: GameType.DINO, score });
            } else {
                setIsAuto(false);
            }
            return;
         }
      }

      // 4. Score & Speed
      s.scoreFloat += 0.1;
      // Speed increases much slower now
      if (s.gameSpeed < 10) {
          s.gameSpeed += 0.0005;
      }
      setScore(Math.floor(s.scoreFloat));

      // 5. Auto Pilot
      if (isAuto) {
         // Look at nearest obstacle
         const nearest = s.obstacles.find(o => o.x > 50);
         if (nearest) {
            const dist = nearest.x - (50 + DINO_WIDTH);
            // Jump depending on speed and distance
            const jumpThreshold = s.gameSpeed * 25;
            if (dist < jumpThreshold && !s.isJumping) {
               jump();
            }
         }
      }

      // Draw
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Ground
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Dino
      ctx.fillStyle = isAuto ? '#ef4444' : '#00fff5';
      ctx.fillRect(50, s.dinoY, DINO_WIDTH, DINO_HEIGHT);
      // Eye
      ctx.fillStyle = '#000';
      ctx.fillRect(75, s.dinoY + 5, 5, 5);

      // Obstacles
      s.obstacles.forEach(o => {
         ctx.fillStyle = o.type === 'CACTUS' ? '#22c55e' : '#fbbf24';
         ctx.fillRect(o.x, o.y, o.width, o.height);
      });

      requestRef.current = requestAnimationFrame(update);
    };

    if (isPlaying) {
       requestRef.current = requestAnimationFrame(update);
    } else {
        // Static
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
        ctx.stroke();
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, score, isAuto]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAuto) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
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
  }, [isAuto]);

  return (
    <div className="flex flex-col items-center">
       <div className="flex justify-between w-full max-w-[600px] mb-4 px-2 items-center">
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
          className="bg-gray-900 border-4 border-arcade-secondary rounded shadow-lg max-w-full cursor-pointer"
       />
       <p className="mt-4 text-sm text-gray-500">
          {t('dinoControls', language)}
       </p>
    </div>
  );
};

export default DinoGame;
