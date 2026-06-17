import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameResult, GameType, Language } from '../types';
import { soundService } from '../services/soundService';
import { buildScenario, SEASON_NAMES } from './sango/data';
import { drawOfficerPortrait } from './sango/portraits';
import {
  drawMap, mapCityAt, drawBattle, battleCellAt, MAP_W, MAP_H, CELL,
} from './sango/render';
import {
  GameState, City, Officer,
} from './sango/types';
import {
  createGame, curFaction, isPlayerTurn, endPlayerTurn, nextFaction,
  factionCities, cityOfficers, armyCapacity, canAttack, launchAttack,
  applyConquest, runFactionAI,
  cmdDevelop, cmdDraft, cmdTrain, cmdRecruit,
} from './sango/engine';
import { createBattle, aiBattleTurn, reachable, doMove, doAttack, doFire, canHit, unitAt, endPhase, battleSurvivors } from './sango/battle';
import { Crown, Play, Swords, Coins, Wheat, Users, Flame, ChevronRight, Shield } from 'lucide-react';

interface Props { onGameOver: (r: GameResult) => void; language: Language; }

// Small procedural officer portrait.
const Portrait: React.FC<{ officer: Officer; color: string; size: number }> = ({ officer, color, size }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    drawOfficerPortrait(ctx, officer, color, 0, 0, size, Math.round(size * 1.15));
  }, [officer.id, color, size]);
  return <canvas ref={ref} width={size} height={Math.round(size * 1.15)} className="rounded" />;
};

// Army composition modal for launching an attack.
const ArmyModal: React.FC<{
  s: GameState; from: string; to: string; isZh: boolean;
  onCancel: () => void; onLaunch: (officerIds: string[], soldiers: number) => void;
}> = ({ s, from, to, isZh, onCancel, onLaunch }) => {
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const fromCity = s.cities[from];
  const avail = fromCity.officers.map(id => s.officers[id]).filter(o => o.faction === s.playerFaction && !o.done);
  const sorted = [...avail].sort((a, b) => b.led - a.led);
  const [picked, setPicked] = useState<string[]>(sorted.slice(0, 3).map(o => o.id));
  const cap = armyCapacity(picked.map(id => s.officers[id]));
  const maxSend = Math.min(fromCity.troops, cap);
  const [soldiers, setSoldiers] = useState(Math.max(0, Math.round(fromCity.troops * 0.7)));
  const send = Math.min(soldiers, maxSend);

  const toggle = (id: string) =>
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-arcade-secondary rounded-lg border border-yellow-600 p-4 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="font-pixel text-sm text-yellow-300 mb-2">
          {fromCity.name} → {s.cities[to].name} {T('出陣', 'March')}
        </h3>
        <div className="text-xs text-gray-300 mb-2">{T('選擇出征武將', 'Choose officers')}（{T('上限統率×120兵', 'cap = LED×120')}）</div>
        <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
          {avail.map(o => (
            <label key={o.id} className={`flex items-center gap-2 p-1 rounded cursor-pointer ${picked.includes(o.id) ? 'bg-yellow-900/40' : 'bg-gray-800/60'}`}>
              <input type="checkbox" checked={picked.includes(o.id)} onChange={() => toggle(o.id)} />
              <span className="text-xs flex-1">{o.name}</span>
              <span className="text-[10px] text-gray-400">統{o.led} 武{o.war}</span>
            </label>
          ))}
          {avail.length === 0 && <div className="text-xs text-gray-500">{T('沒有可出征的武將', 'No available officers')}</div>}
        </div>
        <div className="text-xs text-gray-300 mb-1">{T('兵力', 'Troops')}：{send} / {maxSend}</div>
        <input type="range" min={0} max={maxSend} value={send} onChange={e => setSoldiers(Number(e.target.value))} className="w-full mb-3" />
        <div className="flex gap-2">
          <button disabled={picked.length === 0 || send <= 0}
            onClick={() => onLaunch(picked, send)}
            className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded py-2 font-pixel text-sm">{T('出擊', 'ATTACK')}</button>
          <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 rounded py-2 font-pixel text-sm">{T('取消', 'Cancel')}</button>
        </div>
      </div>
    </div>
  );
};

