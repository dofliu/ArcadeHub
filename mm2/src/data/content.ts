// ===== All game content (data-driven). Expand the world by editing these tables. =====
// Tribute to Might & Magic II: Gates to Another World — the land of CRON.
import {
  Race, ClassDef, Spell, ItemDef, MonsterDef, TileMap, NPCDef, QuestDef, ShopDef, TownDef,
} from '../types';

export const RACES: Race[] = [
  { id: 'human', name: '人類', nameEn: 'Human', mods: {}, desc: '均衡，無特殊弱點。' },
  { id: 'elf', name: '精靈', nameEn: 'Elf', mods: { intellect: 2, accuracy: 1, endurance: -1 }, desc: '聰慧敏銳，體格稍弱。' },
  { id: 'dwarf', name: '矮人', nameEn: 'Dwarf', mods: { endurance: 2, might: 1, speed: -1 }, desc: '強韌耐打，行動較慢。' },
  { id: 'gnome', name: '侏儒', nameEn: 'Gnome', mods: { intellect: 1, luck: 2, might: -1 }, desc: '機運極佳的施法者。' },
  { id: 'half-orc', name: '半獸人', nameEn: 'Half-Orc', mods: { might: 2, endurance: 1, intellect: -2 }, desc: '孔武有力，頭腦簡單。' },
];

// Might & Magic II's eight classes.
export const CLASSES: ClassDef[] = [
  { id: 'knight', name: '騎士', nameEn: 'Knight', hitDie: 12, spDie: 0, school: null, baseAttack: 2, startSpells: [], primary: 'might', desc: '最強的近戰戰士。' },
  { id: 'paladin', name: '聖騎士', nameEn: 'Paladin', hitDie: 10, spDie: 3, school: 'cleric', baseAttack: 2, startSpells: ['first_aid'], primary: 'might', desc: '戰士兼習神術。' },
  { id: 'archer', name: '弓箭手', nameEn: 'Archer', hitDie: 8, spDie: 3, school: 'sorcerer', baseAttack: 2, startSpells: ['spark'], primary: 'accuracy', desc: '遠程好手，略通奧術。' },
  { id: 'cleric', name: '牧師', nameEn: 'Cleric', hitDie: 8, spDie: 6, school: 'cleric', baseAttack: 1, startSpells: ['heal', 'first_aid'], primary: 'personality', desc: '治療與守護的神術師。' },
  { id: 'sorcerer', name: '法師', nameEn: 'Sorcerer', hitDie: 6, spDie: 7, school: 'sorcerer', baseAttack: 0, startSpells: ['spark', 'light'], primary: 'intellect', desc: '毀滅性的奧術師。' },
  { id: 'robber', name: '盜賊', nameEn: 'Robber', hitDie: 8, spDie: 0, school: null, baseAttack: 1, startSpells: [], primary: 'speed', desc: '敏捷、擅長偷竊與開鎖。' },
  { id: 'ninja', name: '忍者', nameEn: 'Ninja', hitDie: 8, spDie: 0, school: null, baseAttack: 2, startSpells: [], primary: 'speed', desc: '暗影殺手，暴擊率極高、行動迅捷。' },
  { id: 'barbarian', name: '野蠻人', nameEn: 'Barbarian', hitDie: 14, spDie: 0, school: null, baseAttack: 2, startSpells: [], primary: 'endurance', desc: '生命力驚人的狂戰士。' },
];

export const SPELLS: Spell[] = [
  // Sorcerer
  { id: 'spark', name: '電花', nameEn: 'Spark', school: 'sorcerer', level: 1, cost: 2, target: 'enemy', kind: 'damage', power: 8, element: 'shock', usableOutside: false, desc: '對單一敵人造成電擊。' },
  { id: 'flame_arrow', name: '火焰箭', nameEn: 'Flame Arrow', school: 'sorcerer', level: 1, cost: 3, target: 'enemy', kind: 'damage', power: 11, element: 'fire', usableOutside: false, desc: '灼燒單一敵人。' },
  { id: 'light', name: '光亮術', nameEn: 'Light', school: 'sorcerer', level: 1, cost: 1, target: 'party', kind: 'light', power: 0, usableOutside: true, desc: '照亮地城。' },
  { id: 'wizard_eye', name: '巫師之眼', nameEn: 'Wizard Eye', school: 'sorcerer', level: 2, cost: 3, target: 'party', kind: 'light', power: 0, usableOutside: true, desc: '揭示地城的自動地圖。' },
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
  // ---- Milestone 2 additions ----
  // Sorcerer
  { id: 'acid_spray', name: '酸液噴濺', nameEn: 'Acid Spray', school: 'sorcerer', level: 1, cost: 3, target: 'enemy', kind: 'damage', power: 12, element: 'poison', usableOutside: false, desc: '腐蝕單一敵人。' },
  { id: 'shield', name: '魔法護盾', nameEn: 'Shield', school: 'sorcerer', level: 2, cost: 3, target: 'party', kind: 'buffAc', power: 4, usableOutside: false, desc: '全隊防禦提升。' },
  { id: 'haste', name: '加速術', nameEn: 'Haste', school: 'sorcerer', level: 3, cost: 6, target: 'party', kind: 'haste', power: 3, usableOutside: false, desc: '全隊行動加速、更難被擊中。' },
  { id: 'energy_blast', name: '能量爆發', nameEn: 'Energy Blast', school: 'sorcerer', level: 3, cost: 7, target: 'allEnemies', kind: 'damage', power: 16, element: 'energy', usableOutside: false, desc: '純能量轟擊全體敵人。' },
  { id: 'ice_storm', name: '冰風暴', nameEn: 'Ice Storm', school: 'sorcerer', level: 4, cost: 9, target: 'allEnemies', kind: 'damage', power: 22, element: 'cold', usableOutside: false, desc: '冰雪席捲全場。' },
  { id: 'town_portal', name: '城鎮傳送', nameEn: 'Town Portal', school: 'sorcerer', level: 4, cost: 8, target: 'self', kind: 'recall', power: 0, usableOutside: true, desc: '立即傳送回城鎮。' },
  { id: 'meteor', name: '隕石術', nameEn: 'Meteor Shower', school: 'sorcerer', level: 5, cost: 13, target: 'allEnemies', kind: 'damage', power: 30, element: 'fire', usableOutside: false, desc: '天降隕石，毀滅全場。' },
  // Cleric
  { id: 'restore', name: '回復術', nameEn: 'Restore', school: 'cleric', level: 2, cost: 4, target: 'ally', kind: 'heal', power: 28, usableOutside: true, desc: '恢復大量生命。' },
  { id: 'cure_ailment', name: '淨化術', nameEn: 'Cure Ailment', school: 'cleric', level: 2, cost: 4, target: 'party', kind: 'cure', power: 0, usableOutside: true, desc: '解除全隊的中毒、沉睡與麻痺。' },
  { id: 'smite', name: '神罰', nameEn: 'Smite', school: 'cleric', level: 3, cost: 6, target: 'enemy', kind: 'damage', power: 22, element: 'holy', usableOutside: false, desc: '神聖之力重擊單一敵人。' },
  { id: 'mass_heal', name: '群體治療', nameEn: 'Mass Heal', school: 'cleric', level: 3, cost: 8, target: 'party', kind: 'partyHeal', power: 26, usableOutside: true, desc: '治療整支隊伍。' },
  { id: 'greater_protection', name: '高等守護', nameEn: 'Greater Protection', school: 'cleric', level: 4, cost: 8, target: 'party', kind: 'buffAc', power: 6, usableOutside: false, desc: '大幅提升全隊防禦。' },
  { id: 'sunray', name: '陽炎審判', nameEn: 'Sunray', school: 'cleric', level: 5, cost: 13, target: 'allEnemies', kind: 'damage', power: 28, element: 'holy', usableOutside: false, desc: '熾烈聖光焚盡敵群。' },
];

