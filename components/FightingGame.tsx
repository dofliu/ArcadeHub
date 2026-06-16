import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameResult, GameType, Language } from '../types';
import { soundService } from '../services/soundService';
import { t } from '../i18n';
import { CHARACTERS } from './fighting/characters';
import {
  GameState, PlayerInput, createGame, stepGame, emptyInput, WORLD_W, WORLD_H,
} from './fighting/engine';
import { render, drawPortrait } from './fighting/render';
import { Play, RefreshCw, Users, Bot, Swords, ChevronLeft } from 'lucide-react';

interface FightingProps {
  onGameOver: (result: GameResult) => void;
  language: Language;
}

type Screen = 'select' | 'fight' | 'result';
type Mode = 'cpu' | '2p';

const STEP = 1000 / 60;

// Keyboard layout: P1 on the left of the board, P2 on the right.
const P1_KEYS = {
  up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  lp: ['KeyF'], hp: ['KeyG'], lk: ['KeyV'], hk: ['KeyB'],
};
const P2_KEYS = {
  up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
  lp: ['Comma', 'Numpad1'], hp: ['Period', 'Numpad2'], lk: ['Slash', 'Numpad4'], hk: ['ShiftRight', 'Numpad5'],
};
type KeyMap = typeof P1_KEYS;
const ALL_CODES = [
  ...Object.values(P1_KEYS).flat(), ...Object.values(P2_KEYS).flat(),
];

