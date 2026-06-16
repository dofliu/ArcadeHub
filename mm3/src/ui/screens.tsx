import React, { useEffect, useMemo, useState } from 'react';
import { Character, EquipSlot, GameState, Gender, Alignment } from '../types';
import * as E from '../engine';
import {
  RACES, CLASSES, MONSTERS, raceMap, classMap, spellMap, itemMap, monsterMap, npcMap, shopMap,
  QUESTS, townMap, PORTRAITS_PER_RACE,
} from '../data/content';
import { Btn, Panel, Bar, charLabel, StatusBadges } from './common';
import { Portrait, PortraitOf } from './portraits';
import { drawMonsterPortrait } from '../render';
import {
  Swords, Shield, Sparkles, Wand2, FlaskConical, Footprints, Coins, Gem, Store, Cross, BedDouble,
  Beer, ScrollText, ArrowLeft, Dices, Users, CheckCircle2, CircleAlert, Circle, GraduationCap, BookOpen,
  Tent, Save, FolderOpen, Trash2, Beef, Trophy,
} from 'lucide-react';

type Apply = (fn: (d: GameState) => void) => void;
type Sfx = (n: any) => void;
const ATTR_ZH: Record<string, string> = { might: '力', intellect: '智', personality: '魅', endurance: '耐', speed: '速', accuracy: '準', luck: '運' };
const ATTRS = ['might', 'intellect', 'personality', 'endurance', 'speed', 'accuracy', 'luck'] as const;

// item type badge + stat line (shop / sheet)
const itemBadge = (it: any): { label: string; color: string } => {
  switch (it.type) {
    case 'weapon': return { label: '武', color: '#e05a4f' };
    case 'armor': return { label: '甲', color: '#4a7ec7' };
    case 'shield': return { label: '盾', color: '#3aa0c0' };
    case 'helm': return { label: '盔', color: '#38a898' };
    case 'cloak': return { label: '袍', color: '#8a6bc7' };
    case 'boots': return { label: '靴', color: '#b07a48' };
    case 'accessory': return { label: '飾', color: '#a855f7' };
    case 'consumable': return { label: '藥', color: '#22c55e' };
    default: return { label: '物', color: '#888' };
  }
};
const itemStat = (it: any): string => {
  const parts: string[] = [];
  if (it.dmg) parts.push(`⚔ ${it.dmg[0]}–${it.dmg[1]}`);
  if (it.atkBonus) parts.push(`命中+${it.atkBonus}`);
  if (it.acBonus) parts.push(`🛡 AC+${it.acBonus}`);
  if (it.heal) parts.push(`💊 HP+${it.heal}`);
  if (it.restore) parts.push(`✦ SP+${it.restore}`);
  if (it.element) parts.push({ fire: '🔥', cold: '❄', electric: '⚡', holy: '✝', poison: '☠' }[it.element as string] || '');
  if (it.attrBonus) for (const k of Object.keys(it.attrBonus)) parts.push(`${ATTR_ZH[k]}+${it.attrBonus[k]}`);
  return parts.join(' ');
};

