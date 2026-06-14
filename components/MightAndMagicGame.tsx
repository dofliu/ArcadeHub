
import React, { useEffect, useRef, useState } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot, Sword, Sparkles, Shield, ArrowUp, ArrowDown, RotateCcw, RotateCw, Heart, Coins, DoorOpen, Skull, Footprints } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface MightProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

// ---- Might & Magic III tribute: first-person grid dungeon crawler ----
const W = 480;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const SCALES = [1, 0.58, 0.336, 0.195, 0.113, 0.066];

// Dungeon map. # wall, . floor, S start, E encounter, T treasure, X exit (boss)
const MAP = [
  '############',
  '#S..E...#.T#',
  '#.#####.#.##',
  '#.#...#.#..#',
  '#.#.#.#.##.#',
  '#...#.E..#.#',
  '#.###.##.#.#',
  '#T..#..#.#.#',
  '##.#.#.#.#.#',
  '#..E.#...EX#',
  '############',
];
const ROWS = MAP.length;
const COLS = MAP[0].length;

// Direction vectors: 0=N,1=E,2=S,3=W
const DIRV = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
const DIR_LABEL = ['N', 'E', 'S', 'W'];

type Phase = 'title' | 'explore' | 'combat' | 'won' | 'lost';

interface Spell { name: string; nameEn: string; cost: number; kind: 'heal' | 'bless' | 'spark' | 'fireball'; }

interface Char {
  name: string;
  cls: string;
  clsEn: string;
  lvl: number;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  atk: number;
  def: number;
  xp: number;
  alive: boolean;
  defending: boolean;
  crit: number; // crit chance 0..1
  steal: boolean;
  spells: Spell[];
}

interface Monster {
  name: string;
  nameEn: string;
  hp: number;
  maxHp: number;
  atk: number;
  xp: number;
  gold: number;
}

interface Combat {
  monsters: Monster[];
  order: number[]; // party indices acting this round
  turn: number;
  round: number;
  bless: number; // party bonus atk this fight
  isBoss: boolean;
  cell: string;
}

interface GState {
  phase: Phase;
  party: Char[];
  pos: { x: number; y: number };
  dir: number;
  gold: number;
  totalXp: number;
  cleared: string[];
  opened: string[];
  visited: string[];
  messages: string[];
  combat: Combat | null;
  bossDown: boolean;
}

const HEAL: Spell = { name: '治療', nameEn: 'Heal', cost: 3, kind: 'heal' };
const BLESS: Spell = { name: '祝福', nameEn: 'Bless', cost: 4, kind: 'bless' };
const SPARK: Spell = { name: '電擊', nameEn: 'Spark', cost: 2, kind: 'spark' };
const FIREBALL: Spell = { name: '火球', nameEn: 'Fireball', cost: 5, kind: 'fireball' };

const makeParty = (): Char[] => [
  { name: '戰士', cls: '戰士', clsEn: 'Knight', lvl: 1, hp: 34, maxHp: 34, sp: 0, maxSp: 0, atk: 9, def: 4, xp: 0, alive: true, defending: false, crit: 0.1, steal: false, spells: [] },
  { name: '牧師', cls: '牧師', clsEn: 'Cleric', lvl: 1, hp: 24, maxHp: 24, sp: 12, maxSp: 12, atk: 5, def: 3, xp: 0, alive: true, defending: false, crit: 0.05, steal: false, spells: [HEAL, BLESS] },
  { name: '法師', cls: '法師', clsEn: 'Sorcerer', lvl: 1, hp: 18, maxHp: 18, sp: 16, maxSp: 16, atk: 4, def: 2, xp: 0, alive: true, defending: false, crit: 0.05, steal: false, spells: [SPARK, FIREBALL] },
  { name: '盜賊', cls: '盜賊', clsEn: 'Robber', lvl: 1, hp: 26, maxHp: 26, sp: 4, maxSp: 4, atk: 7, def: 3, xp: 0, alive: true, defending: false, crit: 0.35, steal: true, spells: [] },
];

const findStart = () => {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (MAP[y][x] === 'S') return { x, y };
    }
  }
  return { x: 1, y: 1 };
};

const isWall = (x: number, y: number) => {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  return MAP[y][x] === '#';
};

const rnd = (n: number) => Math.floor(Math.random() * n);

