// ===== All game content (data-driven). Expand the world by editing these tables. =====
import {
  Race, ClassDef, Spell, ItemDef, MonsterDef, TileMap, NPCDef, QuestDef, ShopDef,
} from '../types';

export const RACES: Race[] = [
  { id: 'human', name: '人類', nameEn: 'Human', mods: {}, desc: '均衡，無特殊弱點。' },
  { id: 'elf', name: '精靈', nameEn: 'Elf', mods: { intellect: 2, accuracy: 1, endurance: -1 }, desc: '聰慧敏銳，體格稍弱。' },
  { id: 'dwarf', name: '矮人', nameEn: 'Dwarf', mods: { endurance: 2, might: 1, speed: -1 }, desc: '強韌耐打，行動較慢。' },
  { id: 'gnome', name: '侏儒', nameEn: 'Gnome', mods: { intellect: 1, luck: 2, might: -1 }, desc: '機運極佳的施法者。' },
  { id: 'half-orc', name: '半獸人', nameEn: 'Half-Orc', mods: { might: 2, endurance: 1, intellect: -2 }, desc: '孔武有力，頭腦簡單。' },
];

export const CLASSES: ClassDef[] = [
  { id: 'knight', name: '騎士', nameEn: 'Knight', hitDie: 12, spDie: 0, school: null, baseAttack: 2, startSpells: [], primary: 'might', desc: '最強的近戰戰士。' },
  { id: 'paladin', name: '聖騎士', nameEn: 'Paladin', hitDie: 10, spDie: 3, school: 'cleric', baseAttack: 2, startSpells: ['first_aid'], primary: 'might', desc: '戰士兼習神術。' },
  { id: 'archer', name: '弓箭手', nameEn: 'Archer', hitDie: 8, spDie: 3, school: 'sorcerer', baseAttack: 2, startSpells: ['spark'], primary: 'accuracy', desc: '遠程好手，略通奧術。' },
  { id: 'cleric', name: '牧師', nameEn: 'Cleric', hitDie: 8, spDie: 6, school: 'cleric', baseAttack: 1, startSpells: ['heal', 'first_aid'], primary: 'personality', desc: '治療與守護的神術師。' },
  { id: 'sorcerer', name: '法師', nameEn: 'Sorcerer', hitDie: 6, spDie: 7, school: 'sorcerer', baseAttack: 0, startSpells: ['spark', 'light'], primary: 'intellect', desc: '毀滅性的奧術師。' },
  { id: 'robber', name: '盜賊', nameEn: 'Robber', hitDie: 8, spDie: 0, school: null, baseAttack: 1, startSpells: [], primary: 'speed', desc: '敏捷、擅長偷竊與暴擊。' },
];