// ============ Intro story ============
const INTRO_BEATS: { title: string; text: string }[] = [
  { title: '泰拉群島', text: '在無垠之海的彼端，漂浮著由古文明餘暉守護的「泰拉群島」。千百年來，島民在守護者寶珠的庇佑下安居樂業。' },
  { title: '黑暗降臨', text: '然而，索皮加地城深處的巫妖王甦醒，奪走了「泰拉星界寶珠」。失去庇佑的群島，怪物橫行、暗潮洶湧。' },
  { title: '英雄的召喚', text: '當守護者寶珠的力量逐漸消逝，傳說中的核心試煉——泰拉守護者，也開始躁動。群島的命運，需要一支無畏的隊伍。' },
  { title: '你的旅程', text: '組建你的六人隊伍，橫越索皮加、泉源、灣望與荒野，討伐巫妖王、平息四方災厄，最終直面泰拉的核心。傳說，由此展開。' },
];
export const IntroScreen: React.FC<{ apply: Apply }> = ({ apply }) => {
  const [page, setPage] = useState(0);
  const last = page >= INTRO_BEATS.length - 1;
  const beat = INTRO_BEATS[page];
  return (
    <div className="w-full max-w-xl flex flex-col items-center gap-4">
      <Panel className="w-full text-center min-h-[200px] flex flex-col justify-center">
        <div className="font-rune text-mm-gold text-2xl mb-3">{beat.title}</div>
        <p className="text-mm-light/85 leading-relaxed text-[15px] px-2">{beat.text}</p>
      </Panel>
      <div className="flex items-center gap-2">
        {INTRO_BEATS.map((_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full ${i === page ? 'bg-mm-gold' : 'bg-mm-edge'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        <Btn onClick={() => apply(d => { d.screen = 'create'; })}>跳過</Btn>
        {last
          ? <Btn variant="primary" className="px-6" onClick={() => apply(d => { d.screen = 'create'; })}>組建隊伍 ▸</Btn>
          : <Btn variant="gold" className="px-6" onClick={() => setPage(p => p + 1)}>繼續 ▸</Btn>}
      </div>
    </div>
  );
};

// ============ Party Creation ============
const RACE_IDS = RACES.map(r => r.id);
const CLASS_IDS = CLASSES.map(c => c.id);
export const CreateScreen: React.FC<{ apply: Apply }> = ({ apply }) => {
  const [chars, setChars] = useState<Character[]>(() =>
    [0, 1, 2, 3, 4, 5].map(i => E.makeCharacter(
      i, E.NAMES[i],
      ['human', 'elf', 'human', 'dwarf', 'half-orc', 'gnome'][i],
      ['knight', 'sorcerer', 'cleric', 'barbarian', 'robber', 'druid'][i],
      i % 2 === 0 ? 'male' : 'female', 'good', i % PORTRAITS_PER_RACE,
    ))
  );
  const setSlot = (i: number, ch: Character) => setChars(prev => prev.map((c, j) => (j === i ? ch : c)));
  const rebuild = (i: number, patch: Partial<{ raceId: string; classId: string; name: string; gender: Gender; alignment: Alignment; portraitId: number }>) => {
    const cur = chars[i];
    const ch = E.makeCharacter(cur.id, patch.name ?? cur.name, patch.raceId ?? cur.raceId, patch.classId ?? cur.classId,
      patch.gender ?? cur.gender, patch.alignment ?? cur.alignment, patch.portraitId ?? cur.portraitId);
    setSlot(i, ch);
  };

  return (
    <div className="w-full max-w-5xl">
      <h2 className="font-rune text-2xl text-mm-gold text-center mb-1">組建你的隊伍</h2>
      <p className="text-center text-mm-light/50 text-sm mb-4">挑選六位冒險者的種族與職業，擲骰決定能力值。</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {chars.map((c, i) => (
          <Panel key={i}>
            <div className="flex items-start gap-2 mb-2">
              <button onClick={() => rebuild(i, { portraitId: (c.portraitId + 1) % PORTRAITS_PER_RACE })}
                className="rounded border border-[#14100a] overflow-hidden shrink-0" title="換髮型">
                <Portrait raceId={c.raceId} classId={c.classId} gender={c.gender} portraitId={c.portraitId} size={52} />
              </button>
              <div className="flex-1 min-w-0">
                <input value={c.name} onChange={e => rebuild(i, { name: e.target.value.slice(0, 8) })}
                  className="bg-black/40 border border-mm-edge rounded px-2 py-1 text-sm w-full text-mm-light mb-1" />
                <div className="text-[11px] text-mm-light/60">HP {c.maxHp} · SP {c.maxSp}</div>
              </div>
              <Btn variant="gold" onClick={() => rebuild(i, {})}><Dices size={14} /></Btn>
            </div>
            <div className="flex gap-1.5 mb-2 text-xs flex-wrap">
              <select value={c.raceId} onChange={e => rebuild(i, { raceId: e.target.value })} className="bg-black/40 border border-mm-edge rounded px-1.5 py-1">
                {RACE_IDS.map(id => <option key={id} value={id}>{raceMap[id].name}</option>)}
              </select>
              <select value={c.classId} onChange={e => rebuild(i, { classId: e.target.value })} className="bg-black/40 border border-mm-edge rounded px-1.5 py-1">
                {CLASS_IDS.map(id => <option key={id} value={id}>{classMap[id].name}</option>)}
              </select>
              <select value={c.gender} onChange={e => rebuild(i, { gender: e.target.value as Gender })} className="bg-black/40 border border-mm-edge rounded px-1.5 py-1">
                <option value="male">男</option><option value="female">女</option>
              </select>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-1">
              {ATTRS.map(k => (
                <div key={k} className="bg-black/30 rounded py-1">
                  <div className="text-mm-light/40">{ATTR_ZH[k]}</div>
                  <div className="text-mm-light font-bold">{c.attrs[k]}</div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-mm-light/40">{classMap[c.classId].desc}</div>
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
const BUILDING_META: Record<string, { label: string; icon: any }> = {
  shop: { label: '商店', icon: Store }, temple: { label: '神殿', icon: Cross }, inn: { label: '旅店', icon: BedDouble },
  training: { label: '訓練場', icon: GraduationCap }, dialog: { label: '酒館', icon: Beer },
};
export const TownScreen: React.FC<{ g: GameState; apply: Apply; sfx?: Sfx }> = ({ g, apply, sfx }) => {
  const town = townMap[g.townId] || townMap.sorpigal;
  const enter = (b: { id: string; kind: string }) => {
    sfx?.('select');
    const shop = shopMap[b.id];
    if (b.kind === 'shop') apply(d => { d.shopId = b.id; d.screen = 'shop'; });
    else if (b.kind === 'dialog') apply(d => { d.dialog = { npcId: b.id, node: E.npcRootNode(d, b.id) }; d.screen = 'dialog'; });
    else if (b.kind === 'training') apply(d => { d.shopId = b.id; d.screen = 'train'; });
    else if (b.kind === 'temple') apply(d => {
      const cost = shop?.healCost || 30;
      if (d.gold < cost) { E.toast(d, `金幣不足（需 ${cost}）`); return; }
      d.gold -= cost; E.restPartyFull(d); E.pushLog(d, `${shop?.name || '神殿'}治癒並淨化了你的隊伍。`);
      sfx?.('holy');
    });
    else if (b.kind === 'inn') apply(d => {
      E.restPartyFull(d); E.advanceTime(d, 8 * 60); d.day += 0; E.pushLog(d, `你在${shop?.name || '旅店'}休息了一晚。`); E.saveGame(d);
      sfx?.('rest');
    });
  };
  const cardCls = 'bg-mm-panel hover:bg-mm-edge border border-mm-edge rounded-lg p-3 flex flex-col items-center gap-1.5 transition';
  return (
    <div className="w-full max-w-2xl text-center">
      <p className="text-mm-light/50 text-sm mb-3">{town.blurb}</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {town.buildings.map(b => {
          const meta = BUILDING_META[b.kind] || BUILDING_META.shop;
          const Icon = meta.icon;
          const shop = shopMap[b.id];
          return (
            <button key={b.id} onClick={() => enter(b)} className={cardCls}>
              <Icon size={24} className="text-mm-gold" />
              <span className="text-xs">{shop?.name?.replace(town.name, '') || meta.label}</span>
            </button>
          );
        })}
      </div>

      {town.npcs.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-center gap-1 text-mm-light/50 text-xs mb-2"><Users size={13} /> 城鎮居民</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {town.npcs.map(id => {
              const badge = npcQuestBadge(g, id);
              return (
                <Btn key={id} onClick={() => { sfx?.('select'); apply(d => { d.dialog = { npcId: id, node: E.npcEntryNode(d, id) }; d.screen = 'dialog'; }); }}>
                  {npcMap[id].name}
                  {badge === 'new' && <CircleAlert size={13} className="inline ml-1 text-mm-gold" />}
                  {badge === 'ready' && <CheckCircle2 size={13} className="inline ml-1 text-green-400" />}
                </Btn>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center mt-4">
        <Btn variant="primary" onClick={() => apply(d => { d.screen = 'overworld'; })}>
          <Footprints size={16} className="inline mr-1" />前往地表
        </Btn>
      </div>
    </div>
  );
};

function npcQuestBadge(g: GameState, npcId: string): 'new' | 'ready' | '' {
  const q = QUESTS.find(qq => qq.giver === npcId);
  if (!q) return '';
  const st = g.quests[q.id];
  if (!st || st === 'inactive') return 'new';
  if (st === 'active') {
    if (q.itemRequired) return g.backpack.includes(q.itemRequired) ? 'ready' : '';
    if (q.clearedRequired) return g.clearedEncounters.includes(q.clearedRequired) ? 'ready' : '';
  }
  return '';
}

// ============ Quest Log ============
export const QuestLogScreen: React.FC<{ g: GameState; apply: Apply }> = ({ g, apply }) => {
  const active = QUESTS.filter(q => g.quests[q.id] === 'active');
  const done = QUESTS.filter(q => g.quests[q.id] === 'complete');
  const ready = (q: typeof QUESTS[number]) =>
    g.quests[q.id] === 'active' && (q.itemRequired ? g.backpack.includes(q.itemRequired)
      : q.clearedRequired ? g.clearedEncounters.includes(q.clearedRequired) : false);
  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center mb-3">
        <ScrollText className="text-mm-gold mr-2" />
        <h2 className="font-rune text-xl text-mm-gold">任務日誌</h2>
        <Btn className="ml-auto" onClick={() => apply(d => { d.screen = d.party.length ? d.prevExplore : 'title'; })}>
          <ArrowLeft size={14} className="inline mr-1" />返回
        </Btn>
      </div>
      <Panel title={`進行中 (${active.length})`} className="mb-3">
        {active.length === 0 && <div className="text-mm-light/40 text-sm">沒有進行中的任務。</div>}
        {active.map(q => (
          <div key={q.id} className="flex gap-2 py-1.5 border-b border-mm-edge/40 text-sm">
            {ready(q) ? <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0" /> : <Circle size={16} className="text-mm-light/30 mt-0.5 shrink-0" />}
            <div>
              <div className="text-mm-light font-bold">{q.main && <span className="text-mm-gold">★ </span>}{q.name} {ready(q) && <span className="text-green-400 text-xs">（可回報）</span>}</div>
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
export const ShopScreen: React.FC<{ g: GameState; apply: Apply; sfx?: Sfx }> = ({ g, apply, sfx }) => {
  const shop = shopMap[g.shopId || ''] || shopMap.weapon_smith;
  const [tab, setTab] = useState<'buy' | 'sell' | 'learn'>('buy');
  const [learnChar, setLearnChar] = useState(0);
  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center mb-3">
        <Store className="text-mm-gold mr-2" />
        <h2 className="font-rune text-xl text-mm-gold">{shop.name}</h2>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-mm-gold flex items-center gap-1"><Coins size={14} />{g.gold}</span>
          <span className="text-cyan-300 flex items-center gap-1"><Gem size={13} />{g.gems}</span>
        </span>
      </div>
      <div className="flex gap-2 mb-3">
        <Btn variant={tab === 'buy' ? 'gold' : 'ghost'} onClick={() => setTab('buy')}>購買</Btn>
        <Btn variant={tab === 'sell' ? 'gold' : 'ghost'} onClick={() => setTab('sell')}>販售</Btn>
        {shop.kind === 'magic' && <Btn variant={tab === 'learn' ? 'gold' : 'ghost'} onClick={() => setTab('learn')}>學習法術</Btn>}
      </div>

      {tab === 'buy' && (
        <Panel className="space-y-1 max-h-80 overflow-auto">
          {shop.stock.map(id => {
            const it = itemMap[id]; const badge = itemBadge(it); const stat = itemStat(it);
            return (
              <div key={id} className="flex items-center gap-2 py-1.5 border-b border-mm-edge/40">
                <span className="text-[11px] font-bold rounded px-1.5 py-0.5 min-w-[1.6rem] text-center shrink-0"
                  style={{ background: badge.color + '28', color: badge.color, border: `1px solid ${badge.color}44` }}>{badge.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-mm-light leading-tight">{it.name}</div>
                  {stat && <div className="text-[10px] text-mm-light/45 leading-tight">{stat}</div>}
                </div>
                <span className="text-mm-gold text-sm w-16 text-right shrink-0">{it.value}</span>
                <Btn variant="gold" disabled={g.gold < it.value} onClick={() => apply(d => { if (E.buyItem(d, id)) sfx?.('buy'); })}>買</Btn>
              </div>
            );
          })}
        </Panel>
      )}

      {tab === 'sell' && (
        <Panel className="space-y-1 max-h-80 overflow-auto">
          {g.backpack.length === 0 && <div className="text-mm-light/40 text-sm">背包是空的。</div>}
          {g.backpack.map((id, i) => {
            const it = itemMap[id]; if (it.type === 'quest') return null;
            const badge = itemBadge(it);
            return (
              <div key={id + i} className="flex items-center gap-2 py-1 border-b border-mm-edge/40">
                <span className="text-[11px] font-bold rounded px-1.5 py-0.5 min-w-[1.6rem] text-center shrink-0"
                  style={{ background: badge.color + '28', color: badge.color }}>{badge.label}</span>
                <span className="flex-1 text-sm">{it.name}</span>
                <span className="text-mm-gold w-14 text-right">{Math.floor(it.value / 2)}</span>
                <Btn onClick={() => apply(d => { E.sellItem(d, id); sfx?.('buy'); })}>賣</Btn>
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
          <div className="space-y-1 max-h-64 overflow-auto">
            {(shop.spells || []).map(sid => {
              const sp = spellMap[sid]; const ch = g.party[learnChar];
              const sch = classMap[ch.classId].school;
              const canClass = sch === sp.school || sch === 'both';
              const known = ch.spells.includes(sid);
              const price = sp.level * 150;
              return (
                <div key={sid} className="flex items-center gap-2 py-1 border-b border-mm-edge/40">
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${sp.school === 'cleric' ? 'text-mm-holy' : 'text-mm-arcane'}`}>{sp.name}</span>
                    <span className="text-mm-light/40 text-xs"> L{sp.level}・{sp.cost}SP{sp.gemCost ? `・${sp.gemCost}💎` : ''}</span>
                    <div className="text-[10px] text-mm-light/40 leading-tight">{sp.desc}</div>
                  </div>
                  <span className="text-mm-gold w-14 text-right text-sm">{price}</span>
                  <Btn variant="primary" disabled={!canClass || known || g.gold < price} onClick={() => apply(d => { if (E.learnSpell(d, learnChar, sid)) sfx?.('buy'); })}>
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

// ============ Training ============
export const TrainScreen: React.FC<{ g: GameState; apply: Apply; active: number; setActive: (i: number) => void; sfx?: Sfx }> = ({ g, apply }) => {
  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center mb-3">
        <GraduationCap className="text-mm-gold mr-2" />
        <h2 className="font-rune text-xl text-mm-gold">{shopMap[g.shopId || '']?.name || '訓練場'}</h2>
        <span className="ml-auto text-mm-gold flex items-center gap-1"><Coins size={14} />{g.gold}</span>
      </div>
      <Panel className="space-y-1">
        <div className="text-xs text-mm-light/50 mb-1">支付金幣以晉升等級（需足夠經驗）。費用 = 等級 × 100。</div>
        {g.party.map((c, i) => {
          const ready = c.xp >= E.xpForNext(c.level);
          const cost = c.level * 100;
          return (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-mm-edge/40">
              <PortraitOf ch={c} size={34} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-mm-light">{c.name} <span className="text-mm-light/40 text-xs">L{c.level} {classMap[c.classId].name}</span></div>
                <div className="text-[10px] text-mm-light/45">XP {c.xp}/{E.xpForNext(c.level)}</div>
              </div>
              {ready
                ? <Btn variant="gold" disabled={g.gold < cost} onClick={() => apply(d => { E.trainAt(d, i); })}>晉升（{cost}）</Btn>
                : <span className="text-mm-light/30 text-xs">經驗不足</span>}
            </div>
          );
        })}
      </Panel>
      <div className="mt-3">
        <Btn onClick={() => apply(d => { d.shopId = null; d.screen = 'town'; })}><ArrowLeft size={14} className="inline mr-1" />離開</Btn>
      </div>
    </div>
  );
};

// ============ Rest ============
export const RestScreen: React.FC<{ g: GameState; apply: Apply; sfx?: Sfx }> = ({ g, apply, sfx }) => {
  const back = () => apply(d => { d.screen = d.prevExplore; });
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center mb-3">
        <Tent className="text-mm-gold mr-2" />
        <h2 className="font-rune text-xl text-mm-gold">紮營休息</h2>
        <Btn className="ml-auto" onClick={back}><ArrowLeft size={14} className="inline mr-1" />返回</Btn>
      </div>
      <Panel className="text-center space-y-3">
        <div className="text-sm text-mm-light/70">休息可完全恢復全隊 HP / SP，並解除沉睡、恐懼與麻痺。</div>
        <div className="flex items-center justify-center gap-2 text-orange-300"><Beef size={16} />食物存量：{g.food}</div>
        <div className="text-xs text-mm-light/40">每次休息消耗 1 份食物，時間推進 8 小時。中毒與疾病需以法術或藥水解除。</div>
        <Btn variant="primary" disabled={g.food <= 0} className="px-6 py-2"
          onClick={() => apply(d => { if (E.restParty(d)) { sfx?.('rest'); } })}>
          <Tent size={15} className="inline mr-1" />休息（消耗 1 食物）
        </Btn>
        {g.food <= 0 && <div className="text-red-400 text-xs">沒有食物了！到商店購買口糧。</div>}
      </Panel>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-3">
        {g.party.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-mm-panel/60 rounded p-1.5 border border-mm-edge/40">
            <PortraitOf ch={c} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] truncate">{c.name}</div>
              <Bar value={c.hp} max={c.maxHp} color="bg-red-500" />
              {c.maxSp > 0 && <Bar value={c.sp} max={c.maxSp} color="bg-blue-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ Save / Load ============
export const SavesScreen: React.FC<{ g: GameState; apply: Apply; replace: (g: GameState) => void }> = ({ g, apply, replace }) => {
  const [, force] = useState(0);
  const slots = E.saveSlots();
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center mb-3">
        <Save className="text-mm-gold mr-2" />
        <h2 className="font-rune text-xl text-mm-gold">存讀檔</h2>
        <Btn className="ml-auto" onClick={() => apply(d => { d.screen = d.party.length ? d.prevExplore : 'title'; })}><ArrowLeft size={14} className="inline mr-1" />返回</Btn>
      </div>
      <Panel className="space-y-2">
        {slots.map(s => {
          const has = E.hasSave(s);
          return (
            <div key={s} className="flex items-center gap-2 py-1 border-b border-mm-edge/40">
              <span className="text-mm-light/70 text-sm w-16">存檔 {s}</span>
              <span className="flex-1 text-xs text-mm-light/40">{has ? '有存檔' : '（空）'}</span>
              <Btn variant="gold" onClick={() => { apply(d => E.saveGame(d, s)); force(x => x + 1); }}><Save size={13} className="inline mr-1" />存</Btn>
              <Btn disabled={!has} onClick={() => { const ld = E.loadGame(s); if (ld) replace(ld); }}><FolderOpen size={13} className="inline mr-1" />讀</Btn>
              <Btn variant="danger" disabled={!has} onClick={() => { E.clearSave(s); force(x => x + 1); }}><Trash2 size={13} /></Btn>
            </div>
          );
        })}
      </Panel>
      <div className="text-xs text-mm-light/40 mt-2 text-center">旅店休息會自動存入主存檔。</div>
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
  | { t: 'menu' } | { t: 'attack' } | { t: 'spellList' }
  | { t: 'spellTargetEnemy'; spellId: string } | { t: 'spellTargetAlly'; spellId: string }
  | { t: 'itemList' } | { t: 'itemTarget'; itemId: string };

export const CombatPanel: React.FC<{ g: GameState; apply: Apply; sfx?: Sfx }> = ({ g, apply, sfx }) => {
  const [mode, setMode] = useState<CombatMode>({ t: 'menu' });
  const actor = useMemo(() => {
    const a = E.currentActor(g);
    return a && a.side === 'party' ? g.party[a.idx] : null;
  }, [g]);

  const reset = () => setMode({ t: 'menu' });
  const wrap = (fn: (d: GameState) => void) => { sfx?.('select'); apply(fn); reset(); };

  if (!actor) return <Panel className="w-full text-center text-mm-light/60 text-sm">戰鬥進行中…</Panel>;

  const aliveMonsters = g.combat!.monsters.map((m, i) => ({ m, i })).filter(x => x.m.hp > 0);
  const consumables = g.backpack.filter(id => itemMap[id].type === 'consumable' && itemMap[id].id !== 'ration');

  return (
    <Panel className="w-full max-w-2xl">
      <div className="text-sm text-mm-neon mb-2 flex items-center gap-2">
        <PortraitOf ch={actor} size={26} /> 輪到 <b>{charLabel(actor)}</b> 行動
        <span className="ml-auto"><StatusBadges ch={actor} /></span>
      </div>

      {mode.t === 'menu' && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="danger" onClick={() => { sfx?.('select'); setMode({ t: 'attack' }); }}><Swords size={14} className="inline mr-1" />攻擊</Btn>
          <Btn onClick={() => wrap(d => E.combatBlock(d))}><Shield size={14} className="inline mr-1" />防禦</Btn>
          {actor.spells.length > 0 && <Btn variant="primary" onClick={() => { sfx?.('select'); setMode({ t: 'spellList' }); }}><Sparkles size={14} className="inline mr-1" />法術</Btn>}
          {consumables.length > 0 && <Btn variant="gold" onClick={() => { sfx?.('select'); setMode({ t: 'itemList' }); }}><FlaskConical size={14} className="inline mr-1" />道具</Btn>}
          <Btn onClick={() => { sfx?.('select'); apply(d => E.combatRun(d)); }}><Footprints size={14} className="inline mr-1" />逃跑</Btn>
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
          <div className="text-xs text-mm-light/50 mb-1">選擇法術（SP {actor.sp}/{actor.maxSp}・💎{g.gems}）：</div>
          <div className="flex flex-wrap gap-2">
            {actor.spells.map(sid => {
              const sp = spellMap[sid];
              const noGems = sp.gemCost ? g.gems < sp.gemCost : false;
              return (
                <Btn key={sid} variant="primary" disabled={actor.sp < sp.cost || noGems}
                  onClick={() => {
                    sfx?.('select');
                    if (sp.target === 'allEnemies' || sp.target === 'party' || sp.target === 'self') wrap(d => E.combatCast(d, sid, -1));
                    else if (sp.target === 'enemy') setMode({ t: 'spellTargetEnemy', spellId: sid });
                    else setMode({ t: 'spellTargetAlly', spellId: sid });
                  }}>
                  {sp.name}（{sp.cost}{sp.gemCost ? `+${sp.gemCost}💎` : ''}）
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
            <Btn key={i} onClick={() => wrap(d => E.combatCast(d, mode.spellId, i))}>{c.name}（{c.hp}/{c.maxHp}）</Btn>
          ))}
          <Btn onClick={reset}>取消</Btn>
        </div>
      )}

      {mode.t === 'itemList' && (
        <div className="flex flex-wrap gap-2">
          {consumables.map((id, k) => (
            <Btn key={id + k} variant="gold" onClick={() => { sfx?.('select'); setMode({ t: 'itemTarget', itemId: id }); }}>{itemMap[id].name}</Btn>
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

// ============ Combat summary ============
export const CombatSummaryScreen: React.FC<{ g: GameState; apply: Apply }> = ({ g, apply }) => {
  const s = g.combatSummary;
  const [countdown, setCountdown] = useState(5);
  const cont = () => apply(d => { d.combatSummary = null; });

  useEffect(() => {
    if (!s) return;
    if (countdown <= 0) { apply(d => { d.combatSummary = null; }); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, s]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(d => { d.combatSummary = null; }); } };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  });

  if (!s) return null;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border-2 border-mm-gold/60 bg-gradient-to-b from-[#2b2418] to-[#171008] p-5 text-center"
        style={{ boxShadow: '0 0 30px rgba(231,181,59,0.3)' }}>
        <Trophy className="inline text-mm-gold mb-1" size={36} />
        <div className="font-rune text-mm-gold text-xl mb-3">{s.boss ? '強敵討伐！' : '戰鬥勝利！'}</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-black/30 rounded py-2"><div className="text-mm-light/50 text-xs">經驗</div><div className="text-mm-light font-bold">+{s.xp}</div></div>
          <div className="bg-black/30 rounded py-2"><div className="text-mm-light/50 text-xs">金幣</div><div className="text-mm-gold font-bold">+{s.gold}</div></div>
          <div className="bg-black/30 rounded py-2"><div className="text-mm-light/50 text-xs">寶石</div><div className="text-cyan-300 font-bold">+{s.gems}</div></div>
        </div>
        {s.drops.length > 0 && <div className="text-sm text-mm-gold mb-2">獲得：{s.drops.join('、')}</div>}
        {s.levelUps.length > 0 && <div className="text-sm text-green-400 mb-2">⭐ 升級：{s.levelUps.join('、')}</div>}
        <Btn variant="gold" className="px-6 py-2 mt-1" onClick={cont}>繼續冒險{countdown > 0 ? `（${countdown}）` : ''}</Btn>
      </div>
    </div>
  );
};

// ============ Character sheet & inventory ============
const SLOTS: { slot: EquipSlot; label: string }[] = [
  { slot: 'weapon', label: '武器' }, { slot: 'armor', label: '盔甲' }, { slot: 'shield', label: '盾牌' },
  { slot: 'helm', label: '頭盔' }, { slot: 'cloak', label: '披風' }, { slot: 'boots', label: '靴子' }, { slot: 'accessory', label: '飾品' },
];

export const SheetScreen: React.FC<{ g: GameState; apply: Apply; active: number; setActive: (i: number) => void; sfx?: Sfx }> = ({ g, apply, active, setActive }) => {
  const ch = g.party[active];
  const cls = classMap[ch.classId];
  const equippableForSlot = (slot: EquipSlot) => g.backpack.filter(id => itemMap[id].slot === slot);
  const [invSlot, setInvSlot] = useState<EquipSlot | null>(null);

  return (
    <div className="w-full max-w-3xl">
      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        {g.party.map((c, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`rounded border overflow-hidden ${active === i ? 'border-mm-gold' : 'border-mm-edge opacity-70'}`} title={c.name}>
            <PortraitOf ch={c} size={32} />
          </button>
        ))}
        <Btn className="ml-auto" onClick={() => apply(d => { d.screen = d.party.length ? (d.combat ? 'combat' : d.prevExplore) : 'title'; })}>
          <ArrowLeft size={14} className="inline mr-1" />返回
        </Btn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Panel title={`${charLabel(ch)}　L${ch.level}`}>
          <div className="flex gap-3 mb-2">
            <div className="rounded border border-[#14100a] overflow-hidden shrink-0"><PortraitOf ch={ch} size={64} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-mm-light/60 mb-1">{raceMap[ch.raceId].name} · {cls.name} · {ch.gender === 'male' ? '♂' : '♀'}</div>
              <div className="text-[11px] text-mm-light/50 mb-1">XP {ch.xp}/{E.xpForNext(ch.level)}</div>
              <div className="space-y-1">
                <Bar value={ch.hp} max={ch.maxHp} color="bg-red-500" />
                {ch.maxSp > 0 && <Bar value={ch.sp} max={ch.maxSp} color="bg-blue-500" />}
              </div>
              <div className="mt-1"><StatusBadges ch={ch} /></div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-3">
            {ATTRS.map(k => (
              <div key={k} className="bg-black/30 rounded py-1">
                <div className="text-mm-light/40">{ATTR_ZH[k]}</div>
                <div className="font-bold">{E.effAttr(ch, k)}</div>
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
                  <span className="flex-1 min-w-0 truncate">{eqId ? itemMap[eqId].name : <span className="text-mm-light/30">（空）</span>}</span>
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

        <Panel title="法術書">
          {ch.spells.length === 0 ? <div className="text-mm-light/30 text-sm">尚未習得法術。</div> : (
            <div className="space-y-1 max-h-44 overflow-auto">
              {ch.spells.map(sid => {
                const sp = spellMap[sid];
                return (
                  <div key={sid} className="flex items-center gap-2 text-sm">
                    <span className={`flex-1 ${sp.school === 'cleric' ? 'text-mm-holy' : 'text-mm-arcane'}`}>{sp.name}<span className="text-mm-light/40 text-xs"> · {sp.cost}SP{sp.gemCost ? `+${sp.gemCost}💎` : ''}</span></span>
                    {sp.usableOutside && (sp.kind === 'heal' || sp.kind === 'cureDead' || sp.kind === 'cureStatus') && (
                      <CastOutsideBtn g={g} apply={apply} casterIdx={active} spellId={sid} />
                    )}
                    {sp.usableOutside && (sp.kind === 'light' || sp.kind === 'town_portal') && (
                      <Btn onClick={() => apply(d => E.castOutside(d, active, sid, active))}>施放</Btn>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title={`背包（${g.backpack.length}）`}>
          <div className="space-y-1 max-h-44 overflow-auto">
            {g.backpack.length === 0 && <div className="text-mm-light/30 text-sm">空空如也。</div>}
            {g.backpack.map((id, k) => {
              const it = itemMap[id]; const badge = itemBadge(it);
              return (
                <div key={id + k} className="flex items-center gap-2 text-sm">
                  <span className="text-[10px] font-bold rounded px-1 min-w-[1.4rem] text-center shrink-0"
                    style={{ background: badge.color + '28', color: badge.color }}>{it.type === 'quest' ? '★' : badge.label}</span>
                  <span className="flex-1 min-w-0 truncate">{it.name}</span>
                  {it.type === 'consumable' && <Btn variant="gold" onClick={() => apply(d => E.useConsumable(d, id, active))}>用</Btn>}
                  {it.slot && <Btn onClick={() => apply(d => E.equipItem(d, active, id))}>裝</Btn>}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
};

// ============ Bestiary ============
const FAMILY_ZH: Record<string, string> = {
  beast: '野獸', humanoid: '人型', undead: '不死', dragon: '龍類', demon: '惡魔', elemental: '元素', construct: '造物', aberration: '異怪',
};
const MonsterIcon: React.FC<{ defId: string }> = ({ defId }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (ctx) drawMonsterPortrait(ctx, defId, cv.width, cv.height);
  }, [defId]);
  return <canvas ref={ref} width={88} height={70} className="rounded border border-[#14100a] w-full" style={{ imageRendering: 'pixelated' }} />;
};
export const BestiaryScreen: React.FC<{ g: GameState; apply: Apply }> = ({ g, apply }) => {
  const seen = g.bestiary.length, total = MONSTERS.length;
  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-center mb-3">
        <BookOpen className="text-mm-gold mr-2" />
        <h2 className="font-rune text-xl text-mm-gold">怪物圖鑑</h2>
        <span className="ml-3 text-mm-light/50 text-sm">已記錄 {seen}/{total}</span>
        <Btn className="ml-auto" onClick={() => apply(d => { d.screen = d.party.length ? d.prevExplore : 'title'; })}>
          <ArrowLeft size={14} className="inline mr-1" />返回
        </Btn>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MONSTERS.map(mn => {
          const known = g.bestiary.includes(mn.id);
          if (!known) return (
            <Panel key={mn.id} className="text-center opacity-60">
              <div className="h-[70px] flex items-center justify-center text-3xl text-mm-light/30">？</div>
              <div className="text-mm-light/40 text-xs mt-1">未發現</div>
            </Panel>
          );
          return (
            <Panel key={mn.id} className="">
              <MonsterIcon defId={mn.id} />
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-mm-light font-bold truncate">{mn.name}{mn.boss && <span className="text-mm-gold"> ★</span>}</span>
                <span className="text-[9px] text-mm-light/40">{FAMILY_ZH[mn.family || ''] || ''}</span>
              </div>
              <div className="grid grid-cols-4 gap-0.5 text-center text-[9px] mt-1">
                <div className="bg-black/30 rounded py-0.5"><div className="text-red-400">HP</div>{mn.hp}</div>
                <div className="bg-black/30 rounded py-0.5"><div className="text-blue-300">AC</div>{mn.ac}</div>
                <div className="bg-black/30 rounded py-0.5"><div className="text-orange-300">傷</div>{mn.dmg[0]}-{mn.dmg[1]}</div>
                <div className="bg-black/30 rounded py-0.5"><div className="text-mm-gold">XP</div>{mn.xp}</div>
              </div>
              <div className="text-[10px] text-mm-light/45 mt-1 leading-tight">{mn.desc}</div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
};

const CastOutsideBtn: React.FC<{ g: GameState; apply: Apply; casterIdx: number; spellId: string }> = ({ g, apply, casterIdx, spellId }) => {
  const [pick, setPick] = useState(false);
  if (!pick) return <Btn onClick={() => setPick(true)}>施放</Btn>;
  return (
    <span className="flex gap-1 flex-wrap">
      {g.party.map((c, i) => (
        <button key={i} className="text-xs px-1.5 py-0.5 bg-mm-edge rounded" onClick={() => { apply(d => E.castOutside(d, casterIdx, spellId, i)); setPick(false); }}>
          {c.name}
        </button>
      ))}
    </span>
  );
};