export const ITEMS: ItemDef[] = [
  // weapons
  { id: 'dagger', name: '匕首', nameEn: 'Dagger', type: 'weapon', slot: 'weapon', dmg: [1, 3], atkBonus: 0, value: 10, desc: '輕巧的小刀。' },
  { id: 'mace', name: '釘錘', nameEn: 'Mace', type: 'weapon', slot: 'weapon', dmg: [2, 7], atkBonus: 1, value: 60, desc: '神職者愛用的鈍器。' },
  { id: 'short_sword', name: '短劍', nameEn: 'Short Sword', type: 'weapon', slot: 'weapon', dmg: [2, 5], atkBonus: 1, value: 40, desc: '可靠的近戰武器。' },
  { id: 'long_sword', name: '長劍', nameEn: 'Long Sword', type: 'weapon', slot: 'weapon', dmg: [3, 8], atkBonus: 2, value: 120, desc: '騎士的標準配劍。' },
  { id: 'battle_axe', name: '戰斧', nameEn: 'Battle Axe', type: 'weapon', slot: 'weapon', dmg: [3, 10], atkBonus: 2, value: 160, twoHanded: true, desc: '沉重的雙手斧。' },
  { id: 'katana', name: '武士刀', nameEn: 'Katana', type: 'weapon', slot: 'weapon', dmg: [3, 9], atkBonus: 2, value: 180, desc: '忍者鍾愛的利刃。' },
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
  { id: 'orb_of_time', name: '時光寶珠', nameEn: 'Orb of Time', type: 'quest', value: 0, desc: '維繫克朗大陸時空穩定的古老寶珠。' },
  { id: 'moonleaf', name: '月光草', nameEn: 'Moonleaf', type: 'quest', value: 0, desc: '只生長在地城陰影中的藥草，藥師葛瑞塔需要它。' },
  { id: 'arcane_tome', name: '奧術法典', nameEn: 'Arcane Tome', type: 'quest', value: 0, desc: '記載著失傳法術的古老書卷。' },
  // ---- Milestone 2 additions ----
  // weapons
  { id: 'spear', name: '長矛', nameEn: 'Spear', type: 'weapon', slot: 'weapon', dmg: [3, 7], atkBonus: 1, value: 70, desc: '攻擊範圍長的刺擊武器。' },
  { id: 'flail', name: '連枷', nameEn: 'Flail', type: 'weapon', slot: 'weapon', dmg: [3, 9], atkBonus: 1, value: 110, desc: '帶刺鐵球的鈍器。' },
  { id: 'morning_star', name: '晨星錘', nameEn: 'Morning Star', type: 'weapon', slot: 'weapon', dmg: [4, 9], atkBonus: 2, value: 150, desc: '沉重的尖刺錘。' },
  { id: 'two_handed_sword', name: '巨劍', nameEn: 'Two-Handed Sword', type: 'weapon', slot: 'weapon', dmg: [5, 12], atkBonus: 3, value: 260, twoHanded: true, desc: '需雙手揮舞的巨大劍刃。' },
  { id: 'halberd', name: '戟', nameEn: 'Halberd', type: 'weapon', slot: 'weapon', dmg: [4, 11], atkBonus: 3, value: 240, twoHanded: true, desc: '斧與矛合一的長柄武器。' },
  { id: 'crossbow', name: '十字弓', nameEn: 'Crossbow', type: 'weapon', slot: 'weapon', dmg: [4, 9], atkBonus: 2, value: 180, desc: '威力強大的遠程武器。' },
  { id: 'war_staff', name: '戰法杖', nameEn: 'War Staff', type: 'weapon', slot: 'weapon', dmg: [2, 6], atkBonus: 2, acBonus: 1, value: 160, desc: '法師可用、兼具防禦的長杖。' },
  { id: 'dragon_blade', name: '龍焰之劍', nameEn: 'Dragon Blade', type: 'weapon', slot: 'weapon', dmg: [6, 14], atkBonus: 4, value: 800, desc: '傳說中蘊含龍焰的寶劍。' },
  // armor
  { id: 'ring_mail', name: '環甲', nameEn: 'Ring Mail', type: 'armor', slot: 'armor', acBonus: 5, value: 90, desc: '縫綴金屬環的護甲。' },
  { id: 'scale_mail', name: '鱗甲', nameEn: 'Scale Mail', type: 'armor', slot: 'armor', acBonus: 7, value: 200, desc: '層疊鱗片的護甲。' },
  { id: 'splint_mail', name: '板條甲', nameEn: 'Splint Mail', type: 'armor', slot: 'armor', acBonus: 8, value: 300, desc: '金屬板條強化的護甲。' },
  { id: 'dragon_plate', name: '龍鱗板甲', nameEn: 'Dragon Plate', type: 'armor', slot: 'armor', acBonus: 13, value: 900, desc: '以龍鱗鍛造的傳說護甲。' },
  { id: 'arcane_robe', name: '奧術長袍', nameEn: 'Arcane Robe', type: 'armor', slot: 'armor', acBonus: 3, value: 220, desc: '不妨礙施法、附帶護盾的長袍。' },
  // shields / helms
  { id: 'tower_shield', name: '塔盾', nameEn: 'Tower Shield', type: 'shield', slot: 'shield', acBonus: 5, value: 200, desc: '巨大的全身防護盾。' },
  { id: 'great_helm', name: '巨盔', nameEn: 'Great Helm', type: 'helm', slot: 'helm', acBonus: 3, value: 140, desc: '厚重的全罩式頭盔。' },
  // accessories
  { id: 'ring_might', name: '力量之戒', nameEn: 'Ring of Might', type: 'accessory', slot: 'accessory', atkBonus: 3, value: 320, desc: '大幅增強攻擊。' },
  { id: 'cloak_protection', name: '守護斗篷', nameEn: 'Cloak of Protection', type: 'accessory', slot: 'accessory', acBonus: 3, value: 320, desc: '飄逸間散發防護之力。' },
  // consumables
  { id: 'antidote', name: '解毒劑', nameEn: 'Antidote', type: 'consumable', heal: 10, value: 15, desc: '解除毒素並回復少量生命。' },
  { id: 'elixir', name: '萬靈藥', nameEn: 'Elixir', type: 'consumable', heal: 60, restore: 30, value: 120, desc: '同時回復生命與法力。' },
  { id: 'greater_mana', name: '高級法力藥水', nameEn: 'Greater Mana Potion', type: 'consumable', restore: 45, value: 70, desc: '恢復 45 點法力。' },
  // quest items
  { id: 'sea_crown', name: '海皇冠冕', nameEn: 'Crown of the Deep', type: 'quest', value: 0, desc: '沉沒洞窟魔王守護的古老冠冕。' },
  { id: 'ancient_scroll', name: '遠古卷軸', nameEn: 'Ancient Scroll', type: 'quest', value: 0, desc: '智者賽吉想研究的神祕卷軸。' },
  { id: 'rune_key', name: '符文鑰匙', nameEn: 'Rune Key', type: 'quest', value: 0, desc: '開啟沉沒洞窟深處封印的符文之鑰。' },
  // ---- Milestone 4 ----
  { id: 'storm_blade', name: '雷霆之刃', nameEn: 'Storm Blade', type: 'weapon', slot: 'weapon', dmg: [5, 12], atkBonus: 3, value: 520, desc: '附帶雷電的鋒利長劍。' },
  { id: 'mithril_plate', name: '秘銀板甲', nameEn: 'Mithril Plate', type: 'armor', slot: 'armor', acBonus: 12, value: 720, desc: '輕盈而堅固的秘銀全身甲。' },
  { id: 'sky_shard', name: '天空碎片', nameEn: 'Sky Shard', type: 'quest', value: 0, desc: '天空神殿核心的結晶碎片，天文學家亟欲研究。' },
];