export const SPELLS: Spell[] = [
  // Sorcerer
  { id: 'spark', name: '電花', nameEn: 'Spark', school: 'sorcerer', level: 1, cost: 2, target: 'enemy', kind: 'damage', power: 8, element: 'shock', usableOutside: false, desc: '對單一敵人造成電擊。' },
  { id: 'flame_arrow', name: '火焰箭', nameEn: 'Flame Arrow', school: 'sorcerer', level: 1, cost: 3, target: 'enemy', kind: 'damage', power: 11, element: 'fire', usableOutside: false, desc: '灼燒單一敵人。' },
  { id: 'light', name: '光亮術', nameEn: 'Light', school: 'sorcerer', level: 1, cost: 1, target: 'party', kind: 'light', power: 0, usableOutside: true, desc: '照亮地城。' },
  { id: 'sleep', name: '睡眠術', nameEn: 'Sleep', school: 'sorcerer', level: 2, cost: 4, target: 'allEnemies', kind: 'sleep', power: 0, usableOutside: false, desc: '使敵群陷入沉睡（降低命中）。' },
  { id: 'frostbite', name: '寒冰', nameEn: 'Frostbite', school: 'sorcerer', level: 2, cost: 4, target: 'enemy', kind: 'damage', power: 16, element: 'cold', usableOutside: false, desc: '強力冰霜傷害。' },
  { id: 'fireball', name: '火球術', nameEn: 'Fireball', school: 'sorcerer', level: 3, cost: 6, target: 'allEnemies', kind: 'damage', power: 14, element: 'fire', usableOutside: false, desc: '對全體敵人造成火焰傷害。' },
  { id: 'lightning', name: '閃電束', nameEn: 'Lightning Bolt', school: 'sorcerer', level: 4, cost: 8, target: 'allEnemies', kind: 'damage', power: 20, element: 'shock', usableOutside: false, desc: '貫穿全體敵人的雷電。' },
  // Cleric
  { id: 'first_aid', name: '急救術', nameEn: 'First Aid', school: 'cleric', level: 1, cost: 2, target: 'ally', kind: 'heal', power: 10, usableOutside: true, desc: '恢復少量生命。' },
  { id: 'heal', name: '治療術', nameEn: 'Heal', school: 'cleric', level: 1, cost: 3, target: 'ally', kind: 'heal', power: 18, usableOutside: true, desc: '恢復生命。' },
  { id: 'bless', name: '祝福術', nameEn: 'Bless', school: 'cleric', level: 2, cost: 4, target: 'party', kind: 'buffAtk', power: 3, usableOutside: false, desc: '全隊命中與傷害提升。' },
  { id: 'protection', name: '守護術', nameEn: 'Protection', school: 'cleric', level: 2, cost: 4, target: 'party', kind: 'buffAc', power: 3, usableOutside: false, desc: '全隊防禦提升。' },
  { id: 'turn_undead', name: '驅散不死', nameEn: 'Turn Undead', school: 'cleric', level: 2, cost: 4, target: 'enemy', kind: 'damage', power: 14, element: 'holy', usableOutside: false, desc: '對不死系造成神聖傷害。' },
  { id: 'cure_wounds', name: '治癒重傷', nameEn: 'Cure Wounds', school: 'cleric', level: 3, cost: 6, target: 'ally', kind: 'heal', power: 40, usableOutside: true, desc: '大幅恢復生命。' },
  { id: 'raise_dead', name: '復活術', nameEn: 'Raise Dead', school: 'cleric', level: 4, cost: 10, target: 'ally', kind: 'cureDead', power: 1, usableOutside: true, desc: '使倒下的同伴復活。' },
  { id: 'holy_word', name: '神聖審判', nameEn: 'Holy Word', school: 'cleric', level: 4, cost: 8, target: 'allEnemies', kind: 'damage', power: 18, element: 'holy', usableOutside: false, desc: '神聖之力席捲敵群。' },
];