const newGame = (): GState => ({
  phase: 'explore',
  party: makeParty(),
  pos: findStart(),
  dir: 1,
  gold: 0,
  totalXp: 0,
  cleared: [],
  opened: [],
  visited: [],
  messages: ['你踏入了泰拉群島的地城深處…'],
  combat: null,
  bossDown: false,
});

const pushMsg = (g: GState, m: string) => {
  g.messages = [...g.messages, m].slice(-5);
};

const genMonsters = (danger: number, isBoss: boolean): Monster[] => {
  if (isBoss) {
    return [{ name: '巫妖王', nameEn: 'Lich King', hp: 70, maxHp: 70, atk: 13, xp: 400, gold: 250 }];
  }
  const pool = [
    { name: '哥布林', nameEn: 'Goblin', hp: 8, maxHp: 8, atk: 4, xp: 20, gold: 8 },
    { name: '骷髏兵', nameEn: 'Skeleton', hp: 13, maxHp: 13, atk: 6, xp: 35, gold: 14 },
    { name: '半獸人', nameEn: 'Orc', hp: 18, maxHp: 18, atk: 9, xp: 55, gold: 22 },
  ];
  const count = 2 + Math.min(2, rnd(danger + 1));
  const out: Monster[] = [];
  for (let i = 0; i < count; i++) {
    const maxTier = Math.min(2, Math.floor(danger / 2));
    const tier = rnd(maxTier + 1);
    const base = pool[tier];
    out.push({ ...base, hp: base.hp, maxHp: base.hp });
  }
  return out;
};

const startCombat = (g: GState, isBoss: boolean, cellKey: string) => {
  const danger = g.cleared.length + 1;
  g.combat = {
    monsters: genMonsters(danger, isBoss),
    order: g.party.map((c, i) => (c.alive ? i : -1)).filter(i => i >= 0),
    turn: 0,
    round: 1,
    bless: 0,
    isBoss,
    cell: cellKey,
  };
  g.party.forEach(c => (c.defending = false));
  g.phase = 'combat';
  pushMsg(g, isBoss ? '⚔ 魔王巫妖王擋住了去路！' : '⚔ 遭遇怪物！');
  soundService.playShoot();
};

const enterCell = (g: GState, x: number, y: number) => {
  const key = `${x},${y}`;
  if (!g.visited.includes(key)) g.visited = [...g.visited, key];
  const cell = MAP[y][x];
  if (cell === 'X' && !g.bossDown) {
    startCombat(g, true, key);
  } else if (cell === 'E' && !g.cleared.includes(key)) {
    startCombat(g, false, key);
  } else if (cell === 'T' && !g.opened.includes(key)) {
    g.opened = [...g.opened, key];
    const danger = g.cleared.length + 1;
    const gold = 30 + danger * 15 + rnd(20);
    g.gold += gold;
    let extra = '';
    const roll = Math.random();
    if (roll < 0.4) {
      const c = g.party[rnd(g.party.length)];
      c.atk += 2;
      extra = `，${c.name} 的攻擊力 +2`;
    } else if (roll < 0.7) {
      const c = g.party[rnd(g.party.length)];
      c.def += 1;
      extra = `，${c.name} 的防禦力 +1`;
    }
    pushMsg(g, `💰 寶箱開啟！獲得 ${gold} 金幣${extra}`);
    soundService.playWin();
  }
};

const clone = (g: GState): GState => ({
  ...g,
  party: g.party.map(c => ({ ...c, spells: c.spells })),
  pos: { ...g.pos },
  cleared: [...g.cleared],
  opened: [...g.opened],
  visited: [...g.visited],
  messages: [...g.messages],
  combat: g.combat
    ? { ...g.combat, monsters: g.combat.monsters.map(m => ({ ...m })), order: [...g.combat.order] }
    : null,
});

const firstAlive = (monsters: Monster[]) => monsters.findIndex(m => m.hp > 0);

const levelUp = (g: GState) => {
  g.party.forEach(c => {
    if (!c.alive) return;
    while (c.xp >= c.lvl * 100) {
      c.xp -= c.lvl * 100;
      c.lvl += 1;
      c.maxHp += 6;
      c.hp = c.maxHp;
      c.atk += 2;
      if (c.maxSp > 0) {
        c.maxSp += 3;
        c.sp = c.maxSp;
      }
      pushMsg(g, `⭐ ${c.name} 升到了 ${c.lvl} 級！`);
    }
  });
};

