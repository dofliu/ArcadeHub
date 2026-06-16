// ===== Pure-ish game engine. Operates on a JSON-serializable GameState. =====
import {
  GameState, Character, Attrs, AttrKey, Combat, CombatMonster, EncounterDef,
  ChestDef, DialogAction, DialogCond, EquipSlot, StatusEffect, ArmorWeight, Gender, Alignment,
  MapEvent, Element,
} from './types';
import {
  raceMap, classMap, spellMap, itemMap, monsterMap, mapMap, questMap, npcMap, townMap,
} from './data/content';

// ---------- RNG ----------
export const rnd = (n: number) => Math.floor(Math.random() * n);
export const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const roll = (d: [number, number]) => rint(d[0], d[1]);
export const d20 = () => rint(1, 20);
export const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));

export const attrMod = (v: number) => Math.floor((v - 10) / 2);

const ATTR_KEYS: AttrKey[] = ['might', 'intellect', 'personality', 'endurance', 'speed', 'accuracy', 'luck'];
const WEIGHT_RANK: Record<ArmorWeight, number> = { light: 0, medium: 1, heavy: 2 };

export const SAVE_VERSION = 2;

export const NAMES = ['亞瑟', '蘭斯', '希爾達', '莫甘娜', '崔斯坦', '伊瑟', '羅倫', '菲歐娜', '凱恩', '賽拉', '達戈', '葛溫'];

// ---------- character building ----------
export function rollAttrs(): Attrs {
  const a = {} as Attrs;
  for (const k of ATTR_KEYS) {
    // 4d4+3 ≈ 7..19, centred ~13
    a[k] = 3 + rint(1, 4) + rint(1, 4) + rint(1, 4) + rint(1, 4);
  }
  return a;
}

// which attribute powers a class's spellcasting
function castAttr(classId: string): AttrKey {
  const c = classMap[classId];
  return c.school === 'sorcerer' ? 'intellect' : 'personality';
}

// effective attribute value including equipment bonuses
export function effAttr(ch: Character, key: AttrKey): number {
  let v = ch.attrs[key];
  for (const slot of Object.keys(ch.equipment) as EquipSlot[]) {
    const id = ch.equipment[slot];
    const it = id ? itemMap[id] : null;
    if (it?.attrBonus?.[key]) v += it.attrBonus[key]!;
  }
  return v;
}

export function recompute(ch: Character) {
  const cls = classMap[ch.classId];
  const endMod = attrMod(effAttr(ch, 'endurance'));
  ch.maxHp = Math.max(1, (cls.hitDie + Math.max(0, endMod)) * ch.level + 2);
  if (cls.spDie > 0) {
    const cm = attrMod(effAttr(ch, castAttr(ch.classId)));
    ch.maxSp = Math.max(0, (cls.spDie + Math.max(0, cm)) * ch.level);
  } else {
    ch.maxSp = 0;
  }
  if (ch.hp > ch.maxHp) ch.hp = ch.maxHp;
  if (ch.sp > ch.maxSp) ch.sp = ch.maxSp;
}

// portrait set size per race (renderer draws variations)
export const PORTRAITS_PER_RACE = 4;

const STARTING_GEAR: Record<string, Partial<Record<EquipSlot, string>>> = {
  knight:    { weapon: 'long_sword', armor: 'chain', shield: 'buckler' },
  paladin:   { weapon: 'mace', armor: 'leather', shield: 'buckler' },
  archer:    { weapon: 'short_bow', armor: 'leather' },
  cleric:    { weapon: 'mace', armor: 'leather' },
  sorcerer:  { weapon: 'dagger', armor: 'robe' },
  robber:    { weapon: 'short_sword', armor: 'leather' },
  ninja:     { weapon: 'short_sword', armor: 'leather' },
  barbarian: { weapon: 'battle_axe', armor: 'studded' },
  druid:     { weapon: 'dagger', armor: 'robe' },
};

export function makeCharacter(
  id: number, name: string, raceId: string, classId: string,
  gender: Gender = 'male', alignment: Alignment = 'good', portraitId = 0,
): Character {
  const race = raceMap[raceId];
  const attrs = rollAttrs();
  for (const k of ATTR_KEYS) {
    if (race.mods[k]) attrs[k] += race.mods[k]!;
  }
  const cls = classMap[classId];
  const ch: Character = {
    id, name, raceId, classId, gender, alignment, portraitId,
    level: 1, xp: 0, attrs,
    hp: 1, maxHp: 1, sp: 0, maxSp: 0, condition: 'ok', status: {},
    equipment: { ...(STARTING_GEAR[classId] || { weapon: 'dagger' }) },
    spells: [...cls.startSpells],
  };
  recompute(ch);
  ch.hp = ch.maxHp;
  ch.sp = ch.maxSp;
  return ch;
}

// ---------- equipment rules ----------
export function canEquip(ch: Character, itemId: string): { ok: boolean; reason?: string } {
  const it = itemMap[itemId];
  if (!it || !it.slot) return { ok: false, reason: '無法裝備' };
  const cls = classMap[ch.classId];
  if (it.type === 'armor' && it.weight && WEIGHT_RANK[it.weight] > WEIGHT_RANK[cls.maxArmor]) {
    return { ok: false, reason: `${cls.name}無法穿戴此重量的護甲` };
  }
  if (it.type === 'shield' && !cls.canShield) return { ok: false, reason: `${cls.name}無法使用盾牌` };
  if (it.type === 'shield' && ch.equipment.weapon && itemMap[ch.equipment.weapon]?.twoHanded) {
    return { ok: false, reason: '雙手武器無法同時持盾' };
  }
  if (it.type === 'weapon' && it.twoHanded && ch.equipment.shield) {
    return { ok: false, reason: '持盾時無法裝備雙手武器' };
  }
  return { ok: true };
}

// ---------- derived combat stats ----------
export function armorAc(ch: Character): number {
  let ac = 0;
  for (const slot of ['armor', 'shield', 'helm', 'accessory', 'cloak', 'boots'] as EquipSlot[]) {
    const it = ch.equipment[slot];
    if (it && itemMap[it]) ac += itemMap[it].acBonus || 0;
  }
  return ac;
}

export function defenseOf(ch: Character): number {
  return 10 + armorAc(ch) + Math.max(0, attrMod(effAttr(ch, 'speed'))) + (ch.buffAc || 0) + (ch.blocking ? 4 : 0);
}

export function attackBonusOf(ch: Character): number {
  const cls = classMap[ch.classId];
  const w = ch.equipment.weapon ? itemMap[ch.equipment.weapon] : null;
  const acc = ch.equipment.accessory ? itemMap[ch.equipment.accessory] : null;
  let b = cls.baseAttack + Math.floor(ch.level / 2) + attrMod(effAttr(ch, 'accuracy'))
    + (w?.atkBonus || 0) + (acc?.atkBonus || 0) + (ch.buffAtk || 0);
  if (ch.status.afraid) b -= 3;
  return b;
}

