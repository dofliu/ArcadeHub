// ===== Pure-ish game engine. Operates on a JSON-serializable GameState. =====
import {
  GameState, Character, Attrs, AttrKey, Combat, CombatMonster, EncounterDef,
  ChestDef, DialogAction, EquipSlot,
} from './types';
import {
  raceMap, classMap, spellMap, itemMap, monsterMap, mapMap, questMap,
} from './data/content';

// ---------- RNG ----------
export const rnd = (n: number) => Math.floor(Math.random() * n);
export const rint = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const roll = (d: [number, number]) => rint(d[0], d[1]);
export const d20 = () => rint(1, 20);
export const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));

export const attrMod = (v: number) => Math.floor((v - 10) / 2);

const ATTR_KEYS: AttrKey[] = ['might', 'intellect', 'personality', 'endurance', 'speed', 'accuracy', 'luck'];

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

function castAttr(classId: string): AttrKey {
  const c = classMap[classId];
  return c.school === 'sorcerer' ? 'intellect' : 'personality';
}

export function recompute(ch: Character) {
  const cls = classMap[ch.classId];
  const endMod = attrMod(ch.attrs.endurance);
  ch.maxHp = Math.max(1, (cls.hitDie + Math.max(0, endMod)) * ch.level + 2);
  if (cls.spDie > 0) {
    const cm = attrMod(ch.attrs[castAttr(ch.classId)]);
    ch.maxSp = Math.max(0, (cls.spDie + Math.max(0, cm)) * ch.level);
  } else {
    ch.maxSp = 0;
  }
}

export function makeCharacter(id: number, name: string, raceId: string, classId: string): Character {
  const race = raceMap[raceId];
  const cls = classMap[classId];
  const attrs = rollAttrs();
  for (const k of ATTR_KEYS) {
    if (race.mods[k]) attrs[k] += race.mods[k]!;
  }
  const ch: Character = {
    id, name, raceId, classId, level: 1, xp: 0, attrs,
    hp: 1, maxHp: 1, sp: 0, maxSp: 0, condition: 'ok',
    equipment: {}, spells: [...cls.startSpells],
  };
  recompute(ch);
  ch.hp = ch.maxHp;
  ch.sp = ch.maxSp;
  // starting gear by class
  const gear: Record<string, Partial<Record<EquipSlot, string>>> = {
    knight: { weapon: 'long_sword', armor: 'leather' },
    paladin: { weapon: 'mace', armor: 'leather' },
    archer: { weapon: 'short_bow', armor: 'cloth' },
    cleric: { weapon: 'mace', armor: 'cloth' },
    sorcerer: { weapon: 'dagger', armor: 'cloth' },
    robber: { weapon: 'short_sword', armor: 'leather' },
  };
  ch.equipment = { ...(gear[classId] || { weapon: 'dagger' }) };
  return ch;
}

// ---------- derived combat stats ----------
export function armorAc(ch: Character): number {
  let ac = 0;
  for (const slot of ['armor', 'shield', 'helm', 'accessory'] as EquipSlot[]) {
    const it = ch.equipment[slot];
    if (it && itemMap[it]) ac += itemMap[it].acBonus || 0;
  }
  return ac;
}

export function defenseOf(ch: Character): number {
  return 10 + armorAc(ch) + Math.max(0, attrMod(ch.attrs.speed)) + (ch.buffAc || 0) + (ch.blocking ? 4 : 0);
}

export function attackBonusOf(ch: Character): number {
  const cls = classMap[ch.classId];
  const w = ch.equipment.weapon ? itemMap[ch.equipment.weapon] : null;
  const acc = ch.equipment.accessory ? itemMap[ch.equipment.accessory] : null;
  return cls.baseAttack + Math.floor(ch.level / 2) + attrMod(ch.attrs.accuracy)
    + (w?.atkBonus || 0) + (acc?.atkBonus || 0) + (ch.buffAtk || 0);
}