const ThreeKingdomsGame: React.FC<Props> = ({ onGameOver, language }) => {
  const isZh = language === 'zh';
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const [screen, setScreen] = useState<'select' | 'play'>('select');
  const [, setV] = useState(0);
  const bump = useCallback(() => setV(v => v + 1), []);

  const sRef = useRef<GameState | null>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const battleRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const reportedRef = useRef(false);

  // UI state for the map screen.
  const [selCity, setSelCity] = useState<string | null>(null);
  const [selOfficer, setSelOfficer] = useState<string | null>(null);
  const [attackMode, setAttackMode] = useState(false);
  const [armyModal, setArmyModal] = useState<{ from: string; to: string } | null>(null);

  const scenarioFactions = useRef(buildScenario());

  // ---- Start a game ------------------------------------------------------
  const start = (factionId: string) => {
    sRef.current = createGame(factionId);
    reportedRef.current = false;
    setSelCity(null); setSelOfficer(null); setAttackMode(false); setArmyModal(null);
    setScreen('play');
    soundService.playMove();
    bump();
  };

  // ---- Render loop -------------------------------------------------------
  useEffect(() => {
    if (screen !== 'play') return;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const s = sRef.current; if (!s) return;
      if (s.phase === 'battle' && s.battle) {
        const ctx = battleRef.current?.getContext('2d');
        if (ctx) drawBattle(ctx, s, s.battle);
        if (s.battle.anim) { s.battle.anim.timer--; if (s.battle.anim.timer <= 0) s.battle.anim = null; }
      } else {
        const ctx = mapRef.current?.getContext('2d');
        if (ctx) {
          const targets = attackMode && selCity
            ? s.cities[selCity].neighbors.filter(n => canAttack(s, selCity, n))
            : [];
          drawMap(ctx, s, { selected: selCity, targets, hover: null });
        }
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [screen, selCity, attackMode]);

  // ---- Turn driver (AI factions + battle AI + result application) --------
  useEffect(() => {
    if (screen !== 'play') return;
    const s = sRef.current; if (!s || s.winner) {
      if (s?.winner && !reportedRef.current) {
        reportedRef.current = true;
        const won = s.winner === s.playerFaction;
        const cities = factionCities(s, s.playerFaction).length;
        onGameOver({ game: 'Three Kingdoms', gameId: GameType.SANGOKUSHI, score: (won ? 5000 : 0) + cities * 300 + s.turnCount * 5 });
      }
      return;
    }

    // Apply a finished battle.
    if (s.phase === 'battle' && s.battle && s.battle.result) {
      const id = setTimeout(() => { applyBattleResult(); }, 1100);
      return () => clearTimeout(id);
    }
    // Battle AI phase.
    if (s.phase === 'battle' && s.battle && !s.battle.result) {
      const playerSide = s.battle.attacker === s.playerFaction ? 'atk' : 'def';
      if (s.battle.side !== playerSide) {
        const id = setTimeout(() => { aiBattleTurn(s, s.battle!); bump(); }, 520);
        return () => clearTimeout(id);
      }
      return;
    }
    // Strategic AI turn.
    if (s.phase === 'map' && curFaction(s) !== s.playerFaction) {
      const id = setTimeout(() => {
        const battle = runFactionAI(s);
        if (battle && s.pending) {
          s.battle = createBattle(s, s.pending);
          s.phase = 'battle';
        } else {
          nextFaction(s);
        }
        bump();
      }, 360);
      return () => clearTimeout(id);
    }
  });

  const applyBattleResult = () => {
    const s = sRef.current!; const bs = s.battle!; const p = s.pending!;
    const won = bs.result === 'atk';
    const atkOffs = p.army.map(a => s.officers[a.officerId]);
    const defOffs = bs.defenderOfficers.map(id => s.officers[id]);
    const atkSurv = battleSurvivors(bs, 'atk');
    const defSurv = battleSurvivors(bs, 'def');
    applyConquest(s, p, won, atkSurv, atkOffs, defOffs);
    if (!won) s.cities[p.cityId].troops = Math.max(0, defSurv);
    s.pending = null; s.battle = null;
    if (!s.winner) s.phase = 'map';
    soundService.playExplosion();
    bump();
  };

  // ---- Map interactions --------------------------------------------------
  const canvasPos = (e: React.MouseEvent, canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  };

  const onMapClick = (e: React.MouseEvent) => {
    const s = sRef.current; if (!s || s.phase !== 'map') return;
    const { x, y } = canvasPos(e, mapRef.current!);
    const cid = mapCityAt(s, x, y);
    if (!cid) { if (!attackMode) { setSelCity(null); setSelOfficer(null); } return; }
    if (attackMode && selCity) {
      if (canAttack(s, selCity, cid)) { setArmyModal({ from: selCity, to: cid }); setAttackMode(false); }
      else { setAttackMode(false); }
      return;
    }
    setSelCity(cid); setSelOfficer(null);
    soundService.playMove();
  };

  // ---- Battle interactions ----------------------------------------------
  const onBattleClick = (e: React.MouseEvent) => {
    const s = sRef.current; if (!s || s.phase !== 'battle' || !s.battle) return;
    const bs = s.battle; if (bs.result) return;
    const playerSide = bs.attacker === s.playerFaction ? 'atk' : 'def';
    if (bs.side !== playerSide) return;
    const { x, y } = canvasPos(e, battleRef.current!);
    const cell = battleCellAt(x, y);
    if (cell.x < 0 || cell.x >= bs.w || cell.y < 0 || cell.y >= bs.h) return;

    if (bs.mode === 'fire' && bs.selected != null) {
      doFire(s, bs, bs.selected, cell.x, cell.y); soundService.playExplosion(); bump(); return;
    }
    const idx = unitAt(bs, cell.x, cell.y);
    if (idx >= 0) {
      const u = bs.units[idx];
      if (u.side === playerSide) {
        if (!u.acted) { bs.selected = idx; bs.reachable = u.moved ? [] : reachable(bs, idx); bs.mode = null; }
        bump(); return;
      } else if (bs.selected != null && canHit(bs, bs.selected, idx)) {
        doAttack(s, bs, bs.selected, idx); soundService.playShoot(); bump(); return;
      }
    } else if (bs.selected != null && bs.reachable.some(t => t.x === cell.x && t.y === cell.y)) {
      doMove(bs, bs.selected, cell.x, cell.y);
      const u = bs.units[bs.selected!];
      bs.reachable = []; // keep selected so player may attack after moving
      if (u && !u.acted) bs.selected = bs.units.indexOf(u);
      bump(); return;
    }
    bump();
  };

  // ===== RENDER ===========================================================
  if (screen === 'select') {
    const fs = scenarioFactions.current;
    return (
      <div className="w-full max-w-[900px] flex flex-col items-center gap-4">
        <h2 className="font-pixel text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-red-500">
          {T('三國志 — 群雄割據', 'Three Kingdoms — Warlords')}
        </h2>
        <p className="text-sm text-gray-400">{T('選擇你的勢力，逐鹿中原、一統天下。', 'Choose your warlord and unify China.')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
          {fs.factionOrder.map(fid => {
            const f = fs.factions[fid];
            const ruler = fs.officers[f.rulerId];
            const cityList = Object.values(fs.cities) as City[];
            const city = cityList.find(c => c.faction === fid)!;
            const cityCount = cityList.filter(c => c.faction === fid).length;
            return (
              <button key={fid} onClick={() => start(fid)}
                className="bg-gray-900 border border-gray-700 rounded-lg p-2 flex flex-col items-center gap-1 hover:-translate-y-1 hover:border-yellow-500 transition">
                <Portrait officer={ruler} color={f.color} size={64} />
                <div className="font-pixel text-xs" style={{ color: f.color }}>{ruler.name}</div>
                <div className="text-[10px] text-gray-400">{city.name}・{cityCount}{T('城', ' cy')}</div>
                <div className="text-[9px] text-gray-500">統{ruler.led} 武{ruler.war} 智{ruler.int}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const s = sRef.current!;
  const pf = s.factions[s.playerFaction];
  const myCities = factionCities(s, s.playerFaction);
  const totalGold = myCities.reduce((n, c) => n + c.gold, 0);
  const totalFood = myCities.reduce((n, c) => n + c.food, 0);
  const totalTroops = myCities.reduce((n, c) => n + c.troops, 0);
  const yourTurn = isPlayerTurn(s);

  return (
    <div className="w-full max-w-[900px] flex flex-col gap-3">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-arcade-secondary/60 rounded-lg px-3 py-2 border border-gray-700">
        <div className="flex items-center gap-2 font-pixel text-sm" style={{ color: pf.color }}>
          <Crown size={16} /> {pf.name}
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span>{s.year}{T('年', '')} {SEASON_NAMES[s.season]}</span>
          <span className="flex items-center gap-1 text-yellow-400"><Coins size={13} />{totalGold}</span>
          <span className="flex items-center gap-1 text-amber-300"><Wheat size={13} />{Math.round(totalFood / 1000)}k</span>
          <span className="flex items-center gap-1 text-red-300"><Users size={13} />{Math.round(totalTroops / 1000)}k</span>
          <span className="text-gray-400">{myCities.length}/{Object.keys(s.cities).length}{T('城', '')}</span>
        </div>
        {s.phase === 'map' && (
          <button onClick={() => { if (yourTurn) { setSelCity(null); endPlayerTurn(s); bump(); } }}
            disabled={!yourTurn}
            className={`flex items-center gap-1 px-3 py-1 rounded font-pixel text-xs ${yourTurn ? 'bg-arcade-primary hover:bg-red-600' : 'bg-gray-700 text-gray-400'}`}>
            {yourTurn ? T('結束回合', 'END TURN') : T('其他勢力行動中…', 'AI thinking…')} <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* MAP PHASE */}
      {s.phase === 'map' && (
        <div className="flex flex-col lg:flex-row gap-3">
          <canvas ref={mapRef} width={MAP_W} height={MAP_H} onClick={onMapClick}
            className="bg-black border-2 border-arcade-secondary rounded w-full lg:w-2/3 cursor-pointer" />
          <div className="lg:w-1/3 bg-gray-900/70 rounded-lg border border-gray-700 p-3 max-h-[560px] overflow-y-auto">
            {selCity ? <CityPanel /> : <LogPanel />}
          </div>
        </div>
      )}

      {/* BATTLE PHASE */}
      {s.phase === 'battle' && s.battle && (
        <div className="flex flex-col lg:flex-row gap-3">
          <canvas ref={battleRef} width={CELL * 13} height={CELL * 9} onClick={onBattleClick}
            className="bg-black border-2 border-arcade-secondary rounded w-full lg:w-2/3 cursor-pointer" />
          <div className="lg:w-1/3"><BattlePanel /></div>
        </div>
      )}

      {/* MARCH / army composition modal */}
      {armyModal && (
        <ArmyModal s={s} from={armyModal.from} to={armyModal.to} isZh={isZh}
          onCancel={() => setArmyModal(null)}
          onLaunch={(ids, sld) => {
            const p = launchAttack(s, armyModal.from, armyModal.to, ids, sld);
            setArmyModal(null);
            if (p) { s.battle = createBattle(s, p); s.phase = 'battle'; setSelCity(null); soundService.playShoot(); }
            bump();
          }} />
      )}

      {/* GAME OVER */}
      {s.phase === 'gameover' && s.winner && (
        <div className="bg-gray-900/80 border border-yellow-600 rounded-lg p-6 text-center flex flex-col items-center gap-3">
          <Crown size={40} className="text-yellow-400" />
          <div className="font-pixel text-2xl text-yellow-300">
            {s.winner === s.playerFaction ? T('天下一統！', 'YOU UNIFIED CHINA!') : T('天下落入他人之手…', 'Another warlord prevailed…')}
          </div>
          <div className="text-sm text-gray-300">{s.factions[s.winner].name} {T('統一了天下', 'unified the land')}（{s.year}{T('年', '')}）</div>
          <button onClick={() => setScreen('select')} className="mt-2 bg-arcade-primary hover:bg-red-600 px-5 py-2 rounded font-pixel">
            {T('再來一局', 'PLAY AGAIN')}
          </button>
        </div>
      )}
    </div>
  );

  // ===== Sub-panels (closures over s) =====================================
  function LogPanel() {
    return (
      <div>
        <h3 className="font-pixel text-sm text-arcade-neon mb-2">{T('軍情', 'Reports')}</h3>
        <ul className="space-y-1 text-xs text-gray-300">
          {s.log.slice(0, 18).map((l, i) => <li key={i} className="border-b border-gray-800 pb-1">{l}</li>)}
        </ul>
      </div>
    );
  }

  function CityPanel() {
    const c = s.cities[selCity!];
    const owner = c.faction ? s.factions[c.faction] : null;
    const mine = c.faction === s.playerFaction && yourTurn;
    const offs = cityOfficers(s, c);
    const sel = selOfficer ? s.officers[selOfficer] : null;
    const canCmd = mine && sel && !sel.done && sel.faction === s.playerFaction;
    const freeHere = offs.filter(o => o.faction === null);

    return (
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-base" style={{ color: owner?.color ?? '#aaa' }}>{c.name}</h3>
          <button onClick={() => { setSelCity(null); setSelOfficer(null); }} className="text-gray-500 text-xs">✕</button>
        </div>
        <div className="text-[11px] text-gray-300 grid grid-cols-2 gap-x-3 gap-y-0.5 my-2">
          <span>{T('勢力', 'Lord')}：{owner ? owner.name : T('空城', 'Free')}</span>
          <span className="text-red-300">{T('兵力', 'Troops')}：{c.troops}</span>
          <span className="text-yellow-400">{T('資金', 'Gold')}：{c.gold}</span>
          <span className="text-amber-300">{T('兵糧', 'Food')}：{c.food}</span>
          <span>{T('農業', 'Agri')}：{c.agri}</span>
          <span>{T('商業', 'Comm')}：{c.comm}</span>
          <span>{T('治安', 'Order')}：{c.order}</span>
          <span>{T('民忠', 'Loyal')}：{c.loyalty}</span>
          <span>{T('城防', 'Def')}：{c.defense}</span>
          <span>{T('人口', 'Pop')}：{Math.round(c.pop / 1000)}k</span>
        </div>

        {mine && (
          <button onClick={() => setAttackMode(true)}
            className="w-full mb-2 flex items-center justify-center gap-1 bg-red-700 hover:bg-red-600 rounded py-1.5 font-pixel text-xs">
            <Swords size={14} /> {attackMode ? T('點選目標城池…', 'Pick a target…') : T('出陣', 'MARCH')}
          </button>
        )}

        <div className="space-y-1">
          {offs.map(o => {
            const fac = o.faction ? s.factions[o.faction] : null;
            return (
              <div key={o.id}
                onClick={() => mine && setSelOfficer(o.id)}
                className={`flex items-center gap-2 p-1 rounded ${selOfficer === o.id ? 'bg-yellow-900/40 border border-yellow-600' : 'bg-gray-800/60'} ${o.done ? 'opacity-50' : ''} ${mine ? 'cursor-pointer' : ''}`}>
                <Portrait officer={o} color={fac?.color ?? '#777'} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{o.name}{o.faction === null && <span className="text-emerald-400 ml-1">{T('在野', 'free')}</span>}</div>
                  <div className="text-[9px] text-gray-400">統{o.led} 武{o.war} 智{o.int} 政{o.pol} 魅{o.cha}</div>
                </div>
                {o.done && <span className="text-[9px] text-gray-500">{T('已行動', 'done')}</span>}
              </div>
            );
          })}
        </div>

        {/* Commands */}
        {canCmd && (
          <div className="mt-3 border-t border-gray-700 pt-2">
            <div className="text-[10px] text-gray-400 mb-1">{T('指令', 'Command')}：{sel!.name}</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <Cmd label={T('開發農業', 'Develop Agri')} onClick={() => { cmdDevelop(s, sel!.id, 'agri'); after(); }} />
              <Cmd label={T('開發商業', 'Develop Comm')} onClick={() => { cmdDevelop(s, sel!.id, 'comm'); after(); }} />
              <Cmd label={T('整治治安', 'Order')} onClick={() => { cmdDevelop(s, sel!.id, 'order'); after(); }} />
              <Cmd label={T('安撫民心', 'Loyalty')} onClick={() => { cmdDevelop(s, sel!.id, 'loyalty'); after(); }} />
              <Cmd label={T('徵兵 3000', 'Draft 3000')} onClick={() => { cmdDraft(s, sel!.id, 3000); after(); }} />
              <Cmd label={T('訓練城防', 'Train')} onClick={() => { cmdTrain(s, sel!.id); after(); }} />
            </div>
            {freeHere.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-gray-400 mb-1">{T('登用在野', 'Recruit')}</div>
                <div className="flex flex-wrap gap-1">
                  {freeHere.map(fo => (
                    <button key={fo.id} onClick={() => { cmdRecruit(s, sel!.id, fo.id); after(); }}
                      className="text-[10px] bg-emerald-800 hover:bg-emerald-700 px-2 py-1 rounded">{fo.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );

    function after() { setSelOfficer(null); soundService.playMove(); bump(); }
  }

  function Cmd({ label, onClick }: { label: string; onClick: () => void }) {
    return <button onClick={onClick} className="bg-arcade-secondary hover:bg-gray-700 rounded px-2 py-1.5 text-left">{label}</button>;
  }

  function BattlePanel() {
    const bs = s.battle!;
    const playerSide = bs.attacker === s.playerFaction ? 'atk' : 'def';
    const yourPhase = bs.side === playerSide && !bs.result;
    const sel = bs.selected != null ? bs.units[bs.selected] : null;
    const selO = sel ? s.officers[sel.officerId] : null;
    const city = s.cities[bs.cityId];
    return (
      <div className="bg-gray-900/70 rounded-lg border border-gray-700 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-sm" style={{ color: s.factions[bs.attacker].color }}>
            <Shield size={14} className="inline mr-1" />{city.name}{T('攻防戰', ' Siege')}
          </h3>
          <span className="text-xs text-gray-400">{T('回合', 'Round')} {bs.round}/{bs.maxRounds}</span>
        </div>
        <div className={`text-center font-pixel text-xs py-1 rounded ${yourPhase ? 'bg-emerald-800' : 'bg-gray-700'}`}>
          {bs.result ? T('戰鬥結束', 'Battle Over')
            : yourPhase ? T('你的回合', 'YOUR PHASE') : T('敵軍行動中…', 'Enemy phase…')}
        </div>

        {sel && selO && (
          <div className="bg-gray-800/70 rounded p-2 text-xs">
            <div className="font-bold">{selO.name}（{sel.type === 'cavalry' ? T('騎兵', 'Cav') : sel.type === 'archer' ? T('弓兵', 'Arc') : T('步兵', 'Inf')}）</div>
            <div className="text-gray-300">{T('兵力', 'HP')} {sel.hp}/{sel.maxHp}　{T('士氣', 'Morale')} {sel.morale}</div>
            <div className="text-gray-400 text-[10px]">統{selO.led} 武{selO.war} 智{selO.int}</div>
          </div>
        )}

        {yourPhase && (
          <div className="grid grid-cols-2 gap-1 text-xs">
            <button disabled={!sel || sel.acted || (selO?.int ?? 0) < 50}
              onClick={() => { if (sel) { bs.mode = 'fire'; bs.reachable = []; bump(); } }}
              className={`flex items-center justify-center gap-1 rounded py-1.5 ${bs.mode === 'fire' ? 'bg-orange-600' : 'bg-arcade-secondary hover:bg-gray-700'} disabled:opacity-40`}>
              <Flame size={13} /> {T('火計', 'Fire')}
            </button>
            <button disabled={!sel}
              onClick={() => { if (sel) { sel.acted = true; sel.moved = true; bs.selected = null; bs.reachable = []; bump(); } }}
              className="bg-arcade-secondary hover:bg-gray-700 rounded py-1.5 disabled:opacity-40">{T('待機', 'Wait')}</button>
            <button onClick={() => { endPhase(bs); bump(); }}
              className="col-span-2 bg-arcade-primary hover:bg-red-600 rounded py-1.5 font-pixel">{T('結束我方回合', 'END PHASE')}</button>
          </div>
        )}
        {bs.mode === 'fire' && <div className="text-[10px] text-orange-300 text-center">{T('點選敵方位置施放火計（範圍3）', 'Click an enemy tile (range 3)')}</div>}

        <div className="text-[11px] text-gray-300 max-h-40 overflow-y-auto border-t border-gray-700 pt-1 mt-1">
          {bs.log.slice(0, 12).map((l, i) => <div key={i} className="border-b border-gray-800 pb-0.5">{l}</div>)}
        </div>
      </div>
    );
  }
};

// ---- Army composition modal (rendered at root via portal-less overlay) ----
// Kept outside the component tree above? We render it inline below.

export default ThreeKingdomsGame;