const winCombat = (g: GState) => {
  const c = g.combat!;
  // distribute rewards
  const aliveCount = g.party.filter(p => p.alive).length || 1;
  c.monsters.forEach(m => {
    g.party.forEach(p => { if (p.alive) p.xp += Math.round(m.xp / 1); });
    g.totalXp += m.xp;
    g.gold += m.gold;
  });
  void aliveCount;
  levelUp(g);
  soundService.playWin();
  if (c.isBoss) {
    g.bossDown = true;
    g.phase = 'won';
    pushMsg(g, '🏆 你擊敗了巫妖王，泰拉重歸和平！');
  } else {
    g.cleared = [...g.cleared, c.cell];
    g.phase = 'explore';
    pushMsg(g, '✨ 戰鬥勝利！');
  }
  g.party.forEach(p => (p.defending = false));
  g.combat = null;
};

const monstersTurn = (g: GState) => {
  const c = g.combat!;
  const alive = c.monsters.filter(m => m.hp > 0);
  alive.forEach(m => {
    const targets = g.party.map((p, i) => (p.alive ? i : -1)).filter(i => i >= 0);
    if (targets.length === 0) return;
    const ti = targets[rnd(targets.length)];
    const target = g.party[ti];
    const def = target.def + (target.defending ? 4 : 0);
    const dmg = Math.max(1, m.atk + rnd(4) - def);
    target.hp -= dmg;
    pushMsg(g, `${m.name} 攻擊 ${target.name}，造成 ${dmg} 傷害`);
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      pushMsg(g, `💀 ${target.name} 倒下了！`);
      soundService.playExplosion();
    }
  });
  if (g.party.every(p => !p.alive)) {
    g.phase = 'lost';
    pushMsg(g, '☠ 全隊覆滅…');
    soundService.playExplosion();
    g.combat = null;
    return;
  }
  // next round
  g.party.forEach(p => (p.defending = false));
  c.round += 1;
  c.order = g.party.map((p, i) => (p.alive ? i : -1)).filter(i => i >= 0);
  c.turn = 0;
};

const advanceTurn = (g: GState) => {
  const c = g.combat!;
  if (c.monsters.every(m => m.hp <= 0)) {
    winCombat(g);
    return;
  }
  c.turn += 1;
  if (c.turn >= c.order.length) {
    monstersTurn(g);
  }
};

