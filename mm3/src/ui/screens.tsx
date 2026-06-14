import React, { useMemo, useState } from 'react';
import { Character, EquipSlot, GameState } from '../types';
import * as E from '../engine';
import {
  RACES, CLASSES, raceMap, classMap, spellMap, itemMap, monsterMap, npcMap, questMap, shopMap, SHOPS,
  TOWN_NPCS, QUESTS,
} from '../data/content';
import { Btn, Panel, Bar, PartyBar, charLabel } from './common';
import {
  Swords, Shield, Sparkles, Wand2, FlaskConical, Footprints, Coins, Store, Cross, BedDouble,
  Beer, ScrollText, Backpack, ArrowLeft, Dices, Users, CheckCircle2, CircleAlert, Circle,
} from 'lucide-react';

type Apply = (fn: (d: GameState) => void) => void;

// ============ Party Creation ============
export const CreateScreen: React.FC<{ apply: Apply }> = ({ apply }) => {
  const [chars, setChars] = useState<Character[]>(() =>
    [0, 1, 2, 3].map(i => E.makeCharacter(i, E.NAMES[i], ['human', 'elf', 'dwarf', 'half-orc'][i], ['knight', 'sorcerer', 'cleric', 'robber'][i]))
  );
  const setSlot = (i: number, ch: Character) => setChars(prev => prev.map((c, j) => (j === i ? ch : c)));
  const rebuild = (i: number, patch: { raceId?: string; classId?: string; name?: string }) => {
    const cur = chars[i];
    const ch = E.makeCharacter(cur.id, patch.name ?? cur.name, patch.raceId ?? cur.raceId, patch.classId ?? cur.classId);
    setSlot(i, ch);
  };
  const reroll = (i: number) => rebuild(i, {});

  return (
    <div className="w-full max-w-4xl">
      <h2 className="font-rune text-2xl text-mm-gold text-center mb-1">組建你的隊伍</h2>
      <p className="text-center text-mm-light/50 text-sm mb-4">挑選四位冒險者的種族與職業，擲骰決定能力值。</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {chars.map((c, i) => (
          <Panel key={i} className="">
            <div className="flex items-center gap-2 mb-2">
              <input
                value={c.name}
                onChange={e => rebuild(i, { name: e.target.value.slice(0, 8) })}
                className="bg-black/40 border border-mm-edge rounded px-2 py-1 text-sm w-28 text-mm-light"
              />
              <Btn variant="gold" className="ml-auto" onClick={() => reroll(i)}><Dices size={14} className="inline mr-1" />擲骰</Btn>
            </div>
            <div className="flex gap-2 mb-2 text-xs flex-wrap">
              <select value={c.raceId} onChange={e => rebuild(i, { raceId: e.target.value })} className="bg-black/40 border border-mm-edge rounded px-2 py-1">
                {RACES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <select value={c.classId} onChange={e => rebuild(i, { classId: e.target.value })} className="bg-black/40 border border-mm-edge rounded px-2 py-1">
                {CLASSES.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
              </select>
              <span className="text-mm-light/60 self-center">HP {c.maxHp} · SP {c.maxSp}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
              {(['might', 'intellect', 'personality', 'endurance', 'speed', 'accuracy', 'luck'] as const).map(k => (
                <div key={k} className="bg-black/30 rounded py-1">
                  <div className="text-mm-light/40">{({ might: '力', intellect: '智', personality: '魅', endurance: '耐', speed: '速', accuracy: '準', luck: '運' } as any)[k]}</div>
                  <div className="text-mm-light font-bold">{c.attrs[k]}</div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-mm-light/40 mt-1">{classMap[c.classId].desc}</div>
          </Panel>
        ))}
      </div>
      <div className="flex justify-center mt-4">
        <Btn variant="primary" className="px-8 py-2" onClick={() => apply(d => E.startAdventure(d, chars))}>
          <Footprints size={16} className="inline mr-1" />踏上旅程
        </Btn>
      </div>
    </div>
  );
};

// ============ Town Hub ============
export const TownScreen: React.FC<{ g: GameState; apply: Apply }> = ({ g, apply }) => {
  const buildings = [
    { id: 'weapon_smith', label: '武器鋪', icon: Swords, kind: 'shop' },
    { id: 'armorer', label: '防具鋪', icon: Shield, kind: 'shop' },
    { id: 'magic_guild', label: '魔法公會', icon: Wand2, kind: 'shop' },
    { id: 'temple', label: '神殿', icon: Cross, kind: 'temple' },
    { id: 'inn', label: '旅店', icon: BedDouble, kind: 'inn' },
    { id: 'tavern_keeper', label: '酒館', icon: Beer, kind: 'dialog' },
  ];
  const enter = (b: { id: string; kind: string }) => {
    if (b.kind === 'shop') apply(d => { d.shopId = b.id; d.screen = 'shop'; });
    else if (b.kind === 'dialog') apply(d => { d.dialog = { npcId: b.id, node: E.npcRootNode(d, b.id) }; d.screen = 'dialog'; });
    else if (b.kind === 'temple') apply(d => {
      const cost = 30;
      if (d.gold < cost) { E.toast(d, '金幣不足（需 30）'); return; }
      d.gold -= cost; E.restPartyFull(d); E.pushLog(d, '神殿治癒了你的隊伍。');
    });
    else if (b.kind === 'inn') apply(d => {
      E.restPartyFull(d); d.day += 1; E.pushLog(d, `你在旅店休息了一晚。（第 ${d.day} 天）`); E.saveGame(d);
    });
  };
  return (
    <div className="w-full max-w-3xl text-center">
      <h2 className="font-rune text-2xl text-mm-gold mb-1">索皮加城 Sorpigal</h2>
      <p className="text-mm-light/50 text-sm mb-4">泰拉群島上最後的安全據點。</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {buildings.map(b => (
          <button key={b.id} onClick={() => enter(b)}
            className="bg-mm-panel hover:bg-mm-edge border border-mm-edge rounded-lg p-4 flex flex-col items-center gap-2 transition">
            <b.icon size={28} className="text-mm-gold" />
            <span className="text-sm">{b.label}</span>
          </button>
        ))}
      </div>
      <div className="text-xs text-mm-light/40 mt-3">神殿：30 金幣全體治療復活  · 旅店：免費休息並存檔</div>

      <div className="mt-4">
        <div className="flex items-center justify-center gap-1 text-mm-light/50 text-xs mb-2"><Users size={13} /> 城鎮居民</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {TOWN_NPCS.map(id => {
            const badge = npcQuestBadge(g, id);
            return (
              <Btn key={id} onClick={() => apply(d => { d.dialog = { npcId: id, node: E.npcEntryNode(d, id) }; d.screen = 'dialog'; })}>
                {npcMap[id].name}
                {badge === 'new' && <CircleAlert size={13} className="inline ml-1 text-mm-gold" />}
                {badge === 'ready' && <CheckCircle2 size={13} className="inline ml-1 text-green-400" />}
              </Btn>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <Btn variant="primary" onClick={() => apply(d => { d.screen = 'overworld'; })}>
          <Footprints size={16} className="inline mr-1" />前往地表
        </Btn>
      </div>
    </div>
  );
};

// quest indicator for an NPC: 'new' = has a quest to give, 'ready' = active quest ready to turn in
function npcQuestBadge(g: GameState, npcId: string): 'new' | 'ready' | '' {
  const q = QUESTS.find(qq => qq.giver === npcId);
  if (!q) return '';
  const st = g.quests[q.id];
  if (!st || st === 'inactive') return 'new';
  if (st === 'active') {
    if (q.itemRequired) return g.backpack.includes(q.itemRequired) ? 'ready' : '';
    if (q.id === 'goblin_threat') return g.clearedEncounters.includes('overworld:7,6') ? 'ready' : '';
  }
  return '';
}

// ============ Quest Log ============
export const QuestLogScreen: React.FC<{ g: GameState; apply: Apply }> = ({ g, apply }) => {
  const active = QUESTS.filter(q => g.quests[q.id] === 'active');
  const done = QUESTS.filter(q => g.quests[q.id] === 'complete');
  const ready = (q: typeof QUESTS[number]) =>
    g.quests[q.id] === 'active' && (q.itemRequired ? g.backpack.includes(q.itemRequired)
      : q.id === 'goblin_threat' ? g.clearedEncounters.includes('overworld:7,6') : false);
  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center mb-3">
        <ScrollText className="text-mm-gold mr-2" />
        <h2 className="font-rune text-xl text-mm-gold">任務日誌</h2>
        <Btn className="ml-auto" onClick={() => apply(d => { d.screen = d.party.length ? 'town' : 'title'; })}>
          <ArrowLeft size={14} className="inline mr-1" />返回
        </Btn>
      </div>
      <Panel title={`進行中 (${active.length})`} className="mb-3">
        {active.length === 0 && <div className="text-mm-light/40 text-sm">沒有進行中的任務。</div>}
        {active.map(q => (
          <div key={q.id} className="flex gap-2 py-1.5 border-b border-mm-edge/40 text-sm">
            {ready(q) ? <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0" /> : <Circle size={16} className="text-mm-light/30 mt-0.5 shrink-0" />}
            <div>
              <div className="text-mm-light font-bold">{q.name} {ready(q) && <span className="text-green-400 text-xs">（可回報）</span>}</div>
              <div className="text-mm-light/60 text-xs">{q.desc}</div>
              {!ready(q) && q.hint && <div className="text-mm-gold/70 text-xs mt-0.5">提示：{q.hint}</div>}
              <div className="text-mm-light/40 text-[10px] mt-0.5">獎勵：{q.rewardGold} 金幣 · {q.rewardXp} 經驗</div>
            </div>
          </div>
        ))}
      </Panel>
      <Panel title={`已完成 (${done.length})`}>
        {done.length === 0 && <div className="text-mm-light/40 text-sm">尚無完成的任務。</div>}
        {done.map(q => (
          <div key={q.id} className="flex gap-2 py-1 text-sm text-mm-light/50">
            <CheckCircle2 size={15} className="text-green-500/60 mt-0.5 shrink-0" />
            <span className="line-through">{q.name}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
};

// ============ Shop ============
export const ShopScreen: React.FC<{ g: GameState; apply: Apply }> = ({ g, apply }) => {
  const shop = shopMap[g.shopId || ''] || SHOPS[0];
  const [tab, setTab] = useState<'buy' | 'sell' | 'learn'>('buy');
  const [learnChar, setLearnChar] = useState(0);
  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center mb-3">
        <Store className="text-mm-gold mr-2" />
        <h2 className="font-rune text-xl text-mm-gold">{shop.name}</h2>
        <span className="ml-auto text-mm-gold flex items-center gap-1"><Coins size={14} />{g.gold}</span>
      </div>
      <div className="flex gap-2 mb-3">
        <Btn variant={tab === 'buy' ? 'gold' : 'ghost'} onClick={() => setTab('buy')}>購買</Btn>
        <Btn variant={tab === 'sell' ? 'gold' : 'ghost'} onClick={() => setTab('sell')}>販售</Btn>
        {shop.kind === 'magic' && <Btn variant={tab === 'learn' ? 'gold' : 'ghost'} onClick={() => setTab('learn')}>學習法術</Btn>}
      </div>

      {tab === 'buy' && (
        <Panel className="space-y-1 max-h-72 overflow-auto">
          {shop.stock.map(id => {
            const it = itemMap[id];
            return (
              <div key={id} className="flex items-center gap-2 text-sm py-1 border-b border-mm-edge/40">
                <span className="flex-1">{it.name} <span className="text-mm-light/40 text-xs">{it.desc}</span></span>
                <span className="text-mm-gold w-16 text-right">{it.value}</span>
                <Btn variant="gold" disabled={g.gold < it.value} onClick={() => apply(d => E.buyItem(d, id))}>買</Btn>
              </div>
            );
          })}
        </Panel>
      )}

      {tab === 'sell' && (
        <Panel className="space-y-1 max-h-72 overflow-auto">
          {g.backpack.length === 0 && <div className="text-mm-light/40 text-sm">背包是空的。</div>}
          {g.backpack.map((id, i) => {
            const it = itemMap[id];
            if (it.type === 'quest') return null;
            return (
              <div key={id + i} className="flex items-center gap-2 text-sm py-1 border-b border-mm-edge/40">
                <span className="flex-1">{it.name}</span>
                <span className="text-mm-gold w-16 text-right">{Math.floor(it.value / 2)}</span>
                <Btn onClick={() => apply(d => E.sellItem(d, id))}>賣</Btn>
              </div>
            );
          })}
        </Panel>
      )}

      {tab === 'learn' && shop.kind === 'magic' && (
        <Panel>
          <div className="flex gap-2 mb-2 flex-wrap">
            {g.party.map((c, i) => (
              <Btn key={i} variant={learnChar === i ? 'gold' : 'ghost'} onClick={() => setLearnChar(i)}>
                {c.name}（{classMap[c.classId].name}）
              </Btn>
            ))}
          </div>
          <div className="space-y-1 max-h-56 overflow-auto">
            {(shop.spells || []).map(sid => {
              const sp = spellMap[sid];
              const ch = g.party[learnChar];
              const canClass = classMap[ch.classId].school === sp.school;
              const known = ch.spells.includes(sid);
              const price = sp.level * 150;
              return (
                <div key={sid} className="flex items-center gap-2 text-sm py-1 border-b border-mm-edge/40">
                  <span className={`flex-1 ${sp.school === 'cleric' ? 'text-mm-holy' : 'text-mm-arcane'}`}>
                    {sp.name} <span className="text-mm-light/40 text-xs">L{sp.level}・{sp.cost}SP</span>
                  </span>
                  <span className="text-mm-gold w-14 text-right">{price}</span>
                  <Btn variant="primary" disabled={!canClass || known || g.gold < price} onClick={() => apply(d => E.learnSpell(d, learnChar, sid))}>
                    {known ? '已會' : !canClass ? '✗' : '學'}
                  </Btn>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="mt-3">
        <Btn onClick={() => apply(d => { d.shopId = null; d.screen = 'town'; })}><ArrowLeft size={14} className="inline mr-1" />離開</Btn>
      </div>
    </div>
  );
};

// ============ Dialog ============
export const DialogScreen: React.FC<{ g: GameState; apply: Apply }> = ({ g, apply }) => {
  if (!g.dialog) return null;
  const npc = npcMap[g.dialog.npcId];
  const node = npc.nodes[g.dialog.node];
  return (
    <div className="w-full max-w-xl">
      <Panel title={npc.name}>
        <p className="text-mm-light/90 leading-relaxed mb-4">{node.text}</p>
        <div className="space-y-2">
          {node.options.filter(opt => E.condMet(g, opt.cond)).map((opt, i) => (
            <Btn key={i} className="w-full text-left" onClick={() => apply(d => {
              if (opt.action) E.applyDialogAction(d, opt.action);
              if (opt.action?.openShop) { d.shopId = opt.action.openShop; d.screen = 'shop'; d.dialog = null; return; }
              if (opt.to) { d.dialog = { npcId: g.dialog!.npcId, node: opt.to }; }
              else { d.dialog = null; d.screen = 'town'; }
            })}>
              ▸ {opt.label}
            </Btn>
          ))}
        </div>
      </Panel>
    </div>
  );
};

// ============ Combat action panel ============
type CombatMode =
  | { t: 'menu' }
  | { t: 'attack' }
  | { t: 'spellList' }
  | { t: 'spellTargetEnemy'; spellId: string }
  | { t: 'spellTargetAlly'; spellId: string }
  | { t: 'itemList' }
  | { t: 'itemTarget'; itemId: string };

export const CombatPanel: React.FC<{ g: GameState; apply: Apply }> = ({ g, apply }) => {
  const [mode, setMode] = useState<CombatMode>({ t: 'menu' });
  const actor = useMemo(() => {
    const a = E.currentActor(g);
    return a && a.side === 'party' ? g.party[a.idx] : null;
  }, [g]);

  const reset = () => setMode({ t: 'menu' });
  const wrap = (fn: (d: GameState) => void) => { apply(fn); reset(); };

  if (!actor) {
    return <Panel className="w-full text-center text-mm-light/60 text-sm">戰鬥進行中…</Panel>;
  }

  const aliveMonsters = g.combat!.monsters.map((m, i) => ({ m, i })).filter(x => x.m.hp > 0);
  const consumables = g.backpack.filter(id => itemMap[id].type === 'consumable');

  return (
    <Panel className="w-full">
      <div className="text-sm text-mm-neon mb-2">輪到 <b>{charLabel(actor)}</b> 行動</div>

      {mode.t === 'menu' && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="danger" onClick={() => setMode({ t: 'attack' })}><Swords size={14} className="inline mr-1" />攻擊</Btn>
          <Btn onClick={() => wrap(d => E.combatBlock(d))}><Shield size={14} className="inline mr-1" />防禦</Btn>
          {actor.spells.length > 0 && <Btn variant="primary" onClick={() => setMode({ t: 'spellList' })}><Sparkles size={14} className="inline mr-1" />法術</Btn>}
          {consumables.length > 0 && <Btn variant="gold" onClick={() => setMode({ t: 'itemList' })}><FlaskConical size={14} className="inline mr-1" />道具</Btn>}
          <Btn onClick={() => apply(d => E.combatRun(d))}><Footprints size={14} className="inline mr-1" />逃跑</Btn>
        </div>
      )}

      {mode.t === 'attack' && (
        <div>
          <div className="text-xs text-mm-light/50 mb-1">選擇攻擊目標：</div>
          <div className="flex flex-wrap gap-2">
            {aliveMonsters.map(({ m, i }) => (
              <Btn key={m.uid} variant="danger" onClick={() => wrap(d => E.combatAttack(d, i))}>
                {monsterMap[m.defId].name}（{m.hp}）
              </Btn>
            ))}
            <Btn onClick={reset}>取消</Btn>
          </div>
        </div>
      )}

      {mode.t === 'spellList' && (
        <div>
          <div className="text-xs text-mm-light/50 mb-1">選擇法術（SP {actor.sp}/{actor.maxSp}）：</div>
          <div className="flex flex-wrap gap-2">
            {actor.spells.map(sid => {
              const sp = spellMap[sid];
              return (
                <Btn key={sid} variant="primary" disabled={actor.sp < sp.cost}
                  onClick={() => {
                    if (sp.target === 'allEnemies' || sp.target === 'party' || sp.target === 'self') wrap(d => E.combatCast(d, sid, -1));
                    else if (sp.target === 'enemy') setMode({ t: 'spellTargetEnemy', spellId: sid });
                    else setMode({ t: 'spellTargetAlly', spellId: sid });
                  }}>
                  {sp.name}（{sp.cost}）
                </Btn>
              );
            })}
            <Btn onClick={reset}>取消</Btn>
          </div>
        </div>
      )}

      {mode.t === 'spellTargetEnemy' && (
        <div className="flex flex-wrap gap-2">
          {aliveMonsters.map(({ m, i }) => (
            <Btn key={m.uid} variant="danger" onClick={() => wrap(d => E.combatCast(d, mode.spellId, i))}>
              {monsterMap[m.defId].name}（{m.hp}）
            </Btn>
          ))}
          <Btn onClick={reset}>取消</Btn>
        </div>
      )}

      {mode.t === 'spellTargetAlly' && (
        <div className="flex flex-wrap gap-2">
          {g.party.map((c, i) => (
            <Btn key={i} onClick={() => wrap(d => E.combatCast(d, mode.spellId, i))}>
              {c.name}（{c.hp}/{c.maxHp}）
            </Btn>
          ))}
          <Btn onClick={reset}>取消</Btn>
        </div>
      )}

      {mode.t === 'itemList' && (
        <div className="flex flex-wrap gap-2">
          {consumables.map((id, k) => (
            <Btn key={id + k} variant="gold" onClick={() => setMode({ t: 'itemTarget', itemId: id })}>{itemMap[id].name}</Btn>
          ))}
          <Btn onClick={reset}>取消</Btn>
        </div>
      )}

      {mode.t === 'itemTarget' && (
        <div className="flex flex-wrap gap-2">
          {g.party.map((c, i) => (
            <Btn key={i} onClick={() => wrap(d => E.combatItem(d, mode.itemId, i))}>{c.name}</Btn>
          ))}
          <Btn onClick={reset}>取消</Btn>
        </div>
      )}
    </Panel>
  );
};

// ============ Character sheet & inventory ============
const SLOTS: { slot: EquipSlot; label: string }[] = [
  { slot: 'weapon', label: '武器' }, { slot: 'armor', label: '盔甲' }, { slot: 'shield', label: '盾牌' },
  { slot: 'helm', label: '頭盔' }, { slot: 'accessory', label: '飾品' },
];

export const SheetScreen: React.FC<{ g: GameState; apply: Apply; active: number; setActive: (i: number) => void }> = ({ g, apply, active, setActive }) => {
  const ch = g.party[active];
  const cls = classMap[ch.classId];
  const equippableForSlot = (slot: EquipSlot) => g.backpack.filter(id => itemMap[id].slot === slot);
  const [invSlot, setInvSlot] = useState<EquipSlot | null>(null);

  return (
    <div className="w-full max-w-3xl">
      <div className="flex gap-2 mb-3 flex-wrap">
        {g.party.map((c, i) => (
          <Btn key={i} variant={active === i ? 'gold' : 'ghost'} onClick={() => setActive(i)}>{c.name}</Btn>
        ))}
        <Btn className="ml-auto" onClick={() => apply(d => { d.screen = d.party.length ? (d.prevExplore === 'dungeon' && d.combat ? 'combat' : 'town') : 'title'; })}>
          <ArrowLeft size={14} className="inline mr-1" />返回
        </Btn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Panel title={`${charLabel(ch)}　L${ch.level}`}>
          <div className="text-xs text-mm-light/60 mb-2">{raceMap[ch.raceId].name} · {cls.name} · XP {ch.xp}/{E.xpForNext(ch.level)}</div>
          <div className="space-y-1 mb-3">
            <Bar value={ch.hp} max={ch.maxHp} color="bg-red-500" />
            {ch.maxSp > 0 && <Bar value={ch.sp} max={ch.maxSp} color="bg-blue-500" />}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-3">
            {(['might', 'intellect', 'personality', 'endurance', 'speed', 'accuracy', 'luck'] as const).map(k => (
              <div key={k} className="bg-black/30 rounded py-1">
                <div className="text-mm-light/40">{({ might: '力', intellect: '智', personality: '魅', endurance: '耐', speed: '速', accuracy: '準', luck: '運' } as any)[k]}</div>
                <div className="font-bold">{ch.attrs[k]}</div>
              </div>
            ))}
          </div>
          <div className="text-xs grid grid-cols-3 gap-2 text-center">
            <div className="bg-black/30 rounded py-1"><div className="text-mm-light/40">防禦</div><div className="font-bold">{E.defenseOf(ch)}</div></div>
            <div className="bg-black/30 rounded py-1"><div className="text-mm-light/40">命中</div><div className="font-bold">+{E.attackBonusOf(ch)}</div></div>
            <div className="bg-black/30 rounded py-1"><div className="text-mm-light/40">護甲</div><div className="font-bold">{E.armorAc(ch)}</div></div>
          </div>
        </Panel>

        <Panel title="裝備">
          <div className="space-y-1">
            {SLOTS.map(({ slot, label }) => {
              const eqId = ch.equipment[slot];
              return (
                <div key={slot} className="flex items-center gap-2 text-sm">
                  <span className="text-mm-light/50 w-10">{label}</span>
                  <span className="flex-1">{eqId ? itemMap[eqId].name : <span className="text-mm-light/30">（空）</span>}</span>
                  {eqId && <Btn onClick={() => apply(d => E.unequipItem(d, active, slot))}>卸下</Btn>}
                  <Btn variant="gold" onClick={() => setInvSlot(invSlot === slot ? null : slot)}>更換</Btn>
                </div>
              );
            })}
          </div>
          {invSlot && (
            <div className="mt-2 border-t border-mm-edge/40 pt-2">
              <div className="text-xs text-mm-light/50 mb-1">背包中可裝備的{SLOTS.find(s => s.slot === invSlot)?.label}：</div>
              <div className="flex flex-wrap gap-1">
                {equippableForSlot(invSlot).length === 0 && <span className="text-mm-light/30 text-xs">無</span>}
                {equippableForSlot(invSlot).map((id, k) => (
                  <Btn key={id + k} onClick={() => apply(d => { E.equipItem(d, active, id); })}>{itemMap[id].name}</Btn>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="法術書" className="md:col-span-1">
          {ch.spells.length === 0 ? <div className="text-mm-light/30 text-sm">尚未習得法術。</div> : (
            <div className="space-y-1 max-h-44 overflow-auto">
              {ch.spells.map(sid => {
                const sp = spellMap[sid];
                return (
                  <div key={sid} className="flex items-center gap-2 text-sm">
                    <span className={`flex-1 ${sp.school === 'cleric' ? 'text-mm-holy' : 'text-mm-arcane'}`}>{sp.name}<span className="text-mm-light/40 text-xs"> · {sp.cost}SP</span></span>
                    {sp.usableOutside && (sp.kind === 'heal' || sp.kind === 'cureDead') && (
                      <CastOutsideBtn g={g} apply={apply} casterIdx={active} spellId={sid} />
                    )}
                    {sp.usableOutside && sp.kind === 'light' && (
                      <Btn onClick={() => apply(d => E.castOutside(d, active, sid, active))}>施放</Btn>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="背包" className="md:col-span-1">
          <div className="space-y-1 max-h-44 overflow-auto">
            {g.backpack.length === 0 && <div className="text-mm-light/30 text-sm">空空如也。</div>}
            {g.backpack.map((id, k) => {
              const it = itemMap[id];
              return (
                <div key={id + k} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{it.name} <span className="text-mm-light/40 text-xs">{it.type === 'quest' ? '★任務' : ''}</span></span>
                  {it.type === 'consumable' && <Btn variant="gold" onClick={() => apply(d => E.useConsumable(d, id, active))}>使用</Btn>}
                  {it.slot && <Btn onClick={() => apply(d => E.equipItem(d, active, id))}>裝備</Btn>}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
};

const CastOutsideBtn: React.FC<{ g: GameState; apply: Apply; casterIdx: number; spellId: string }> = ({ g, apply, casterIdx, spellId }) => {
  const [pick, setPick] = useState(false);
  if (!pick) return <Btn onClick={() => setPick(true)}>施放</Btn>;
  return (
    <span className="flex gap-1">
      {g.party.map((c, i) => (
        <button key={i} className="text-xs px-1.5 py-0.5 bg-mm-edge rounded" onClick={() => { apply(d => E.castOutside(d, casterIdx, spellId, i)); setPick(false); }}>
          {c.name}
        </button>
      ))}
    </span>
  );
};