export function weaponDamageRoll(ch: Character): number {
  const w = ch.equipment.weapon ? itemMap[ch.equipment.weapon] : null;
  const base = w?.dmg ? roll(w.dmg) : rint(1, 2);
  return base + Math.max(0, attrMod(ch.attrs.might)) + (ch.buffAtk || 0);
}

export function critChance(ch: Character): number {
  const cls = classMap[ch.classId];
  const luck = Math.max(0, attrMod(ch.attrs.luck)) * 0.02;
  return (cls.id === 'robber' ? 0.25 : 0.05) + luck;
}

export const xpForNext = (level: number) => level * 300;

export function levelUp(g: GameState, ch: Character) {
  while (ch.xp >= xpForNext(ch.level)) {
    ch.xp -= xpForNext(ch.level);
    ch.level += 1;
    recompute(ch);
    ch.hp = ch.maxHp;
    ch.sp = ch.maxSp;
    pushLog(g, `⭐ ${ch.name} 升到了 ${ch.level} 級！`);
  }
}

// ---------- log ----------
export function pushLog(g: GameState, m: string) {
  g.log = [...g.log, m].slice(-40);
}
export function toast(g: GameState, m: string) {
  g.messages = [...g.messages, m].slice(-3);
}

export const hasItem = (g: GameState, id: string) => g.backpack.includes(id);
export const aliveParty = (g: GameState) => g.party.filter(c => c.condition === 'ok' && c.hp > 0);

// ---------- new game ----------
export function newGame(): GameState {
  return {
    screen: 'title',
    prevExplore: 'overworld',
    party: [],
    active: 0,
    gold: 200,
    food: 10,
    day: 1,
    backpack: ['healing_potion', 'healing_potion'],
    pos: { mapId: 'overworld', x: 3, y: 8, dir: 0 },
    flags: {},
    quests: {},
    clearedEncounters: [],
    lootedChests: [],
    openedDoors: [],
    combat: null,
    dialog: null,
    shopId: null,
    log: ['泰拉群島的命運，掌握在你的隊伍手中…'],
    messages: [],
  };
}

export function startAdventure(g: GameState, party: Character[]) {
  g.party = party;
  g.screen = 'town';
  pushLog(g, '你們抵達了索皮加城。');
}

// ---------- world / movement ----------
export function passableTerrain(ch: string): boolean {
  return ch !== '#' && ch !== '~' && ch !== '^' && ch !== 'T';
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
        toast(g, `🔒 ${itemMap[door.keyItem]?.name || '鑰匙'}才能開啟此門`);
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
  enterCell(g);
  return true;
}