const MightAndMagicGame: React.FC<MightProps> = ({ onGameOver, language }) => {
  const en = language === 'en';
  const [g, setG] = useState<GState>(() => ({ ...newGame(), phase: 'title' }));
  const [isAuto, setIsAuto] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef(g);
  const reported = useRef(false);
  gRef.current = g;

  const score = g.gold + g.totalXp + (g.bossDown ? 1000 : 0);

  const update = (fn: (draft: GState) => void) => {
    setG(prev => {
      const d = clone(prev);
      fn(d);
      return d;
    });
  };

  // ---------- movement ----------
  const turn = (delta: number) => {
    if (g.phase !== 'explore') return;
    soundService.playMove();
    update(d => { d.dir = (d.dir + delta + 4) % 4; });
  };

  const step = (forward: boolean) => {
    if (g.phase !== 'explore') return;
    update(d => {
      const v = DIRV[d.dir];
      const nx = d.pos.x + (forward ? v.x : -v.x);
      const ny = d.pos.y + (forward ? v.y : -v.y);
      if (isWall(nx, ny)) {
        pushMsg(d, '🧱 前方是牆壁');
        return;
      }
      d.pos = { x: nx, y: ny };
      soundService.playMove();
      enterCell(d, nx, ny);
    });
  };

  // ---------- combat actions ----------
  const doAttack = () => {
    update(d => {
      const c = d.combat!;
      const actor = d.party[c.order[c.turn]];
      const mi = firstAlive(c.monsters);
      if (mi < 0) { advanceTurn(d); return; }
      const m = c.monsters[mi];
      let dmg = actor.atk + c.bless + rnd(5);
      const isCrit = Math.random() < actor.crit;
      if (isCrit) dmg = Math.round(dmg * 1.8);
      m.hp -= dmg;
      pushMsg(d, `${actor.name} ${isCrit ? '暴擊' : '攻擊'} ${m.name}，造成 ${dmg} 傷害`);
      if (actor.steal && Math.random() < 0.5) {
        const g2 = 5 + rnd(10);
        d.gold += g2;
        pushMsg(d, `🪙 ${actor.name} 偷取了 ${g2} 金幣`);
      }
      soundService.playShoot();
      if (m.hp <= 0) { pushMsg(d, `${m.name} 被擊倒！`); soundService.playScore(); }
      advanceTurn(d);
    });
  };

  const doDefend = () => {
    update(d => {
      const c = d.combat!;
      const actor = d.party[c.order[c.turn]];
      actor.defending = true;
      pushMsg(d, `🛡 ${actor.name} 進入防禦姿態`);
      advanceTurn(d);
    });
  };

  const doSpell = (spell: Spell) => {
    update(d => {
      const c = d.combat!;
      const actor = d.party[c.order[c.turn]];
      if (actor.sp < spell.cost) { pushMsg(d, '法力不足！'); return; }
      actor.sp -= spell.cost;
      soundService.playRotate();
      if (spell.kind === 'heal') {
        let lowest = d.party.filter(p => p.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const amt = 12 + actor.lvl * 4;
        lowest.hp = Math.min(lowest.maxHp, lowest.hp + amt);
        pushMsg(d, `✨ ${actor.name} 治療 ${lowest.name} ${amt} 點生命`);
      } else if (spell.kind === 'bless') {
        c.bless += 3;
        pushMsg(d, `🙏 ${actor.name} 施放祝福，全隊攻擊提升`);
      } else if (spell.kind === 'spark') {
        const mi = firstAlive(c.monsters);
        if (mi >= 0) {
          const dmg = 10 + actor.lvl * 2 + rnd(6);
          c.monsters[mi].hp -= dmg;
          pushMsg(d, `⚡ 電擊 ${c.monsters[mi].name}，造成 ${dmg} 傷害`);
          if (c.monsters[mi].hp <= 0) pushMsg(d, `${c.monsters[mi].name} 被擊倒！`);
        }
      } else if (spell.kind === 'fireball') {
        const dmg = 8 + actor.lvl * 2 + rnd(5);
        c.monsters.forEach(m => { if (m.hp > 0) m.hp -= dmg; });
        pushMsg(d, `🔥 火球席捲全場，全體受到 ${dmg} 傷害`);
        soundService.playExplosion();
      }
      advanceTurn(d);
    });
  };

  // ---------- auto demo ----------
  useEffect(() => {
    if (!isAuto) return;
    if (g.phase !== 'explore' && g.phase !== 'combat') return;
    const id = setTimeout(() => {
      const cur = gRef.current;
      if (cur.phase === 'explore') {
        const v = DIRV[cur.dir];
        const ahead = isWall(cur.pos.x + v.x, cur.pos.y + v.y);
        if (!ahead && Math.random() < 0.72) step(true);
        else turn(Math.random() < 0.5 ? 1 : -1);
      } else if (cur.phase === 'combat') {
        const c = cur.combat!;
        const actor = cur.party[c.order[c.turn]];
        const hurt = cur.party.find(p => p.alive && p.hp / p.maxHp < 0.4);
        const healSpell = actor.spells.find(s => s.kind === 'heal');
        const fire = actor.spells.find(s => s.kind === 'fireball');
        if (hurt && healSpell && actor.sp >= healSpell.cost) doSpell(healSpell);
        else if (fire && actor.sp >= fire.cost && c.monsters.filter(m => m.hp > 0).length >= 2) doSpell(fire);
        else doAttack();
      }
    }, 480);
    return () => clearTimeout(id);
  }, [isAuto, g.phase, g.pos.x, g.pos.y, g.dir, g.combat?.turn, g.combat?.round]);

  // ---------- report game over ----------
  useEffect(() => {
    if ((g.phase === 'won' || g.phase === 'lost') && !reported.current) {
      reported.current = true;
      setIsAuto(false);
      const sc = g.gold + g.totalXp + (g.bossDown ? 1000 : 0);
      setTimeout(() => onGameOver({ game: 'Might & Magic III', gameId: GameType.MIGHTMAGIC, score: sc }), 1200);
    }
  }, [g.phase]);

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isAuto) return;
      if (g.phase === 'explore') {
        if (e.key === 'ArrowUp') { e.preventDefault(); step(true); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); step(false); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); turn(1); }
      } else if (g.phase === 'combat') {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); doAttack(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g.phase, g.dir, g.pos.x, g.pos.y, isAuto, g.combat?.turn]);

  // ---------- rendering ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (g.phase === 'combat' && g.combat) {
      drawCombat(ctx, g.combat, isAuto);
    } else if (g.phase === 'explore') {
      drawCorridor(ctx, g.pos, g.dir);
    } else {
      drawIdle(ctx, g.phase, en);
    }
  }, [g.phase, g.pos.x, g.pos.y, g.dir, g.combat, isAuto, en]);

  const restart = () => {
    reported.current = false;
    setG(newGame());
    soundService.playMove();
  };
  const startAuto = () => {
    reported.current = false;
    setG(newGame());
    setIsAuto(true);
  };

  const acting = g.combat ? g.party[g.combat.order[g.combat.turn]] : null;

  return (
    <div className="flex flex-col items-center w-full max-w-[480px]">
      <div className="flex justify-between w-full mb-3 px-1 items-center text-sm">
        <div className="flex items-center gap-3">
          <span className="font-pixel text-arcade-neon">SCORE: {score}</span>
          <span className="flex items-center gap-1 text-yellow-400"><Coins size={14} /> {g.gold}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={startAuto} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
            <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
          </button>
          <button onClick={restart} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
            {g.phase === 'title' ? <Play size={18} /> : <RefreshCw size={18} />}
          </button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="bg-gray-900 border-4 border-arcade-secondary rounded shadow-lg max-w-full"
        />
        {g.phase === 'explore' && (
          <div className="absolute top-2 right-2 bg-black/60 p-1 rounded border border-gray-700">
            <MiniMap g={g} />
            <div className="text-center text-[10px] text-arcade-neon mt-0.5">{DIR_LABEL[g.dir]}</div>
          </div>
        )}
        {(g.phase === 'won' || g.phase === 'lost') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded">
            {g.phase === 'won' ? <DoorOpen size={48} className="text-yellow-400 mb-2" /> : <Skull size={48} className="text-red-500 mb-2" />}
            <div className="font-pixel text-2xl mb-1" style={{ color: g.phase === 'won' ? '#facc15' : '#ef4444' }}>
              {g.phase === 'won' ? (en ? 'VICTORY!' : '通關成功！') : (en ? 'DEFEATED' : '全隊覆滅')}
            </div>
            <div className="text-gray-300 text-sm">SCORE: {score}</div>
          </div>
        )}
      </div>

      {/* Party bar */}
      <div className="grid grid-cols-4 gap-1 w-full mt-3">
        {g.party.map((c, i) => {
          const isActing = !!acting && g.combat?.order[g.combat.turn] === i && g.phase === 'combat';
          return (
            <div key={i} className={`p-1.5 rounded border text-[11px] ${!c.alive ? 'opacity-40 border-gray-700 bg-gray-900' : isActing ? 'border-arcade-neon bg-arcade-neon/10 shadow-[0_0_10px_rgba(0,255,245,0.4)]' : 'border-gray-700 bg-gray-800'}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-white truncate">{en ? c.clsEn : c.cls}</span>
                <span className="text-gray-400">Lv{c.lvl}</span>
              </div>
              <Bar value={c.hp} max={c.maxHp} color="bg-red-500" icon={<Heart size={9} />} />
              {c.maxSp > 0 && <Bar value={c.sp} max={c.maxSp} color="bg-blue-500" icon={<Sparkles size={9} />} />}
            </div>
          );
        })}
      </div>

      {/* Action area */}
      {g.phase === 'combat' && acting && (
        <div className="w-full mt-3 bg-arcade-secondary/60 border border-gray-700 rounded p-2">
          {/* monsters */}
          <div className="flex flex-wrap gap-2 mb-2 justify-center">
            {g.combat!.monsters.map((m, i) => (
              <div key={i} className={`text-[11px] px-2 py-1 rounded border ${m.hp <= 0 ? 'opacity-30 border-gray-700' : 'border-red-500/60 bg-red-900/20'}`}>
                <div className="text-red-300 font-bold">{en ? m.nameEn : m.name}</div>
                <div className="w-16"><Bar value={Math.max(0, m.hp)} max={m.maxHp} color="bg-red-600" /></div>
              </div>
            ))}
          </div>
          {!isAuto && (
            <>
              <div className="text-center text-xs text-arcade-neon mb-1">
                {en ? `${acting.clsEn}'s turn` : `輪到 ${acting.cls} 行動`}
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                <ActBtn onClick={doAttack} icon={<Sword size={14} />} label={en ? 'Attack' : '攻擊'} />
                <ActBtn onClick={doDefend} icon={<Shield size={14} />} label={en ? 'Defend' : '防禦'} />
                {acting.spells.map((s, i) => (
                  <ActBtn
                    key={i}
                    onClick={() => doSpell(s)}
                    disabled={acting.sp < s.cost}
                    icon={<Sparkles size={14} />}
                    label={`${en ? s.nameEn : s.name} (${s.cost})`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Explore controls (mobile + desktop) */}
      {g.phase === 'explore' && !isAuto && (
        <div className="grid grid-cols-3 gap-2 mt-3 w-48">
          <div />
          <CtrlBtn onClick={() => step(true)} icon={<ArrowUp />} />
          <div />
          <CtrlBtn onClick={() => turn(-1)} icon={<RotateCcw />} />
          <CtrlBtn onClick={() => step(false)} icon={<ArrowDown />} />
          <CtrlBtn onClick={() => turn(1)} icon={<RotateCw />} />
        </div>
      )}

      {g.phase === 'title' && (
        <div className="mt-4 text-center text-gray-400 text-sm max-w-sm">
          <Footprints className="inline mb-1 text-arcade-neon" />
          <p>{en ? 'Lead a party of four through the dungeon, fight monsters, grab treasure, and defeat the Lich King.' : '率領四人小隊深入地城，擊敗怪物、搜刮寶藏，最終討伐巫妖王！'}</p>
        </div>
      )}

      {/* Message log */}
      <div className="w-full mt-3 bg-black/40 border border-gray-800 rounded p-2 h-20 overflow-hidden text-[11px] text-gray-300 leading-snug">
        {g.messages.map((m, i) => (
          <div key={i} className={i === g.messages.length - 1 ? 'text-white' : 'text-gray-500'}>{m}</div>
        ))}
      </div>

      <p className="mt-3 text-sm text-gray-500">{t('mightMagicControls', language)}</p>
    </div>
  );
};

// ---------- small UI helpers ----------
const Bar: React.FC<{ value: number; max: number; color: string; icon?: React.ReactNode }> = ({ value, max, color, icon }) => (
  <div className="flex items-center gap-1 mt-0.5">
    {icon}
    <div className="flex-1 h-1.5 bg-gray-900 rounded overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${max > 0 ? Math.max(0, (value / max) * 100) : 0}%` }} />
    </div>
  </div>
);

const ActBtn: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }> = ({ onClick, icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-arcade-accent hover:bg-arcade-primary disabled:opacity-40 disabled:hover:bg-arcade-accent transition border border-gray-600"
  >
    {icon} {label}
  </button>
);

const CtrlBtn: React.FC<{ onClick: () => void; icon: React.ReactNode }> = ({ onClick, icon }) => (
  <button onClick={onClick} className="p-3 bg-arcade-secondary rounded-lg active:bg-arcade-primary flex justify-center hover:bg-arcade-accent transition">
    {icon}
  </button>
);

const MiniMap: React.FC<{ g: GState }> = ({ g }) => {
  const cell = 9;
  return (
    <svg width={COLS * cell} height={ROWS * cell}>
      {MAP.map((row, y) =>
        row.split('').map((ch, x) => {
          const key = `${x},${y}`;
          const visited = g.visited.includes(key);
          let fill = '#111827';
          if (ch === '#') fill = '#374151';
          else if (visited) fill = '#1f2937';
          if (visited && ch === 'X') fill = '#ca8a04';
          if (visited && ch === 'T' && !g.opened.includes(key)) fill = '#a16207';
          return <rect key={key} x={x * cell} y={y * cell} width={cell - 1} height={cell - 1} fill={fill} />;
        })
      )}
      <rect x={g.pos.x * cell + 1} y={g.pos.y * cell + 1} width={cell - 3} height={cell - 3} fill="#00fff5" />
    </svg>
  );
};

// ---------- canvas drawing ----------
function opening(d: number) {
  const s = SCALES[d];
  const hw = (W / 2) * s;
  const hh = (H / 2) * s;
  return { l: CX - hw, r: CX + hw, t: CY - hh, b: CY + hh };
}

function quad(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

function drawCorridor(ctx: CanvasRenderingContext2D, pos: { x: number; y: number }, dir: number) {
  // ceiling / floor
  ctx.fillStyle = '#0b0b16';
  ctx.fillRect(0, 0, W, H / 2);
  ctx.fillStyle = '#23232f';
  ctx.fillRect(0, H / 2, W, H / 2);

  const fwd = DIRV[dir];
  const left = DIRV[(dir + 3) % 4];
  const right = DIRV[(dir + 1) % 4];
  let cx = pos.x;
  let cy = pos.y;
  const maxDepth = 4;
  for (let s = 0; s <= maxDepth; s++) {
    const near = opening(s);
    const far = opening(s + 1);
    const sideShade = Math.max(20, 70 - s * 14);
    const frontShade = Math.max(28, 95 - s * 16);
    const sideColor = `rgb(${sideShade},${sideShade},${sideShade + 12})`;
    const frontColor = `rgb(${frontShade},${frontShade},${frontShade + 14})`;

    if (isWall(cx + left.x, cy + left.y)) {
      quad(ctx, near.l, near.t, far.l, far.t, far.l, far.b, near.l, near.b, sideColor);
    }
    if (isWall(cx + right.x, cy + right.y)) {
      quad(ctx, near.r, near.t, far.r, far.t, far.r, far.b, near.r, near.b, sideColor);
    }
    if (isWall(cx + fwd.x, cy + fwd.y)) {
      ctx.fillStyle = frontColor;
      ctx.fillRect(far.l, far.t, far.r - far.l, far.b - far.t);
      // mark special cells on the wall face ahead
      break;
    }
    // hint markers on floor for special cells ahead
    const fcell = MAP[cy + fwd.y]?.[cx + fwd.x];
    if (fcell === 'X') { ctx.fillStyle = '#facc15'; ctx.fillRect(far.l, far.b - 6, far.r - far.l, 5); }
    else if (fcell === 'T') { ctx.fillStyle = '#a16207'; ctx.fillRect(far.l, far.b - 6, far.r - far.l, 5); }
    else if (fcell === 'E') { ctx.fillStyle = '#7f1d1d'; ctx.fillRect(far.l, far.b - 6, far.r - far.l, 5); }
    cx += fwd.x;
    cy += fwd.y;
  }
}

function drawCombat(ctx: CanvasRenderingContext2D, c: Combat, isAuto: boolean) {
  // cave background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a0a14');
  grad.addColorStop(1, '#05050a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const alive = c.monsters.filter(m => m.hp > 0);
  const n = c.monsters.length;
  c.monsters.forEach((m, i) => {
    const spread = W / (n + 1);
    const mx = spread * (i + 1);
    const my = H / 2 - 10;
    const dead = m.hp <= 0;
    ctx.globalAlpha = dead ? 0.2 : 1;
    if (c.isBoss) {
      // big lich
      ctx.fillStyle = '#6b21a8';
      ctx.fillRect(mx - 45, my - 50, 90, 110);
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.arc(mx - 18, my - 15, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 18, my - 15, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(mx - 6, my + 70, 12, 30);
    } else {
      const colors = ['#16a34a', '#cbd5e1', '#ea580c'];
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.ellipse(mx, my, 26, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(mx - 9, my - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 9, my - 6, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = isAuto ? '#ff6b6b' : '#00fff5';
  ctx.font = '12px monospace';
  ctx.fillText(isAuto ? 'AUTO BATTLE' : `ROUND ${c.round}`, 10, 20);
  void alive;
}

function drawIdle(ctx: CanvasRenderingContext2D, phase: Phase, en: boolean) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#11111d');
  grad.addColorStop(1, '#05050a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(en ? 'MIGHT & MAGIC III' : '魔 法 門 III', CX, CY - 10);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px monospace';
  ctx.fillText(en ? 'Isles of Terra — press Play' : '泰拉群島 — 按下開始', CX, CY + 24);
  ctx.textAlign = 'start';
  void phase;
}

export default MightAndMagicGame;