export function weaponDamageRoll(ch: Character): number {
  const w = ch.equipment.weapon ? itemMap[ch.equipment.weapon] : null;
  const base = w?.dmg ? roll(w.dmg) : rint(1, 2);
  return base + Math.max(0, attrMod(effAttr(ch, 'might'))) + (ch.buffAtk || 0);
}

export function weaponElement(ch: Character): Element | undefined {
  const w = ch.equipment.weapon ? itemMap[ch.equipment.weapon] : null;
  return w?.element;
}

export function critChance(ch: Character): number {
  const cls = classMap[ch.classId];
  const luck = Math.max(0, attrMod(effAttr(ch, 'luck'))) * 0.02;
  return cls.critMult + luck;
}

export const xpForNext = (level: number) => level * 300;

export function levelUp(g: GameState, ch: Character): boolean {
  let leveled = false;
  while (ch.xp >= xpForNext(ch.level)) {
    ch.xp -= xpForNext(ch.level);
    ch.level += 1;
    recompute(ch);
    ch.hp = ch.maxHp;
    ch.sp = ch.maxSp;
    pushLog(g, `⭐ ${ch.name} 升到了 ${ch.level} 級！`);
    leveled = true;
  }
  return leveled;
}

// ---------- log ----------
export function pushLog(g: GameState, m: string) {
  g.log = [...g.log, m].slice(-60);
}
export function toast(g: GameState, m: string) {
  g.messages = [...g.messages, m].slice(-3);
}

export const hasItem = (g: GameState, id: string) => g.backpack.includes(id);
export const aliveParty = (g: GameState) => g.party.filter(c => c.condition === 'ok' && c.hp > 0 && !c.status.paralyzed);
export const standingParty = (g: GameState) => g.party.filter(c => c.condition === 'ok' && c.hp > 0);

// ---------- new game ----------
export function newGame(): GameState {
  return {
    version: SAVE_VERSION,
    screen: 'title',
    prevExplore: 'overworld',
    party: [],
    active: 0,
    gold: 250,
    gems: 0,
    food: 12,
    day: 1,
    minutes: 8 * 60,
    townId: 'sorpigal',
    backpack: ['healing_potion', 'healing_potion', 'mana_potion', 'ration', 'ration'],
    pos: { mapId: 'overworld', x: 2, y: 12, dir: 0 },
    flags: {},
    quests: {},
    clearedEncounters: [],
    lootedChests: [],
    openedDoors: [],
    visitedMaps: ['overworld'],
    combat: null,
    combatSummary: null,
    dialog: null,
    shopId: null,
    sign: null,
    log: ['泰拉群島的命運，掌握在你的隊伍手中…'],
    messages: [],
    settings: { music: true, sound: true },
  };
}

export function startAdventure(g: GameState, party: Character[]) {
  g.party = party;
  g.screen = 'town';
  g.townId = 'sorpigal';
  pushLog(g, '你們抵達了索皮加城。');
}

// ---------- world / movement ----------
export function passableTerrain(ch: string): boolean {
  return ch !== '#' && ch !== '~' && ch !== '^' && ch !== 'T' && ch !== 'L';
}

export function tryStep(g: GameState, nx: number, ny: number): boolean {
  const map = mapMap[g.pos.mapId];
  if (ny < 0 || nx < 0 || ny >= map.grid.length || nx >= map.grid[0].length) return false;
  const cell = map.grid[ny][nx];
  const dkey = `${nx},${ny}`;
  const door = map.doors?.[dkey];
  if (cell === 'D' || door) {
    const opened = g.openedDoors.includes(`${map.id}:${dkey}`);
    if (!opened) {
      if (door?.locked && door.keyItem && !hasItem(g, door.keyItem)) {
        toast(g, `🔒 需要${itemMap[door.keyItem]?.name || '鑰匙'}才能開啟此門`);
        return false;
      }
      g.openedDoors = [...g.openedDoors, `${map.id}:${dkey}`];
      if (door?.flag) g.flags[door.flag] = true;
      pushLog(g, door?.text ? `你開啟了門。${door.text}` : '你開啟了一扇門。');
    }
  } else if (!passableTerrain(cell)) {
    return false;
  }
  g.pos.x = nx;
  g.pos.y = ny;
  advanceTime(g, 5);
  enterCell(g);
  return true;
}