export const ITEMS: ItemDef[] = [
  // weapons
  { id: 'dagger', name: '匕首', nameEn: 'Dagger', type: 'weapon', slot: 'weapon', dmg: [1, 3], atkBonus: 0, value: 10, desc: '輕巧的小刀。' },
  { id: 'mace', name: '釘錘', nameEn: 'Mace', type: 'weapon', slot: 'weapon', dmg: [2, 7], atkBonus: 1, value: 60, desc: '神職者愛用的鈍器。' },
  { id: 'short_sword', name: '短劍', nameEn: 'Short Sword', type: 'weapon', slot: 'weapon', dmg: [2, 5], atkBonus: 1, value: 40, desc: '可靠的近戰武器。' },
  { id: 'long_sword', name: '長劍', nameEn: 'Long Sword', type: 'weapon', slot: 'weapon', dmg: [3, 8], atkBonus: 2, value: 120, desc: '騎士的標準配劍。' },
  { id: 'battle_axe', name: '戰斧', nameEn: 'Battle Axe', type: 'weapon', slot: 'weapon', dmg: [3, 10], atkBonus: 2, value: 160, twoHanded: true, desc: '沉重的雙手斧。' },
  { id: 'short_bow', name: '短弓', nameEn: 'Short Bow', type: 'weapon', slot: 'weapon', dmg: [2, 6], atkBonus: 1, value: 80, desc: '遠程攻擊武器。' },
  // armor
  { id: 'cloth', name: '布衣', nameEn: 'Cloth', type: 'armor', slot: 'armor', acBonus: 1, value: 5, desc: '聊勝於無。' },
  { id: 'leather', name: '皮甲', nameEn: 'Leather Armor', type: 'armor', slot: 'armor', acBonus: 3, value: 30, desc: '輕便皮製護甲。' },
  { id: 'chain', name: '鎖子甲', nameEn: 'Chain Mail', type: 'armor', slot: 'armor', acBonus: 6, value: 120, desc: '環環相扣的金屬甲。' },
  { id: 'plate', name: '板甲', nameEn: 'Plate Mail', type: 'armor', slot: 'armor', acBonus: 10, value: 400, desc: '最堅固的全身板甲。' },
  // shields
  { id: 'buckler', name: '圓盾', nameEn: 'Buckler', type: 'shield', slot: 'shield', acBonus: 1, value: 20, desc: '小型手盾。' },
  { id: 'kite_shield', name: '鳶盾', nameEn: 'Kite Shield', type: 'shield', slot: 'shield', acBonus: 3, value: 80, desc: '大型防護盾。' },
  // helms
  { id: 'leather_cap', name: '皮帽', nameEn: 'Leather Cap', type: 'helm', slot: 'helm', acBonus: 1, value: 15, desc: '簡單的頭部護具。' },
  { id: 'iron_helm', name: '鐵盔', nameEn: 'Iron Helm', type: 'helm', slot: 'helm', acBonus: 2, value: 60, desc: '堅固的鐵製頭盔。' },
  // accessories
  { id: 'ring_protection', name: '守護戒指', nameEn: 'Ring of Protection', type: 'accessory', slot: 'accessory', acBonus: 2, value: 200, desc: '散發護盾微光。' },
  { id: 'amulet_might', name: '力量護符', nameEn: 'Amulet of Might', type: 'accessory', slot: 'accessory', atkBonus: 2, value: 200, desc: '增強持有者的攻擊。' },
  // consumables
  { id: 'healing_potion', name: '治療藥水', nameEn: 'Healing Potion', type: 'consumable', heal: 30, value: 25, desc: '恢復 30 點生命。' },
  { id: 'greater_healing', name: '高級治療藥水', nameEn: 'Greater Healing Potion', type: 'consumable', heal: 70, value: 80, desc: '恢復 70 點生命。' },
  { id: 'mana_potion', name: '法力藥水', nameEn: 'Mana Potion', type: 'consumable', restore: 20, value: 30, desc: '恢復 20 點法力。' },
  // quest
  { id: 'crystal_key', name: '水晶鑰匙', nameEn: 'Crystal Key', type: 'quest', value: 0, desc: '能開啟地城深處封印之門。' },
  { id: 'orb_of_terra', name: '泰拉星界寶珠', nameEn: 'Orb of Terra', type: 'quest', value: 0, desc: '蘊含泰拉群島古老力量的寶珠。' },
];

export const MONSTERS: MonsterDef[] = [
  { id: 'giant_rat', name: '巨鼠', nameEn: 'Giant Rat', hp: 6, ac: 1, attack: 1, dmg: [1, 3], speed: 9, xp: 12, gold: [1, 6], color: '#9a8c98', desc: '地城中常見的害獸。' },
  { id: 'kobold', name: '狗頭人', nameEn: 'Kobold', hp: 9, ac: 2, attack: 2, dmg: [2, 4], speed: 11, xp: 20, gold: [4, 10], color: '#bc6c25', desc: '成群結隊的小怪。' },
  { id: 'goblin', name: '哥布林', nameEn: 'Goblin', hp: 12, ac: 3, attack: 3, dmg: [2, 6], speed: 10, xp: 30, gold: [6, 14], color: '#588157', desc: '兇悍的綠皮戰士。' },
  { id: 'cave_spider', name: '洞穴蜘蛛', nameEn: 'Cave Spider', hp: 14, ac: 4, attack: 4, dmg: [2, 7], speed: 13, xp: 38, gold: [3, 9], color: '#4a4e69', desc: '迅捷而致命。' },
  { id: 'skeleton', name: '骷髏兵', nameEn: 'Skeleton', hp: 16, ac: 4, attack: 4, dmg: [3, 7], speed: 8, xp: 45, gold: [8, 18], resist: { cold: 50 }, color: '#e0e1dd', desc: '被喚醒的亡者骨兵。' },
  { id: 'orc', name: '半獸人', nameEn: 'Orc', hp: 22, ac: 5, attack: 5, dmg: [4, 9], speed: 9, xp: 60, gold: [12, 24], color: '#606c38', desc: '強壯的戰士。' },
  { id: 'zombie', name: '殭屍', nameEn: 'Zombie', hp: 26, ac: 3, attack: 4, dmg: [3, 10], speed: 5, xp: 55, gold: [5, 12], resist: { cold: 50 }, color: '#7f5539', desc: '緩慢但耐打的腐屍。' },
  { id: 'dark_acolyte', name: '黑暗祭司', nameEn: 'Dark Acolyte', hp: 20, ac: 4, attack: 3, dmg: [2, 6], speed: 11, xp: 75, gold: [18, 36], spellId: 'spark', color: '#5a189a', desc: '會施放法術的敵人。' },
  { id: 'lich_king', name: '巫妖王', nameEn: 'Lich King', hp: 140, ac: 8, attack: 8, dmg: [6, 14], speed: 12, xp: 600, gold: [200, 350], spellId: 'fireball', resist: { cold: 50, shock: 30 }, boss: true, color: '#7c3aed', desc: '泰拉地城深處的不死之主。' },
];

