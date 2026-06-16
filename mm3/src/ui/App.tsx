import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Dir } from '../types';
import * as E from '../engine';
import { mapMap, questMap, townMap } from '../data/content';
import { drawDungeon, drawOverworld, drawCombat, drawTitle, drawTownScene, CW, CH } from '../render';
import { musicService, trackForScreen } from '../music';
import { soundService } from '../sound';
import { Btn, Panel, PartyRoster } from './common';
import { StoneFrame, CarvedPanel, Compass } from './frame';
import {
  CreateScreen, TownScreen, ShopScreen, DialogScreen, CombatPanel, SheetScreen, QuestLogScreen,
  RestScreen, SavesScreen, CombatSummaryScreen, TrainScreen,
} from './screens';
import {
  ArrowUp, ArrowDown, RotateCcw, RotateCw, ArrowLeft, ArrowRight, Save, Backpack,
  Coins, Gem, CalendarDays, Beef, Skull, Trophy, ScrollText, Map as MapIcon, Music, Music2,
  Volume2, VolumeX, Tent, BookOpen, Footprints,
} from 'lucide-react';

const DIRV = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

export const App: React.FC = () => {
  const [g, setG] = useState<GameState>(() => E.newGame());
  const [sheetActive, setSheetActive] = useState(0);
  const [musicOn, setMusicOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef('');
  const fxStartRef = useRef(0);

  const apply = useCallback((fn: (d: GameState) => void) => {
    setG(prev => { const d = E.clone(prev); fn(d); return d; });
  }, []);

  const sfx = useCallback((name: Parameters<typeof soundService.play>[0]) => {
    if (soundOn) soundService.play(name);
  }, [soundOn]);

  // ----- movement -----
  const move = useCallback((forward: boolean) => {
    apply(d => {
      if (d.screen === 'dungeon') {
        const v = DIRV[d.pos.dir];
        const ok = E.tryStep(d, d.pos.x + (forward ? v.x : -v.x), d.pos.y + (forward ? v.y : -v.y));
        if (ok && soundOn && d.screen === 'dungeon') soundService.play('step');
      }
    });
  }, [apply, soundOn]);

  const turn = useCallback((delta: number) => {
    apply(d => { if (d.screen === 'dungeon') { E.turnDir(d, delta); if (soundOn) soundService.play('turn'); } });
  }, [apply, soundOn]);

  const moveOver = useCallback((dir: number) => {
    apply(d => {
      if (d.screen === 'overworld') {
        d.pos.dir = dir as Dir;
        const v = DIRV[dir];
        const ok = E.tryStep(d, d.pos.x + v.x, d.pos.y + v.y);
        if (ok && soundOn) soundService.play('step');
      }
    });
  }, [apply, soundOn]);

  // ----- keyboard -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (g.screen === 'dungeon') {
        if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); move(true); }
        else if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); move(false); }
        else if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); turn(-1); }
        else if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); turn(1); }
      } else if (g.screen === 'overworld') {
        const map: Record<string, number> = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3 };
        if (e.key in map) { e.preventDefault(); moveOver(map[e.key]); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g.screen, move, turn, moveOver]);

  // ----- canvas render (static screens) -----
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    if (g.screen === 'combat') return; // combat is animated below
    if (g.screen === 'dungeon') drawDungeon(ctx, g);
    else if (g.screen === 'overworld') drawOverworld(ctx, g);
    else if (g.screen === 'town') drawTownScene(ctx, g.townId);
    else drawTitle(ctx);
  }, [g]);

  // ----- combat canvas: animated fx via rAF -----
  useEffect(() => {
    if (g.screen !== 'combat') return;
    let raf = 0; let active = true;
    const loop = () => {
      if (!active) return;
      const cv = canvasRef.current; const ctx = cv?.getContext('2d');
      if (ctx) {
        const elapsed = (typeof performance !== 'undefined' ? performance.now() : 0) - fxStartRef.current;
        drawCombat(ctx, g, Math.max(0, 1 - elapsed / 450));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(raf); };
  }, [g]);

  // ----- music by screen -----
  useEffect(() => {
    if (!musicOn) return;
    musicService.play(trackForScreen(g.screen, { isBoss: g.combat?.boss, mapId: g.pos.mapId, townId: g.townId }));
  }, [g.screen, g.combat?.boss, g.pos.mapId, g.townId, musicOn]);

  // ----- combat fx -> animation timestamp + sound -----
  useEffect(() => {
    const fx = g.combat?.fx;
    if (!fx) return;
    const key = `${g.combat?.round}:${g.combat?.turn}:${fx.kind}:${fx.targetIdx}`;
    if (key === fxRef.current) return;
    fxRef.current = key;
    fxStartRef.current = (typeof performance !== 'undefined' ? performance.now() : 0);
    if (!soundOn) return;
    if (fx.kind === 'hit') soundService.play(fx.targetSide === 'party' ? 'hurt' : 'hit');
    else if (fx.kind === 'crit') soundService.play('crit');
    else if (fx.kind === 'miss') soundService.play('miss');
    else if (fx.kind === 'death') soundService.play('enemy_die');
    else if (fx.kind === 'heal') soundService.play('heal');
    else if (fx.kind === 'spell') {
      soundService.play(fx.element === 'fire' ? 'fire' : fx.element === 'cold' ? 'ice' : fx.element === 'electric' ? 'shock' : fx.element === 'holy' ? 'holy' : 'spell');
    }
  }, [g, soundOn]);

  // ----- encounter / summary sounds -----
  const prevScreen = useRef(g.screen);
  useEffect(() => {
    if (prevScreen.current !== 'combat' && g.screen === 'combat' && soundOn) soundService.play('encounter');
    if (g.screen === 'gameover' && prevScreen.current !== 'gameover' && soundOn) soundService.play('defeat');
    prevScreen.current = g.screen;
  }, [g.screen, soundOn]);
  useEffect(() => {
    if (g.combatSummary && soundOn) {
      soundService.play(g.combatSummary.levelUps.length ? 'levelup' : 'victory');
    }
  }, [g.combatSummary, soundOn]);

  const toggleMusic = () => {
    musicService.resume();
    setMusicOn(v => {
      const nv = !v; musicService.setEnabled(nv);
      if (nv) musicService.play(trackForScreen(g.screen, { isBoss: g.combat?.boss, mapId: g.pos.mapId, townId: g.townId }));
      return nv;
    });
  };

  const showCanvas = ['title', 'overworld', 'dungeon', 'combat', 'town', 'victory', 'gameover'].includes(g.screen);
  const isExplore = g.screen === 'overworld' || g.screen === 'dungeon';
  const isCombat = g.screen === 'combat';
  const showConsole = ['overworld', 'dungeon', 'combat', 'town'].includes(g.screen);
  const orbDone = g.flags['orb_returned'];
  const clock = `${String(Math.floor(g.minutes / 60)).padStart(2, '0')}:${String(g.minutes % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen flex flex-col items-center p-2 md:p-4">
      {/* Header */}
      <header className="w-full max-w-5xl flex items-center gap-3 mb-2">
        <h1 className="font-rune text-lg md:text-xl text-mm-gold tracking-wide">魔法門 III · 泰拉群島</h1>
        <div className="ml-auto flex gap-1.5">
          <Btn onClick={() => { soundService.resume(); setSoundOn(v => { const nv = !v; soundService.setEnabled(nv); return nv; }); }} title={soundOn ? '音效：開' : '音效：關'}>{soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}</Btn>
          <Btn onClick={toggleMusic} title={musicOn ? '音樂：開' : '音樂：關'}>{musicOn ? <Music size={15} /> : <Music2 size={15} className="opacity-40" />}</Btn>
          {g.party.length > 0 && g.screen !== 'create' && (
            <>
              <Btn onClick={() => apply(d => { d.screen = 'quests'; })} title="任務日誌"><ScrollText size={15} /></Btn>
              <Btn onClick={() => { setSheetActive(0); apply(d => { d.screen = 'sheet'; }); }} title="角色與背包"><Backpack size={15} /></Btn>
              <Btn onClick={() => apply(d => { d.screen = 'saves'; })} title="存讀檔"><Save size={15} /></Btn>
            </>
          )}
        </div>
      </header>

      {/* Toasts */}
      {g.messages.length > 0 && (
        <div className="w-full max-w-5xl mb-2 space-y-1">
          {g.messages.map((m, i) => (
            <div key={i} className="text-center text-sm text-mm-gold bg-mm-panel/80 border border-mm-gold/30 rounded py-1">{m}</div>
          ))}
        </div>
      )}

      {/* ===== In-game console (explore / combat / town) ===== */}
      {showConsole && (
        <div className="w-full max-w-5xl flex flex-col gap-2">
          <div className="flex flex-col lg:flex-row gap-3 items-start justify-center">
            {/* LEFT: framed viewport + context */}
            <main className="flex flex-col items-center gap-2 min-w-0">
              <StoneFrame>
                <div className="relative">
                  <canvas ref={canvasRef} width={CW} height={CH} style={{ imageRendering: 'pixelated' }} className="block bg-black max-w-full" />
                  {isExplore && (
                    <div className="absolute bottom-1 left-1 text-[11px] text-mm-light/80 bg-black/60 px-2 py-0.5 rounded">
                      {mapMap[g.pos.mapId].name}
                    </div>
                  )}
                  {g.screen === 'town' && (
                    <div className="absolute bottom-1 left-1 text-[12px] text-mm-gold bg-black/60 px-2 py-0.5 rounded font-rune">
                      {townMap[g.townId]?.name}
                    </div>
                  )}
                  {isCombat && (
                    <div className="absolute top-1 left-1 text-[11px] text-mm-neon bg-black/60 px-2 py-0.5 rounded">
                      第 {g.combat?.round} 回合
                    </div>
                  )}
                  {g.screen === 'gameover' && (
                    <Overlay icon={<Skull size={46} className="text-red-500" />} title="全隊覆滅" color="#ef4444"
                      action={<Btn variant="primary" onClick={() => { E.clearSave(); setG(E.newGame()); }}>重新開始</Btn>} />
                  )}
                </div>
              </StoneFrame>

              {/* sign / event text */}
              {g.sign && isExplore && (
                <div className="text-[12px] text-mm-gold/90 bg-black/40 border border-mm-gold/30 rounded px-3 py-1 max-w-md text-center">{g.sign}</div>
              )}

              {/* town content */}
              {g.screen === 'town' && <TownScreen g={g} apply={apply} sfx={sfx} />}

              {/* combat action panel */}
              {isCombat && <CombatPanel g={g} apply={apply} sfx={sfx} />}

              {/* explore movement (mobile dpad) */}
              {isExplore && (
                <div className="flex items-center gap-6 lg:hidden">
                  {g.screen === 'dungeon' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <span /><CtrlBtn onClick={() => move(true)}><ArrowUp /></CtrlBtn><span />
                      <CtrlBtn onClick={() => turn(-1)}><RotateCcw /></CtrlBtn><CtrlBtn onClick={() => move(false)}><ArrowDown /></CtrlBtn><CtrlBtn onClick={() => turn(1)}><RotateCw /></CtrlBtn>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <span /><CtrlBtn onClick={() => moveOver(0)}><ArrowUp /></CtrlBtn><span />
                      <CtrlBtn onClick={() => moveOver(3)}><ArrowLeft /></CtrlBtn><CtrlBtn onClick={() => moveOver(2)}><ArrowDown /></CtrlBtn><CtrlBtn onClick={() => moveOver(1)}><ArrowRight /></CtrlBtn>
                    </div>
                  )}
                </div>
              )}
              {isExplore && (
                <div className="hidden lg:block text-[11px] text-mm-light/40">
                  鍵盤：{g.screen === 'dungeon' ? '↑前進 ↓後退 ←→轉向（WASD）' : '方向鍵 / WASD 移動'}
                </div>
              )}
            </main>

            {/* RIGHT: control panel */}
            <aside className="w-full lg:w-56 flex flex-col gap-2 shrink-0">
              {/* compass + automap */}
              <CarvedPanel className="flex flex-col items-center">
                {g.screen === 'dungeon'
                  ? <AutoMap g={g} />
                  : <Compass dir={g.pos.dir} />}
                <div className="text-[10px] text-mm-neon mt-1">面向：{['北', '東', '南', '西'][g.pos.dir]}</div>
              </CarvedPanel>

              {/* resources */}
              <CarvedPanel title="補給">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[12px]">
                  <span className="flex items-center gap-1 text-mm-gold"><Coins size={13} />{g.gold}</span>
                  <span className="flex items-center gap-1 text-cyan-300"><Gem size={13} />{g.gems}</span>
                  <span className="flex items-center gap-1 text-orange-300"><Beef size={13} />{g.food}</span>
                  <span className="flex items-center gap-1 text-mm-light/70"><CalendarDays size={13} />{g.day}天</span>
                  <span className="col-span-2 text-center text-mm-light/50 text-[11px]">🕓 {clock}</span>
                </div>
              </CarvedPanel>

              {/* context actions */}
              {!isCombat && (
                <CarvedPanel title="行動">
                  <div className="grid grid-cols-2 gap-1.5">
                    <Btn onClick={() => apply(d => { d.screen = 'rest'; })} title="休息"><Tent size={14} className="inline mr-1" />休息</Btn>
                    <Btn onClick={() => { setSheetActive(0); apply(d => { d.screen = 'sheet'; }); }}><Backpack size={14} className="inline mr-1" />角色</Btn>
                    <Btn onClick={() => apply(d => { d.screen = 'quests'; })}><ScrollText size={14} className="inline mr-1" />任務</Btn>
                    <Btn onClick={() => apply(d => { d.screen = 'saves'; })}><Save size={14} className="inline mr-1" />存檔</Btn>
                  </div>
                </CarvedPanel>
              )}
            </aside>
          </div>

          {/* bottom roster */}
          {g.party.length > 0 && (
            <PartyRoster g={g} highlight={isCombat ? E.currentActor(g)?.idx : undefined}
              onSelect={(i) => { setSheetActive(i); apply(d => { d.screen = 'sheet'; }); }} />
          )}

          {/* quest tracker (explore) */}
          {g.quests['orb_quest'] && g.quests['orb_quest'] !== 'complete' && isExplore && (
            <Panel className="w-full text-xs">
              <div className="flex items-center gap-1 text-mm-gold"><ScrollText size={13} /> {questMap['orb_quest'].name}</div>
              <div className="text-mm-light/60 mt-0.5">
                {E.hasItem(g, 'orb_of_terra') ? '✓ 已取得寶珠！回索皮加城酒館交付任務。' : questMap['orb_quest'].desc}
              </div>
            </Panel>
          )}

          {/* log */}
          {g.party.length > 0 && (
            <Panel className="w-full max-h-24 overflow-auto text-[11px] text-mm-light/70 leading-snug">
              {g.log.slice(-8).map((m, i, arr) => (
                <div key={i} className={i === arr.length - 1 ? 'text-mm-light' : ''}>{m}</div>
              ))}
            </Panel>
          )}
        </div>
      )}

      {/* ===== Full-screen content screens ===== */}
      {!showConsole && (
        <main className="w-full max-w-4xl flex flex-col items-center gap-3">
          {g.screen === 'title' && (
            <>
              <StoneFrame><canvas ref={canvasRef} width={CW} height={CH} className="block bg-black max-w-full" style={{ imageRendering: 'pixelated' }} /></StoneFrame>
              <div className="flex flex-col items-center gap-3 mt-1">
                <p className="text-mm-light/60 text-sm text-center max-w-md">
                  一款向《Might &amp; Magic III: Isles of Terra》致敬的獨立第一人稱地城 RPG。組建六人隊伍、橫越泰拉群島、討伐遠古守護者。
                </p>
                <div className="flex gap-3">
                  <Btn variant="primary" className="px-8 py-2" onClick={() => apply(d => { d.screen = 'create'; })}>新的冒險</Btn>
                  {E.hasSave() && <Btn variant="gold" className="px-6 py-2" onClick={() => { const s = E.loadGame(); if (s) setG(s); }}>繼續遊戲</Btn>}
                </div>
              </div>
            </>
          )}
          {g.screen === 'create' && <CreateScreen apply={apply} />}
          {g.screen === 'shop' && <ShopScreen g={g} apply={apply} sfx={sfx} />}
          {g.screen === 'dialog' && <DialogScreen g={g} apply={apply} />}
          {g.screen === 'sheet' && <SheetScreen g={g} apply={apply} active={sheetActive} setActive={setSheetActive} sfx={sfx} />}
          {g.screen === 'quests' && <QuestLogScreen g={g} apply={apply} />}
          {g.screen === 'rest' && <RestScreen g={g} apply={apply} sfx={sfx} />}
          {g.screen === 'train' && <TrainScreen g={g} apply={apply} active={sheetActive} setActive={setSheetActive} sfx={sfx} />}
          {g.screen === 'saves' && <SavesScreen g={g} apply={apply} replace={setG} />}

          {g.screen === 'victory' && (
            <>
              <StoneFrame><canvas ref={canvasRef} width={CW} height={CH} className="block bg-black max-w-full" style={{ imageRendering: 'pixelated' }} /></StoneFrame>
              <Panel className="w-full max-w-lg text-center mt-2">
                <Trophy className="inline text-mm-gold mb-1" size={40} />
                <div className="font-rune text-mm-gold text-2xl mb-2">泰拉群島重歸光明！</div>
                <p className="text-mm-light/70 text-sm mb-3">
                  泰拉守護者崩解，群島的核心終於平靜。你的隊伍橫越索皮加、泉源與荒野，討伐了巫妖王與遠古造物，
                  名字將永遠銘刻在泰拉的傳說之中。
                </p>
                <div className="flex gap-2 justify-center">
                  <Btn variant="gold" onClick={() => apply(d => { d.screen = 'town'; d.townId = 'sorpigal'; })}>回到城鎮</Btn>
                  <Btn variant="primary" onClick={() => { E.clearSave(); setG(E.newGame()); }}>新的冒險</Btn>
                </div>
              </Panel>
            </>
          )}
        </main>
      )}

      {/* combat summary overlay */}
      {g.combatSummary && showConsole && <CombatSummaryScreen g={g} apply={apply} />}

      <footer className="text-mm-light/30 text-xs mt-4">
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
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 gap-3">
    {icon}
    <div className="font-rune text-2xl" style={{ color }}>{title}</div>
    {action}
  </div>
);

// Dungeon automap (SVG)
const AutoMap: React.FC<{ g: GameState }> = ({ g }) => {
  const map = mapMap[g.pos.mapId];
  const grid = map.grid;
  const cell = Math.min(13, Math.floor(180 / Math.max(grid.length, grid[0].length)));
  return (
    <svg width={grid[0].length * cell} height={grid.length * cell} shapeRendering="crispEdges">
      {grid.map((row, y) =>
        row.split('').map((ch, x) => {
          const key = `${x},${y}`;
          const gkey = `${map.id}:${key}`;
          let fill = '#0c0913';
          if (ch === '#') fill = '#46402f';
          else if (map.doors?.[key]) fill = g.openedDoors.includes(gkey) ? '#2a2440' : '#5a3e8c';
          else if (map.portals?.[key]) fill = '#4cc9f0';
          else if (map.chests?.[key] && !g.lootedChests.includes(gkey)) fill = '#e7b53b';
          else if (map.encounters?.[key] && !g.clearedEncounters.includes(gkey)) fill = '#6b2226';
          else fill = '#221c38';
          return <rect key={key} x={x * cell} y={y * cell} width={cell - 1} height={cell - 1} fill={fill} />;
        })
      )}
      <rect x={g.pos.x * cell + 1} y={g.pos.y * cell + 1} width={cell - 3} height={cell - 3} fill="#fff" />
    </svg>
  );
};