const FightingGame: React.FC<FightingProps> = ({ onGameOver, language }) => {
  const isZh = language === 'zh';
  const [screen, setScreen] = useState<Screen>('select');
  const [mode, setMode] = useState<Mode>('cpu');
  const [difficulty, setDifficulty] = useState<0 | 1 | 2>(1);
  const [p1Char, setP1Char] = useState(CHARACTERS[0].id);
  const [p2Char, setP2Char] = useState(CHARACTERS[1].id);
  const [resultText, setResultText] = useState('');
  const [paused, setPaused] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const keys = useRef<Record<string, boolean>>({});
  const prevP1 = useRef<Record<string, boolean>>({});
  const prevP2 = useRef<Record<string, boolean>>({});
  const endedRef = useRef(false);
  const prevHitstop = useRef(0);
  const prevProjCount = useRef(0);
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  // --- Input helpers -------------------------------------------------------
  const readInput = (map: KeyMap, prev: Record<string, boolean>): PlayerInput => {
    const k = keys.current;
    const on = (codes: string[]) => codes.some(c => k[c]);
    const cur = {
      up: on(map.up), down: on(map.down), left: on(map.left), right: on(map.right),
      lp: on(map.lp), hp: on(map.hp), lk: on(map.lk), hk: on(map.hk),
    };
    const input: PlayerInput = {
      ...cur,
      lpP: cur.lp && !prev.lp, hpP: cur.hp && !prev.hp,
      lkP: cur.lk && !prev.lk, hkP: cur.hk && !prev.hk,
    };
    prev.lp = cur.lp; prev.hp = cur.hp; prev.lk = cur.lk; prev.hk = cur.hk;
    return input;
  };

  // --- Sound hooks ---------------------------------------------------------
  const handleSfx = (gs: GameState) => {
    // Hit / block impacts (detected on hitstop rising edge).
    if (gs.hitstop > prevHitstop.current && gs.hitstop > 0) {
      const last = gs.sparks[gs.sparks.length - 1];
      if (last?.kind === 'block') soundService.playTone(320, 'square', 0.05, 0.06);
      else if (last?.kind === 'super') { soundService.playExplosion(); soundService.playTone(120, 'sawtooth', 0.25, 0.12); }
      else soundService.playTone(150, 'square', 0.08, 0.13);
    }
    prevHitstop.current = gs.hitstop;
    // Projectile launches.
    if (gs.projectiles.length > prevProjCount.current) {
      const np = gs.projectiles[gs.projectiles.length - 1];
      if (np?.spec.super) soundService.playWin();
      else soundService.playShoot();
    }
    prevProjCount.current = gs.projectiles.length;
  };

  // --- Game loop -----------------------------------------------------------
  const startMatch = useCallback(() => {
    const vsAI = mode === 'cpu';
    gsRef.current = createGame(p1Char, vsAI ? p2Char : p2Char, vsAI, difficulty);
    endedRef.current = false;
    prevHitstop.current = 0;
    prevProjCount.current = 0;
    prevP1.current = {}; prevP2.current = {};
    setPaused(false);
    setScreen('fight');
    soundService.playMove();
  }, [mode, p1Char, p2Char, difficulty]);

  useEffect(() => {
    if (screen !== 'fight') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      const gs = gsRef.current;
      if (!gs) return;
      if (pausedRef.current) { last = now; return; }
      acc += now - last;
      last = now;
      if (acc > 200) acc = 200;
      while (acc >= STEP) {
        const i1 = readInput(P1_KEYS, prevP1.current);
        const i2 = mode === 'cpu' ? emptyInput() : readInput(P2_KEYS, prevP2.current);
        stepGame(gs, [i1, i2]);
        handleSfx(gs);
        acc -= STEP;
        if (gs.phase === 'matchend' && !endedRef.current) {
          endedRef.current = true;
          finishMatch(gs);
        }
      }
      render(ctx, gs);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, mode]);

  const finishMatch = (gs: GameState) => {
    const p1 = gs.fighters[0];
    const win = gs.matchWinner === 0;
    const score = p1.wins * 1000 + Math.round(p1.health) + p1.bestCombo * 50;
    if (mode === 'cpu') {
      setResultText(win
        ? (isZh ? '你贏了！' : 'YOU WIN!')
        : (isZh ? '你輸了…' : 'YOU LOSE…'));
      onGameOver({ game: 'Street Fighter', gameId: GameType.FIGHTING, score });
    } else {
      setResultText(gs.matchWinner === 0
        ? (isZh ? '玩家 1 獲勝！' : 'PLAYER 1 WINS!')
        : (isZh ? '玩家 2 獲勝！' : 'PLAYER 2 WINS!'));
      onGameOver({ game: 'Street Fighter', gameId: GameType.FIGHTING, score });
    }
    setTimeout(() => setScreen('result'), 1500);
  };

  // --- Keyboard listeners --------------------------------------------------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (ALL_CODES.includes(e.code)) { e.preventDefault(); keys.current[e.code] = true; }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screen === 'fight') setPaused(p => !p);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (ALL_CODES.includes(e.code)) keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [screen]);

  // --- Touch controls (P1) -------------------------------------------------
  const hold = (codes: string[], v: boolean) => codes.forEach(c => { keys.current[c] = v; });

  // ========================================================================
  // SELECT SCREEN
  // ========================================================================
  if (screen === 'select') {
    return (
      <SelectScreen
        isZh={isZh} mode={mode} setMode={setMode} difficulty={difficulty}
        setDifficulty={setDifficulty} p1Char={p1Char} setP1Char={setP1Char}
        p2Char={p2Char} setP2Char={setP2Char} onStart={startMatch}
      />
    );
  }

  // ========================================================================
  // FIGHT / RESULT
  // ========================================================================
  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-[900px]">
        <canvas
          ref={canvasRef}
          width={WORLD_W}
          height={WORLD_H}
          className="bg-black border-4 border-arcade-secondary rounded shadow-lg w-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {paused && screen === 'fight' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
            <div className="font-pixel text-3xl text-arcade-neon">{isZh ? '暫停' : 'PAUSED'}</div>
            <button onClick={() => setPaused(false)} className="bg-arcade-primary px-6 py-2 rounded font-pixel">
              {isZh ? '繼續' : 'RESUME'}
            </button>
            <button onClick={() => { cancelAnimationFrame(rafRef.current); setScreen('select'); }}
              className="text-gray-300 hover:text-white text-sm">
              {isZh ? '回到選角' : 'Back to Select'}
            </button>
          </div>
        )}

        {screen === 'result' && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-5">
            <div className="font-pixel text-4xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-arcade-primary">
              {resultText}
            </div>
            <div className="flex gap-3">
              <button onClick={startMatch}
                className="flex items-center gap-2 bg-arcade-primary hover:bg-red-600 px-5 py-2 rounded font-pixel">
                <RefreshCw size={18} /> {isZh ? '再戰' : 'REMATCH'}
              </button>
              <button onClick={() => setScreen('select')}
                className="flex items-center gap-2 bg-arcade-secondary hover:bg-gray-700 px-5 py-2 rounded font-pixel border border-arcade-neon/40">
                <Swords size={18} /> {isZh ? '換角色' : 'CHANGE'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch controls for P1 on small screens */}
      <div className="flex md:hidden justify-between w-full max-w-[900px] mt-4 select-none gap-2">
        <div className="grid grid-cols-3 gap-1">
          <div />
          <TouchBtn label="↑" onDown={() => hold(P1_KEYS.up, true)} onUp={() => hold(P1_KEYS.up, false)} />
          <div />
          <TouchBtn label="←" onDown={() => hold(P1_KEYS.left, true)} onUp={() => hold(P1_KEYS.left, false)} />
          <TouchBtn label="↓" onDown={() => hold(P1_KEYS.down, true)} onUp={() => hold(P1_KEYS.down, false)} />
          <TouchBtn label="→" onDown={() => hold(P1_KEYS.right, true)} onUp={() => hold(P1_KEYS.right, false)} />
        </div>
        <div className="grid grid-cols-2 gap-1">
          <TouchBtn label="LP" onDown={() => hold(P1_KEYS.lp, true)} onUp={() => hold(P1_KEYS.lp, false)} accent />
          <TouchBtn label="HP" onDown={() => hold(P1_KEYS.hp, true)} onUp={() => hold(P1_KEYS.hp, false)} accent />
          <TouchBtn label="LK" onDown={() => hold(P1_KEYS.lk, true)} onUp={() => hold(P1_KEYS.lk, false)} accent />
          <TouchBtn label="HK" onDown={() => hold(P1_KEYS.hk, true)} onUp={() => hold(P1_KEYS.hk, false)} accent />
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400 text-center max-w-[900px] leading-relaxed">
        <p className="text-arcade-neon font-bold mb-1">{isZh ? '招式指令（面向對手）' : 'Move Commands (facing opponent)'}</p>
        <p>{isZh
          ? '波動拳 ↓ ↘ → + 拳　｜　昇龍拳 → ↓ ↘ + 拳　｜　旋風腿 ↓ ↙ ← + 腳　｜　超必殺 ↓↘→↓↘→ + 拳（需集滿能量）'
          : 'Fireball ↓ ↘ → + P  |  Dragon → ↓ ↘ + P  |  Cyclone ↓ ↙ ← + K  |  Super ↓↘→↓↘→ + P (full meter)'}</p>
      </div>
    </div>
  );
};