export const MONSTERS: MonsterDef[] = [
  { id: 'giant_rat', name: '巨鼠', nameEn: 'Giant Rat', hp: 6, ac: 1, attack: 1, dmg: [1, 3], speed: 9, xp: 12, gold: [1, 6], color: '#9a8c98', desc: '地城中常見的害獸。' },
  { id: 'kobold', name: '狗頭人', nameEn: 'Kobold', hp: 9, ac: 2, attack: 2, dmg: [2, 4], speed: 11, xp: 20, gold: [4, 10], color: '#bc6c25', desc: '成群結隊的小怪。' },
  { id: 'goblin', name: '哥布林', nameEn: 'Goblin', hp: 12, ac: 3, attack: 3, dmg: [2, 6], speed: 10, xp: 30, gold: [6, 14], color: '#588157', desc: '兇悍的綠皮戰士。' },
  { id: 'cave_spider', name: '洞穴蜘蛛', nameEn: 'Cave Spider', hp: 14, ac: 4, attack: 4, dmg: [2, 7], speed: 13, xp: 38, gold: [3, 9], inflicts: { poison: 0.4 }, color: '#4a4e69', desc: '迅捷而致命，咬擊帶毒。' },
  { id: 'skeleton', name: '骷髏兵', nameEn: 'Skeleton', hp: 16, ac: 4, attack: 4, dmg: [3, 7], speed: 8, xp: 45, gold: [8, 18], resist: { cold: 50 }, color: '#e0e1dd', desc: '被喚醒的亡者骨兵。' },
  { id: 'orc', name: '半獸人', nameEn: 'Orc', hp: 22, ac: 5, attack: 5, dmg: [4, 9], speed: 9, xp: 60, gold: [12, 24], color: '#606c38', desc: '強壯的戰士。' },
  { id: 'zombie', name: '殭屍', nameEn: 'Zombie', hp: 26, ac: 3, attack: 4, dmg: [3, 10], speed: 5, xp: 55, gold: [5, 12], resist: { cold: 50 }, color: '#7f5539', desc: '緩慢但耐打的腐屍。' },
  { id: 'dark_acolyte', name: '黑暗祭司', nameEn: 'Dark Acolyte', hp: 20, ac: 4, attack: 3, dmg: [2, 6], speed: 11, xp: 75, gold: [18, 36], spellId: 'spark', color: '#5a189a', desc: '會施放法術的敵人。' },
  { id: 'corrupt_guardian', name: '墮落守護者', nameEn: 'Corrupt Guardian', hp: 150, ac: 9, attack: 9, dmg: [6, 15], speed: 13, xp: 700, gold: [250, 400], spellId: 'fireball', resist: { cold: 50, shock: 30 }, boss: true, color: '#7c3aed', desc: '受夏特姆（Sheltem）腐化、看守時光寶珠的遠古守護者。' },
  // ---- Milestone 2 additions ----
  { id: 'bandit', name: '強盜', nameEn: 'Bandit', hp: 15, ac: 4, attack: 4, dmg: [3, 7], speed: 11, xp: 40, gold: [10, 26], color: '#6c584c', desc: '攔路打劫的亡命之徒。' },
  { id: 'wolf', name: '野狼', nameEn: 'Wolf', hp: 13, ac: 4, attack: 4, dmg: [3, 8], speed: 15, xp: 42, gold: [0, 4], color: '#8d99ae', desc: '迅捷的掠食者。' },
  { id: 'ghoul', name: '食屍鬼', nameEn: 'Ghoul', hp: 24, ac: 5, attack: 5, dmg: [4, 9], speed: 9, xp: 70, gold: [10, 22], resist: { cold: 50, poison: 50 }, inflicts: { poison: 0.35 }, color: '#6a994e', desc: '啃食腐肉的不死生物，爪擊帶毒。' },
  { id: 'harpy', name: '鷹身女妖', nameEn: 'Harpy', hp: 20, ac: 6, attack: 5, dmg: [3, 8], speed: 16, xp: 72, gold: [8, 20], color: '#bc6c25', desc: '從天而降的尖嘯怪物。' },
  { id: 'ogre', name: '食人魔', nameEn: 'Ogre', hp: 38, ac: 5, attack: 6, dmg: [6, 13], speed: 7, xp: 110, gold: [20, 45], color: '#7f5539', desc: '力大無窮的巨怪。' },
  { id: 'gargoyle', name: '石像鬼', nameEn: 'Gargoyle', hp: 34, ac: 8, attack: 6, dmg: [4, 10], speed: 10, xp: 120, gold: [15, 38], resist: { fire: 30, cold: 30 }, inflicts: { paralyze: 0.25 }, color: '#5c677d', desc: '堅硬如石的飛行守衛，凝視使人僵直。' },
  { id: 'troll', name: '巨魔', nameEn: 'Troll', hp: 52, ac: 6, attack: 7, dmg: [6, 14], speed: 8, xp: 160, gold: [25, 55], color: '#386641', desc: '再生力驚人的巨怪。' },
  { id: 'witch', name: '女巫', nameEn: 'Witch', hp: 28, ac: 5, attack: 4, dmg: [2, 6], speed: 12, xp: 130, gold: [30, 60], spellId: 'frostbite', color: '#9d4edd', desc: '施放冰霜詛咒的術士。' },
  { id: 'dark_knight', name: '黑暗騎士', nameEn: 'Dark Knight', hp: 46, ac: 9, attack: 8, dmg: [6, 12], speed: 11, xp: 170, gold: [35, 70], color: '#3a0ca3', desc: '墮落的鋼鐵戰士。' },
  { id: 'minotaur', name: '牛頭怪', nameEn: 'Minotaur', hp: 58, ac: 7, attack: 8, dmg: [7, 15], speed: 9, xp: 200, gold: [40, 80], color: '#6f1d1b', desc: '迷宮中的狂暴守衛。' },
  { id: 'fire_drake', name: '火焰飛龍', nameEn: 'Fire Drake', hp: 64, ac: 8, attack: 8, dmg: [6, 14], speed: 13, xp: 240, gold: [50, 100], spellId: 'flame_arrow', resist: { fire: 70 }, color: '#e85d04', desc: '噴吐火焰的年輕龍獸。' },
  { id: 'sea_serpent', name: '深海巨蛇', nameEn: 'Sea Serpent', hp: 220, ac: 10, attack: 10, dmg: [8, 18], speed: 14, xp: 900, gold: [350, 550], spellId: 'ice_storm', resist: { cold: 70, fire: 20 }, inflicts: { poison: 0.3 }, boss: true, color: '#0077b6', desc: '盤踞沉沒洞窟、守護海皇冠冕的遠古巨蛇。' },
  { id: 'sheltem', name: '夏特姆', nameEn: 'Sheltem', hp: 320, ac: 12, attack: 12, dmg: [10, 22], speed: 16, xp: 2000, gold: [800, 1200], spellId: 'meteor', resist: { fire: 50, cold: 50, shock: 50, holy: 30 }, inflicts: { paralyze: 0.3 }, boss: true, color: '#d00000', desc: '叛逆的守護者，妄圖毀滅克朗的元兇。' },
  // ---- Milestone 4 monsters (Sky Temple) ----
  { id: 'giant_bat', name: '巨蝙蝠', nameEn: 'Giant Bat', hp: 16, ac: 6, attack: 5, dmg: [2, 6], speed: 18, xp: 50, gold: [2, 6], color: '#6d597a', desc: '盤旋於高塔的迅捷蝙蝠。' },
  { id: 'stone_golem', name: '石巨人', nameEn: 'Stone Golem', hp: 80, ac: 11, attack: 7, dmg: [6, 14], speed: 5, xp: 230, gold: [20, 50], resist: { fire: 30, cold: 30, shock: 30, poison: 100 }, color: '#8a8d91', desc: '緩慢但堅不可摧的魔像守衛。' },
  { id: 'storm_elemental', name: '風暴元素', nameEn: 'Storm Elemental', hp: 44, ac: 7, attack: 6, dmg: [4, 10], speed: 15, xp: 165, gold: [20, 45], spellId: 'lightning', resist: { shock: 80 }, color: '#48cae4', desc: '凝聚雷電的元素生命。' },
  { id: 'storm_djinn', name: '雷霆精靈王', nameEn: 'Storm Djinn', hp: 260, ac: 11, attack: 11, dmg: [8, 18], speed: 17, xp: 1200, gold: [400, 700], spellId: 'lightning', resist: { shock: 80, fire: 20 }, inflicts: { paralyze: 0.25 }, boss: true, color: '#0096c7', desc: '盤踞天空神殿、操縱雷霆的精靈之王。' },
];