export function turnDir(g: GameState, delta: number) {
  g.pos.dir = (((g.pos.dir + delta) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
}

export function advanceTime(g: GameState, mins: number) {
  g.minutes += mins;
  while (g.minutes >= 24 * 60) { g.minutes -= 24 * 60; g.day += 1; }
}

export function enterCell(g: GameState) {
  const map = mapMap[g.pos.mapId];
  const key = `${g.pos.x},${g.pos.y}`;
  const gkey = `${map.id}:${key}`;

  if (!g.visitedMaps.includes(map.id)) g.visitedMaps.push(map.id);

  const portal = map.portals?.[key];
  if (portal) {
    if (portal.needFlag && !g.flags[portal.needFlag]) {
      toast(g, '🚪 一股無形的力量阻擋著去路…');
    } else if (portal.toScreen === 'town') {
      g.screen = 'town';
      g.townId = portal.town || 'sorpigal';
      pushLog(g, `你進入了${portal.label || townMap[g.townId]?.name || '城鎮'}。`);
      return;
    } else {
      const tmap = mapMap[portal.toMap];
      g.pos = { mapId: portal.toMap, x: portal.to.x, y: portal.to.y, dir: (portal.to.dir ?? g.pos.dir) as 0 | 1 | 2 | 3 };
      g.screen = tmap.kind === 'dungeon' ? 'dungeon' : 'overworld';
      g.prevExplore = g.screen;
      if (!g.visitedMaps.includes(tmap.id)) g.visitedMaps.push(tmap.id);
      pushLog(g, `🚪 ${portal.label || '你移動到新的區域'}`);
      return;
    }
  }

  // scripted map event (shrine, sign-driven trap, etc.)
  const ev = map.events?.[key];
  if (ev) {
    const fired = applyMapEvent(g, ev);
    if (fired && g.screen === 'gameover') return;
  }

  const sign = map.signs?.[key];
  if (sign) g.sign = sign;
  else g.sign = null;

  const enc = map.encounters?.[key];
  if (enc && !g.clearedEncounters.includes(gkey)) {
    startCombat(g, gkey, enc, map.id);
    return;
  }

  const chest = map.chests?.[key];
  if (chest && !g.lootedChests.includes(gkey)) {
    lootChest(g, gkey, chest);
  }
}

function applyMapEvent(g: GameState, ev: MapEvent): boolean {
  if (ev.onceFlag && g.flags[ev.onceFlag]) return false;
  if (ev.onceFlag) g.flags[ev.onceFlag] = true;
  if (ev.text) { g.sign = ev.text; pushLog(g, ev.text); }
  if (ev.setFlag) g.flags[ev.setFlag] = true;
  if (ev.giveItem) { g.backpack.push(ev.giveItem); pushLog(g, `獲得 ${itemMap[ev.giveItem]?.name || ev.giveItem}。`); }
  if (ev.giveGold) { g.gold += ev.giveGold; pushLog(g, `獲得 ${ev.giveGold} 金幣。`); }
  if (ev.attrBoost) {
    for (const ch of g.party) ch.attrs[ev.attrBoost.attr] += ev.attrBoost.amount;
    g.party.forEach(recompute);
    pushLog(g, `全隊的${ATTR_LABEL[ev.attrBoost.attr]}永久提升了 ${ev.attrBoost.amount}！`);
  }
  if (ev.teachSpell) teachSpellTo(g, ev.teachSpell);
  if (ev.healParty) restPartyFull(g);
  if (ev.damage) {
    const dmg = roll(ev.damage);
    g.party.forEach(p => { if (p.condition === 'ok' && p.hp > 0) damageChar(g, p, dmg); });
    pushLog(g, `💥 陷阱！全隊受到 ${dmg} 傷害。`);
    if (standingParty(g).length === 0) { g.screen = 'gameover'; pushLog(g, '☠ 你的隊伍全滅了…'); }
  }
  return true;
}

const ATTR_LABEL: Record<AttrKey, string> = {
  might: '力量', intellect: '智力', personality: '魅力', endurance: '耐力', speed: '速度', accuracy: '準確', luck: '幸運',
};

function lootChest(g: GameState, gkey: string, chest: ChestDef) {
  g.lootedChests = [...g.lootedChests, gkey];
  // trap?
  if (chest.trapped) {
    const robber = g.party.find(c => (c.classId === 'robber' || c.classId === 'ninja') && c.condition === 'ok');
    const disarmed = robber && Math.random() < (0.4 + 0.04 * Math.max(0, attrMod(effAttr(robber, 'luck'))) + 0.03 * robber.level);
    if (disarmed) {
      pushLog(g, `🗝 ${robber!.name} 解除了寶箱的陷阱！`);
    } else {
      const dmg = roll(chest.trapDmg || [5, 12]);
      g.party.forEach(p => { if (p.condition === 'ok' && p.hp > 0) damageChar(g, p, dmg); });
      pushLog(g, `💥 寶箱陷阱觸發！全隊受到 ${dmg} 傷害。`);
      toast(g, `💥 陷阱！-${dmg} HP`);
      if (standingParty(g).length === 0) { g.screen = 'gameover'; pushLog(g, '☠ 你的隊伍全滅了…'); return; }
    }
  }
  const parts: string[] = [];
  if (chest.gold) { const amt = roll(chest.gold); g.gold += amt; parts.push(`${amt} 金幣`); }
  if (chest.gems) { const amt = roll(chest.gems); g.gems += amt; if (amt > 0) parts.push(`${amt} 寶石`); }
  if (chest.items) {
    for (const it of chest.items) { g.backpack = [...g.backpack, it]; parts.push(itemMap[it]?.name || it); }
  }
  pushLog(g, `💰 寶箱：獲得 ${parts.join('、') || '空空如也'}`);
  toast(g, `獲得 ${parts.join('、')}`);
}

// ---------- inventory ----------
export function equipItem(g: GameState, charIdx: number, itemId: string): boolean {
  const def = itemMap[itemId];
  if (!def || !def.slot) return false;
  const ch = g.party[charIdx];
  const chk = canEquip(ch, itemId);
  if (!chk.ok) { toast(g, `✗ ${chk.reason}`); return false; }
  // two-handed weapon clears shield
  if (def.type === 'weapon' && def.twoHanded && ch.equipment.shield) {
    const sh = ch.equipment.shield; delete ch.equipment.shield; if (sh) g.backpack.push(sh);
  }
  const cur = ch.equipment[def.slot];
  ch.equipment[def.slot] = itemId;
  g.backpack.splice(g.backpack.indexOf(itemId), 1);
  if (cur) g.backpack.push(cur);
  recompute(ch);
  pushLog(g, `${ch.name} 裝備了 ${def.name}。`);
  return true;
}

export function unequipItem(g: GameState, charIdx: number, slot: EquipSlot) {
  const ch = g.party[charIdx];
  const cur = ch.equipment[slot];
  if (!cur) return;
  delete ch.equipment[slot];
  g.backpack.push(cur);
  recompute(ch);
}

export function useConsumable(g: GameState, itemId: string, targetIdx: number): boolean {
  const def = itemMap[itemId];
  if (!def || def.type !== 'consumable') return false;
  const ch = g.party[targetIdx];
  if (def.id === 'ration') { g.food += 1; g.backpack.splice(g.backpack.indexOf(itemId), 1); pushLog(g, '你補充了一份口糧。'); return true; }
  if (def.heal) {
    if (ch.condition !== 'ok' && ch.hp <= 0) ch.condition = 'ok';
    ch.hp = Math.min(ch.maxHp, ch.hp + def.heal);
  }
  if (def.restore) ch.sp = Math.min(ch.maxSp, ch.sp + def.restore);
  if (def.curesStatus) for (const s of def.curesStatus) delete ch.status[s];
  g.backpack.splice(g.backpack.indexOf(itemId), 1);
  pushLog(g, `${ch.name} 使用了 ${def.name}。`);
  return true;
}

// ---------- spells outside combat ----------
export function castOutside(g: GameState, casterIdx: number, spellId: string, targetIdx: number): boolean {
  const sp = spellMap[spellId];
  const caster = g.party[casterIdx];
  if (!sp || !sp.usableOutside) { toast(g, '此法術無法在此使用'); return false; }
  if (caster.condition !== 'ok') return false;
  if (caster.sp < sp.cost) { toast(g, '法力不足'); return false; }
  if (sp.gemCost && g.gems < sp.gemCost) { toast(g, '寶石不足'); return false; }
  caster.sp -= sp.cost;
  if (sp.gemCost) g.gems -= sp.gemCost;
  const target = g.party[targetIdx] || caster;
  const cm = attrMod(effAttr(caster, sp.school === 'sorcerer' ? 'intellect' : 'personality'));
  if (sp.kind === 'heal') {
    if (sp.target === 'party') {
      g.party.forEach(t => { if (t.condition !== 'dead') { if (t.hp <= 0) t.condition = 'ok'; t.hp = Math.min(t.maxHp, t.hp + sp.power + cm * 2); } });
      pushLog(g, `✨ ${caster.name} 對全隊施放 ${sp.name}。`);
    } else {
      if (target.hp <= 0) target.condition = 'ok';
      target.hp = Math.min(target.maxHp, target.hp + sp.power + cm * 2);
      pushLog(g, `✨ ${caster.name} 對 ${target.name} 施放 ${sp.name}。`);
    }
  } else if (sp.kind === 'cureDead') {
    target.condition = 'ok';
    target.status = {};
    target.hp = sp.power >= 999 ? target.maxHp : Math.max(1, Math.floor(target.maxHp / 2));
    pushLog(g, `✨ ${caster.name} 復活了 ${target.name}！`);
  } else if (sp.kind === 'cureStatus') {
    if (sp.id === 'awaken') g.party.forEach(t => delete t.status.asleep);
    else if (sp.id === 'cure_poison') { delete target.status.poisoned; delete target.status.diseased; }
    else if (sp.id === 'remove_fear') g.party.forEach(t => { delete t.status.afraid; delete t.status.paralyzed; });
    pushLog(g, `✨ ${caster.name} 施放了 ${sp.name}。`);
  } else if (sp.kind === 'light') {
    g.flags['light'] = true;
    pushLog(g, `✨ ${caster.name} 施放了光亮術。`);
  } else if (sp.kind === 'town_portal') {
    g.screen = 'town';
    g.townId = nearestTown(g);
    g.combat = null;
    pushLog(g, `✨ ${caster.name} 施放城鎮傳送，隊伍回到了${townMap[g.townId]?.name}。`);
  } else {
    toast(g, '此法術只能在戰鬥中使用');
    caster.sp += sp.cost; if (sp.gemCost) g.gems += sp.gemCost;
    return false;
  }
  return true;
}

function nearestTown(g: GameState): string {
  // simplistic: last town visited or sorpigal
  return g.townId || 'sorpigal';
}

// ---------- combat ----------
export function startCombat(g: GameState, encKey: string, enc: EncounterDef, mapId: string) {
  let uid = 1;
  const monsters: CombatMonster[] = [];
  for (const grp of enc.monsters) {
    const n = roll(grp.count);
    for (let i = 0; i < n; i++) {
      const def = monsterMap[grp.id];
      monsters.push({ uid: uid++, defId: grp.id, hp: def.hp, maxHp: def.hp, status: {} });
    }
  }
  g.combat = {
    monsters, order: [], turn: 0, round: 1, cell: encKey, mapId,
    boss: !!enc.boss, surprise: enc.surprise, awaitingTarget: null, fx: null,
  };
  for (const c of g.party) { c.blocking = false; c.buffAtk = 0; c.buffAc = 0; c.buffSpeed = 0; }
  buildOrder(g);
  g.screen = 'combat';
  pushLog(g, g.combat.boss ? '⚔ 強敵出現了！' : '⚔ 遭遇怪物！');
  processUntilPlayer(g);
}

function speedOf(g: GameState, e: { side: 'party' | 'monster'; idx: number }): number {
  if (e.side === 'party') { const c = g.party[e.idx]; return effAttr(c, 'speed') + (c.buffSpeed || 0) + rnd(3); }
  return monsterMap[g.combat!.monsters[e.idx].defId].speed + rnd(3);
}

function buildOrder(g: GameState) {
  const c = g.combat!;
  const entries: { side: 'party' | 'monster'; idx: number }[] = [];
  g.party.forEach((ch, i) => { if (ch.condition === 'ok' && ch.hp > 0) entries.push({ side: 'party', idx: i }); });
  c.monsters.forEach((m, i) => { if (m.hp > 0) entries.push({ side: 'monster', idx: i }); });
  entries.sort((a, b) => speedOf(g, b) - speedOf(g, a));
  c.order = entries;
  c.turn = 0;
}

export function currentActor(g: GameState): { side: 'party' | 'monster'; idx: number } | null {
  const c = g.combat;
  if (!c) return null;
  if (c.turn >= c.order.length) return null;
  return c.order[c.turn];
}

function aliveMonsters(g: GameState) {
  return g.combat!.monsters.filter(m => m.hp > 0);
}
export function firstAliveMonsterIdx(g: GameState): number {
  return g.combat!.monsters.findIndex(m => m.hp > 0);
}

// returns true if the actor can take a normal action this turn
function tickActorStart(g: GameState, actor: { side: 'party' | 'monster'; idx: number }): boolean {
  const status = actor.side === 'party' ? g.party[actor.idx].status : g.combat!.monsters[actor.idx].status;
  const name = actor.side === 'party' ? g.party[actor.idx].name : monsterMap[g.combat!.monsters[actor.idx].defId].name;
  // poison / disease damage at start of turn
  for (const s of ['poisoned', 'diseased'] as StatusEffect[]) {
    if (status[s]) {
      const dmg = s === 'poisoned' ? rint(2, 5) : rint(1, 3);
      if (actor.side === 'party') damageChar(g, g.party[actor.idx], dmg);
      else { g.combat!.monsters[actor.idx].hp -= dmg; }
      pushLog(g, `☠ ${name} 受到${s === 'poisoned' ? '毒素' : '疾病'}侵蝕，損失 ${dmg} 點生命。`);
      if (status[s]! > 0) { status[s]!--; if (status[s]! <= 0) delete status[s]; }
    }
  }
  // paralyze / sleep skip turn
  for (const s of ['paralyzed', 'asleep'] as StatusEffect[]) {
    if (status[s]) {
      pushLog(g, `${name} ${s === 'asleep' ? '沉睡中' : '被麻痺'}，無法行動。`);
      if (status[s]! > 0) { status[s]!--; if (status[s]! <= 0) delete status[s]; }
      return false;
    }
  }
  // fear / blessed durations tick
  for (const s of ['afraid'] as StatusEffect[]) {
    if (status[s] && status[s]! > 0) { status[s]!--; if (status[s]! <= 0) delete status[s]; }
  }
  return true;
}

function advance(g: GameState) {
  const c = g.combat!;
  c.turn += 1;
  while (c.turn < c.order.length) {
    const e = c.order[c.turn];
    const dead = e.side === 'party'
      ? (g.party[e.idx].condition !== 'ok' || g.party[e.idx].hp <= 0)
      : c.monsters[e.idx].hp <= 0;
    if (!dead) break;
    c.turn += 1;
  }
  if (c.turn >= c.order.length) {
    for (const ch of g.party) ch.blocking = false;
    c.round += 1;
    buildOrder(g);
  }
}

export function processUntilPlayer(g: GameState) {
  let guard = 0;
  while (g.combat && guard++ < 300) {
    if (checkCombatEnd(g)) return;
    const actor = currentActor(g);
    if (!actor) { advance(g); continue; }
    if (actor.side === 'party') {
      // tick start-of-turn status; if incapacitated, skip
      const canAct = tickActorStart(g, actor);
      if (checkCombatEnd(g)) return;
      if (!canAct) { advance(g); continue; }
      return; // wait for player input
    }
    // monster
    const canAct = tickActorStart(g, actor);
    if (checkCombatEnd(g)) return;
    if (canAct) monsterAct(g, actor.idx);
    if (checkCombatEnd(g)) return;
    advance(g);
  }
}

function checkCombatEnd(g: GameState): boolean {
  const c = g.combat;
  if (!c) return true;
  if (aliveMonsters(g).length === 0) { endCombatWin(g); return true; }
  if (standingParty(g).length === 0) { endCombatLoss(g); return true; }
  return false;
}

function applyDamageToMonster(g: GameState, mIdx: number, dmg: number, element?: string): number {
  const m = g.combat!.monsters[mIdx];
  const def = monsterMap[m.defId];
  let d = dmg;
  if (element && def.resist && (def.resist as any)[element]) {
    d = Math.round(d * (1 - (def.resist as any)[element] / 100));
  }
  d = Math.max(1, d);
  m.hp -= d;
  delete m.status.asleep; // damage wakes
  return d;
}

function raceResist(ch: Character, element?: Element): number {
  if (!element) return 0;
  let r = raceMap[ch.raceId].resist?.[element] || 0;
  for (const slot of Object.keys(ch.equipment) as EquipSlot[]) {
    const id = ch.equipment[slot]; const it = id ? itemMap[id] : null;
    if (it?.resist?.[element]) r += it.resist[element]!;
  }
  return Math.min(90, r);
}

function damageChar(g: GameState, ch: Character, dmg: number, element?: Element) {
  let d = dmg;
  const r = raceResist(ch, element);
  if (r) d = Math.round(d * (1 - r / 100));
  ch.hp -= Math.max(1, d);
  delete ch.status.asleep;
  if (ch.hp <= 0) {
    ch.hp = 0;
    ch.condition = 'unconscious';
    ch.status = {};
    pushLog(g, `💀 ${ch.name} 倒下了！`);
  }
}

// ----- player combat actions -----
export function combatAttack(g: GameState, monsterIdx: number) {
  const c = g.combat!;
  const cur = currentActor(g);
  if (!cur || cur.side !== 'party') return;
  const actor = g.party[cur.idx];
  const m = c.monsters[monsterIdx];
  if (!m || m.hp <= 0) return;
  const def = monsterMap[m.defId];
  const hit = d20();
  if (hit === 1) {
    pushLog(g, `${actor.name} 的攻擊落空了。`);
    c.fx = { kind: 'miss', targetSide: 'monster', targetIdx: monsterIdx, ttl: 12 };
  } else if (hit === 20 || hit + attackBonusOf(actor) >= 10 + def.ac) {
    // ninja assassination
    const cls = classMap[actor.classId];
    const assassinate = cls.id === 'ninja' && !def.boss && Math.random() < (0.06 + 0.01 * actor.level + 0.02 * Math.max(0, attrMod(effAttr(actor, 'luck'))));
    let dmg = weaponDamageRoll(actor);
    const crit = Math.random() < critChance(actor);
    if (crit || hit === 20) dmg = Math.round(dmg * 2);
    if (assassinate) dmg = m.hp;
    const dealt = applyDamageToMonster(g, monsterIdx, dmg, weaponElement(actor));
    if (assassinate) pushLog(g, `🗡 ${actor.name} 一擊暗殺了 ${def.name}！`);
    else pushLog(g, `${actor.name} ${crit || hit === 20 ? '暴擊' : '命中'} ${def.name}，造成 ${dealt} 傷害。`);
    c.fx = { kind: crit || hit === 20 || assassinate ? 'crit' : 'hit', targetSide: 'monster', targetIdx: monsterIdx, amount: dealt, ttl: 14 };
    if ((cls.id === 'robber') && Math.random() < 0.5) {
      const g2 = rint(3, 12); g.gold += g2; pushLog(g, `🪙 ${actor.name} 偷取了 ${g2} 金幣。`);
    }
    if (m.hp <= 0) { pushLog(g, `${def.name} 被擊倒！`); c.fx = { kind: 'death', targetSide: 'monster', targetIdx: monsterIdx, ttl: 16 }; }
  } else {
    pushLog(g, `${actor.name} 未能突破 ${def.name} 的防禦。`);
    c.fx = { kind: 'miss', targetSide: 'monster', targetIdx: monsterIdx, ttl: 12 };
  }
  afterPlayerAction(g);
}

export function combatCast(g: GameState, spellId: string, targetIdx: number) {
  const c = g.combat!;
  const cur = currentActor(g);
  if (!cur || cur.side !== 'party') return;
  const actor = g.party[cur.idx];
  const sp = spellMap[spellId];
  if (!sp || actor.sp < sp.cost) { toast(g, '法力不足'); return; }
  if (sp.gemCost && g.gems < sp.gemCost) { toast(g, '寶石不足'); return; }
  actor.sp -= sp.cost;
  if (sp.gemCost) g.gems -= sp.gemCost;
  const cm = attrMod(effAttr(actor, sp.school === 'sorcerer' ? 'intellect' : 'personality'));
  if (sp.kind === 'damage') {
    const base = sp.power + cm * 2;
    if (sp.target === 'allEnemies') {
      let total = 0, count = 0;
      c.monsters.forEach((m, i) => { if (m.hp > 0) { total += applyDamageToMonster(g, i, base + rnd(5), sp.element); count++; } });
      pushLog(g, `🔮 ${actor.name} 施放 ${sp.name}，席捲 ${count} 個敵人！`);
      c.fx = { kind: 'spell', targetSide: 'monster', targetIdx: -1, element: sp.element, amount: total, ttl: 18 };
    } else {
      const valid = targetIdx >= 0 && !!c.monsters[targetIdx] && c.monsters[targetIdx].hp > 0;
      const i = valid ? targetIdx : firstAliveMonsterIdx(g);
      if (i >= 0) {
        const dealt = applyDamageToMonster(g, i, base + rnd(5), sp.element);
        pushLog(g, `🔮 ${actor.name} 對 ${monsterMap[c.monsters[i].defId].name} 施放 ${sp.name}，造成 ${dealt} 傷害。`);
        c.fx = { kind: 'spell', targetSide: 'monster', targetIdx: i, element: sp.element, amount: dealt, ttl: 18 };
        if (c.monsters[i].hp <= 0) pushLog(g, `${monsterMap[c.monsters[i].defId].name} 被擊倒！`);
      }
    }
  } else if (sp.kind === 'heal') {
    if (sp.target === 'party') {
      g.party.forEach(t => { if (t.condition !== 'dead') { if (t.hp <= 0) t.condition = 'ok'; t.hp = Math.min(t.maxHp, t.hp + sp.power + cm * 2); } });
      pushLog(g, `✨ ${actor.name} 治療了全隊。`);
    } else {
      const t = g.party[targetIdx] || actor;
      if (t.hp <= 0) t.condition = 'ok';
      t.hp = Math.min(t.maxHp, t.hp + sp.power + cm * 2);
      pushLog(g, `✨ ${actor.name} 治療了 ${t.name}。`);
      c.fx = { kind: 'heal', targetSide: 'party', targetIdx, ttl: 16 };
    }
  } else if (sp.kind === 'cureDead') {
    const t = g.party[targetIdx] || actor;
    t.condition = 'ok'; t.status = {}; t.hp = sp.power >= 999 ? t.maxHp : Math.max(1, Math.floor(t.maxHp / 2));
    pushLog(g, `✨ ${actor.name} 復活了 ${t.name}！`);
  } else if (sp.kind === 'cureStatus') {
    if (sp.id === 'awaken') g.party.forEach(t => delete t.status.asleep);
    else if (sp.id === 'cure_poison') { const t = g.party[targetIdx] || actor; delete t.status.poisoned; delete t.status.diseased; }
    else if (sp.id === 'remove_fear') g.party.forEach(t => { delete t.status.afraid; delete t.status.paralyzed; });
    pushLog(g, `✨ ${actor.name} 施放了 ${sp.name}。`);
  } else if (sp.kind === 'buffAtk' || sp.kind === 'bless') {
    g.party.forEach(p => { if (p.condition === 'ok') { p.buffAtk = (p.buffAtk || 0) + sp.power; p.status.blessed = 99; } });
    pushLog(g, `🙏 ${actor.name} 施放 ${sp.name}，全隊攻擊提升。`);
  } else if (sp.kind === 'buffAc' || sp.kind === 'shield') {
    g.party.forEach(p => { if (p.condition === 'ok') { p.buffAc = (p.buffAc || 0) + sp.power; p.status.shielded = 99; } });
    pushLog(g, `🛡 ${actor.name} 施放 ${sp.name}，全隊防禦提升。`);
  } else if (sp.kind === 'haste') {
    g.party.forEach(p => { if (p.condition === 'ok') { p.buffSpeed = (p.buffSpeed || 0) + sp.power; p.status.hasted = 99; } });
    pushLog(g, `💨 ${actor.name} 施放加速術，全隊行動加快。`);
  } else if (sp.kind === 'sleep') {
    let n = 0;
    c.monsters.forEach(m => { if (m.hp > 0 && !monsterMap[m.defId].boss && Math.random() < 0.6) { m.status.asleep = rint(2, 4); n++; } });
    pushLog(g, `💤 ${actor.name} 施放睡眠術，${n} 個敵人沉睡。`);
  } else if (sp.kind === 'fear') {
    let n = 0;
    c.monsters.forEach(m => { if (m.hp > 0 && !monsterMap[m.defId].boss && Math.random() < 0.6) { m.status.afraid = rint(2, 4); n++; } });
    pushLog(g, `😱 ${actor.name} 施放恐懼術，${n} 個敵人膽寒。`);
  } else if (sp.kind === 'paralyze') {
    const i = targetIdx >= 0 && c.monsters[targetIdx]?.hp > 0 ? targetIdx : firstAliveMonsterIdx(g);
    if (i >= 0 && !monsterMap[c.monsters[i].defId].boss) { c.monsters[i].status.paralyzed = rint(2, 3); pushLog(g, `🌀 ${actor.name} 麻痺了 ${monsterMap[c.monsters[i].defId].name}。`); }
    else pushLog(g, `${actor.name} 的麻痺術對強敵無效。`);
  }
  afterPlayerAction(g);
}

export function combatItem(g: GameState, itemId: string, targetIdx: number) {
  const it = itemMap[itemId];
  if (it?.castSpell) {
    // scroll: cast its spell (no SP cost), consume
    const cur = currentActor(g);
    if (!cur || cur.side !== 'party') return;
    g.backpack.splice(g.backpack.indexOf(itemId), 1);
    const sp = spellMap[it.castSpell];
    pushLog(g, `📜 使用了${it.name}。`);
    // emulate the spell's effect cheaply by routing through combatCast logic on a temp
    const tmpSpId = it.castSpell;
    // give actor enough sp temporarily
    const actor = g.party[cur.idx];
    const saved = actor.sp; actor.sp = spellMap[tmpSpId].cost + (spellMap[tmpSpId].gemCost ? 0 : 0);
    const savedGems = g.gems; if (spellMap[tmpSpId].gemCost) g.gems += spellMap[tmpSpId].gemCost!;
    combatCast(g, tmpSpId, targetIdx);
    // restore (combatCast already advanced turn). Refund the borrowed sp/gems difference.
    void saved; void savedGems; void sp;
    return;
  }
  if (useConsumable(g, itemId, targetIdx)) afterPlayerAction(g);
}

export function combatBlock(g: GameState) {
  const cur = currentActor(g);
  if (!cur || cur.side !== 'party') return;
  const actor = g.party[cur.idx];
  actor.blocking = true;
  pushLog(g, `🛡 ${actor.name} 進入防禦。`);
  afterPlayerAction(g);
}

export function combatRun(g: GameState): boolean {
  if (g.combat!.boss) { toast(g, '無法從強敵身邊逃跑！'); return false; }
  const fastest = Math.max(...standingParty(g).map(c => effAttr(c, 'speed')), 0);
  if (Math.random() < 0.45 + fastest * 0.01) {
    pushLog(g, '你們成功逃離了戰鬥。');
    g.combat = null;
    g.screen = g.prevExplore;
    return true;
  }
  pushLog(g, '逃跑失敗！');
  g.combat!.turn = g.combat!.order.length;
  advance(g);
  processUntilPlayer(g);
  return false;
}

function afterPlayerAction(g: GameState) {
  if (checkCombatEnd(g)) return;
  advance(g);
  processUntilPlayer(g);
}

function monsterAct(g: GameState, mIdx: number) {
  const def = monsterMap[g.combat!.monsters[mIdx].defId];
  // action economy: bosses & huge foes strike multiple times to offset a 6-person party
  const actions = def.boss ? 3 : def.size === 'huge' ? 2 : def.size === 'large' ? 2 : 1;
  for (let a = 0; a < actions; a++) {
    if (g.combat!.monsters[mIdx].hp <= 0) return;
    if (standingParty(g).length === 0) return;
    monsterSingleAction(g, mIdx, a);
  }
}

function monsterSingleAction(g: GameState, mIdx: number, actionIdx = 0) {
  const c = g.combat!;
  const m = c.monsters[mIdx];
  if (m.hp <= 0) return;
  const def = monsterMap[m.defId];
  const targets = g.party.map((p, i) => ({ p, i })).filter(t => t.p.condition === 'ok' && t.p.hp > 0);
  if (targets.length === 0) return;
  // afraid monsters may cower
  if (m.status.afraid && Math.random() < 0.5) { pushLog(g, `${def.name} 因恐懼而退縮。`); return; }
  const target = targets[rnd(targets.length)];
  // a monster casts at most once per turn (first action) — keeps AoE from stacking into a wipe
  if (def.spellId && actionIdx === 0 && Math.random() < 0.45) {
    const sp = spellMap[def.spellId];
    if (sp.target === 'allEnemies') {
      // party-wide blast — a real threat from casters/bosses
      let last = target.i;
      for (const t of targets) {
        const dmg = Math.round((sp.power + rnd(6)) * 0.6);
        damageChar(g, t.p, dmg, sp.element);
        last = t.i;
      }
      pushLog(g, `${def.name} 施放 ${sp.name}，烈焰席捲全隊！`);
      c.fx = { kind: 'spell', targetSide: 'party', targetIdx: last, element: sp.element, amount: undefined, ttl: 18 };
    } else {
      const dmg = sp.power + rnd(6);
      damageChar(g, target.p, dmg, sp.element);
      pushLog(g, `${def.name} 施放 ${sp.name}，${target.p.name} 受到 ${dmg} 傷害。`);
      c.fx = { kind: 'spell', targetSide: 'party', targetIdx: target.i, element: sp.element, amount: dmg, ttl: 16 };
    }
    return;
  }
  const hit = d20();
  if (hit === 1) { pushLog(g, `${def.name} 的攻擊落空。`); return; }
  if (hit === 20 || hit + def.attack >= defenseOf(target.p)) {
    const dmg = roll(def.dmg);
    damageChar(g, target.p, dmg);
    pushLog(g, `${def.name} 攻擊 ${target.p.name}，造成 ${dmg} 傷害。`);
    c.fx = { kind: 'hit', targetSide: 'party', targetIdx: target.i, amount: dmg, ttl: 12 };
    // inflict status
    if (def.inflicts && target.p.hp > 0 && Math.random() < def.inflicts.chance) {
      const s = def.inflicts.status;
      target.p.status[s] = def.inflicts.rounds;
      pushLog(g, `${target.p.name} 陷入${STATUS_LABEL[s]}狀態！`);
    }
  } else {
    pushLog(g, `${target.p.name} 擋下了 ${def.name} 的攻擊。`);
  }
}

export const STATUS_LABEL: Record<StatusEffect, string> = {
  asleep: '沉睡', afraid: '恐懼', poisoned: '中毒', paralyzed: '麻痺', cursed: '詛咒',
  diseased: '疾病', blessed: '祝福', shielded: '護盾', hasted: '加速',
};

function endCombatWin(g: GameState) {
  const c = g.combat!;
  let totalXp = 0, totalGold = 0, totalGems = 0;
  const drops: string[] = [];
  for (const m of c.monsters) {
    const def = monsterMap[m.defId];
    totalXp += def.xp;
    totalGold += roll(def.gold);
    if (def.gems) totalGems += roll(def.gems);
  }
  const alive = standingParty(g);
  const share = Math.max(1, Math.floor(totalXp / Math.max(1, alive.length)));
  const levelUps: string[] = [];
  for (const ch of alive) { ch.xp += share; ch.buffAtk = 0; ch.buffAc = 0; ch.buffSpeed = 0; ch.blocking = false; }
  g.gold += totalGold;
  g.gems += totalGems;
  pushLog(g, `✨ 勝利！獲得 ${totalGold} 金幣${totalGems ? `、${totalGems} 寶石` : ''}、每人 ${share} 經驗。`);
  for (const ch of alive) { if (levelUp(g, ch)) levelUps.push(ch.name); }
  if (c.boss) {
    const bossDef = monsterMap[c.monsters[0].defId];
    handleBossDrop(g, bossDef.id, drops);
  }
  g.clearedEncounters = [...g.clearedEncounters, c.cell];
  g.combat = null;
  if (g.flags['terra_cleared'] && !g.flags['victory_shown']) {
    g.flags['victory_shown'] = true;
    g.combatSummary = null;
    g.screen = 'victory';
  } else {
    g.combatSummary = { xp: share, gold: totalGold, gems: totalGems, drops, levelUps, boss: c.boss };
    g.screen = g.prevExplore;
  }
}

function handleBossDrop(g: GameState, bossId: string, drops: string[]) {
  const give = (item: string, msg: string) => { if (!g.backpack.includes(item)) { g.backpack.push(item); drops.push(itemMap[item]?.name || item); } pushLog(g, msg); };
  if (bossId === 'lich_king') { g.flags['boss_dead'] = true; give('orb_of_terra', '🏆 巫妖王被擊敗了！你取得了泰拉星界寶珠！'); }
  else if (bossId === 'cyclops') { give('cyclops_eye', '🏆 獨眼巨人倒下了！你挖出了牠的眼珠。'); }
  else if (bossId === 'wyvern') { give('ancient_relic', '🏆 飛龍被擊敗了！古墓深處的上古遺物到手了。'); }
  else if (bossId === 'terra_guardian') { g.flags['terra_cleared'] = true; pushLog(g, '🏆 泰拉守護者崩解了！群島的核心終於平靜。'); }
}

function endCombatLoss(g: GameState) {
  g.combat = null;
  g.combatSummary = null;
  g.screen = 'gameover';
  pushLog(g, '☠ 你的隊伍全滅了…');
}

// ---------- rest ----------
export function restParty(g: GameState): boolean {
  if (g.food <= 0) { toast(g, '沒有食物可供休息！'); return false; }
  g.food -= 1;
  advanceTime(g, 8 * 60);
  for (const ch of g.party) {
    if (ch.condition !== 'dead') {
      ch.hp = ch.maxHp;
      ch.sp = ch.maxSp;
      // resting cures sleep/fear but not poison/disease (need cure)
      delete ch.status.asleep; delete ch.status.afraid; delete ch.status.paralyzed;
    }
  }
  pushLog(g, `🏕 隊伍休息恢復了體力。（消耗 1 份食物，剩 ${g.food}）`);
  // chance of ambush while resting in a dungeon
  return true;
}

// ---------- dialog / quests ----------
export function condMet(g: GameState, cond?: DialogCond): boolean {
  if (!cond) return true;
  if (cond.item && !hasItem(g, cond.item)) return false;
  if (cond.notItem && hasItem(g, cond.notItem)) return false;
  if (cond.flag && !g.flags[cond.flag]) return false;
  if (cond.notFlag && g.flags[cond.notFlag]) return false;
  if (cond.questActive && g.quests[cond.questActive] !== 'active') return false;
  if (cond.questComplete && g.quests[cond.questComplete] !== 'complete') return false;
  if (cond.questInactive && g.quests[cond.questInactive] && g.quests[cond.questInactive] !== 'inactive') return false;
  if (cond.cleared && !g.clearedEncounters.includes(cond.cleared)) return false;
  if (cond.minGold !== undefined && g.gold < cond.minGold) return false;
  return true;
}

export function npcEntryNode(g: GameState, npcId: string): string {
  const npc = npcMap[npcId];
  if (!npc) return 'start';
  for (const e of npc.entries || []) {
    if (condMet(g, e.cond)) return e.node;
  }
  return npc.root;
}
export const npcRootNode = npcEntryNode;

function teachSpellTo(g: GameState, spellId: string) {
  const sp = spellMap[spellId];
  if (!sp) return;
  const canLearn = (c: Character) => { const s = classMap[c.classId].school; return s === sp.school || s === 'both'; };
  let target = g.party.find(c => canLearn(c) && !c.spells.includes(spellId));
  if (!target) target = g.party.find(canLearn);
  if (!target) { pushLog(g, '隊伍中沒有能學習此法術的成員。'); return; }
  if (!target.spells.includes(spellId)) {
    target.spells.push(spellId);
    pushLog(g, `📖 ${target.name} 學會了 ${sp.name}！`);
  }
}

export function applyDialogAction(g: GameState, action: DialogAction) {
  if (action.giveQuest) {
    g.quests[action.giveQuest] = 'active';
    pushLog(g, `📜 接下任務：${questMap[action.giveQuest]?.name}`);
  }
  if (action.completeQuest) {
    g.quests[action.completeQuest] = 'complete';
    const q = questMap[action.completeQuest];
    if (q) {
      if (q.itemRequired) {
        const ii = g.backpack.indexOf(q.itemRequired);
        if (ii >= 0) g.backpack.splice(ii, 1);
      }
      g.gold += q.rewardGold;
      const alive = standingParty(g).length ? standingParty(g) : g.party;
      const share = Math.max(1, Math.floor(q.rewardXp / Math.max(1, alive.length)));
      for (const ch of alive) { ch.xp += share; levelUp(g, ch); }
      g.flags[`${q.id}_done`] = true;
      if (q.id === 'orb_quest') g.flags['orb_returned'] = true;
      pushLog(g, `🏆 任務完成：${q.name}！獲得 ${q.rewardGold} 金幣與 ${q.rewardXp} 經驗。`);
    }
  }
  if (action.teachSpell) teachSpellTo(g, action.teachSpell);
  if (action.setFlag) g.flags[action.setFlag] = true;
  if (action.giveItem) { g.backpack.push(action.giveItem); pushLog(g, `獲得 ${itemMap[action.giveItem]?.name || action.giveItem}。`); }
  if (action.giveGold) g.gold += action.giveGold;
  if (action.takeGold) g.gold = Math.max(0, g.gold - action.takeGold);
  if (action.giveGems) g.gems += action.giveGems;
  if (action.heal) restPartyFull(g);
  if (action.cure) for (const ch of g.party) ch.status = {};
}

export function restPartyFull(g: GameState) {
  for (const ch of g.party) {
    if (ch.condition !== 'dead') {
      ch.condition = 'ok';
      ch.hp = ch.maxHp;
      ch.sp = ch.maxSp;
      ch.status = {};
    }
  }
}

// ---------- shops ----------
export function buyItem(g: GameState, itemId: string): boolean {
  const def = itemMap[itemId];
  if (!def) return false;
  if (g.gold < def.value) { toast(g, '金幣不足'); return false; }
  g.gold -= def.value;
  g.backpack.push(itemId);
  pushLog(g, `購買了 ${def.name}。`);
  return true;
}
export function sellItem(g: GameState, itemId: string): boolean {
  const i = g.backpack.indexOf(itemId);
  if (i < 0) return false;
  const def = itemMap[itemId];
  const price = Math.floor((def.value || 0) / 2);
  g.backpack.splice(i, 1);
  g.gold += price;
  pushLog(g, `賣出 ${def.name}，得到 ${price} 金幣。`);
  return true;
}
export function learnSpell(g: GameState, charIdx: number, spellId: string): boolean {
  const sp = spellMap[spellId];
  const ch = g.party[charIdx];
  const cls = classMap[ch.classId];
  if (!sp || (cls.school !== sp.school && cls.school !== 'both')) { toast(g, '此職業無法學習該法術'); return false; }
  if (ch.spells.includes(spellId)) { toast(g, '已經學會了'); return false; }
  const price = sp.level * 150;
  if (g.gold < price) { toast(g, '金幣不足'); return false; }
  g.gold -= price;
  ch.spells.push(spellId);
  pushLog(g, `${ch.name} 學會了 ${sp.name}。`);
  return true;
}

// trainer: pay gold to apply pending level-ups (when xp >= threshold)
export function trainAt(g: GameState, charIdx: number): boolean {
  const ch = g.party[charIdx];
  if (ch.xp < xpForNext(ch.level)) { toast(g, '經驗不足以晉級'); return false; }
  const cost = ch.level * 100;
  if (g.gold < cost) { toast(g, `金幣不足（需 ${cost}）`); return false; }
  g.gold -= cost;
  levelUp(g, ch);
  return true;
}

// ---------- save / load ----------
const SAVE_KEY = 'mm3_save_v2';
const SLOTS = 3;
const slotKey = (n: number) => `${SAVE_KEY}_slot${n}`;

export function saveGame(g: GameState, slot = 0) {
  try { localStorage.setItem(slot > 0 ? slotKey(slot) : SAVE_KEY, JSON.stringify(g)); toast(g, '已存檔'); } catch { /* ignore */ }
}
export function loadGame(slot = 0): GameState | null {
  try {
    const raw = localStorage.getItem(slot > 0 ? slotKey(slot) : SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return migrate(s);
  } catch { return null; }
}
export function hasSave(slot = 0): boolean {
  try { return !!localStorage.getItem(slot > 0 ? slotKey(slot) : SAVE_KEY); } catch { return false; }
}
export function clearSave(slot = 0) {
  try { localStorage.removeItem(slot > 0 ? slotKey(slot) : SAVE_KEY); } catch { /* ignore */ }
}
export const saveSlots = () => Array.from({ length: SLOTS }, (_, i) => i + 1);

// forward-compatible default fill for older saves
function migrate(s: GameState): GameState {
  const base = newGame();
  return { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
}