export function turnDir(g: GameState, delta: number) {
  g.pos.dir = (((g.pos.dir + delta) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
}

export function enterCell(g: GameState) {
  const map = mapMap[g.pos.mapId];
  const key = `${g.pos.x},${g.pos.y}`;
  const gkey = `${map.id}:${key}`;

  const portal = map.portals?.[key];
  if (portal) {
    if (portal.toScreen === 'town') {
      g.screen = 'town';
      pushLog(g, '你回到了索皮加城。');
      return;
    }
    const tmap = mapMap[portal.toMap];
    g.pos = { mapId: portal.toMap, x: portal.to.x, y: portal.to.y, dir: (portal.to.dir ?? g.pos.dir) as 0 | 1 | 2 | 3 };
    g.screen = tmap.kind === 'dungeon' ? 'dungeon' : 'overworld';
    g.prevExplore = g.screen;
    pushLog(g, `🚪 ${portal.label || '你移動到新的區域'}`);
    return;
  }

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

function lootChest(g: GameState, gkey: string, chest: ChestDef) {
  g.lootedChests = [...g.lootedChests, gkey];
  let parts: string[] = [];
  if (chest.gold) {
    const amt = roll(chest.gold);
    g.gold += amt;
    parts.push(`${amt} 金幣`);
  }
  if (chest.items) {
    for (const it of chest.items) {
      g.backpack = [...g.backpack, it];
      parts.push(itemMap[it]?.name || it);
    }
  }
  pushLog(g, `💰 寶箱：獲得 ${parts.join('、') || '空空如也'}`);
  toast(g, `獲得 ${parts.join('、')}`);
}

// ---------- inventory ----------
export function equipItem(g: GameState, charIdx: number, itemId: string) {
  const def = itemMap[itemId];
  if (!def || !def.slot) return;
  const ch = g.party[charIdx];
  const cur = ch.equipment[def.slot];
  ch.equipment[def.slot] = itemId;
  g.backpack.splice(g.backpack.indexOf(itemId), 1);
  if (cur) g.backpack.push(cur);
  pushLog(g, `${ch.name} 裝備了 ${def.name}。`);
}

export function unequipItem(g: GameState, charIdx: number, slot: EquipSlot) {
  const ch = g.party[charIdx];
  const cur = ch.equipment[slot];
  if (!cur) return;
  delete ch.equipment[slot];
  g.backpack.push(cur);
}

export function useConsumable(g: GameState, itemId: string, targetIdx: number): boolean {
  const def = itemMap[itemId];
  if (!def || def.type !== 'consumable') return false;
  const ch = g.party[targetIdx];
  if (def.heal) {
    if (ch.condition !== 'ok' && ch.hp <= 0) ch.condition = 'ok';
    ch.hp = Math.min(ch.maxHp, ch.hp + def.heal);
  }
  if (def.restore) ch.sp = Math.min(ch.maxSp, ch.sp + def.restore);
  g.backpack.splice(g.backpack.indexOf(itemId), 1);
  pushLog(g, `${ch.name} 使用了 ${def.name}。`);
  return true;
}

// ---------- spells outside combat ----------
export function castOutside(g: GameState, casterIdx: number, spellId: string, targetIdx: number): boolean {
  const sp = spellMap[spellId];
  const caster = g.party[casterIdx];
  if (!sp || !sp.usableOutside) return false;
  if (caster.sp < sp.cost) { toast(g, '法力不足'); return false; }
  caster.sp -= sp.cost;
  const target = g.party[targetIdx];
  if (sp.kind === 'heal') {
    if (target.hp <= 0) target.condition = 'ok';
    target.hp = Math.min(target.maxHp, target.hp + sp.power + attrMod(caster.attrs[castAttr(caster.classId)]) * 2);
    pushLog(g, `✨ ${caster.name} 對 ${target.name} 施放 ${sp.name}。`);
  } else if (sp.kind === 'cureDead') {
    target.condition = 'ok';
    target.hp = Math.max(1, Math.floor(target.maxHp / 2));
    pushLog(g, `✨ ${caster.name} 復活了 ${target.name}！`);
  } else if (sp.kind === 'light') {
    g.flags['light'] = true;
    pushLog(g, `✨ ${caster.name} 施放了光亮術。`);
  }
  return true;
}

// ---------- combat ----------
export function startCombat(g: GameState, encKey: string, enc: EncounterDef, mapId: string) {
  let uid = 1;
  const monsters: CombatMonster[] = [];
  for (const grp of enc.monsters) {
    const n = roll(grp.count);
    for (let i = 0; i < n; i++) {
      const def = monsterMap[grp.id];
      monsters.push({ uid: uid++, defId: grp.id, hp: def.hp, maxHp: def.hp });
    }
  }
  g.combat = {
    monsters, order: [], turn: 0, round: 1, cell: encKey, mapId,
    boss: !!enc.boss, awaitingTarget: null,
  };
  for (const c of g.party) { c.blocking = false; c.buffAtk = 0; c.buffAc = 0; }
  buildOrder(g);
  g.screen = 'combat';
  pushLog(g, g.combat.boss ? '⚔ 魔王出現了！' : '⚔ 遭遇怪物！');
  processUntilPlayer(g);
}

function speedOf(g: GameState, e: { side: 'party' | 'monster'; idx: number }): number {
  if (e.side === 'party') return g.party[e.idx].attrs.speed + rnd(3);
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

function advance(g: GameState) {
  const c = g.combat!;
  c.turn += 1;
  // skip dead actors
  while (c.turn < c.order.length) {
    const e = c.order[c.turn];
    const dead = e.side === 'party'
      ? (g.party[e.idx].condition !== 'ok' || g.party[e.idx].hp <= 0)
      : c.monsters[e.idx].hp <= 0;
    if (!dead) break;
    c.turn += 1;
  }
  if (c.turn >= c.order.length) {
    // new round
    for (const ch of g.party) ch.blocking = false;
    c.round += 1;
    buildOrder(g);
  }
}

export function processUntilPlayer(g: GameState) {
  let guard = 0;
  while (g.combat && guard++ < 200) {
    if (checkCombatEnd(g)) return;
    const actor = currentActor(g);
    if (!actor) { advance(g); continue; }
    if (actor.side === 'party') return; // wait for player input
    monsterAct(g, actor.idx);
    if (checkCombatEnd(g)) return;
    advance(g);
  }
}

function checkCombatEnd(g: GameState): boolean {
  const c = g.combat;
  if (!c) return true;
  if (aliveMonsters(g).length === 0) { endCombatWin(g); return true; }
  if (aliveParty(g).length === 0) { endCombatLoss(g); return true; }
  return false;
}

function applyDamageToMonster(g: GameState, mIdx: number, dmg: number, element?: string) {
  const m = g.combat!.monsters[mIdx];
  const def = monsterMap[m.defId];
  let d = dmg;
  if (element && def.resist && (def.resist as any)[element]) {
    d = Math.round(d * (1 - (def.resist as any)[element] / 100));
  }
  m.hp -= Math.max(1, d);
  return Math.max(1, d);
}

function damageChar(g: GameState, ch: Character, dmg: number) {
  ch.hp -= dmg;
  if (ch.hp <= 0) {
    ch.hp = 0;
    ch.condition = 'unconscious';
    pushLog(g, `💀 ${ch.name} 倒下了！`);
  }
}

// ----- player combat actions -----
export function combatAttack(g: GameState, monsterIdx: number) {
  const c = g.combat!;
  const actor = g.party[currentActor(g)!.idx];
  const m = c.monsters[monsterIdx];
  if (!m || m.hp <= 0) return;
  const def = monsterMap[m.defId];
  const hit = d20();
  if (hit === 1) {
    pushLog(g, `${actor.name} 的攻擊落空了。`);
  } else if (hit === 20 || hit + attackBonusOf(actor) >= 10 + def.ac) {
    let dmg = weaponDamageRoll(actor);
    const crit = Math.random() < critChance(actor);
    if (crit || hit === 20) dmg = Math.round(dmg * 2);
    const dealt = applyDamageToMonster(g, monsterIdx, dmg);
    pushLog(g, `${actor.name} ${crit || hit === 20 ? '暴擊' : '命中'} ${def.name}，造成 ${dealt} 傷害。`);
    if (classMap[actor.classId].id === 'robber' && Math.random() < 0.5) {
      const g2 = rint(3, 12); g.gold += g2; pushLog(g, `🪙 ${actor.name} 偷取了 ${g2} 金幣。`);
    }
    if (m.hp <= 0) pushLog(g, `${def.name} 被擊倒！`);
  } else {
    pushLog(g, `${actor.name} 未能突破 ${def.name} 的防禦。`);
  }
  afterPlayerAction(g);
}

export function combatCast(g: GameState, spellId: string, targetIdx: number) {
  const c = g.combat!;
  const actor = g.party[currentActor(g)!.idx];
  const sp = spellMap[spellId];
  if (!sp || actor.sp < sp.cost) { toast(g, '法力不足'); return; }
  actor.sp -= sp.cost;
  const cm = attrMod(actor.attrs[castAttr(actor.classId)]);
  if (sp.kind === 'damage') {
    const base = sp.power + cm * 2;
    if (sp.target === 'allEnemies') {
      c.monsters.forEach((m, i) => {
        if (m.hp > 0) {
          const dealt = applyDamageToMonster(g, i, base + rnd(5), sp.element);
          void dealt;
        }
      });
      pushLog(g, `🔮 ${actor.name} 施放 ${sp.name}，席捲全體敵人！`);
    } else {
      const valid = targetIdx >= 0 && !!c.monsters[targetIdx] && c.monsters[targetIdx].hp > 0;
      const i = valid ? targetIdx : firstAliveMonsterIdx(g);
      if (i >= 0) {
        const dealt = applyDamageToMonster(g, i, base + rnd(5), sp.element);
        pushLog(g, `🔮 ${actor.name} 對 ${monsterMap[c.monsters[i].defId].name} 施放 ${sp.name}，造成 ${dealt} 傷害。`);
      }
    }
  } else if (sp.kind === 'heal') {
    const t = g.party[targetIdx] || actor;
    if (t.hp <= 0) t.condition = 'ok';
    t.hp = Math.min(t.maxHp, t.hp + sp.power + cm * 2);
    pushLog(g, `✨ ${actor.name} 治療了 ${t.name}。`);
  } else if (sp.kind === 'cureDead') {
    const t = g.party[targetIdx] || actor;
    t.condition = 'ok'; t.hp = Math.max(1, Math.floor(t.maxHp / 2));
    pushLog(g, `✨ ${actor.name} 復活了 ${t.name}！`);
  } else if (sp.kind === 'buffAtk') {
    g.party.forEach(p => { if (p.condition === 'ok') p.buffAtk = (p.buffAtk || 0) + sp.power; });
    pushLog(g, `🙏 ${actor.name} 施放 ${sp.name}，全隊攻擊提升。`);
  } else if (sp.kind === 'buffAc') {
    g.party.forEach(p => { if (p.condition === 'ok') p.buffAc = (p.buffAc || 0) + sp.power; });
    pushLog(g, `🛡 ${actor.name} 施放 ${sp.name}，全隊防禦提升。`);
  } else if (sp.kind === 'sleep') {
    pushLog(g, `💤 ${actor.name} 施放睡眠術。`);
  }
  afterPlayerAction(g);
}

export function combatItem(g: GameState, itemId: string, targetIdx: number) {
  if (useConsumable(g, itemId, targetIdx)) afterPlayerAction(g);
}

export function combatBlock(g: GameState) {
  const actor = g.party[currentActor(g)!.idx];
  actor.blocking = true;
  pushLog(g, `🛡 ${actor.name} 進入防禦。`);
  afterPlayerAction(g);
}

export function combatRun(g: GameState): boolean {
  if (g.combat!.boss) { toast(g, '無法從魔王身邊逃跑！'); return false; }
  if (Math.random() < 0.6) {
    pushLog(g, '你們成功逃離了戰鬥。');
    g.combat = null;
    g.screen = g.prevExplore;
    return true;
  }
  pushLog(g, '逃跑失敗！');
  // forfeit the rest of the round -> monsters act
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
  const c = g.combat!;
  const m = c.monsters[mIdx];
  if (m.hp <= 0) return;
  const def = monsterMap[m.defId];
  const targets = g.party.map((p, i) => ({ p, i })).filter(t => t.p.condition === 'ok' && t.p.hp > 0);
  if (targets.length === 0) return;
  const target = targets[rnd(targets.length)];
  // cast?
  if (def.spellId && Math.random() < 0.4) {
    const sp = spellMap[def.spellId];
    const dmg = sp.power + rnd(6);
    damageChar(g, target.p, dmg);
    pushLog(g, `${def.name} 施放 ${sp.name}，${target.p.name} 受到 ${dmg} 傷害。`);
    return;
  }
  const hit = d20();
  if (hit === 1) { pushLog(g, `${def.name} 的攻擊落空。`); return; }
  if (hit === 20 || hit + def.attack >= defenseOf(target.p)) {
    const dmg = roll(def.dmg);
    damageChar(g, target.p, dmg);
    pushLog(g, `${def.name} 攻擊 ${target.p.name}，造成 ${dmg} 傷害。`);
  } else {
    pushLog(g, `${target.p.name} 擋下了 ${def.name} 的攻擊。`);
  }
}

function endCombatWin(g: GameState) {
  const c = g.combat!;
  let totalXp = 0, totalGold = 0;
  for (const m of c.monsters) {
    const def = monsterMap[m.defId];
    totalXp += def.xp;
    totalGold += roll(def.gold);
  }
  const alive = aliveParty(g);
  const share = Math.max(1, Math.floor(totalXp / Math.max(1, alive.length)));
  for (const ch of alive) { ch.xp += share; ch.buffAtk = 0; ch.buffAc = 0; ch.blocking = false; }
  g.gold += totalGold;
  pushLog(g, `✨ 勝利！獲得 ${totalGold} 金幣、每人 ${share} 經驗。`);
  for (const ch of alive) levelUp(g, ch);
  if (c.boss) {
    g.flags['boss_dead'] = true;
    if (!g.backpack.includes('orb_of_terra')) g.backpack.push('orb_of_terra');
    pushLog(g, '🏆 巫妖王被擊敗了！你取得了泰拉星界寶珠！');
  }
  g.clearedEncounters = [...g.clearedEncounters, c.cell];
  g.combat = null;
  g.screen = g.prevExplore;
}

function endCombatLoss(g: GameState) {
  g.combat = null;
  g.screen = 'gameover';
  pushLog(g, '☠ 你的隊伍全滅了…');
}

// ---------- dialog / quests ----------
export function npcRootNode(g: GameState, npcId: string): string {
  if (npcId === 'tavern_keeper') {
    if (g.quests['orb_quest'] === 'complete') return 'done';
    if (g.quests['orb_quest'] === 'active' && hasItem(g, 'orb_of_terra')) return 'hasOrb';
  }
  return 'start';
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
      g.gold += q.rewardGold;
      const alive = aliveParty(g);
      const share = Math.max(1, Math.floor(q.rewardXp / Math.max(1, alive.length)));
      for (const ch of alive) { ch.xp += share; levelUp(g, ch); }
      // consume orb
      const oi = g.backpack.indexOf('orb_of_terra');
      if (oi >= 0) g.backpack.splice(oi, 1);
      pushLog(g, `🏆 任務完成！獲得 ${q.rewardGold} 金幣與 ${q.rewardXp} 經驗。`);
      g.flags['orb_returned'] = true;
    }
  }
  if (action.setFlag) g.flags[action.setFlag] = true;
  if (action.giveItem) g.backpack.push(action.giveItem);
  if (action.giveGold) g.gold += action.giveGold;
  if (action.heal) restPartyFull(g);
}

export function restPartyFull(g: GameState) {
  for (const ch of g.party) {
    if (ch.condition !== 'dead') {
      ch.condition = 'ok';
      ch.hp = ch.maxHp;
      ch.sp = ch.maxSp;
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
  if (!sp || cls.school !== sp.school) { toast(g, '此職業無法學習該法術'); return false; }
  if (ch.spells.includes(spellId)) { toast(g, '已經學會了'); return false; }
  const price = sp.level * 150;
  if (g.gold < price) { toast(g, '金幣不足'); return false; }
  g.gold -= price;
  ch.spells.push(spellId);
  pushLog(g, `${ch.name} 學會了 ${sp.name}。`);
  return true;
}

// ---------- save / load ----------
const SAVE_KEY = 'mm3_save_v1';
export function saveGame(g: GameState) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(g)); toast(g, '已存檔'); } catch { /* ignore */ }
}
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch { return null; }
}
export function hasSave(): boolean {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