// ---- Touch button -------------------------------------------------------
const TouchBtn: React.FC<{ label: string; onDown: () => void; onUp: () => void; accent?: boolean }> =
  ({ label, onDown, onUp, accent }) => (
    <button
      className={`w-14 h-14 rounded-lg font-bold text-sm flex items-center justify-center active:scale-95 transition ${
        accent ? 'bg-arcade-primary/80 active:bg-arcade-primary' : 'bg-arcade-secondary active:bg-gray-700'}`}
      onTouchStart={(e) => { e.preventDefault(); onDown(); }}
      onTouchEnd={(e) => { e.preventDefault(); onUp(); }}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    >{label}</button>
  );

// ---- Character select screen -------------------------------------------
const SelectScreen: React.FC<{
  isZh: boolean; mode: Mode; setMode: (m: Mode) => void;
  difficulty: 0 | 1 | 2; setDifficulty: (d: 0 | 1 | 2) => void;
  p1Char: string; setP1Char: (id: string) => void;
  p2Char: string; setP2Char: (id: string) => void;
  onStart: () => void;
}> = ({ isZh, mode, setMode, difficulty, setDifficulty, p1Char, setP1Char, p2Char, setP2Char, onStart }) => {
  const [side, setSide] = useState<0 | 1>(0); // which side the click assigns to
  const diffLabels = isZh ? ['簡單', '普通', '困難'] : ['EASY', 'NORMAL', 'HARD'];

  const pick = (id: string) => {
    if (side === 0) { setP1Char(id); setSide(1); }
    else { setP2Char(id); setSide(0); }
    soundService.playMove();
  };

  return (
    <div className="w-full max-w-[900px] flex flex-col items-center gap-5">
      <h2 className="font-pixel text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-arcade-primary">
        {isZh ? '選擇你的鬥士' : 'SELECT YOUR FIGHTER'}
      </h2>

      {/* Mode + difficulty */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={() => setMode('cpu')}
          className={`flex items-center gap-2 px-4 py-2 rounded font-pixel text-sm border ${
            mode === 'cpu' ? 'bg-arcade-primary border-arcade-primary' : 'bg-arcade-secondary border-gray-600'}`}>
          <Bot size={16} /> {isZh ? '單人對電腦' : '1P vs CPU'}
        </button>
        <button onClick={() => setMode('2p')}
          className={`flex items-center gap-2 px-4 py-2 rounded font-pixel text-sm border ${
            mode === '2p' ? 'bg-arcade-primary border-arcade-primary' : 'bg-arcade-secondary border-gray-600'}`}>
          <Users size={16} /> {isZh ? '雙人對戰' : '2 PLAYERS'}
        </button>
        {mode === 'cpu' && (
          <div className="flex items-center gap-1 ml-2">
            {([0, 1, 2] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`px-3 py-2 rounded text-xs font-pixel border ${
                  difficulty === d ? 'bg-arcade-neon text-black border-arcade-neon' : 'bg-arcade-secondary border-gray-600'}`}>
                {diffLabels[d]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current picks */}
      <div className="flex items-center justify-center gap-6 w-full">
        <PickSlot isZh={isZh} label={isZh ? '玩家 1' : 'PLAYER 1'} charId={p1Char} active={side === 0} onClick={() => setSide(0)} />
        <div className="font-pixel text-arcade-primary text-xl">VS</div>
        <PickSlot isZh={isZh} label={mode === 'cpu' ? (isZh ? '電腦' : 'CPU') : (isZh ? '玩家 2' : 'PLAYER 2')}
          charId={p2Char} active={side === 1} onClick={() => setSide(1)} />
      </div>

      {/* Roster */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {CHARACTERS.map(c => (
          <CharCard key={c.id} charId={c.id} onPick={() => pick(c.id)}
            selected={c.id === p1Char || c.id === p2Char} />
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">
        {isZh ? '點角色卡輪流指定給玩家1／對手。' : 'Click a card to assign to P1 / opponent in turn.'}
      </p>

      <button onClick={onStart}
        className="flex items-center gap-2 bg-arcade-primary hover:bg-red-600 px-8 py-3 rounded-lg font-pixel text-lg shadow-lg">
        <Play size={20} /> {isZh ? '開始對戰' : 'FIGHT!'}
      </button>
    </div>
  );
};

const PickSlot: React.FC<{ isZh: boolean; label: string; charId: string; active: boolean; onClick: () => void }> =
  ({ label, charId, active, onClick }) => {
    const c = CHARACTERS.find(x => x.id === charId)!;
    return (
      <button onClick={onClick}
        className={`flex flex-col items-center p-2 rounded-lg border-2 transition ${
          active ? 'border-arcade-neon shadow-[0_0_15px_rgba(0,255,245,0.4)]' : 'border-gray-700'}`}>
        <span className="text-xs text-gray-400">{label}</span>
        <Portrait charId={charId} size={88} />
        <span className="font-pixel text-sm" style={{ color: c.palette.accent }}>{c.name}</span>
      </button>
    );
  };

const CharCard: React.FC<{ charId: string; onPick: () => void; selected: boolean }> =
  ({ charId, onPick, selected }) => {
    const c = CHARACTERS.find(x => x.id === charId)!;
    return (
      <button onClick={onPick}
        className={`group bg-gray-900 rounded-lg p-3 border flex flex-col items-center gap-1 hover:-translate-y-1 transition ${
          selected ? 'border-arcade-primary' : 'border-gray-700'}`}>
        <Portrait charId={charId} size={96} />
        <span className="font-pixel text-sm" style={{ color: c.palette.accent }}>{c.name}</span>
        <span className="text-[10px] text-gray-400 text-center leading-tight">{c.title}</span>
      </button>
    );
  };

// Small animated idle portrait of a character.
const Portrait: React.FC<{ charId: string; size: number }> = ({ charId, size }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const c = CHARACTERS.find(x => x.id === charId)!;
    let raf = 0;
    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPortrait(ctx, c, canvas.width / 2, canvas.height - 4, canvas.height / 175, frame);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [charId]);
  return <canvas ref={ref} width={size} height={Math.round(size * 1.4)} />;
};

export default FightingGame;
