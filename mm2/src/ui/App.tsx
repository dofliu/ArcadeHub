import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState } from '../types';
import * as E from '../engine';
import { mapMap, questMap } from '../data/content';
import { drawDungeon, drawOverworld, drawCombat, drawTitle, drawFx, CW, CH } from '../render';
import { soundService, Sfx } from '../sound';
import { Btn, Panel, PartyPanel } from './common';
import {
  CreateScreen, TownScreen, ShopScreen, DialogScreen, CombatPanel, SheetScreen, QuestLogScreen, HireScreen, TrainScreen, SavesScreen,
} from './screens';
import {
  ArrowUp, ArrowDown, RotateCcw, RotateCw, ArrowLeft, ArrowRight, Save, FolderOpen,
  Coins, CalendarDays, Backpack, Skull, Trophy, ScrollText, Volume2, VolumeX, MonitorCog,
} from 'lucide-react';

const DIRV = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];

export const App: React.FC = () => {
  const [g, setG] = useState<GameState>(() => E.newGame());
  const [sheetActive, setSheetActive] = useState(0);
  const [soundOn, setSoundOn] = useState(() => E.loadSettings()?.sound ?? true);
  const [vga, setVga] = useState(() => E.loadSettings()?.vga ?? true);
  const vgaRef = useRef(vga);
  vgaRef.current = vga;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // remember display/sound preferences
  useEffect(() => { soundService.setEnabled(soundOn); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { E.saveSettings({ vga, sound: soundOn }); }, [vga, soundOn]);

  const apply = useCallback((fn: (d: GameState) => void) => {
    setG(prev => { const d = E.clone(prev); fn(d); return d; });
  }, []);

  // ----- flush queued sound effects from the engine -----
  useEffect(() => {
    if (g.sfx.length === 0) return;
    for (const s of g.sfx) soundService.play(s as Sfx);
    apply(d => { d.sfx = []; });
  }, [g.sfx, apply]);

  const toggleSound = useCallback(() => {
    setSoundOn(v => {
      const nv = !v;
      soundService.setEnabled(nv);
      if (nv) soundService.play('select');
      return nv;
    });
  }, []);

  // ----- movement -----
  const move = useCallback((forward: boolean) => {
    apply(d => {
      if (d.screen === 'dungeon') {
        const v = DIRV[d.pos.dir];
        E.tryStep(d, d.pos.x + (forward ? v.x : -v.x), d.pos.y + (forward ? v.y : -v.y));
      }
    });
  }, [apply]);

  const turn = useCallback((delta: number) => {
    soundService.play('turn');
    apply(d => { if (d.screen === 'dungeon') E.turnDir(d, delta); });
  }, [apply]);

  const moveOver = useCallback((dir: number) => {
    apply(d => {
      if (d.screen === 'overworld') {
        d.pos.dir = dir as 0 | 1 | 2 | 3;
        const v = DIRV[dir];
        E.tryStep(d, d.pos.x + v.x, d.pos.y + v.y);
      }
    });
  }, [apply]);

  // ----- keyboard -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (g.screen === 'dungeon') {
        if (e.key === 'ArrowUp') { e.preventDefault(); move(true); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); move(false); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); turn(1); }
      } else if (g.screen === 'overworld') {
        const map: Record<string, number> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
        if (e.key in map) { e.preventDefault(); moveOver(map[e.key]); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g.screen, move, turn, moveOver]);

  // ----- canvas -----
  const gRef = useRef(g);
  gRef.current = g;
  const fxRef = useRef<{ kind: string; side: string; idx: number; element?: string; start: number }[]>([]);
  const rafRef = useRef(0);
  const FX_DUR = 380;

  // Ambient animation loop: keeps torches flickering (and combat FX playing)
  // while in the dungeon or combat. Throttled to ~30fps; self-stops elsewhere.
  const lastDrawRef = useRef(0);
  const runAmbient = useCallback(() => {
    if (rafRef.current) return;
    const step = (ts: number) => {
      const cv = canvasRef.current;
      const cur = gRef.current;
      if (!cv || (cur.screen !== 'combat' && cur.screen !== 'dungeon')) { rafRef.current = 0; fxRef.current = []; return; }
      const ctx = cv.getContext('2d');
      if (!ctx) { rafRef.current = 0; return; }
      if (ts - lastDrawRef.current >= 33) {
        lastDrawRef.current = ts;
        const now = performance.now();
        fxRef.current = fxRef.current.filter(e => now - e.start < FX_DUR);
        if (cur.screen === 'combat') {
          const active = fxRef.current.map(e => ({ ...e, age: (now - e.start) / FX_DUR }));
          drawCombat(ctx, cur, vgaRef.current, active);
          drawFx(ctx, cur, active);
        } else {
          drawDungeon(ctx, cur, vgaRef.current);
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    if (g.screen === 'combat') drawCombat(ctx, g, vga);
    else if (g.screen === 'dungeon') drawDungeon(ctx, g, vga);
    else if (g.screen === 'overworld') drawOverworld(ctx, g, vga);
    else drawTitle(ctx);
    if (g.screen === 'combat' || g.screen === 'dungeon') runAmbient();
  }, [g, vga, runAmbient]);

  // flush queued combat FX -> animate
  useEffect(() => {
    if (g.fx.length === 0) return;
    const now = performance.now();
    for (const f of g.fx) fxRef.current.push({ ...f, start: now });
    apply(d => { d.fx = []; });
    runAmbient();
  }, [g.fx, apply, runAmbient]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const showCanvas = ['title', 'overworld', 'dungeon', 'combat', 'victory', 'gameover'].includes(g.screen);
  const isExplore = g.screen === 'overworld' || g.screen === 'dungeon';
  const orbDone = g.flags['orb_returned'];

  // victory screen trigger: orb returned and back in town -> show banner via flag (kept simple)
  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-6">
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center gap-3 mb-3">
        <h1 className="font-rune text-lg md:text-xl text-mm-gold">魔法門 II · 克朗大陸</h1>
        {g.party.length > 0 && (
          <div className="flex items-center gap-3 text-sm ml-2">
            <span className="flex items-center gap-1 text-mm-gold"><Coins size={14} />{g.gold}</span>
            <span className="flex items-center gap-1 text-mm-light/60"><CalendarDays size={14} />第{g.day}天</span>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <Btn onClick={toggleSound} title={soundOn ? '靜音' : '開啟音效'}>{soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}</Btn>
          <Btn onClick={() => setVga(v => !v)} title="切換畫面模式 VGA/EGA"><MonitorCog size={16} /><span className="ml-1 text-[10px]">{vga ? 'VGA' : 'EGA'}</span></Btn>
          {g.party.length > 0 && g.screen !== 'create' && (
            <>
              <Btn onClick={() => apply(d => { d.screen = 'quests'; })} title="任務日誌"><ScrollText size={16} /></Btn>
              <Btn onClick={() => { setSheetActive(0); apply(d => { d.screen = 'sheet'; }); }} title="角色與背包"><Backpack size={16} /></Btn>
              <Btn onClick={() => apply(d => { d.screen = 'saves'; })} title="存讀檔"><Save size={16} /></Btn>
            </>
          )}
        </div>
      </header>

      {/* Toasts */}
      {g.messages.length > 0 && (
        <div className="w-full max-w-4xl mb-2 space-y-1">
          {g.messages.map((m, i) => (
            <div key={i} className="text-center text-sm text-mm-gold bg-mm-panel/80 border border-mm-gold/30 rounded py-1">{m}</div>
          ))}
        </div>
      )}

      {/* Main + right-hand party roster */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row md:items-start md:justify-center gap-3">
      <main className="flex-1 min-w-0 max-w-3xl flex flex-col items-center gap-3">
        {showCanvas && (
          <div className="relative">
            <canvas ref={canvasRef} width={CW} height={CH} style={{ imageRendering: 'pixelated' }} className="rounded-lg border-2 border-mm-edge shadow-2xl bg-black max-w-full" />
            {g.screen === 'dungeon' && (
              <div className="absolute top-2 right-2 bg-black/60 p-1 rounded border border-mm-edge">
                {g.flags['wizard_eye'] ? (
                  <AutoMap g={g} />
                ) : (
                  <div className="w-[120px] h-[110px] flex items-center justify-center text-center text-[9px] text-mm-light/40 px-2">
                    施放「巫師之眼」<br />以顯示自動地圖
                  </div>
                )}
                <div className="text-center text-[10px] text-mm-neon mt-0.5">{['北', '東', '南', '西'][g.pos.dir]}</div>
              </div>
            )}
            {isExplore && (
              <div className="absolute bottom-2 left-2 text-[11px] text-mm-light/70 bg-black/50 px-2 py-0.5 rounded">
                {mapMap[g.pos.mapId].name}
              </div>
            )}
            {g.screen === 'gameover' && (
              <Overlay icon={<Skull size={48} className="text-red-500" />} title="全隊覆滅" color="#ef4444"
                action={<Btn variant="primary" onClick={() => { E.clearSave(); setG(E.newGame()); }}>重新開始</Btn>} />
            )}
            {g.screen === 'victory' && (
              <Overlay icon={<Trophy size={48} className="text-mm-gold" />} title="克朗得救了！" color="#e7b53b"
                action={
                  <div className="flex flex-col items-center gap-2 max-w-md text-center px-4">
                    <p className="text-mm-light/80 text-sm">夏特姆殞落，時空恢復秩序。你的隊伍成為克朗永世傳唱的英雄。</p>
                    <div className="flex gap-2">
                      <Btn variant="gold" onClick={() => apply(d => { d.screen = 'town'; })}>回到城鎮</Btn>
                      <Btn variant="primary" onClick={() => { E.clearSave(); setG(E.newGame()); }}>新的冒險</Btn>
                    </div>
                  </div>
                } />
            )}
          </div>
        )}

        {/* Title */}
        {g.screen === 'title' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-mm-light/60 text-sm text-center max-w-md">
              一款向《Might &amp; Magic II: Gates to Another World》致敬的獨立第一人稱地城 RPG。組建六人隊伍、雇用幫手、探索克朗大陸的地城、討伐墮落守護者、取回時光寶珠。
            </p>
            <div className="flex gap-3">
              <Btn variant="primary" className="px-8 py-2" onClick={() => apply(d => { d.screen = 'create'; })}>新的冒險</Btn>
              {E.hasAnySave() && <Btn variant="gold" className="px-6 py-2" onClick={() => { const sl = E.latestSlot(); const s = sl ? E.loadGame(sl) : null; if (s) setG(s); }}>繼續遊戲</Btn>}
            </div>
          </div>
        )}

        {g.screen === 'create' && <CreateScreen apply={apply} />}
        {g.screen === 'town' && <TownScreen g={g} apply={apply} />}
        {g.screen === 'shop' && <ShopScreen g={g} apply={apply} />}
        {g.screen === 'dialog' && <DialogScreen g={g} apply={apply} />}
        {g.screen === 'sheet' && <SheetScreen g={g} apply={apply} active={sheetActive} setActive={setSheetActive} />}
        {g.screen === 'quests' && <QuestLogScreen g={g} apply={apply} />}
        {g.screen === 'hire' && <HireScreen g={g} apply={apply} />}
        {g.screen === 'train' && <TrainScreen g={g} apply={apply} active={sheetActive} setActive={setSheetActive} />}
        {g.screen === 'saves' && <SavesScreen g={g} apply={apply} replace={setG} />}
        {g.screen === 'combat' && <CombatPanel g={g} apply={apply} />}

        {/* Explore movement controls (touch screens; desktop uses arrow keys) */}
        {isExplore && (
          <div className="flex items-center gap-6 md:hidden">
            {g.screen === 'dungeon' ? (
              <div className="grid grid-cols-3 gap-2">
                <span />
                <CtrlBtn onClick={() => move(true)}><ArrowUp /></CtrlBtn>
                <span />
                <CtrlBtn onClick={() => turn(-1)}><RotateCcw /></CtrlBtn>
                <CtrlBtn onClick={() => move(false)}><ArrowDown /></CtrlBtn>
                <CtrlBtn onClick={() => turn(1)}><RotateCw /></CtrlBtn>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <span />
                <CtrlBtn onClick={() => moveOver(0)}><ArrowUp /></CtrlBtn>
                <span />
                <CtrlBtn onClick={() => moveOver(3)}><ArrowLeft /></CtrlBtn>
                <CtrlBtn onClick={() => moveOver(2)}><ArrowDown /></CtrlBtn>
                <CtrlBtn onClick={() => moveOver(1)}><ArrowRight /></CtrlBtn>
              </div>
            )}
            <div className="text-xs text-mm-light/40 max-w-[120px]">
              {g.screen === 'dungeon' ? '↑前進 ↓後退 ←→轉向' : '方向鍵移動'}
            </div>
          </div>
        )}
        {isExplore && (
          <div className="hidden md:block text-[11px] text-mm-light/40">
            鍵盤：{g.screen === 'dungeon' ? '↑前進 ↓後退 ←→轉向' : '方向鍵移動'}
          </div>
        )}

        {/* Quest tracker */}
        {g.quests['orb_quest'] && g.quests['orb_quest'] !== 'complete' && ['town', 'overworld', 'dungeon'].includes(g.screen) && (
          <Panel className="w-full text-xs">
            <div className="flex items-center gap-1 text-mm-gold"><ScrollText size={13} /> {questMap['orb_quest'].name}</div>
            <div className="text-mm-light/60 mt-0.5">
              {E.hasItem(g, 'orb_of_time') ? '✓ 已取得時光寶珠！回中央之門酒館交付任務。' : questMap['orb_quest'].desc}
            </div>
          </Panel>
        )}
        {orbDone && g.screen === 'town' && (
          <Panel className="w-full text-center">
            <Trophy className="inline text-mm-gold mb-1" size={32} />
            <div className="font-rune text-mm-gold text-lg">克朗大陸重歸光明！</div>
            <div className="text-mm-light/60 text-sm">你完成了主線任務。感謝遊玩這個 Milestone 1 垂直切片。</div>
          </Panel>
        )}

        {/* Log */}
        {g.party.length > 0 && (
          <Panel className="w-full max-h-28 overflow-auto text-[11px] text-mm-light/70 leading-snug">
            {g.log.slice(-8).map((m, i, arr) => (
              <div key={i} className={i === arr.length - 1 ? 'text-mm-light' : ''}>{m}</div>
            ))}
          </Panel>
        )}
      </main>

      {g.party.length > 0 && !['title', 'create'].includes(g.screen) && (
        <aside className="w-full md:w-44 md:sticky md:top-4">
          <div className="font-rune text-mm-gold text-xs mb-1 hidden md:block">隊伍</div>
          <PartyPanel g={g} highlight={g.screen === 'combat' ? E.currentActor(g)?.idx : undefined}
            onSelect={(i) => { setSheetActive(i); apply(d => { d.screen = 'sheet'; }); }} />
        </aside>
      )}
      </div>

      <footer className="text-mm-light/30 text-xs mt-6">
        Original tribute · not affiliated with the Might &amp; Magic franchise.
      </footer>
    </div>
  );
};

const CtrlBtn: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button onClick={onClick} className="p-3 bg-mm-panel border border-mm-edge rounded-lg active:bg-mm-arcane hover:bg-mm-edge transition flex justify-center">
    {children}
  </button>
);

const Overlay: React.FC<{ icon: React.ReactNode; title: string; color: string; action?: React.ReactNode }> = ({ icon, title, color, action }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-lg gap-3">
    {icon}
    <div className="font-rune text-2xl" style={{ color }}>{title}</div>
    {action}
  </div>
);

// Dungeon automap (SVG)
const AutoMap: React.FC<{ g: GameState }> = ({ g }) => {
  const map = mapMap[g.pos.mapId];
  const grid = map.grid;
  const cell = 10;
  return (
    <svg width={grid[0].length * cell} height={grid.length * cell}>
      {grid.map((row, y) =>
        row.split('').map((ch, x) => {
          const key = `${x},${y}`;
          const gkey = `${map.id}:${key}`;
          let fill = '#0c0913';
          if (ch === '#') fill = '#3a2f5c';
          else if (map.doors?.[key]) fill = g.openedDoors.includes(gkey) ? '#2a2440' : '#5a3e8c';
          else if (map.portals?.[key]) fill = '#4cc9f0';
          else if (map.chests?.[key] && !g.lootedChests.includes(gkey)) fill = '#e7b53b';
          else fill = '#221c38';
          return <rect key={key} x={x * cell} y={y * cell} width={cell - 1} height={cell - 1} fill={fill} />;
        })
      )}
      <rect x={g.pos.x * cell + 1.5} y={g.pos.y * cell + 1.5} width={cell - 4} height={cell - 4} fill="#fff" />
    </svg>
  );
};