// ---------- Maps ----------
export const MAPS: TileMap[] = [
  {
    id: 'overworld',
    name: '泰拉地表',
    nameEn: 'Terra Overworld',
    kind: 'overworld',
    grid: [
      '##############',
      '#............#',
      '#..~~~.......#',
      '#..~~~..^^...#',
      '#.......^^...#',
      '#...TT......#',
      '#...TT......#',
      '#...........#',
      '#...........#',
      '##############',
    ],
    start: { x: 3, y: 8, dir: 0 },
    portals: {
      '2,8': { toMap: 'overworld', to: { x: 2, y: 8 }, toScreen: 'town', label: '索皮加城' },
      '12,1': { toMap: 'dungeon1', to: { x: 1, y: 1, dir: 1 }, label: '地城入口' },
    },
    encounters: {
      '7,6': { monsters: [{ id: 'goblin', count: [1, 2] }, { id: 'kobold', count: [1, 2] }] },
    },
  },
  {
    id: 'dungeon1',
    name: '泰拉地城 · 一層',
    nameEn: 'Terra Dungeon · L1',
    kind: 'dungeon',
    level: 1,
    grid: [
      '############',
      '#S......#D.#',
      '#.........##',
      '#..........#',
      '#..........#',
      '#....##....#',
      '#....##....#',
      '#..........#',
      '#..........#',
      '#..........#',
      '############',
    ],
    start: { x: 1, y: 1, dir: 1 },
    doors: {
      '9,1': { locked: true, keyItem: 'crystal_key', text: '一扇刻著符文的封印之門。' },
    },
    chests: {
      '10,9': { items: ['crystal_key'], gold: [20, 40] },
      '1,9': { gold: [30, 60], items: ['healing_potion'] },
      '10,3': { gold: [15, 35], items: ['leather'] },
    },
    encounters: {
      '3,5': { monsters: [{ id: 'giant_rat', count: [2, 3] }, { id: 'kobold', count: [1, 2] }] },
      '8,7': { monsters: [{ id: 'goblin', count: [2, 3] }] },
      '5,8': { monsters: [{ id: 'skeleton', count: [1, 2] }, { id: 'giant_rat', count: [1, 2] }] },
    },
    portals: {
      '10,1': { toMap: 'dungeon2', to: { x: 1, y: 1, dir: 1 }, label: '向下的階梯' },
      '1,1': { toMap: 'overworld', to: { x: 11, y: 1, dir: 3 }, label: '回到地表' },
    },
  },
  {
    id: 'dungeon2',
    name: '泰拉地城 · 深層',
    nameEn: 'Terra Dungeon · Depths',
    kind: 'dungeon',
    level: 2,
    grid: [
      '############',
      '#..........#',
      '#..####....#',
      '#..........#',
      '#....##....#',
      '#....##....#',
      '#..........#',
      '#..........#',
      '############',
    ],
    start: { x: 1, y: 1, dir: 1 },
    chests: {
      '1,6': { gold: [40, 80], items: ['greater_healing'] },
      '10,1': { gold: [30, 60], items: ['kite_shield'] },
    },
    encounters: {
      '5,3': { monsters: [{ id: 'orc', count: [1, 2] }, { id: 'cave_spider', count: [1, 2] }] },
      '8,5': { monsters: [{ id: 'zombie', count: [1, 2] }, { id: 'dark_acolyte', count: [1, 1] }] },
      '10,7': { monsters: [{ id: 'lich_king', count: [1, 1] }], once: true, boss: true },
    },
    portals: {
      '1,1': { toMap: 'dungeon1', to: { x: 10, y: 1, dir: 3 }, label: '向上的階梯' },
    },
  },
];

