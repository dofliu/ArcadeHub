
import React, { useEffect, useRef, useState } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Bot, Crosshair, Heart } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface SalamanderProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

// Horizontal scrolling shoot-em-up (Konami Salamander / Life Force tribute)
const GAME_WIDTH = 480;
const GAME_HEIGHT = 320;
const PLAYER_WIDTH = 26;
const PLAYER_HEIGHT = 14;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 7;
const ENEMY_BULLET_SPEED = 3.5;
const START_LIVES = 3;

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Enemy extends Entity {
  id: number;
  hp: number;
  maxHp: number;
  vx: number;
  baseY: number;
  amp: number;
  phase: number;
  freq: number;
  type: 'grunt' | 'turret' | 'boss';
  lastShot: number;
  dropsPower: boolean;
}

interface PowerUp extends Entity {
  id: number;
  vx: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

const SalamanderGame: React.FC<SalamanderProps> = ({ onGameOver, language }) => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [weaponLevel, setWeaponLevel] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAuto, setIsAuto] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const keys = useRef<Record<string, boolean>>({});

  const state = useRef({
    playerX: 60,
    playerY: GAME_HEIGHT / 2,
    playerBullets: [] as Entity[],
    enemyBullets: [] as Entity[],
    enemies: [] as Enemy[],
    powerups: [] as PowerUp[],
    particles: [] as Particle[],
    stars: [] as Star[],
    weapon: 1,
    invuln: 0,
    lastShot: 0,
    lastSpawn: 0,
    bossSpawned: false,
    bossActive: false,
    distance: 0,
    nextId: 1,
  });

  const makeStars = () => {
    const stars: Star[] = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        speed: 0.5 + Math.random() * 2.5,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
    return stars;
  };

  const initGame = (auto: boolean = false) => {
    state.current = {
      playerX: 60,
      playerY: GAME_HEIGHT / 2,
      playerBullets: [],
      enemyBullets: [],
      enemies: [],
      powerups: [],
      particles: [],
      stars: makeStars(),
      weapon: 1,
      invuln: 60,
      lastShot: 0,
      lastSpawn: 0,
      bossSpawned: false,
      bossActive: false,
      distance: 0,
      nextId: 1,
    };
    setScore(0);
    setLives(START_LIVES);
    setWeaponLevel(1);
    setIsPlaying(true);
    setIsAuto(auto);
    soundService.playMove();
  };

  const spawnExplosion = (x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random();
      const speed = 1 + Math.random() * 3;
      state.current.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  };

  const fireBullet = () => {
    const now = Date.now();
    if (now - state.current.lastShot < 130) return;
    state.current.lastShot = now;
    const px = state.current.playerX + PLAYER_WIDTH;
    const py = state.current.playerY + PLAYER_HEIGHT / 2 - 2;
    const w = state.current.weapon;
    // Main straight shot
    state.current.playerBullets.push({ x: px, y: py, width: 12, height: 4 });
    if (w >= 2) {
      // Double shot spacing
      state.current.playerBullets.push({ x: px, y: py - 6, width: 12, height: 4 });
      state.current.playerBullets.push({ x: px, y: py + 6, width: 12, height: 4 });
    }
    if (w >= 3) {
      // Add angled spread (encoded via height field trick? keep simple: separate arrays not needed)
      const up = { x: px, y: py - 4, width: 10, height: 4 } as any;
      up.vy = -2.5;
      const down = { x: px, y: py + 4, width: 10, height: 4 } as any;
      down.vy = 2.5;
      state.current.playerBullets.push(up, down);
    }
    soundService.playShoot();
  };

  const spawnEnemy = () => {
    const s = state.current;
    const roll = Math.random();
    const type: Enemy['type'] = roll < 0.25 ? 'turret' : 'grunt';
    const isTurret = type === 'turret';
    const y = 30 + Math.random() * (GAME_HEIGHT - 90);
    const enemy: Enemy = {
      id: s.nextId++,
      x: GAME_WIDTH + 20,
      y,
      baseY: y,
      width: isTurret ? 26 : 22,
      height: isTurret ? 22 : 18,
      hp: isTurret ? 3 : 1,
      maxHp: isTurret ? 3 : 1,
      vx: isTurret ? -1.2 : -(1.8 + Math.random() * 1.5),
      amp: isTurret ? 0 : 20 + Math.random() * 40,
      phase: Math.random() * Math.PI * 2,
      freq: 0.02 + Math.random() * 0.03,
      type,
      lastShot: Date.now() + Math.random() * 1000,
      dropsPower: Math.random() < 0.22,
    };
    s.enemies.push(enemy);
  };

  const spawnBoss = () => {
    const s = state.current;
    const boss: Enemy = {
      id: s.nextId++,
      x: GAME_WIDTH + 40,
      y: GAME_HEIGHT / 2 - 45,
      baseY: GAME_HEIGHT / 2 - 45,
      width: 70,
      height: 90,
      hp: 60,
      maxHp: 60,
      vx: -1,
      amp: 70,
      phase: 0,
      freq: 0.015,
      type: 'boss',
      lastShot: Date.now(),
      dropsPower: false,
    };
    s.enemies.push(boss);
    s.bossActive = true;
    soundService.playWin();
  };

  const endGame = () => {
    setIsPlaying(false);
    soundService.playExplosion();
    if (!isAuto) {
      onGameOver({ game: 'Salamander', gameId: GameType.SALAMANDER, score });
    } else {
      setIsAuto(false);
    }
  };

  const updateAutoPilot = () => {
    const s = state.current;
    const pCx = s.playerX + PLAYER_WIDTH / 2;
    const pCy = s.playerY + PLAYER_HEIGHT / 2;

    // Dodge nearest incoming enemy bullet
    let danger: Entity | null = null;
    let dMin = 120;
    for (const b of s.enemyBullets) {
      if (b.x > s.playerX && b.x - s.playerX < 140) {
        const dy = (b.y + b.height / 2) - pCy;
        if (Math.abs(dy) < dMin && Math.abs(dy) < 40) {
          dMin = Math.abs(dy);
          danger = b;
        }
      }
    }
    // Also avoid enemies physically
    let targetY = pCy;
    if (danger) {
      targetY = (danger.y + danger.height / 2) > pCy ? pCy - 50 : pCy + 50;
    } else {
      // Aim at nearest enemy ahead
      let best: Enemy | null = null;
      let bestDx = 99999;
      for (const e of s.enemies) {
        const dx = e.x - s.playerX;
        if (dx > -10 && dx < bestDx) { bestDx = dx; best = e; }
      }
      if (best) targetY = best.y + best.height / 2;
    }
    if (targetY < pCy - 4) s.playerY = Math.max(0, s.playerY - PLAYER_SPEED);
    else if (targetY > pCy + 4) s.playerY = Math.min(GAME_HEIGHT - PLAYER_HEIGHT, s.playerY + PLAYER_SPEED);

    // Keep good horizontal position
    if (s.playerX > 90) s.playerX -= PLAYER_SPEED;
    else if (s.playerX < 50) s.playerX += PLAYER_SPEED;

    // Grab nearby powerups
    for (const p of s.powerups) {
      if (Math.abs(p.x - pCx) < 80) {
        const dy = (p.y + p.height / 2) - pCy;
        if (dy < -4) s.playerY = Math.max(0, s.playerY - PLAYER_SPEED);
        else if (dy > 4) s.playerY = Math.min(GAME_HEIGHT - PLAYER_HEIGHT, s.playerY + PLAYER_SPEED);
      }
    }

    fireBullet();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawBackground = () => {
      ctx.fillStyle = '#0a0a18';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.fillStyle = '#ffffff';
      for (const star of state.current.stars) {
        ctx.globalAlpha = star.size === 2 ? 0.9 : 0.5;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
      ctx.globalAlpha = 1;
    };

    const update = () => {
      if (!isPlaying) return;
      const s = state.current;
      s.distance++;

      if (isAuto) updateAutoPilot();
      else {
        if (keys.current['ArrowUp']) s.playerY = Math.max(0, s.playerY - PLAYER_SPEED);
        if (keys.current['ArrowDown']) s.playerY = Math.min(GAME_HEIGHT - PLAYER_HEIGHT, s.playerY + PLAYER_SPEED);
        if (keys.current['ArrowLeft']) s.playerX = Math.max(0, s.playerX - PLAYER_SPEED);
        if (keys.current['ArrowRight']) s.playerX = Math.min(GAME_WIDTH - PLAYER_WIDTH - 60, s.playerX + PLAYER_SPEED);
        if (keys.current['Space']) fireBullet();
      }

      // Stars
      for (const star of s.stars) {
        star.x -= star.speed;
        if (star.x < 0) { star.x = GAME_WIDTH; star.y = Math.random() * GAME_HEIGHT; }
      }

      // Spawning
      if (!s.bossSpawned) {
        const spawnGap = Math.max(28, 70 - Math.floor(s.distance / 200));
        if (s.distance - s.lastSpawn > spawnGap) {
          spawnEnemy();
          s.lastSpawn = s.distance;
        }
        // Boss appears after a stretch
        if (s.distance > 1400) {
          s.bossSpawned = true;
          spawnBoss();
        }
      }

      drawBackground();

      // Update enemies
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        e.x += e.vx;
        if (e.type === 'boss') {
          // Hover on right side
          if (e.x > GAME_WIDTH - e.width - 20) {
            // keep moving in
          } else {
            e.vx = 0;
            e.x = GAME_WIDTH - e.width - 20;
          }
          e.phase += e.freq;
          e.y = e.baseY + Math.sin(e.phase) * e.amp;
        } else {
          e.phase += e.freq;
          e.y = e.baseY + Math.sin(e.phase) * e.amp;
        }

        // Enemy shooting
        const now = Date.now();
        if (e.type !== 'grunt' || Math.random() < 0.3) {
          const interval = e.type === 'boss' ? 600 : 1500;
          if (now - e.lastShot > interval && e.x < GAME_WIDTH) {
            e.lastShot = now;
            const ex = e.x;
            const ey = e.y + e.height / 2;
            // Aim toward player
            const dx = (s.playerX + PLAYER_WIDTH / 2) - ex;
            const dy = (s.playerY + PLAYER_HEIGHT / 2) - ey;
            const dist = Math.hypot(dx, dy) || 1;
            const speed = ENEMY_BULLET_SPEED;
            const bullet: any = { x: ex, y: ey, width: 6, height: 6 };
            bullet.vx = (dx / dist) * speed;
            bullet.vy = (dy / dist) * speed;
            s.enemyBullets.push(bullet);
            if (e.type === 'boss') {
              // Spread shot
              for (const off of [-0.4, 0.4]) {
                const a = Math.atan2(dy, dx) + off;
                s.enemyBullets.push({ x: ex, y: ey, width: 6, height: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed } as any);
              }
            }
          }
        }

        // Off-screen removal
        if (e.x + e.width < -10) {
          s.enemies.splice(i, 1);
        }
      }

      // Update player bullets
      for (let i = s.playerBullets.length - 1; i >= 0; i--) {
        const b: any = s.playerBullets[i];
        b.x += BULLET_SPEED;
        if (b.vy) b.y += b.vy;
        if (b.x > GAME_WIDTH + 10 || b.y < -10 || b.y > GAME_HEIGHT + 10) {
          s.playerBullets.splice(i, 1);
        }
      }

      // Update enemy bullets
      for (let i = s.enemyBullets.length - 1; i >= 0; i--) {
        const b: any = s.enemyBullets[i];
        b.x += b.vx ?? -ENEMY_BULLET_SPEED;
        b.y += b.vy ?? 0;
        if (b.x < -10 || b.x > GAME_WIDTH + 10 || b.y < -10 || b.y > GAME_HEIGHT + 10) {
          s.enemyBullets.splice(i, 1);
        }
      }

      // Update powerups
      for (let i = s.powerups.length - 1; i >= 0; i--) {
        const p = s.powerups[i];
        p.x += p.vx;
        if (p.x + p.width < -10) s.powerups.splice(i, 1);
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // Collisions: player bullets vs enemies
      for (let i = s.playerBullets.length - 1; i >= 0; i--) {
        const b = s.playerBullets[i];
        for (let j = s.enemies.length - 1; j >= 0; j--) {
          const e = s.enemies[j];
          if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
            s.playerBullets.splice(i, 1);
            e.hp -= 1;
            spawnExplosion(b.x, b.y, 4, '#ffcc00');
            if (e.hp <= 0) {
              const points = e.type === 'boss' ? 1000 : (e.type === 'turret' ? 150 : 50);
              setScore(sc => sc + points);
              spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.type === 'boss' ? 30 : 12, '#ff5050');
              soundService.playExplosion();
              if (e.dropsPower) {
                s.powerups.push({ id: s.nextId++, x: e.x, y: e.y, width: 16, height: 16, vx: -1.5 });
              }
              if (e.type === 'boss') {
                // Victory: big score, restart wave
                setScore(sc => sc + 2000);
                s.bossActive = false;
                s.bossSpawned = false;
                s.distance = 0;
                s.lastSpawn = 0;
                soundService.playWin();
              }
              s.enemies.splice(j, 1);
            } else {
              soundService.playScore();
            }
            break;
          }
        }
      }

      // Player rect
      const pr = { x: s.playerX, y: s.playerY, width: PLAYER_WIDTH, height: PLAYER_HEIGHT };

      // Powerup pickup
      for (let i = s.powerups.length - 1; i >= 0; i--) {
        const p = s.powerups[i];
        if (pr.x < p.x + p.width && pr.x + pr.width > p.x && pr.y < p.y + p.height && pr.y + pr.height > p.y) {
          s.powerups.splice(i, 1);
          s.weapon = Math.min(3, s.weapon + 1);
          setWeaponLevel(s.weapon);
          setScore(sc => sc + 30);
          soundService.playWin();
        }
      }

      if (s.invuln > 0) s.invuln--;

      // Hazard collisions (enemy bullets + enemy bodies) vs player
      const hitPlayer = () => {
        if (s.invuln > 0) return false;
        for (let i = s.enemyBullets.length - 1; i >= 0; i--) {
          const b = s.enemyBullets[i];
          if (pr.x < b.x + b.width && pr.x + pr.width > b.x && pr.y < b.y + b.height && pr.y + pr.height > b.y) {
            s.enemyBullets.splice(i, 1);
            return true;
          }
        }
        for (const e of s.enemies) {
          if (pr.x < e.x + e.width && pr.x + pr.width > e.x && pr.y < e.y + e.height && pr.y + pr.height > e.y) {
            return true;
          }
        }
        return false;
      };

      if (hitPlayer()) {
        spawnExplosion(s.playerX + PLAYER_WIDTH / 2, s.playerY + PLAYER_HEIGHT / 2, 20, '#00fff5');
        soundService.playExplosion();
        s.weapon = Math.max(1, s.weapon - 1);
        setWeaponLevel(s.weapon);
        setLives(lv => {
          const nl = lv - 1;
          if (nl <= 0) {
            endGame();
          } else {
            // Respawn
            s.playerX = 60;
            s.playerY = GAME_HEIGHT / 2;
            s.invuln = 90;
            s.enemyBullets = [];
          }
          return nl;
        });
      }

      // ---- DRAW ----
      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      ctx.globalAlpha = 1;

      // Powerups
      for (const p of s.powerups) {
        ctx.fillStyle = '#ffd000';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('P', p.x + 4, p.y + 12);
      }

      // Enemies
      for (const e of s.enemies) {
        if (e.type === 'boss') {
          ctx.fillStyle = '#9b2226';
          ctx.fillRect(e.x, e.y, e.width, e.height);
          ctx.fillStyle = '#e94560';
          ctx.fillRect(e.x - 6, e.y + e.height / 2 - 10, 8, 20);
          // core
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(e.x + 20, e.y + e.height / 2, 9, 0, Math.PI * 2);
          ctx.fill();
          // HP bar
          ctx.fillStyle = '#333';
          ctx.fillRect(e.x, e.y - 8, e.width, 4);
          ctx.fillStyle = '#00ff7f';
          ctx.fillRect(e.x, e.y - 8, e.width * (e.hp / e.maxHp), 4);
        } else if (e.type === 'turret') {
          ctx.fillStyle = '#c77dff';
          ctx.fillRect(e.x, e.y, e.width, e.height);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(e.x + 2, e.y + e.height / 2 - 2, e.width - 8, 4);
        } else {
          ctx.fillStyle = '#e94560';
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width, e.y);
          ctx.lineTo(e.x + e.width, e.y + e.height);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(e.x + e.width - 7, e.y + e.height / 2 - 2, 4, 4);
        }
      }

      // Player bullets
      ctx.fillStyle = '#ffff66';
      for (const b of s.playerBullets) ctx.fillRect(b.x, b.y, b.width, b.height);

      // Enemy bullets
      ctx.fillStyle = '#ff5cf0';
      for (const b of s.enemyBullets) {
        ctx.beginPath();
        ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player ship (blink while invulnerable)
      if (!(s.invuln > 0 && Math.floor(s.distance / 4) % 2 === 0)) {
        ctx.fillStyle = isAuto ? '#ff6b6b' : '#00fff5';
        ctx.beginPath();
        ctx.moveTo(s.playerX, s.playerY);
        ctx.lineTo(s.playerX + PLAYER_WIDTH, s.playerY + PLAYER_HEIGHT / 2);
        ctx.lineTo(s.playerX, s.playerY + PLAYER_HEIGHT);
        ctx.lineTo(s.playerX + 7, s.playerY + PLAYER_HEIGHT / 2);
        ctx.closePath();
        ctx.fill();
        // engine flare
        ctx.fillStyle = '#ffae00';
        ctx.fillRect(s.playerX - 4 - (s.distance % 3), s.playerY + PLAYER_HEIGHT / 2 - 2, 4, 4);
      }

      requestRef.current = requestAnimationFrame(update);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      // Static idle screen
      if (state.current.stars.length === 0) state.current.stars = makeStars();
      drawBackground();
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, score, isAuto]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (isAuto) return;
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isAuto]);

  // Touch/hold helpers for mobile
  const hold = (code: string, down: boolean) => {
    if (isAuto) return;
    keys.current[code] = down;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full max-w-[480px] mb-4 px-2 items-center">
        <div className="font-pixel text-arcade-neon text-sm">SCORE: {score}</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-arcade-primary" title="Lives">
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <Heart key={i} size={14} fill="currentColor" />
            ))}
          </div>
          <div className="text-xs text-yellow-400 font-pixel" title="Weapon">P{weaponLevel}</div>
        </div>
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
        className="bg-gray-900 border-4 border-arcade-secondary rounded shadow-lg max-w-full"
      />

      {!isAuto && (
        <div className="flex gap-6 mt-6 md:hidden items-center select-none">
          <div className="grid grid-cols-3 gap-2">
            <div />
            <button className="p-3 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center"
              onTouchStart={() => hold('ArrowUp', true)} onTouchEnd={() => hold('ArrowUp', false)}><ArrowUp /></button>
            <div />
            <button className="p-3 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center"
              onTouchStart={() => hold('ArrowLeft', true)} onTouchEnd={() => hold('ArrowLeft', false)}><ArrowLeft /></button>
            <button className="p-3 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center"
              onTouchStart={() => hold('ArrowDown', true)} onTouchEnd={() => hold('ArrowDown', false)}><ArrowDown /></button>
            <button className="p-3 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center"
              onTouchStart={() => hold('ArrowRight', true)} onTouchEnd={() => hold('ArrowRight', false)}><ArrowRight /></button>
          </div>
          <button className="p-5 bg-red-600 rounded-full active:bg-red-700 flex justify-center border-b-4 border-red-800"
            onTouchStart={() => hold('Space', true)} onTouchEnd={() => hold('Space', false)}><Crosshair /></button>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500">
        {t('salamanderControls', language)}
      </p>
    </div>
  );
};

export default SalamanderGame;