// ---------- Maps ----------
export const MAPS: TileMap[] = [
  {
    id: 'overworld',
    name: '克朗大陸',
    nameEn: 'Land of CRON',
    kind: 'overworld',
    grid: [
      '##################',
      '#................#',
      '#................#',
      '#....~~~.........#',
      '#....~~~...^^....#',
      '#..........^^....#',
      '#................#',
      '#...TT...........#',
      '#...TT....~~~....#',
      '#.........~~~....#',
      '#................#',
      '#................#',
      '##################',
    ],
    start: { x: 3, y: 11, dir: 1 },
    portals: {
      '2,11': { toMap: 'overworld', to: { x: 2, y: 11 }, toScreen: 'town', town: 'middlegate', label: '中央之門 Middlegate' },
      '9,2': { toMap: 'overworld', to: { x: 9, y: 2 }, toScreen: 'town', town: 'tundara', label: '冰原城 Tundara' },
      '16,2': { toMap: 'overworld', to: { x: 16, y: 2 }, toScreen: 'town', town: 'atlantium', label: '亞特蘭提姆 Atlantium' },
      '16,11': { toMap: 'overworld', to: { x: 16, y: 11 }, toScreen: 'town', town: 'vulcania', label: '火山城 Vulcania' },
      '16,7': { toMap: 'dungeon1', to: { x: 1, y: 1, dir: 1 }, label: '中央之門地城' },
      '2,2': { toMap: 'caverns1', to: { x: 1, y: 1, dir: 1 }, label: '沉沒洞窟' },
      '9,11': { toMap: 'sky_temple1', to: { x: 1, y: 1, dir: 1 }, label: '天空神殿' },
    },
    encounters: {
      '6,10': { monsters: [{ id: 'goblin', count: [1, 2] }, { id: 'kobold', count: [1, 2] }] },
      '9,6': { monsters: [{ id: 'wolf', count: [1, 3] }, { id: 'bandit', count: [1, 2] }] },
      '13,5': { monsters: [{ id: 'fire_drake', count: [1, 1] }, { id: 'harpy', count: [1, 2] }] },
      '13,9': { monsters: [{ id: 'troll', count: [1, 1] }, { id: 'wolf', count: [1, 2] }] },
    },
  },
  {
    id: 'dungeon1',
    name: '中央之門地城 · 一層',
    nameEn: 'Middlegate Dungeon · L1',
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
      '9,1': { locked: true, keyItem: 'crystal_key', text: '一扇刻著古代符文的封印之門。' },
    },
    chests: {
      '10,9': { items: ['crystal_key'], gold: [20, 40] },
      '1,9': { gold: [30, 60], items: ['healing_potion', 'moonleaf'] },
      '10,3': { gold: [15, 35], items: ['leather'] },
    },
    encounters: {
      '3,5': { monsters: [{ id: 'giant_rat', count: [2, 3] }, { id: 'kobold', count: [1, 2] }] },
      '8,7': { monsters: [{ id: 'goblin', count: [2, 3] }] },
      '5,8': { monsters: [{ id: 'skeleton', count: [1, 2] }, { id: 'giant_rat', count: [1, 2] }] },
    },
    portals: {
      '10,1': { toMap: 'dungeon2', to: { x: 1, y: 1, dir: 1 }, label: '向下的階梯' },
      '1,1': { toMap: 'overworld', to: { x: 15, y: 7, dir: 3 }, label: '回到地表' },
    },
  },
  {
    id: 'dungeon2',
    name: '中央之門地城 · 深層',
    nameEn: 'Middlegate Dungeon · Depths',
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
      '1,6': { gold: [40, 80], items: ['greater_healing', 'arcane_tome'] },
      '10,1': { gold: [30, 60], items: ['kite_shield'] },
    },
    encounters: {
      '5,3': { monsters: [{ id: 'orc', count: [1, 2] }, { id: 'cave_spider', count: [1, 2] }] },
      '8,5': { monsters: [{ id: 'zombie', count: [1, 2] }, { id: 'dark_acolyte', count: [1, 1] }] },
      '10,7': { monsters: [{ id: 'corrupt_guardian', count: [1, 1] }], once: true, boss: true, bossItem: 'orb_of_time', bossFlag: 'boss_dead' },
    },
    portals: {
      '1,1': { toMap: 'dungeon1', to: { x: 10, y: 1, dir: 3 }, label: '向上的階梯' },
    },
  },
  {
    id: 'caverns1',
    name: '沉沒洞窟 · 一層',
    nameEn: 'Sunken Caverns · L1',
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
      '9,1': { locked: true, keyItem: 'rune_key', text: '一扇由符文封印的厚重石門。' },
    },
    chests: {
      '10,9': { items: ['rune_key'], gold: [40, 80] },
      '1,9': { gold: [60, 110], items: ['greater_healing', 'ancient_scroll'] },
      '10,3': { gold: [30, 60], items: ['scale_mail'] },
    },
    encounters: {
      '3,5': { monsters: [{ id: 'ghoul', count: [1, 2] }, { id: 'bandit', count: [1, 2] }] },
      '8,7': { monsters: [{ id: 'gargoyle', count: [1, 2] }] },
      '5,8': { monsters: [{ id: 'troll', count: [1, 1] }, { id: 'wolf', count: [1, 2] }] },
    },
    portals: {
      '10,1': { toMap: 'caverns2', to: { x: 1, y: 1, dir: 1 }, label: '通往深處的階梯' },
      '1,1': { toMap: 'overworld', to: { x: 3, y: 2, dir: 2 }, label: '回到地表' },
    },
  },
  {
    id: 'caverns2',
    name: '沉沒洞窟 · 深淵',
    nameEn: 'Sunken Caverns · Abyss',
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
      '1,6': { gold: [80, 140], items: ['elixir', 'dragon_blade'] },
      '10,1': { gold: [60, 110], items: ['tower_shield'] },
    },
    encounters: {
      '5,3': { monsters: [{ id: 'dark_knight', count: [1, 2] }, { id: 'witch', count: [1, 1] }] },
      '8,5': { monsters: [{ id: 'minotaur', count: [1, 1] }, { id: 'fire_drake', count: [1, 1] }] },
      '10,7': { monsters: [{ id: 'sea_serpent', count: [1, 1] }], once: true, boss: true, bossItem: 'sea_crown', bossFlag: 'boss2_dead' },
    },
    portals: {
      '1,1': { toMap: 'caverns1', to: { x: 10, y: 1, dir: 3 }, label: '向上的階梯' },
    },
  },
  {
    id: 'sky_temple1',
    name: '天空神殿',
    nameEn: 'Sky Temple',
    kind: 'dungeon',
    level: 1,
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
      '1,6': { gold: [100, 180], items: ['mithril_plate'] },
      '10,1': { gold: [80, 150], items: ['storm_blade'] },
    },
    encounters: {
      '5,3': { monsters: [{ id: 'giant_bat', count: [2, 3] }, { id: 'storm_elemental', count: [1, 1] }] },
      '8,5': { monsters: [{ id: 'stone_golem', count: [1, 1] }, { id: 'giant_bat', count: [1, 2] }] },
      '10,7': { monsters: [{ id: 'storm_djinn', count: [1, 1] }], once: true, boss: true, bossItem: 'sky_shard', bossFlag: 'djinn_dead' },
    },
    portals: {
      '1,1': { toMap: 'overworld', to: { x: 9, y: 10, dir: 0 }, label: '回到地表' },
    },
  },
];