// ---------- NPCs / Dialog ----------
export const NPCS: NPCDef[] = [
  {
    id: 'tavern_keeper',
    name: '酒館老闆 古斯',
    nameEn: 'Gus the Tavernkeeper',
    root: 'start',
    nodes: {
      start: {
        id: 'start',
        text: '「旅人啊，泰拉群島正陷入黑暗。地城深處的『泰拉星界寶珠』被巫妖王奪走了。你願意取回它嗎？」',
        options: [
          { label: '我接下這個任務', to: 'accepted', action: { giveQuest: 'orb_quest' } },
          { label: '寶珠在哪裡？', to: 'where' },
          { label: '改天再說', action: { end: true } },
        ],
      },
      where: {
        id: 'where',
        text: '「在城外東北方的地城深處。一層有道封印之門，需要『水晶鑰匙』才能通往下層。小心巫妖王！」',
        options: [
          { label: '我接下這個任務', to: 'accepted', action: { giveQuest: 'orb_quest' } },
          { label: '離開', action: { end: true } },
        ],
      },
      accepted: {
        id: 'accepted',
        text: '「願光明指引你。取回寶珠後回來找我，必有重謝。」',
        options: [{ label: '出發', action: { end: true } }],
      },
      hasOrb: {
        id: 'hasOrb',
        text: '「你…你真的取回了寶珠！泰拉得救了！這是你應得的獎賞，英雄。」',
        options: [{ label: '領取獎賞', action: { completeQuest: 'orb_quest', end: true } }],
      },
      done: {
        id: 'done',
        text: '「英雄，泰拉的居民永遠感激你。」',
        options: [{ label: '離開', action: { end: true } }],
      },
    },
  },
];

export const QUESTS: QuestDef[] = [
  { id: 'orb_quest', name: '泰拉星界寶珠', nameEn: 'The Orb of Terra', desc: '從地城深處的巫妖王手中取回泰拉星界寶珠。', rewardGold: 500, rewardXp: 400 },
];

// ---------- Shops ----------
export const SHOPS: ShopDef[] = [
  { id: 'weapon_smith', name: '武器鋪', nameEn: 'Weapon Smith', kind: 'goods', stock: ['dagger', 'short_sword', 'mace', 'long_sword', 'battle_axe', 'short_bow'] },
  { id: 'armorer', name: '防具鋪', nameEn: 'Armorer', kind: 'goods', stock: ['cloth', 'leather', 'chain', 'plate', 'buckler', 'kite_shield', 'leather_cap', 'iron_helm'] },
  { id: 'magic_guild', name: '魔法公會', nameEn: 'Magic Guild', kind: 'magic', stock: ['healing_potion', 'mana_potion', 'greater_healing'], spells: ['flame_arrow', 'frostbite', 'fireball', 'lightning', 'sleep', 'heal', 'bless', 'protection', 'turn_undead', 'cure_wounds', 'holy_word', 'raise_dead'] },
  { id: 'temple', name: '神殿', nameEn: 'Temple', kind: 'temple', stock: [] },
  { id: 'inn', name: '旅店', nameEn: 'Inn', kind: 'inn', stock: [] },
];

// ---------- Lookup helpers ----------
const byId = <T extends { id: string }>(arr: T[]) => {
  const m: Record<string, T> = {};
  for (const x of arr) m[x.id] = x;
  return m;
};

export const raceMap = byId(RACES);
export const classMap = byId(CLASSES);
export const spellMap = byId(SPELLS);
export const itemMap = byId(ITEMS);
export const monsterMap = byId(MONSTERS);
export const mapMap = byId(MAPS);
export const npcMap = byId(NPCS);
export const questMap = byId(QUESTS);
export const shopMap = byId(SHOPS);
