
import React, { useEffect, useRef, useState } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, ArrowLeft, ArrowRight, Bot, Crosshair } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface SpaceInvadersProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const GAME_WIDTH = 320;
const GAME_HEIGHT = 400;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 20;
const ALIEN_WIDTH = 20;
const ALIEN_HEIGHT = 15;
const BULLET_SPEED = 6;
const ALIEN_SPEED = 1;
const PLAYER_SPEED = 4;

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Alien extends Entity {
  id: number;
}

const SpaceInvadersGame: React.FC<SpaceInvadersProps> = ({ onGameOver, language }) => {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Ref
  const state = useRef({
    playerX: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
    playerBullets: [] as Entity[],
    alienBullets: [] as Entity[],
    aliens: [] as Alien[],
    alienDirection: 1, // 1 right, -1 left
    lastShotTime: 0,
    lastAlienShotTime: 0,
    level: 1
  });

  const initGame = (auto: boolean = false) => {
    const aliens: Alien[] = [];
    const rows = 4;
    const cols = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.push({
          id: r * cols + c,
          x: c * (ALIEN_WIDTH + 15) + 30,
          y: r * (ALIEN_HEIGHT + 15) + 40,
          width: ALIEN_WIDTH,
          height: ALIEN_HEIGHT
        });
      }
    }

    state.current = {
      playerX: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
      playerBullets: [],
      alienBullets: [],
      aliens: aliens,
      alienDirection: 1,
      lastShotTime: 0,
      lastAlienShotTime: 0,
      level: 1
    };
    
    setScore(0);
    setIsPlaying(true);
    setIsAuto(auto);
    soundService.playMove();
  };

  const spawnAliens = () => {
    const aliens: Alien[] = [];
    const rows = 4 + Math.min(2, Math.floor(state.current.level / 2));
    const cols = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.push({
          id: Date.now() + r * cols + c,
          x: c * (ALIEN_WIDTH + 15) + 30,
          y: r * (ALIEN_HEIGHT + 15) + 40,
          width: ALIEN_WIDTH,
          height: ALIEN_HEIGHT
        });
      }
    }
    state.current.aliens = aliens;
    state.current.playerBullets = [];
    state.current.alienBullets = [];
    state.current.alienDirection = 1;
  };

  const fireBullet = () => {
    const now = Date.now();
    if (now - state.current.lastShotTime > 400) { // Fire rate limit
      state.current.playerBullets.push({
        x: state.current.playerX + PLAYER_WIDTH / 2 - 2,
        y: GAME_HEIGHT - PLAYER_HEIGHT - 5,
        width: 4,
        height: 8
      });
      state.current.lastShotTime = now;
      soundService.playShoot();
    }
  };

  // Auto Pilot AI
  const updateAutoPilot = () => {
    if (state.current.aliens.length === 0) return;

    const playerCenter = state.current.playerX + PLAYER_WIDTH / 2;

    // 1. Dodge Logic
    // Check for bullets that are close and heading towards player
    const dangerousBullet = state.current.alienBullets.find(b => 
      b.y > GAME_HEIGHT - 150 && // Only care if getting close
      Math.abs((b.x + b.width/2) - playerCenter) < PLAYER_WIDTH // In hitting range width-wise
    );

    if (dangerousBullet) {
      // Move away from bullet
      if (dangerousBullet.x < playerCenter) {
        state.current.playerX = Math.min(GAME_WIDTH - PLAYER_WIDTH, state.current.playerX + PLAYER_SPEED);
      } else {
        state.current.playerX = Math.max(0, state.current.playerX - PLAYER_SPEED);
      }
    } else {
      // 2. Attack Logic
      // Find nearest bottom alien
      // Group by columns, pick lowest alien in closest column
      
      // Simplified: Just find nearest alien by X
      let targetAlien = state.current.aliens[0];
      let minDist = 9999;

      for (const alien of state.current.aliens) {
         const dist = Math.abs((alien.x + alien.width/2) - playerCenter);
         if (dist < minDist) {
            minDist = dist;
            targetAlien = alien;
         }
      }

      const targetX = targetAlien.x + targetAlien.width / 2 - PLAYER_WIDTH / 2;
      
      if (Math.abs(state.current.playerX - targetX) > 5) {
         if (state.current.playerX < targetX) {
             state.current.playerX = Math.min(GAME_WIDTH - PLAYER_WIDTH, state.current.playerX + PLAYER_SPEED);
         } else {
             state.current.playerX = Math.max(0, state.current.playerX - PLAYER_SPEED);
         }
      } else {
         // Aligned, fire!
         fireBullet();
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      if (!isPlaying) return;

      if (isAuto) updateAutoPilot();

      // Clear
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // 1. Update Aliens
      let hitEdge = false;
      for (const alien of state.current.aliens) {
        alien.x += ALIEN_SPEED * state.current.alienDirection * (1 + state.current.level * 0.1);
        if (alien.x <= 0 || alien.x + alien.width >= GAME_WIDTH) {
          hitEdge = true;
        }
      }
      if (hitEdge) {
        state.current.alienDirection *= -1;
        for (const alien of state.current.aliens) {
          alien.y += 10; // Move down
          if (alien.y + alien.height >= GAME_HEIGHT - PLAYER_HEIGHT) {
             // Invasion successful - Game Over
             setIsPlaying(false);
             soundService.playExplosion();
             if (!isAuto) {
                 onGameOver({ game: 'Space Invaders', gameId: GameType.SPACEINVADERS, score });
             } else {
                 setIsAuto(false);
             }
             return;
          }
        }
      }

      // 2. Alien Shooting
      if (Date.now() - state.current.lastAlienShotTime > Math.max(500, 2000 - state.current.level * 100) && state.current.aliens.length > 0) {
         // Random alien shoots
         const shooter = state.current.aliens[Math.floor(Math.random() * state.current.aliens.length)];
         state.current.alienBullets.push({
             x: shooter.x + shooter.width / 2,
             y: shooter.y + shooter.height,
             width: 4,
             height: 8
         });
         state.current.lastAlienShotTime = Date.now();
      }

      // 3. Update Bullets
      state.current.playerBullets.forEach(b => b.y -= BULLET_SPEED);
      state.current.playerBullets = state.current.playerBullets.filter(b => b.y > -10);

      state.current.alienBullets.forEach(b => b.y += BULLET_SPEED / 1.5);
      state.current.alienBullets = state.current.alienBullets.filter(b => b.y < GAME_HEIGHT + 10);

      // 4. Collision Detection
      // Player bullets hit Aliens
      for (let i = state.current.playerBullets.length - 1; i >= 0; i--) {
        const pb = state.current.playerBullets[i];
        let hit = false;
        for (let j = state.current.aliens.length - 1; j >= 0; j--) {
           const alien = state.current.aliens[j];
           if (
             pb.x < alien.x + alien.width &&
             pb.x + pb.width > alien.x &&
             pb.y < alien.y + alien.height &&
             pb.y + pb.height > alien.y
           ) {
             state.current.aliens.splice(j, 1);
             state.current.playerBullets.splice(i, 1);
             setScore(s => s + 20);
             hit = true;
             soundService.playScore(); // actually standard beep is fine
             break;
           }
        }
        if (hit) continue;
      }

      // Alien bullets hit Player
      const playerRect = {
         x: state.current.playerX,
         y: GAME_HEIGHT - PLAYER_HEIGHT - 2,
         width: PLAYER_WIDTH,
         height: PLAYER_HEIGHT
      };

      for (const ab of state.current.alienBullets) {
          if (
             ab.x < playerRect.x + playerRect.width &&
             ab.x + ab.width > playerRect.x &&
             ab.y < playerRect.y + playerRect.height &&
             ab.y + ab.height > playerRect.y
          ) {
             setIsPlaying(false);
             soundService.playExplosion();
             if (!isAuto) {
                 onGameOver({ game: 'Space Invaders', gameId: GameType.SPACEINVADERS, score });
             } else {
                 setIsAuto(false);
             }
             return;
          }
      }

      // Level Clear
      if (state.current.aliens.length === 0) {
          state.current.level++;
          soundService.playWin();
          spawnAliens();
      }

      // Draw Player
      ctx.fillStyle = isAuto ? '#ef4444' : '#00fff5'; // Red for auto bot
      ctx.beginPath();
      ctx.moveTo(playerRect.x + PLAYER_WIDTH / 2, playerRect.y);
      ctx.lineTo(playerRect.x + PLAYER_WIDTH, playerRect.y + PLAYER_HEIGHT);
      ctx.lineTo(playerRect.x, playerRect.y + PLAYER_HEIGHT);
      ctx.fill();

      // Draw Aliens
      ctx.fillStyle = '#e94560'; // Arcade primary
      state.current.aliens.forEach(a => {
         // Simple invader shape (rectangle with eyes)
         ctx.fillRect(a.x, a.y, a.width, a.height);
         ctx.fillStyle = '#1a1a2e';
         ctx.fillRect(a.x + 4, a.y + 4, 4, 4);
         ctx.fillRect(a.x + 12, a.y + 4, 4, 4);
         ctx.fillStyle = '#e94560';
      });

      // Draw Bullets
      ctx.fillStyle = '#ffff00';
      state.current.playerBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
      
      ctx.fillStyle = '#ff00ff';
      state.current.alienBullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

      requestRef.current = requestAnimationFrame(update);
    };

    if (isPlaying) {
       requestRef.current = requestAnimationFrame(update);
    } else {
        // Static Draw
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, score, isAuto]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAuto) return;
      if (e.key === 'ArrowLeft') {
         state.current.playerX = Math.max(0, state.current.playerX - 10);
      } else if (e.key === 'ArrowRight') {
         state.current.playerX = Math.min(GAME_WIDTH - PLAYER_WIDTH, state.current.playerX + 10);
      } else if (e.code === 'Space') {
         e.preventDefault(); // prevent scroll
         fireBullet();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuto]);

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
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="bg-gray-900 border-4 border-arcade-secondary rounded shadow-lg"
       />

       {!isAuto && (
        <div className="grid grid-cols-3 gap-4 mt-6 md:hidden w-[320px]">
            <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center" onClick={() => state.current.playerX = Math.max(0, state.current.playerX - 20)}><ArrowLeft /></button>
            <button className="p-4 bg-red-600 rounded-lg active:bg-red-700 flex justify-center border-b-4 border-red-800" onClick={fireBullet}><Crosshair /></button>
            <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center" onClick={() => state.current.playerX = Math.min(GAME_WIDTH - PLAYER_WIDTH, state.current.playerX + 20)}><ArrowRight /></button>
        </div>
       )}

       <p className="mt-4 text-sm text-gray-500">
          {t('spaceInvadersControls', language)}
       </p>
    </div>
  );
};

export default SpaceInvadersGame;