// ---------- NPCs / Dialog ----------
// Town NPCs the player can talk to from the town hub (besides the tavern building).
export const TOWN_NPCS = ['elder', 'herbalist', 'mage_apprentice', 'priest', 'townsfolk'];

// Hireling roster (Might & Magic II allowed up to 2 hirelings beyond the party of 6).
export const HIRELINGS: { id: string; name: string; raceId: string; classId: string; level: number; cost: number }[] = [
  { id: 'h_garad', name: '加拉德', raceId: 'half-orc', classId: 'barbarian', level: 3, cost: 150 },
  { id: 'h_shin', name: '真', raceId: 'human', classId: 'ninja', level: 3, cost: 170 },
  { id: 'h_lyra', name: '萊拉', raceId: 'elf', classId: 'sorcerer', level: 3, cost: 200 },
  { id: 'h_mara', name: '瑪拉', raceId: 'gnome', classId: 'cleric', level: 3, cost: 190 },
];

export const NPCS: NPCDef[] = [
  {
    id: 'tavern_keeper',
    name: '酒館老闆 古斯',
    nameEn: 'Gus the Tavernkeeper',
    root: 'start',
    entries: [
      { cond: { flag: 'game_won' }, node: 'epilogue' },
      { cond: { flag: 'endgame_ready' }, node: 'final' },
      { cond: { questComplete: 'orb_quest' }, node: 'done' },
      { cond: { questActive: 'orb_quest', item: 'orb_of_time' }, node: 'hasOrb' },
      { cond: { questActive: 'orb_quest' }, node: 'reminder' },
    ],
    nodes: {
      final: {
        id: 'final',
        text: '「兩件聖物都已尋回…但真正的元兇是叛逆的守護者『夏特姆』！他正撕裂克朗的時空。英雄，你準備好做最後的決戰了嗎？」',
        options: [
          { label: '⚔ 面對夏特姆', action: { finalBattle: true } },
          { label: '我再準備一下', action: { end: true } },
        ],
      },
      epilogue: {
        id: 'epilogue',
        text: '「夏特姆殞落，克朗的時空恢復了秩序。吟遊詩人傳唱著你的傳奇，直到永遠。願你的冒險永不止息，英雄。」',
        options: [{ label: '（完）', action: { end: true } }],
      },
      start: {
        id: 'start',
        text: '「旅人啊，克朗大陸的時空正在崩壞。墮落守護者奪走了維繫時空的『時光寶珠』。你願意取回它嗎？」',
        options: [
          { label: '我接下這個任務', to: 'accepted', action: { giveQuest: 'orb_quest' } },
          { label: '寶珠在哪裡？', to: 'where' },
          { label: '改天再說', action: { end: true } },
        ],
      },
      where: {
        id: 'where',
        text: '「在中央之門城外的地城深處。一層有道封印之門，需要『水晶鑰匙』才能通往下層。小心墮落守護者！」',
        options: [
          { label: '我接下這個任務', to: 'accepted', action: { giveQuest: 'orb_quest' } },
          { label: '離開', action: { end: true } },
        ],
      },
      accepted: {
        id: 'accepted',
        text: '「願光明指引你。取回寶珠後回來找我，必有重謝。也別忘了：你可以在這裡雇用幫手。」',
        options: [{ label: '出發', action: { end: true } }],
      },
      reminder: {
        id: 'reminder',
        text: '「時光寶珠還在墮落守護者手上嗎？克朗的時空撐不了多久了…水晶鑰匙在地城一層。」',
        options: [{ label: '我會的', action: { end: true } }],
      },
      hasOrb: {
        id: 'hasOrb',
        text: '「你…你真的取回了時光寶珠！克朗的時空穩定下來了！這是你應得的獎賞，英雄。」',
        options: [{ label: '領取獎賞', action: { completeQuest: 'orb_quest', end: true } }],
      },
      done: {
        id: 'done',
        text: '「英雄，克朗的居民永遠感激你。要不要再來一杯？算我請客。」',
        options: [{ label: '離開', action: { end: true } }],
      },
    },
  },
  {
    id: 'elder',
    name: '村莊長老 艾德蒙',
    nameEn: 'Elder Edmund',
    root: 'start',
    entries: [
      { cond: { questComplete: 'goblin_threat' }, node: 'done' },
      { cond: { questActive: 'goblin_threat', cleared: 'overworld:6,10' }, node: 'reward' },
      { cond: { questActive: 'goblin_threat' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「一群哥布林盤踞在中央之門城外的道路上，商隊都不敢通行了。年輕人，你能替我們驅逐牠們嗎？」',
        options: [
          { label: '交給我吧', to: 'accept', action: { giveQuest: 'goblin_threat' } },
          { label: '牠們在哪？', to: 'where' },
          { label: '我再考慮', action: { end: true } },
        ],
      },
      where: {
        id: 'where',
        text: '「就在城外地表的東南方，一支哥布林部隊。小心，牠們成群行動。」',
        options: [
          { label: '交給我吧', to: 'accept', action: { giveQuest: 'goblin_threat' } },
          { label: '離開', action: { end: true } },
        ],
      },
      accept: { id: 'accept', text: '「願你旗開得勝。」', options: [{ label: '出發', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「哥布林還在城外東南方肆虐呢。」', options: [{ label: '我這就去', action: { end: true } }] },
      reward: {
        id: 'reward',
        text: '「道路又安全了！這枚守護戒指是我們的謝意，請收下。」',
        options: [{ label: '領取獎賞', action: { completeQuest: 'goblin_threat', giveItem: 'ring_protection', end: true } }],
      },
      done: { id: 'done', text: '「多虧了你，商隊又開始通行了。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'herbalist',
    name: '藥師 葛瑞塔',
    nameEn: 'Greta the Herbalist',
    root: 'start',
    entries: [
      { cond: { questComplete: 'herb_gathering' }, node: 'done' },
      { cond: { questActive: 'herb_gathering', item: 'moonleaf' }, node: 'reward' },
      { cond: { questActive: 'herb_gathering' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「我需要一種叫『月光草』的藥草，只生長在地城的陰影裡。幫我採來，我教你的牧師一個治療祕術。」',
        options: [
          { label: '我會留意', to: 'accept', action: { giveQuest: 'herb_gathering' } },
          { label: '沒興趣', action: { end: true } },
        ],
      },
      accept: { id: 'accept', text: '「月光草通常藏在地城一層的箱子裡。謝謝你！」', options: [{ label: '好的', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「找到月光草了嗎？試試地城一層的寶箱。」', options: [{ label: '還在找', action: { end: true } }] },
      reward: {
        id: 'reward',
        text: '「正是月光草！如約定，我把『治癒重傷』的祕術傳授給你的牧師。」',
        options: [{ label: '領取傳授', action: { completeQuest: 'herb_gathering', teachSpell: 'cure_wounds', end: true } }],
      },
      done: { id: 'done', text: '「願月光草的清香伴你左右。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'mage_apprentice',
    name: '法師學徒 費歐',
    nameEn: 'Fio the Apprentice',
    root: 'start',
    entries: [
      { cond: { questComplete: 'lost_tome' }, node: 'done' },
      { cond: { questActive: 'lost_tome', item: 'arcane_tome' }, node: 'reward' },
      { cond: { questActive: 'lost_tome' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「我師父的『奧術法典』遺落在地城深層。若你能取回，我就把裡面的火球術教給你的法師！」',
        options: [
          { label: '我幫你找', to: 'accept', action: { giveQuest: 'lost_tome' } },
          { label: '改天吧', action: { end: true } },
        ],
      },
      accept: { id: 'accept', text: '「法典應該在地城『深層』的某個寶箱裡。萬分感謝！」', options: [{ label: '了解', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「奧術法典還在地城深層呢，拜託了。」', options: [{ label: '快了', action: { end: true } }] },
      reward: {
        id: 'reward',
        text: '「這就是法典！依約，火球術現在屬於你的法師了。」',
        options: [{ label: '領取傳授', action: { completeQuest: 'lost_tome', teachSpell: 'fireball', end: true } }],
      },
      done: { id: 'done', text: '「有了法典，師父一定會誇獎我的！」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'priest',
    name: '神殿祭司 賽勒斯',
    nameEn: 'Priest Cyrus',
    root: 'start',
    entries: [
      { cond: { flag: 'boss_dead' }, node: 'afterBoss' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「光明與你同在，旅人。墮落守護者的詛咒讓不死者橫行地城。神聖的法術對牠們格外有效，切記。」',
        options: [
          { label: '謝謝指點', action: { end: true } },
          { label: '為我們祈福', to: 'bless', action: { heal: true } },
        ],
      },
      bless: { id: 'bless', text: '「願神恩治癒你們的傷痛。」', options: [{ label: '阿們', action: { end: true } }] },
      afterBoss: {
        id: 'afterBoss',
        text: '「墮落守護者已被擊敗？太好了！克朗的亡魂終於能安息。願你福澤綿長。」',
        options: [{ label: '為我們祈福', to: 'bless', action: { heal: true } }, { label: '離開', action: { end: true } }],
      },
    },
  },
  {
    id: 'townsfolk',
    name: '城鎮居民',
    nameEn: 'Townsperson',
    root: 'start',
    entries: [
      { cond: { flag: 'orb_returned' }, node: 'hero' },
      { cond: { questActive: 'orb_quest' }, node: 'worried' },
    ],
    nodes: {
      start: { id: 'start', text: '「歡迎來到中央之門。城外的地城最近很不平靜，聽說連商隊都被哥布林攔路了。」', options: [{ label: '了解', action: { end: true } }] },
      worried: { id: 'worried', text: '「你就是要去討伐墮落守護者的冒險者嗎？拜託一定要成功啊…」', options: [{ label: '我會的', action: { end: true } }] },
      hero: { id: 'hero', text: '「是你救了克朗！孩子們都在傳唱你的事蹟呢！」', options: [{ label: '不敢當', action: { end: true } }] },
    },
  },
  {
    id: 'atlantium_tavern',
    name: '亞特蘭提姆酒館主 瑪琳',
    nameEn: 'Marlin of Atlantium',
    root: 'start',
    entries: [
      { cond: { questComplete: 'caverns_quest' }, node: 'done' },
      { cond: { questActive: 'caverns_quest', item: 'sea_crown' }, node: 'reward' },
      { cond: { questActive: 'caverns_quest' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「西北方的沉沒洞窟裡，深海巨蛇守著古老的『海皇冠冕』。沒人敢去。你願意挑戰嗎？需要符文鑰匙才能進入深淵。」',
        options: [
          { label: '我去取回冠冕', to: 'accept', action: { giveQuest: 'caverns_quest' } },
          { label: '太危險了', action: { end: true } },
        ],
      },
      accept: { id: 'accept', text: '「符文鑰匙就在洞窟一層的寶箱裡。願海神保佑你。」', options: [{ label: '出發', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「深海巨蛇還盤踞在沉沒洞窟的深淵呢。記得拿符文鑰匙。」', options: [{ label: '我會的', action: { end: true } }] },
      reward: {
        id: 'reward',
        text: '「海皇冠冕！你真的辦到了！這是亞特蘭提姆全城的謝禮，英雄。」',
        options: [{ label: '領取獎賞', action: { completeQuest: 'caverns_quest', giveItem: 'cloak_protection', end: true } }],
      },
      done: { id: 'done', text: '「海皇冠冕已安置於神殿，克朗的海岸恢復了平靜。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'sage',
    name: '智者 賽吉',
    nameEn: 'Sage Theron',
    root: 'start',
    entries: [
      { cond: { questComplete: 'sage_quest' }, node: 'done' },
      { cond: { questActive: 'sage_quest', item: 'ancient_scroll' }, node: 'reward' },
      { cond: { questActive: 'sage_quest' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「沉沒洞窟裡有一卷『遠古卷軸』，記載著失傳的傳送法術。替我取回，我便將『城鎮傳送』之術傳授給你的法師。」',
        options: [
          { label: '交給我', to: 'accept', action: { giveQuest: 'sage_quest' } },
          { label: '考慮一下', action: { end: true } },
        ],
      },
      accept: { id: 'accept', text: '「卷軸在洞窟一層的寶箱中。感激不盡。」', options: [{ label: '了解', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「遠古卷軸找到了嗎？就在沉沒洞窟一層。」', options: [{ label: '快了', action: { end: true } }] },
      reward: {
        id: 'reward',
        text: '「正是這卷軸！如約定，『城鎮傳送』之術現在屬於你的法師了。」',
        options: [{ label: '領取傳授', action: { completeQuest: 'sage_quest', teachSpell: 'town_portal', end: true } }],
      },
      done: { id: 'done', text: '「有了卷軸，我能研究的東西可多了。多謝你，旅人。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'vulcania_smith',
    name: '火山城鐵匠 布朗',
    nameEn: 'Brom the Smith',
    root: 'start',
    entries: [
      { cond: { questComplete: 'bounty_drake' }, node: 'done' },
      { cond: { questActive: 'bounty_drake', cleared: 'overworld:13,5' }, node: 'reward' },
      { cond: { questActive: 'bounty_drake' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「東邊山道有頭火焰飛龍，燒壞了我運礦的車隊。替我除掉牠，賞金豐厚！」',
        options: [
          { label: '接下懸賞', to: 'accept', action: { giveQuest: 'bounty_drake' } },
          { label: '改天吧', action: { end: true } },
        ],
      },
      accept: { id: 'accept', text: '「火焰飛龍就在東邊山道（地圖東側）。當心牠的火焰。」', options: [{ label: '了解', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「火焰飛龍還在東邊山道肆虐呢。」', options: [{ label: '這就去', action: { end: true } }] },
      reward: {
        id: 'reward',
        text: '「飛龍被你解決了？太好了！這把好刀歸你，還有賞金。」',
        options: [{ label: '領取懸賞', action: { completeQuest: 'bounty_drake', giveItem: 'katana', end: true } }],
      },
      done: { id: 'done', text: '「礦路又能通了，多謝你，英雄。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'tundara_warden',
    name: '冰原城守望者 芙蕾雅',
    nameEn: 'Warden Freya',
    root: 'start',
    entries: [
      { cond: { questComplete: 'bounty_frost' }, node: 'done' },
      { cond: { questActive: 'bounty_frost', cleared: 'overworld:13,9' }, node: 'reward' },
      { cond: { questActive: 'bounty_frost' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「南方沼澤竄出一頭巨魔，村民都不敢出城了。獵殺牠，冰原城會記住你的恩情。」',
        options: [
          { label: '接下懸賞', to: 'accept', action: { giveQuest: 'bounty_frost' } },
          { label: '考慮一下', action: { end: true } },
        ],
      },
      accept: { id: 'accept', text: '「巨魔在南方沼澤（地圖下方）。小心牠的再生。」', options: [{ label: '了解', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「巨魔還在南方沼澤呢。」', options: [{ label: '這就去', action: { end: true } }] },
      reward: {
        id: 'reward',
        text: '「巨魔倒下了！這枚守護戒指是冰原城的謝禮。」',
        options: [{ label: '領取懸賞', action: { completeQuest: 'bounty_frost', giveItem: 'ring_protection', end: true } }],
      },
      done: { id: 'done', text: '「沼澤安全了，村民都很感激你。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'astronomer',
    name: '天文學家 賽蕾絲',
    nameEn: 'Celeste the Astronomer',
    root: 'start',
    entries: [
      { cond: { questComplete: 'sky_quest' }, node: 'done' },
      { cond: { questActive: 'sky_quest', item: 'sky_shard' }, node: 'reward' },
      { cond: { questActive: 'sky_quest' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「南方漂浮著一座天空神殿，核心有塊『天空碎片』。若你能取回，我就教你的法師駕馭雷霆之力——閃電束。」',
        options: [
          { label: '我去取回碎片', to: 'accept', action: { giveQuest: 'sky_quest' } },
          { label: '改天再說', action: { end: true } },
        ],
      },
      accept: { id: 'accept', text: '「天空神殿的入口在地圖南方。守護它的是雷霆精靈王，務必小心。」', options: [{ label: '了解', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「天空碎片還在神殿核心呢，由雷霆精靈王看守。」', options: [{ label: '快了', action: { end: true } }] },
      reward: {
        id: 'reward',
        text: '「璀璨的天空碎片！如約定，閃電束之術現在屬於你的法師了。」',
        options: [{ label: '領取傳授', action: { completeQuest: 'sky_quest', teachSpell: 'lightning', end: true } }],
      },
      done: { id: 'done', text: '「藉著天空碎片，我看見了更遙遠的星辰。謝謝你，旅人。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
];

export const QUESTS: QuestDef[] = [
  { id: 'orb_quest', name: '時光寶珠', nameEn: 'The Orb of Time', giver: 'tavern_keeper', itemRequired: 'orb_of_time', desc: '從墮落守護者手中取回維繫克朗時空的時光寶珠。', hint: '需要水晶鑰匙進入地城深層，擊敗墮落守護者。', rewardGold: 500, rewardXp: 400 },
  { id: 'goblin_threat', name: '哥布林威脅', nameEn: 'The Goblin Threat', giver: 'elder', clearCell: 'overworld:6,10', desc: '擊退盤踞在中央之門城外的哥布林部隊。', hint: '哥布林在戶外地圖南方。', rewardGold: 150, rewardXp: 120 },
  { id: 'bounty_drake', name: '懸賞：火焰飛龍', nameEn: 'Bounty: Fire Drake', giver: 'vulcania_smith', clearCell: 'overworld:13,5', desc: '獵殺東邊山道的火焰飛龍。', hint: '火焰飛龍在戶外地圖東側。', rewardGold: 280, rewardXp: 220 },
  { id: 'bounty_frost', name: '懸賞：沼澤巨魔', nameEn: 'Bounty: Swamp Troll', giver: 'tundara_warden', clearCell: 'overworld:13,9', desc: '獵殺南方沼澤的巨魔。', hint: '巨魔在戶外地圖下方。', rewardGold: 300, rewardXp: 240 },
  { id: 'herb_gathering', name: '月光草採集', nameEn: 'Moonleaf Gathering', giver: 'herbalist', itemRequired: 'moonleaf', desc: '為藥師葛瑞塔採集地城裡的月光草。', hint: '月光草在地城一層的寶箱中。', rewardGold: 120, rewardXp: 100 },
  { id: 'lost_tome', name: '失落的法典', nameEn: 'The Lost Tome', giver: 'mage_apprentice', itemRequired: 'arcane_tome', desc: '為法師學徒費歐尋回遺落的奧術法典。', hint: '奧術法典在地城深層的寶箱中。', rewardGold: 200, rewardXp: 160 },
  { id: 'caverns_quest', name: '海皇冠冕', nameEn: 'Crown of the Deep', giver: 'atlantium_tavern', itemRequired: 'sea_crown', desc: '從沉沒洞窟的深海巨蛇手中取回海皇冠冕。', hint: '需要符文鑰匙（洞窟一層）才能進入深淵，擊敗深海巨蛇。', rewardGold: 900, rewardXp: 700 },
  { id: 'sage_quest', name: '遠古卷軸', nameEn: 'The Ancient Scroll', giver: 'sage', itemRequired: 'ancient_scroll', desc: '為智者賽吉尋回沉沒洞窟中的遠古卷軸。', hint: '遠古卷軸在沉沒洞窟一層的寶箱中。', rewardGold: 300, rewardXp: 240 },
  { id: 'sky_quest', name: '天空碎片', nameEn: 'The Sky Shard', giver: 'astronomer', itemRequired: 'sky_shard', desc: '從天空神殿的雷霆精靈王手中取回天空碎片。', hint: '天空神殿入口在戶外地圖南方。', rewardGold: 450, rewardXp: 380 },
];

// ---------- Shops ----------
export const SHOPS: ShopDef[] = [
  // Middlegate (starter)
  { id: 'weapon_smith', name: '武器鋪', nameEn: 'Weapon Smith', kind: 'goods', stock: ['dagger', 'short_sword', 'mace', 'long_sword', 'battle_axe', 'katana', 'short_bow', 'spear'] },
  { id: 'armorer', name: '防具鋪', nameEn: 'Armorer', kind: 'goods', stock: ['cloth', 'leather', 'ring_mail', 'chain', 'plate', 'buckler', 'kite_shield', 'leather_cap', 'iron_helm'] },
  { id: 'magic_guild', name: '魔法公會', nameEn: 'Magic Guild', kind: 'magic', stock: ['healing_potion', 'mana_potion', 'greater_healing', 'antidote'], spells: ['flame_arrow', 'acid_spray', 'wizard_eye', 'shield', 'frostbite', 'fireball', 'lightning', 'sleep', 'heal', 'restore', 'cure_ailment', 'bless', 'protection', 'turn_undead', 'cure_wounds', 'holy_word', 'raise_dead'] },
  // Atlantium (advanced)
  { id: 'master_smith', name: '大師武器鋪', nameEn: 'Master Smith', kind: 'goods', stock: ['morning_star', 'flail', 'crossbow', 'two_handed_sword', 'halberd', 'war_staff', 'dragon_blade'] },
  { id: 'master_armory', name: '大師防具鋪', nameEn: 'Master Armory', kind: 'goods', stock: ['scale_mail', 'splint_mail', 'arcane_robe', 'dragon_plate', 'tower_shield', 'great_helm', 'ring_might', 'cloak_protection', 'ring_protection', 'amulet_might'] },
  { id: 'arcane_emporium', name: '奧術商會', nameEn: 'Arcane Emporium', kind: 'magic', stock: ['greater_healing', 'greater_mana', 'elixir'], spells: ['haste', 'energy_blast', 'ice_storm', 'town_portal', 'meteor', 'smite', 'mass_heal', 'greater_protection', 'sunray'] },
  // shared services
  { id: 'temple', name: '神殿', nameEn: 'Temple', kind: 'temple', stock: [] },
  { id: 'inn', name: '旅店', nameEn: 'Inn', kind: 'inn', stock: [] },
];

// ---------- Towns ----------
export const TOWNS: TownDef[] = [
  {
    id: 'middlegate', name: '中央之門 Middlegate', nameEn: 'Middlegate',
    desc: '克朗大陸上最後的安全據點，冒險的起點。',
    shops: ['weapon_smith', 'armorer', 'magic_guild'],
    npcs: ['tavern_keeper', 'elder', 'herbalist', 'mage_apprentice', 'priest', 'townsfolk'],
  },
  {
    id: 'atlantium', name: '亞特蘭提姆 Atlantium', nameEn: 'Atlantium',
    desc: '繁華的學者之城，販售高階裝備與法術。',
    shops: ['master_smith', 'master_armory', 'arcane_emporium'],
    npcs: ['atlantium_tavern', 'sage', 'astronomer', 'townsfolk'],
  },
  {
    id: 'tundara', name: '冰原城 Tundara', nameEn: 'Tundara',
    desc: '冰封北境的堅城，鎮民世代與寒霜為伍。',
    shops: ['master_armory', 'magic_guild'],
    npcs: ['tundara_warden', 'townsfolk'],
  },
  {
    id: 'vulcania', name: '火山城 Vulcania', nameEn: 'Vulcania',
    desc: '建於火山口的鍛造之城，盛產利刃與烈焰法術。',
    shops: ['master_smith', 'arcane_emporium'],
    npcs: ['vulcania_smith', 'townsfolk'],
  },
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
export const townMap = byId(TOWNS);
