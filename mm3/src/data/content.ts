// ===== All game content (data-driven). Expand the world by editing these tables. =====
import {
  Race, ClassDef, Spell, ItemDef, MonsterDef, TileMap, NPCDef, QuestDef, ShopDef,
} from '../types';

export const RACES: Race[] = [
  { id: 'human', name: '人類', nameEn: 'Human', mods: {}, desc: '均衡，無特殊弱點。學習力強。' },
  { id: 'elf', name: '精靈', nameEn: 'Elf', mods: { intellect: 2, accuracy: 1, endurance: -1 }, resist: { magic: 20 }, desc: '聰慧敏銳，體格稍弱，抗魔法。' },
  { id: 'dwarf', name: '矮人', nameEn: 'Dwarf', mods: { endurance: 2, might: 1, speed: -1 }, resist: { poison: 30 }, desc: '強韌耐打，行動較慢，抗毒。' },
  { id: 'gnome', name: '侏儒', nameEn: 'Gnome', mods: { intellect: 1, luck: 2, might: -1 }, resist: { magic: 15 }, desc: '機運極佳的施法者。' },
  { id: 'half-orc', name: '半獸人', nameEn: 'Half-Orc', mods: { might: 2, endurance: 1, intellect: -2 }, desc: '孔武有力，頭腦簡單，生命旺盛。' },
];

export const CLASSES: ClassDef[] = [
  { id: 'knight',    name: '騎士',   nameEn: 'Knight',    hitDie: 12, spDie: 0, school: null,       baseAttack: 3, startSpells: [],                  primary: 'might',       maxArmor: 'heavy',  canShield: true,  critMult: 0.05, desc: '最強的近戰戰士，可穿戴重甲。' },
  { id: 'paladin',   name: '聖騎士', nameEn: 'Paladin',   hitDie: 10, spDie: 3, school: 'cleric',   baseAttack: 2, startSpells: ['first_aid'],       primary: 'might',       maxArmor: 'heavy',  canShield: true,  critMult: 0.05, desc: '戰士兼習神術，可穿重甲。' },
  { id: 'archer',    name: '弓箭手', nameEn: 'Archer',    hitDie: 8,  spDie: 3, school: 'sorcerer', baseAttack: 2, startSpells: ['spark'],          primary: 'accuracy',    maxArmor: 'medium', canShield: false, critMult: 0.10, desc: '遠程好手，略通奧術。' },
  { id: 'cleric',    name: '牧師',   nameEn: 'Cleric',    hitDie: 8,  spDie: 6, school: 'cleric',   baseAttack: 1, startSpells: ['heal', 'first_aid'], primary: 'personality', maxArmor: 'medium', canShield: true,  critMult: 0.05, desc: '治療與守護的神術師。' },
  { id: 'sorcerer',  name: '法師',   nameEn: 'Sorcerer',  hitDie: 6,  spDie: 7, school: 'sorcerer', baseAttack: 0, startSpells: ['spark', 'light'], primary: 'intellect',   maxArmor: 'light',  canShield: false, critMult: 0.05, desc: '毀滅性的奧術師，僅能輕裝。' },
  { id: 'robber',    name: '盜賊',   nameEn: 'Robber',    hitDie: 8,  spDie: 0, school: null,       baseAttack: 1, startSpells: [],                  primary: 'speed',       maxArmor: 'medium', canShield: false, critMult: 0.22, desc: '敏捷、擅長偷竊與暴擊、解除陷阱。' },
  { id: 'ninja',     name: '忍者',   nameEn: 'Ninja',     hitDie: 8,  spDie: 0, school: null,       baseAttack: 2, startSpells: [],                  primary: 'speed',       maxArmor: 'medium', canShield: false, critMult: 0.28, desc: '暗殺高手，攻擊可能瞬殺敵人。' },
  { id: 'barbarian', name: '蠻族',   nameEn: 'Barbarian', hitDie: 14, spDie: 0, school: null,       baseAttack: 3, startSpells: [],                  primary: 'endurance',   maxArmor: 'heavy',  canShield: true,  critMult: 0.08, desc: '生命力驚人的狂戰士。' },
  { id: 'druid',     name: '德魯伊', nameEn: 'Druid',     hitDie: 8,  spDie: 7, school: 'both',     baseAttack: 1, startSpells: ['spark', 'first_aid'], primary: 'personality', maxArmor: 'light', canShield: false, critMult: 0.05, desc: '兼通奧術與神術的自然賢者。' },
];

export const SPELLS: Spell[] = [
  // ---- Sorcerer (奧術) ----
  { id: 'spark',       name: '電花',   nameEn: 'Spark',          school: 'sorcerer', level: 1, cost: 2,  target: 'enemy',      kind: 'damage', power: 8,  element: 'electric', usableOutside: false, desc: '對單一敵人造成電擊。' },
  { id: 'flame_arrow', name: '火焰箭', nameEn: 'Flame Arrow',    school: 'sorcerer', level: 1, cost: 3,  target: 'enemy',      kind: 'damage', power: 11, element: 'fire',     usableOutside: false, desc: '灼燒單一敵人。' },
  { id: 'light',       name: '光亮術', nameEn: 'Light',          school: 'sorcerer', level: 1, cost: 1,  target: 'party',      kind: 'light',  power: 0,                       usableOutside: true,  desc: '照亮地城。' },
  { id: 'awaken',      name: '喚醒術', nameEn: 'Awaken',         school: 'sorcerer', level: 1, cost: 2,  target: 'party',      kind: 'cureStatus', power: 0,                   usableOutside: true,  desc: '喚醒沉睡的同伴。' },
  { id: 'sleep',       name: '睡眠術', nameEn: 'Sleep',          school: 'sorcerer', level: 2, cost: 4,  target: 'allEnemies', kind: 'sleep',  power: 0,                       usableOutside: false, desc: '使敵群陷入沉睡。' },
  { id: 'frostbite',   name: '寒冰',   nameEn: 'Frostbite',      school: 'sorcerer', level: 2, cost: 4,  target: 'enemy',      kind: 'damage', power: 16, element: 'cold',     usableOutside: false, desc: '強力冰霜傷害。' },
  { id: 'haste',       name: '加速術', nameEn: 'Haste',          school: 'sorcerer', level: 2, cost: 5,  target: 'party',      kind: 'haste',  power: 3,                       usableOutside: false, desc: '全隊速度提升。' },
  { id: 'shield_spell',name: '魔法護盾',nameEn: 'Shield',         school: 'sorcerer', level: 2, cost: 4,  target: 'party',      kind: 'shield', power: 3,                       usableOutside: false, desc: '全隊防禦提升。' },
  { id: 'fireball',    name: '火球術', nameEn: 'Fireball',       school: 'sorcerer', level: 3, cost: 6,  target: 'allEnemies', kind: 'damage', power: 14, element: 'fire',     usableOutside: false, desc: '對全體敵人造成火焰傷害。' },
  { id: 'lightning',   name: '閃電束', nameEn: 'Lightning Bolt', school: 'sorcerer', level: 3, cost: 7,  target: 'allEnemies', kind: 'damage', power: 18, element: 'electric', usableOutside: false, desc: '貫穿全體敵人的雷電。' },
  { id: 'fear',        name: '恐懼術', nameEn: 'Terror',         school: 'sorcerer', level: 3, cost: 5,  target: 'allEnemies', kind: 'fear',   power: 0,                       usableOutside: false, desc: '使敵群陷入恐懼，降低命中。' },
  { id: 'town_portal', name: '城鎮傳送',nameEn: 'Town Portal',    school: 'sorcerer', level: 4, cost: 8,  target: 'party',      kind: 'town_portal', power: 0,                  usableOutside: true,  usableInside: true, desc: '瞬間傳送回最近的城鎮。' },
  { id: 'cone_cold',   name: '冰錐術', nameEn: 'Cone of Cold',   school: 'sorcerer', level: 4, cost: 8,  target: 'allEnemies', kind: 'damage', power: 22, element: 'cold',     usableOutside: false, desc: '冰霜錐橫掃全體敵人。' },
  { id: 'meteor',      name: '隕石術', nameEn: 'Meteor Shower',  school: 'sorcerer', level: 5, cost: 12, gemCost: 1, target: 'allEnemies', kind: 'damage', power: 30, element: 'fire', usableOutside: false, desc: '召喚隕石毀滅敵群。' },
  { id: 'disintegrate',name: '解離術', nameEn: 'Disintegrate',   school: 'sorcerer', level: 5, cost: 14, gemCost: 1, target: 'enemy',  kind: 'damage', power: 50, element: 'energy', usableOutside: false, desc: '純能量轟擊單一敵人。' },
  { id: 'inferno',     name: '煉獄術', nameEn: 'Inferno',        school: 'sorcerer', level: 6, cost: 18, gemCost: 2, target: 'allEnemies', kind: 'damage', power: 42, element: 'fire', usableOutside: false, desc: '地獄烈焰焚盡一切。' },
  // ---- Cleric (神術) ----
  { id: 'first_aid',   name: '急救術', nameEn: 'First Aid',      school: 'cleric', level: 1, cost: 2,  target: 'ally',  kind: 'heal',     power: 10,                   usableOutside: true,  desc: '恢復少量生命。' },
  { id: 'heal',        name: '治療術', nameEn: 'Heal',           school: 'cleric', level: 1, cost: 3,  target: 'ally',  kind: 'heal',     power: 18,                   usableOutside: true,  desc: '恢復生命。' },
  { id: 'bless',       name: '祝福術', nameEn: 'Bless',          school: 'cleric', level: 2, cost: 4,  target: 'party', kind: 'bless',    power: 3,                    usableOutside: false, desc: '全隊命中與傷害提升。' },
  { id: 'protection',  name: '守護術', nameEn: 'Protection',     school: 'cleric', level: 2, cost: 4,  target: 'party', kind: 'buffAc',   power: 3,                    usableOutside: false, desc: '全隊防禦提升。' },
  { id: 'cure_poison', name: '解毒術', nameEn: 'Cure Poison',    school: 'cleric', level: 2, cost: 3,  target: 'ally',  kind: 'cureStatus', power: 0,                  usableOutside: true,  desc: '解除中毒與疾病。' },
  { id: 'turn_undead', name: '驅散不死',nameEn: 'Turn Undead',    school: 'cleric', level: 2, cost: 4,  target: 'allEnemies', kind: 'damage', power: 14, element: 'holy', usableOutside: false, desc: '對不死系造成神聖傷害。' },
  { id: 'cure_wounds', name: '治癒重傷',nameEn: 'Cure Wounds',    school: 'cleric', level: 3, cost: 6,  target: 'ally',  kind: 'heal',     power: 40,                   usableOutside: true,  desc: '大幅恢復生命。' },
  { id: 'remove_fear', name: '勇氣術', nameEn: 'Remove Fear',    school: 'cleric', level: 2, cost: 3,  target: 'party', kind: 'cureStatus', power: 0,                  usableOutside: true,  desc: '消除恐懼與麻痺。' },
  { id: 'paralyze',    name: '麻痺術', nameEn: 'Paralyze',       school: 'cleric', level: 3, cost: 6,  target: 'enemy', kind: 'paralyze', power: 0,                    usableOutside: false, desc: '麻痺單一敵人數回合。' },
  { id: 'holy_word',   name: '神聖審判',nameEn: 'Holy Word',      school: 'cleric', level: 4, cost: 8,  target: 'allEnemies', kind: 'damage', power: 18, element: 'holy', usableOutside: false, desc: '神聖之力席捲敵群。' },
  { id: 'raise_dead',  name: '復活術', nameEn: 'Raise Dead',     school: 'cleric', level: 4, cost: 10, target: 'ally',  kind: 'cureDead', power: 1,                    usableOutside: true,  desc: '使倒下的同伴復活。' },
  { id: 'heroism',     name: '英雄氣概',nameEn: 'Heroism',        school: 'cleric', level: 4, cost: 8,  target: 'party', kind: 'bless',    power: 5,                    usableOutside: false, desc: '強化全隊的戰意。' },
  { id: 'mass_heal',   name: '群體治療',nameEn: 'Mass Heal',      school: 'cleric', level: 5, cost: 14, target: 'party', kind: 'heal',     power: 45,                   usableOutside: true,  desc: '治療全隊成員。' },
  { id: 'divine_fury', name: '神怒術', nameEn: 'Divine Fury',    school: 'cleric', level: 5, cost: 13, gemCost: 1, target: 'allEnemies', kind: 'damage', power: 34, element: 'holy', usableOutside: false, desc: '神之怒火審判一切邪惡。' },
  { id: 'resurrection',name: '神聖復生',nameEn: 'Resurrection',    school: 'cleric', level: 6, cost: 20, gemCost: 2, target: 'ally', kind: 'cureDead', power: 999,                usableOutside: true,  desc: '完全復活並治癒同伴。' },
];

export const ITEMS: ItemDef[] = [
  // ---- weapons (light → heavy) ----
  { id: 'dagger',        name: '匕首',   nameEn: 'Dagger',        type: 'weapon', slot: 'weapon', dmg: [1, 3],  atkBonus: 0, value: 10,  desc: '輕巧的小刀。' },
  { id: 'short_sword',   name: '短劍',   nameEn: 'Short Sword',   type: 'weapon', slot: 'weapon', dmg: [2, 5],  atkBonus: 1, value: 40,  desc: '可靠的近戰武器。' },
  { id: 'mace',          name: '釘錘',   nameEn: 'Mace',          type: 'weapon', slot: 'weapon', dmg: [2, 7],  atkBonus: 1, value: 60,  desc: '神職者愛用的鈍器。' },
  { id: 'spear',         name: '長矛',   nameEn: 'Spear',         type: 'weapon', slot: 'weapon', dmg: [3, 7],  atkBonus: 1, value: 90,  desc: '兼顧攻防的長柄武器。' },
  { id: 'long_sword',    name: '長劍',   nameEn: 'Long Sword',    type: 'weapon', slot: 'weapon', dmg: [3, 8],  atkBonus: 2, value: 120, desc: '騎士的標準配劍。' },
  { id: 'war_hammer',    name: '戰錘',   nameEn: 'War Hammer',    type: 'weapon', slot: 'weapon', dmg: [4, 9],  atkBonus: 2, value: 160, desc: '能擊碎骨骼的重鎚。' },
  { id: 'battle_axe',    name: '戰斧',   nameEn: 'Battle Axe',    type: 'weapon', slot: 'weapon', dmg: [3, 11], atkBonus: 2, value: 180, twoHanded: true, desc: '沉重的雙手斧。' },
  { id: 'great_sword',   name: '巨劍',   nameEn: 'Great Sword',   type: 'weapon', slot: 'weapon', dmg: [5, 12], atkBonus: 3, value: 320, twoHanded: true, desc: '需雙手揮舞的巨大長劍。' },
  { id: 'short_bow',     name: '短弓',   nameEn: 'Short Bow',     type: 'weapon', slot: 'weapon', dmg: [2, 6],  atkBonus: 1, value: 80,  ranged: true, desc: '遠程攻擊武器。' },
  { id: 'long_bow',      name: '長弓',   nameEn: 'Long Bow',      type: 'weapon', slot: 'weapon', dmg: [3, 9],  atkBonus: 2, value: 200, ranged: true, desc: '射程更遠的精製長弓。' },
  // magic weapons
  { id: 'flame_sword',   name: '烈焰之劍', nameEn: 'Flameblade',  type: 'weapon', slot: 'weapon', dmg: [4, 10], atkBonus: 3, value: 600, element: 'fire',     desc: '附有火焰魔力的長劍。' },
  { id: 'frost_brand',   name: '霜寒之刃', nameEn: 'Frost Brand', type: 'weapon', slot: 'weapon', dmg: [4, 11], atkBonus: 3, value: 650, element: 'cold',     desc: '散發寒氣的魔劍。' },
  { id: 'thunder_mace',  name: '雷霆聖錘', nameEn: 'Thunder Mace',type: 'weapon', slot: 'weapon', dmg: [5, 12], atkBonus: 4, value: 800, element: 'electric', desc: '蘊含雷電的神聖鈍器。' },
  { id: 'holy_avenger',  name: '聖光復仇者',nameEn: 'Holy Avenger',type: 'weapon', slot: 'weapon', dmg: [6, 14], atkBonus: 5, value: 1500, element: 'holy', attrBonus: { might: 2 }, desc: '傳說中的聖騎士之劍。' },
  // ---- armor (light) ----
  { id: 'cloth',         name: '布衣',   nameEn: 'Cloth',         type: 'armor', slot: 'armor', acBonus: 1,  value: 5,   weight: 'light',  desc: '聊勝於無。' },
  { id: 'robe',          name: '法師長袍', nameEn: 'Mage Robe',   type: 'armor', slot: 'armor', acBonus: 2,  value: 50,  weight: 'light', attrBonus: { intellect: 1 }, desc: '繡有符文的施法者長袍。' },
  { id: 'leather',       name: '皮甲',   nameEn: 'Leather Armor', type: 'armor', slot: 'armor', acBonus: 3,  value: 30,  weight: 'light',  desc: '輕便皮製護甲。' },
  // ---- armor (medium) ----
  { id: 'studded',       name: '鉚釘皮甲', nameEn: 'Studded Leather', type: 'armor', slot: 'armor', acBonus: 5, value: 75, weight: 'medium', desc: '鑲嵌金屬鉚釘的皮甲。' },
  { id: 'chain',         name: '鎖子甲', nameEn: 'Chain Mail',    type: 'armor', slot: 'armor', acBonus: 6,  value: 120, weight: 'medium', desc: '環環相扣的金屬甲。' },
  // ---- armor (heavy) ----
  { id: 'splint',        name: '鱗甲',   nameEn: 'Splint Mail',   type: 'armor', slot: 'armor', acBonus: 8,  value: 250, weight: 'heavy',  desc: '條狀鋼板拼接的護甲。' },
  { id: 'plate',         name: '板甲',   nameEn: 'Plate Mail',    type: 'armor', slot: 'armor', acBonus: 10, value: 400, weight: 'heavy',  desc: '最堅固的全身板甲。' },
  { id: 'dragon_plate',  name: '龍鱗板甲', nameEn: 'Dragon Plate',type: 'armor', slot: 'armor', acBonus: 14, value: 1200, weight: 'heavy', resist: { fire: 30 }, desc: '以龍鱗鍛造的傳奇護甲。' },
  // ---- shields ----
  { id: 'buckler',       name: '圓盾',   nameEn: 'Buckler',       type: 'shield', slot: 'shield', acBonus: 1, value: 20,  desc: '小型手盾。' },
  { id: 'kite_shield',   name: '鳶盾',   nameEn: 'Kite Shield',   type: 'shield', slot: 'shield', acBonus: 3, value: 80,  desc: '大型防護盾。' },
  { id: 'tower_shield',  name: '塔盾',   nameEn: 'Tower Shield',  type: 'shield', slot: 'shield', acBonus: 5, value: 220, desc: '幾乎遮蔽全身的巨盾。' },
  // ---- helms ----
  { id: 'leather_cap',   name: '皮帽',   nameEn: 'Leather Cap',   type: 'helm', slot: 'helm', acBonus: 1, value: 15,  desc: '簡單的頭部護具。' },
  { id: 'iron_helm',     name: '鐵盔',   nameEn: 'Iron Helm',     type: 'helm', slot: 'helm', acBonus: 2, value: 60,  desc: '堅固的鐵製頭盔。' },
  { id: 'great_helm',    name: '全罩盔', nameEn: 'Great Helm',    type: 'helm', slot: 'helm', acBonus: 3, value: 160, desc: '包覆整個頭部的重盔。' },
  // ---- cloaks ----
  { id: 'cloak_warmth',  name: '保暖披風', nameEn: 'Cloak of Warmth', type: 'cloak', slot: 'cloak', acBonus: 1, value: 120, resist: { cold: 25 }, desc: '抵禦寒冷的厚披風。' },
  { id: 'cloak_shadow',  name: '暗影披風', nameEn: 'Cloak of Shadows', type: 'cloak', slot: 'cloak', acBonus: 2, value: 250, attrBonus: { speed: 1 }, desc: '隱沒於陰影的披風。' },
  // ---- boots ----
  { id: 'leather_boots', name: '皮靴',   nameEn: 'Leather Boots', type: 'boots', slot: 'boots', acBonus: 1, value: 40,  desc: '耐穿的旅行皮靴。' },
  { id: 'boots_speed',   name: '疾行之靴', nameEn: 'Boots of Speed', type: 'boots', slot: 'boots', acBonus: 1, value: 300, attrBonus: { speed: 2 }, desc: '使穿戴者步履如風。' },
  // ---- accessories ----
  { id: 'ring_protection', name: '守護戒指', nameEn: 'Ring of Protection', type: 'accessory', slot: 'accessory', acBonus: 2, value: 200, desc: '散發護盾微光。' },
  { id: 'amulet_might',    name: '力量護符', nameEn: 'Amulet of Might',    type: 'accessory', slot: 'accessory', atkBonus: 2, attrBonus: { might: 1 }, value: 250, desc: '增強持有者的攻擊。' },
  { id: 'ring_wizardry',   name: '巫術指環', nameEn: 'Ring of Wizardry',   type: 'accessory', slot: 'accessory', attrBonus: { intellect: 2 }, value: 400, desc: '提升法力與智識。' },
  { id: 'amulet_life',     name: '生命護符', nameEn: 'Amulet of Life',     type: 'accessory', slot: 'accessory', attrBonus: { endurance: 2 }, value: 400, desc: '強化持有者的生命力。' },
  // ---- consumables ----
  { id: 'healing_potion',  name: '治療藥水', nameEn: 'Healing Potion',  type: 'consumable', heal: 30,  value: 25,  desc: '恢復 30 點生命。' },
  { id: 'greater_healing', name: '高級治療藥水', nameEn: 'Greater Healing Potion', type: 'consumable', heal: 70, value: 80, desc: '恢復 70 點生命。' },
  { id: 'mana_potion',     name: '法力藥水', nameEn: 'Mana Potion',     type: 'consumable', restore: 20, value: 30, desc: '恢復 20 點法力。' },
  { id: 'antidote',        name: '解毒劑',   nameEn: 'Antidote',        type: 'consumable', curesStatus: ['poisoned', 'diseased'], value: 20, desc: '解除中毒與疾病。' },
  { id: 'elixir',          name: '萬靈藥',   nameEn: 'Elixir',          type: 'consumable', heal: 50, restore: 30, curesStatus: ['poisoned', 'diseased', 'asleep', 'afraid', 'paralyzed'], value: 150, desc: '恢復生命法力並解除一切異常。' },
  { id: 'scroll_fireball', name: '火球卷軸', nameEn: 'Scroll of Fireball', type: 'consumable', castSpell: 'fireball', value: 100, desc: '任何人都能引爆的火球卷軸。' },
  { id: 'ration',          name: '口糧',     nameEn: 'Rations',         type: 'consumable', value: 10,  desc: '一份旅途中的食物。' },
  // ---- quest ----
  { id: 'crystal_key',   name: '水晶鑰匙',   nameEn: 'Crystal Key',   type: 'quest', value: 0, desc: '能開啟地城深處封印之門。' },
  { id: 'iron_key',      name: '鐵鑰匙',     nameEn: 'Iron Key',      type: 'quest', value: 0, desc: '生鏽的鐵鑰，似乎能開某扇牢門。' },
  { id: 'orb_of_terra',  name: '泰拉星界寶珠', nameEn: 'Orb of Terra', type: 'quest', value: 0, desc: '蘊含泰拉群島古老力量的寶珠。' },
  { id: 'moonleaf',      name: '月光草',     nameEn: 'Moonleaf',      type: 'quest', value: 0, desc: '只生長在地城陰影中的藥草，藥師葛瑞塔需要它。' },
  { id: 'arcane_tome',   name: '奧術法典',   nameEn: 'Arcane Tome',   type: 'quest', value: 0, desc: '記載著失傳法術的古老書卷。' },
  { id: 'cyclops_eye',   name: '獨眼巨人之眼', nameEn: 'Cyclops Eye', type: 'quest', value: 0, desc: '巨人洞窟之主的眼珠，珠寶商高價收購。' },
  { id: 'sea_chart',     name: '航海圖',     nameEn: 'Sea Chart',     type: 'quest', value: 0, desc: '標記著群島之間秘密航線的地圖。' },
  { id: 'ancient_relic', name: '上古遺物',   nameEn: 'Ancient Relic', type: 'quest', value: 0, desc: '泰拉文明留下的神秘裝置。' },
];

export const MONSTERS: MonsterDef[] = [
  // ---- vermin / beasts ----
  { id: 'giant_rat',   name: '巨鼠',   nameEn: 'Giant Rat',   hp: 6,   ac: 1,  attack: 1,  dmg: [1, 3],   speed: 9,  xp: 12,  gold: [1, 6],    family: 'beast',    color: '#9a8c98', sprite: 'rat',     desc: '地城中常見的害獸。' },
  { id: 'cave_spider', name: '洞穴蜘蛛', nameEn: 'Cave Spider', hp: 14, ac: 4, attack: 4, dmg: [2, 7], speed: 13, xp: 38, gold: [3, 9], family: 'beast', inflicts: { status: 'poisoned', chance: 0.35, rounds: 4 }, color: '#4a4e69', sprite: 'spider', desc: '迅捷而致命，毒牙傷人。' },
  { id: 'dire_wolf',   name: '恐狼',   nameEn: 'Dire Wolf',   hp: 18,  ac: 4,  attack: 5,  dmg: [3, 8],   speed: 14, xp: 44,  gold: [2, 8],    family: 'beast',    color: '#6c757d', sprite: 'wolf',    desc: '成群獵食的巨狼。' },
  { id: 'giant_snake', name: '巨蟒',   nameEn: 'Giant Snake', hp: 24,  ac: 5,  attack: 5,  dmg: [3, 9],   speed: 11, xp: 60,  gold: [4, 12],   family: 'beast', inflicts: { status: 'poisoned', chance: 0.5, rounds: 5 }, color: '#52796f', sprite: 'snake', desc: '纏繞絞殺的毒蟒。' },
  // ---- humanoids ----
  { id: 'kobold',      name: '狗頭人', nameEn: 'Kobold',      hp: 9,   ac: 2,  attack: 2,  dmg: [2, 4],   speed: 11, xp: 20,  gold: [4, 10],   family: 'humanoid', color: '#bc6c25', sprite: 'kobold',  desc: '成群結隊的小怪。' },
  { id: 'goblin',      name: '哥布林', nameEn: 'Goblin',      hp: 12,  ac: 3,  attack: 3,  dmg: [2, 6],   speed: 10, xp: 30,  gold: [6, 14],   family: 'humanoid', color: '#588157', sprite: 'goblin',  desc: '兇悍的綠皮戰士。' },
  { id: 'orc',         name: '半獸人', nameEn: 'Orc',         hp: 22,  ac: 5,  attack: 5,  dmg: [4, 9],   speed: 9,  xp: 60,  gold: [12, 24],  family: 'humanoid', color: '#606c38', sprite: 'orc',     desc: '強壯的戰士。' },
  { id: 'bandit',      name: '強盜',   nameEn: 'Bandit',      hp: 20,  ac: 5,  attack: 5,  dmg: [3, 8],   speed: 12, xp: 55,  gold: [20, 50],  family: 'humanoid', color: '#7f4f24', sprite: 'bandit',  desc: '攔路打劫的亡命之徒。' },
  { id: 'ogre',        name: '食人魔', nameEn: 'Ogre',        hp: 45,  ac: 6,  attack: 7,  dmg: [6, 14],  speed: 7,  xp: 120, gold: [25, 60],  family: 'humanoid', size: 'large', color: '#9c6644', sprite: 'ogre', desc: '揮舞巨棒的笨重巨人。' },
  { id: 'dark_acolyte',name: '黑暗祭司', nameEn: 'Dark Acolyte', hp: 20, ac: 4, attack: 3, dmg: [2, 6], speed: 11, xp: 75, gold: [18, 36], spellId: 'spark', family: 'humanoid', color: '#5a189a', sprite: 'mage', desc: '會施放法術的敵人。' },
  { id: 'sorceress',   name: '女巫',   nameEn: 'Sorceress',   hp: 30,  ac: 5,  attack: 4,  dmg: [2, 6],   speed: 13, xp: 130, gold: [40, 80],  gems: [0, 2], spellId: 'fireball', family: 'humanoid', color: '#9d4edd', sprite: 'mage', desc: '操縱烈焰的危險施法者。' },
  // ---- undead ----
  { id: 'skeleton',    name: '骷髏兵', nameEn: 'Skeleton',    hp: 16,  ac: 4,  attack: 4,  dmg: [3, 7],   speed: 8,  xp: 45,  gold: [8, 18],   family: 'undead', resist: { cold: 50, poison: 100 }, color: '#e0e1dd', sprite: 'skeleton', desc: '被喚醒的亡者骨兵。' },
  { id: 'zombie',      name: '殭屍',   nameEn: 'Zombie',      hp: 26,  ac: 3,  attack: 4,  dmg: [3, 10],  speed: 5,  xp: 55,  gold: [5, 12],   family: 'undead', resist: { cold: 50, poison: 100 }, inflicts: { status: 'diseased', chance: 0.3, rounds: -1 }, color: '#7f5539', sprite: 'zombie', desc: '緩慢但耐打的腐屍。' },
  { id: 'ghoul',       name: '食屍鬼', nameEn: 'Ghoul',       hp: 30,  ac: 5,  attack: 6,  dmg: [4, 9],   speed: 10, xp: 85,  gold: [10, 25],  family: 'undead', resist: { cold: 50, poison: 100 }, inflicts: { status: 'paralyzed', chance: 0.25, rounds: 2 }, color: '#a3b18a', sprite: 'ghoul', desc: '麻痺利爪的不死掠食者。' },
  { id: 'wraith',      name: '幽魂',   nameEn: 'Wraith',      hp: 38,  ac: 7,  attack: 7,  dmg: [5, 11],  speed: 13, xp: 140, gold: [20, 45],  family: 'undead', resist: { cold: 75, poison: 100, electric: 30 }, spellId: 'frostbite', color: '#8d99ae', sprite: 'wraith', desc: '飄忽不定的怨靈。' },
  // ---- elemental / construct ----
  { id: 'fire_imp',    name: '火焰小鬼', nameEn: 'Fire Imp',  hp: 18,  ac: 6,  attack: 5,  dmg: [3, 7],   speed: 14, xp: 70,  gold: [10, 20],  family: 'demon', resist: { fire: 100 }, inflicts: { status: 'poisoned', chance: 0, rounds: 0 }, spellId: 'flame_arrow', color: '#e63946', sprite: 'imp', desc: '吐火的小型惡魔。' },
  { id: 'gargoyle',    name: '石像鬼', nameEn: 'Gargoyle',    hp: 40,  ac: 8,  attack: 6,  dmg: [4, 10],  speed: 9,  xp: 110, gold: [15, 30],  family: 'construct', resist: { fire: 30, cold: 30, electric: 30 }, color: '#6c757d', sprite: 'gargoyle', desc: '從石牆甦醒的守護者。' },
  { id: 'stone_golem', name: '石魔像', nameEn: 'Stone Golem', hp: 70,  ac: 9,  attack: 8,  dmg: [6, 13],  speed: 5,  xp: 200, gold: [0, 0],    gems: [1, 3], family: 'construct', resist: { fire: 50, cold: 50, electric: 50, poison: 100 }, size: 'large', color: '#adb5bd', sprite: 'golem', desc: '不知疲倦的石造守衛。' },
  // ---- big / boss-tier ----
  { id: 'cyclops',     name: '獨眼巨人', nameEn: 'Cyclops',   hp: 90,  ac: 7,  attack: 9,  dmg: [8, 18],  speed: 7,  xp: 280, gold: [60, 120], gems: [1, 4], family: 'humanoid', size: 'huge', boss: true, color: '#9c6644', color2: '#e9c46a', sprite: 'cyclops', desc: '盤踞巨人洞窟的獨眼霸主。' },
  { id: 'wyvern',      name: '飛龍',   nameEn: 'Wyvern',      hp: 80,  ac: 8,  attack: 8,  dmg: [6, 15],  speed: 15, xp: 260, gold: [40, 90],  gems: [1, 3], family: 'dragon', resist: { poison: 100 }, inflicts: { status: 'poisoned', chance: 0.5, rounds: 5 }, size: 'large', color: '#2a9d8f', sprite: 'wyvern', desc: '毒尾翔空的亞龍。' },
  { id: 'lich_king',   name: '巫妖王', nameEn: 'Lich King',   hp: 180, ac: 9,  attack: 9,  dmg: [6, 14],  speed: 12, xp: 700, gold: [200, 350], gems: [3, 8], spellId: 'fireball', family: 'undead', resist: { cold: 50, electric: 30, poison: 100 }, boss: true, size: 'large', color: '#7c3aed', color2: '#4cc9f0', sprite: 'lich', desc: '泰拉地城深處的不死之主。' },
  { id: 'terra_guardian', name: '泰拉守護者', nameEn: 'Terra Guardian', hp: 300, ac: 11, attack: 11, dmg: [10, 22], speed: 13, xp: 1500, gold: [400, 700], gems: [8, 16], spellId: 'meteor', family: 'construct', resist: { fire: 50, cold: 50, electric: 50, holy: 30, poison: 100 }, boss: true, size: 'huge', color: '#e9c46a', color2: '#e76f51', sprite: 'guardian', desc: '守衛泰拉核心的遠古造物，群島命運的最終試煉。' },
];

// ---------- Maps ----------
// Terrain legend: # wall  . floor/grass  ~ water  ^ mountain  T tree  D door  S start
//                 r road  s sand  L lava  b bridge
export const MAPS: TileMap[] = [
  {
    id: 'overworld',
    name: '泰拉群島地表',
    nameEn: 'Isles of Terra',
    kind: 'overworld',
    region: 'terra',
    skyColor: '#3a6ea5',
    grid: [
      '####################',
      '#....TT....~~~......#',
      '#...TTT....~~~..^^..#',
      '#....T.....~~~..^^^.#',
      '#.........rr.......^#',
      '#...^^...rr....TT...#',
      '#..^^^..rr.....TTT..#',
      '#..^^..rr.......T...#',
      '#.....rr...........#',
      '#....rr....~~......#',
      '#...rr.....~~~.....#',
      '#..rr.......~~.....#',
      '#.Sr..TT..........s#',
      '#..r..TTT........ss#',
      '#..r...T........sss#',
      '####################',
    ],
    start: { x: 2, y: 12, dir: 0 },
    portals: {
      '1,12': { toMap: 'overworld', to: { x: 1, y: 12 }, toScreen: 'town', town: 'sorpigal', label: '索皮加城' },
      '11,1':  { toMap: 'overworld', to: { x: 11, y: 1 }, toScreen: 'town', town: 'fountainhead', label: '泉源鎮' },
      '18,13': { toMap: 'overworld', to: { x: 18, y: 13 }, toScreen: 'town', town: 'wildabar', label: '荒野堡' },
      '3,4':   { toMap: 'sorpigal_d1', to: { x: 1, y: 1, dir: 1 }, label: '索皮加地城' },
      '17,3':  { toMap: 'cyclops_cave', to: { x: 1, y: 1, dir: 1 }, label: '巨人洞窟' },
      '18,14': { toMap: 'crypt_d1', to: { x: 1, y: 1, dir: 1 }, label: '荒野古墓' },
    },
    encounters: {
      '8,5':   { monsters: [{ id: 'goblin', count: [1, 2] }, { id: 'kobold', count: [1, 2] }] },
      '13,8':  { monsters: [{ id: 'dire_wolf', count: [2, 3] }] },
      '6,11':  { monsters: [{ id: 'bandit', count: [1, 3] }] },
      '15,11': { monsters: [{ id: 'giant_snake', count: [1, 2] }] },
    },
    signs: {
      '4,4': '路牌：← 索皮加城　↑ 地城入口',
      '11,2': '路牌：泉源鎮就在前方。',
    },
    events: {
      '12,3': { onceFlag: 'shrine_might', text: '一座古老的神龕。你感到力量湧入體內！', attrBoost: { attr: 'might', amount: 1 }, healParty: true },
    },
  },
  // ===== Sorpigal Dungeon =====
  {
    id: 'sorpigal_d1',
    name: '索皮加地城 · 一層',
    nameEn: 'Sorpigal Dungeon · L1',
    kind: 'dungeon',
    level: 1,
    skyColor: '#1a1330',
    grid: [
      '############',
      '#S......#D.#',
      '#.####....##',
      '#.#..#.....#',
      '#.#..#..##.#',
      '#....#..##.#',
      '#.####.....#',
      '#......##..#',
      '#.####.##..#',
      '#....#.....#',
      '############',
    ],
    start: { x: 1, y: 1, dir: 1 },
    doors: {
      '9,1': { locked: true, keyItem: 'crystal_key', text: '一扇刻著符文的封印之門。' },
    },
    chests: {
      '10,9': { items: ['crystal_key'], gold: [20, 40] },
      '1,9':  { gold: [30, 60], items: ['healing_potion', 'moonleaf'] },
      '10,3': { gold: [15, 35], items: ['leather'] },
      '4,4':  { gold: [10, 25], items: ['leather_cap'], trapped: true, trapDmg: [4, 10] },
    },
    encounters: {
      '3,5': { monsters: [{ id: 'giant_rat', count: [2, 3] }, { id: 'kobold', count: [1, 2] }] },
      '8,7': { monsters: [{ id: 'goblin', count: [2, 3] }] },
      '5,9': { monsters: [{ id: 'skeleton', count: [1, 2] }, { id: 'cave_spider', count: [1, 2] }] },
    },
    portals: {
      '10,1': { toMap: 'sorpigal_d2', to: { x: 1, y: 1, dir: 1 }, label: '向下的階梯' },
      '1,1':  { toMap: 'overworld', to: { x: 3, y: 4, dir: 2 }, label: '回到地表' },
    },
  },
  {
    id: 'sorpigal_d2',
    name: '索皮加地城 · 深層',
    nameEn: 'Sorpigal Dungeon · Depths',
    kind: 'dungeon',
    level: 2,
    skyColor: '#1a0a1e',
    grid: [
      '############',
      '#..........#',
      '#..####....#',
      '#..........#',
      '#....##....#',
      '#....##....#',
      '#..........#',
      '#..####....#',
      '#..........#',
      '#..........#',
      '############',
    ],
    start: { x: 1, y: 1, dir: 1 },
    chests: {
      '1,8':  { gold: [40, 80], items: ['greater_healing', 'arcane_tome'] },
      '10,1': { gold: [30, 60], items: ['kite_shield'] },
      '10,9': { gold: [60, 120], gems: [1, 3], items: ['chain'], trapped: true, trapDmg: [8, 16] },
    },
    encounters: {
      '5,3':  { monsters: [{ id: 'orc', count: [1, 2] }, { id: 'cave_spider', count: [1, 2] }] },
      '8,5':  { monsters: [{ id: 'zombie', count: [1, 2] }, { id: 'dark_acolyte', count: [1, 1] }] },
      '5,6':  { monsters: [{ id: 'ghoul', count: [1, 2] }] },
      '10,7': { monsters: [{ id: 'lich_king', count: [1, 1] }], once: true, boss: true },
    },
    portals: {
      '1,1': { toMap: 'sorpigal_d1', to: { x: 10, y: 1, dir: 3 }, label: '向上的階梯' },
    },
  },
  // ===== Cyclops Cave =====
  {
    id: 'cyclops_cave',
    name: '巨人洞窟',
    nameEn: 'Cyclops Cave',
    kind: 'dungeon',
    level: 3,
    skyColor: '#2a1a0a',
    grid: [
      '############',
      '#S...#.....#',
      '#.##.#.###.#',
      '#.#....#...#',
      '#.#.##.#.#.#',
      '#...#..#.#.#',
      '###.#.##.#.#',
      '#.....#....#',
      '#.###.#.##.#',
      '#.......B..#',
      '############',
    ],
    start: { x: 1, y: 1, dir: 1 },
    chests: {
      '5,3':  { gold: [50, 100], items: ['war_hammer'] },
      '10,1': { gold: [40, 90], gems: [1, 2], items: ['studded'] },
      '1,7':  { gold: [30, 70], items: ['antidote', 'mana_potion'] },
    },
    encounters: {
      '6,5':  { monsters: [{ id: 'ogre', count: [1, 2] }] },
      '3,7':  { monsters: [{ id: 'gargoyle', count: [1, 2] }] },
      '8,7':  { monsters: [{ id: 'orc', count: [2, 3] }, { id: 'bandit', count: [1, 2] }] },
      '7,9':  { monsters: [{ id: 'cyclops', count: [1, 1] }], once: true, boss: true },
    },
    portals: {
      '1,1': { toMap: 'overworld', to: { x: 17, y: 3, dir: 2 }, label: '離開洞窟' },
    },
  },
  // ===== Wildabar Crypt =====
  {
    id: 'crypt_d1',
    name: '荒野古墓 · 上層',
    nameEn: 'Wildabar Crypt · L1',
    kind: 'dungeon',
    level: 4,
    skyColor: '#0a1020',
    grid: [
      '############',
      '#S.#.....#.#',
      '#..#.###.#.#',
      '#..#.#.....#',
      '#....#.###.#',
      '#.####...#.#',
      '#......#.#.#',
      '#.####.#...#',
      '#....#...#D#',
      '#.##.....#.#',
      '############',
    ],
    start: { x: 1, y: 1, dir: 1 },
    doors: {
      '9,8': { locked: true, keyItem: 'iron_key', text: '一扇沉重的鐵製墓門。' },
    },
    chests: {
      '10,1': { gold: [50, 100], items: ['iron_key'] },
      '1,8':  { gold: [60, 120], gems: [1, 3], items: ['frost_brand'], trapped: true, trapDmg: [10, 20] },
      '6,3':  { gold: [40, 80], items: ['cloak_warmth'] },
    },
    encounters: {
      '4,3':  { monsters: [{ id: 'skeleton', count: [2, 4] }] },
      '6,6':  { monsters: [{ id: 'ghoul', count: [1, 2] }, { id: 'zombie', count: [1, 2] }] },
      '8,5':  { monsters: [{ id: 'wraith', count: [1, 2] }] },
      '10,9': { monsters: [{ id: 'wyvern', count: [1, 1] }], once: true, boss: true },
    },
    portals: {
      '1,1':  { toMap: 'overworld', to: { x: 18, y: 14, dir: 3 }, label: '離開古墓' },
      '10,9': { toMap: 'terra_core', to: { x: 1, y: 1, dir: 1 }, label: '通往泰拉核心', needFlag: 'orb_returned' },
    },
  },
  // ===== Terra Core (final) =====
  {
    id: 'terra_core',
    name: '泰拉核心',
    nameEn: 'Terra Core',
    kind: 'dungeon',
    level: 6,
    skyColor: '#1a0010',
    grid: [
      '#########',
      '#S......#',
      '#.#####.#',
      '#.#...#.#',
      '#.#.#.#.#',
      '#...#...#',
      '#.#####.#',
      '#...G...#',
      '#########',
    ],
    start: { x: 1, y: 1, dir: 1 },
    chests: {
      '7,1': { gold: [200, 400], gems: [3, 6], items: ['dragon_plate'] },
      '1,5': { gold: [150, 300], items: ['holy_avenger'] },
    },
    encounters: {
      '4,3': { monsters: [{ id: 'stone_golem', count: [1, 2] }] },
      '4,7': { monsters: [{ id: 'terra_guardian', count: [1, 1] }], once: true, boss: true },
    },
    portals: {
      '1,1': { toMap: 'crypt_d1', to: { x: 10, y: 9, dir: 3 }, label: '返回古墓' },
    },
  },
];

// ---------- Towns ----------
export interface TownDef {
  id: string;
  name: string;
  nameEn: string;
  blurb: string;
  buildings: { id: string; kind: string }[];
  npcs: string[];
}
export const TOWNS: TownDef[] = [
  {
    id: 'sorpigal', name: '索皮加城', nameEn: 'Sorpigal', blurb: '泰拉群島上最後的安全據點。',
    buildings: [
      { id: 'weapon_smith', kind: 'shop' }, { id: 'armorer', kind: 'shop' }, { id: 'magic_guild', kind: 'shop' },
      { id: 'temple_sorpigal', kind: 'temple' }, { id: 'inn_sorpigal', kind: 'inn' }, { id: 'training_sorpigal', kind: 'training' },
      { id: 'tavern_keeper', kind: 'dialog' },
    ],
    npcs: ['elder', 'herbalist', 'mage_apprentice', 'priest', 'townsfolk'],
  },
  {
    id: 'fountainhead', name: '泉源鎮', nameEn: 'Fountain Head', blurb: '清泉湧流、學者雲集的北方小鎮。',
    buildings: [
      { id: 'fh_magic', kind: 'shop' }, { id: 'fh_goods', kind: 'shop' },
      { id: 'temple_fh', kind: 'temple' }, { id: 'inn_fh', kind: 'inn' }, { id: 'training_fh', kind: 'training' },
    ],
    npcs: ['scholar', 'fountain_keeper'],
  },
  {
    id: 'wildabar', name: '荒野堡', nameEn: 'Wildabar', blurb: '沙漠邊緣的傭兵與冒險者之城。',
    buildings: [
      { id: 'wb_smith', kind: 'shop' }, { id: 'wb_armor', kind: 'shop' },
      { id: 'temple_wb', kind: 'temple' }, { id: 'inn_wb', kind: 'inn' }, { id: 'training_wb', kind: 'training' },
    ],
    npcs: ['jeweler', 'mercenary', 'gatekeeper'],
  },
];

// ---------- NPCs / Dialog ----------
export const NPCS: NPCDef[] = [
  {
    id: 'tavern_keeper', name: '酒館老闆 古斯', nameEn: 'Gus the Tavernkeeper', root: 'start',
    entries: [
      { cond: { questComplete: 'orb_quest' }, node: 'done' },
      { cond: { questActive: 'orb_quest', item: 'orb_of_terra' }, node: 'hasOrb' },
      { cond: { questActive: 'orb_quest' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「旅人啊，泰拉群島正陷入黑暗。索皮加地城深處的『泰拉星界寶珠』被巫妖王奪走了。你願意取回它嗎？」',
        options: [
          { label: '我接下這個任務', to: 'accepted', action: { giveQuest: 'orb_quest' } },
          { label: '寶珠在哪裡？', to: 'where' },
          { label: '改天再說', action: { end: true } },
        ],
      },
      where: {
        id: 'where',
        text: '「在城外北方的索皮加地城深處。一層有道封印之門，需要『水晶鑰匙』才能通往下層。小心巫妖王！」',
        options: [
          { label: '我接下這個任務', to: 'accepted', action: { giveQuest: 'orb_quest' } },
          { label: '離開', action: { end: true } },
        ],
      },
      accepted: { id: 'accepted', text: '「願光明指引你。取回寶珠後回來找我，必有重謝。」', options: [{ label: '出發', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「寶珠還在巫妖王手上嗎？泰拉的時間不多了…記得水晶鑰匙在地城一層。」', options: [{ label: '我會的', action: { end: true } }] },
      hasOrb: { id: 'hasOrb', text: '「你…你真的取回了寶珠！泰拉得救了！這是你應得的獎賞，英雄。聽說古墓深處，還有更古老的威脅在甦醒…」', options: [{ label: '領取獎賞', action: { completeQuest: 'orb_quest', end: true } }] },
      done: { id: 'done', text: '「英雄，泰拉的居民永遠感激你。荒野堡的古墓最近不太平靜，或許你該去看看。要不要再來一杯？算我請客。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'elder', name: '村莊長老 艾德蒙', nameEn: 'Elder Edmund', root: 'start',
    entries: [
      { cond: { questComplete: 'goblin_threat' }, node: 'done' },
      { cond: { questActive: 'goblin_threat', cleared: 'overworld:8,5' }, node: 'reward' },
      { cond: { questActive: 'goblin_threat' }, node: 'reminder' },
    ],
    nodes: {
      start: {
        id: 'start',
        text: '「一群哥布林盤踞在城外的道路上，商隊都不敢通行了。年輕人，你能替我們驅逐牠們嗎？」',
        options: [
          { label: '交給我吧', to: 'accept', action: { giveQuest: 'goblin_threat' } },
          { label: '牠們在哪？', to: 'where' },
          { label: '我再考慮', action: { end: true } },
        ],
      },
      where: { id: 'where', text: '「就在城外地表中央的路口，一支哥布林部隊。小心，牠們成群行動。」', options: [{ label: '交給我吧', to: 'accept', action: { giveQuest: 'goblin_threat' } }, { label: '離開', action: { end: true } }] },
      accept: { id: 'accept', text: '「願你旗開得勝。」', options: [{ label: '出發', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「哥布林還在城外路口肆虐呢。」', options: [{ label: '我這就去', action: { end: true } }] },
      reward: { id: 'reward', text: '「道路又安全了！這枚守護戒指是我們的謝意，請收下。」', options: [{ label: '領取獎賞', action: { completeQuest: 'goblin_threat', giveItem: 'ring_protection', end: true } }] },
      done: { id: 'done', text: '「多虧了你，商隊又開始通行了。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'herbalist', name: '藥師 葛瑞塔', nameEn: 'Greta the Herbalist', root: 'start',
    entries: [
      { cond: { questComplete: 'herb_gathering' }, node: 'done' },
      { cond: { questActive: 'herb_gathering', item: 'moonleaf' }, node: 'reward' },
      { cond: { questActive: 'herb_gathering' }, node: 'reminder' },
    ],
    nodes: {
      start: { id: 'start', text: '「我需要一種叫『月光草』的藥草，只生長在地城的陰影裡。幫我採來，我教你的牧師一個治療祕術。」', options: [{ label: '我會留意', to: 'accept', action: { giveQuest: 'herb_gathering' } }, { label: '沒興趣', action: { end: true } }] },
      accept: { id: 'accept', text: '「月光草通常藏在索皮加地城一層的箱子裡。謝謝你！」', options: [{ label: '好的', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「找到月光草了嗎？試試索皮加地城一層的寶箱。」', options: [{ label: '還在找', action: { end: true } }] },
      reward: { id: 'reward', text: '「正是月光草！如約定，我把『治癒重傷』的祕術傳授給你的牧師。」', options: [{ label: '領取傳授', action: { completeQuest: 'herb_gathering', teachSpell: 'cure_wounds', end: true } }] },
      done: { id: 'done', text: '「願月光草的清香伴你左右。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'mage_apprentice', name: '法師學徒 費歐', nameEn: 'Fio the Apprentice', root: 'start',
    entries: [
      { cond: { questComplete: 'lost_tome' }, node: 'done' },
      { cond: { questActive: 'lost_tome', item: 'arcane_tome' }, node: 'reward' },
      { cond: { questActive: 'lost_tome' }, node: 'reminder' },
    ],
    nodes: {
      start: { id: 'start', text: '「我師父的『奧術法典』遺落在地城深層。若你能取回，我就把裡面的火球術教給你的法師！」', options: [{ label: '我幫你找', to: 'accept', action: { giveQuest: 'lost_tome' } }, { label: '改天吧', action: { end: true } }] },
      accept: { id: 'accept', text: '「法典應該在索皮加地城『深層』的某個寶箱裡。萬分感謝！」', options: [{ label: '了解', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「奧術法典還在地城深層呢，拜託了。」', options: [{ label: '快了', action: { end: true } }] },
      reward: { id: 'reward', text: '「這就是法典！依約，火球術現在屬於你的法師了。」', options: [{ label: '領取傳授', action: { completeQuest: 'lost_tome', teachSpell: 'fireball', end: true } }] },
      done: { id: 'done', text: '「有了法典，師父一定會誇獎我的！」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'priest', name: '神殿祭司 賽勒斯', nameEn: 'Priest Cyrus', root: 'start',
    entries: [{ cond: { flag: 'boss_dead' }, node: 'afterBoss' }],
    nodes: {
      start: { id: 'start', text: '「光明與你同在，旅人。巫妖王的詛咒讓不死者橫行地城。神聖的法術對牠們格外有效，切記。」', options: [{ label: '謝謝指點', action: { end: true } }, { label: '為我們祈福', to: 'bless', action: { heal: true, cure: true } }] },
      bless: { id: 'bless', text: '「願神恩治癒你們的傷痛。」', options: [{ label: '阿們', action: { end: true } }] },
      afterBoss: { id: 'afterBoss', text: '「巫妖王已被擊敗？太好了！泰拉的亡魂終於能安息。願你福澤綿長。」', options: [{ label: '為我們祈福', to: 'bless', action: { heal: true, cure: true } }, { label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'townsfolk', name: '城鎮居民', nameEn: 'Townsperson', root: 'start',
    entries: [
      { cond: { flag: 'orb_returned' }, node: 'hero' },
      { cond: { questActive: 'orb_quest' }, node: 'worried' },
    ],
    nodes: {
      start: { id: 'start', text: '「歡迎來到索皮加城。城外的地城最近很不平靜，聽說連商隊都被哥布林攔路了。」', options: [{ label: '了解', action: { end: true } }] },
      worried: { id: 'worried', text: '「你就是要去討伐巫妖王的冒險者嗎？拜託一定要成功啊…」', options: [{ label: '我會的', action: { end: true } }] },
      hero: { id: 'hero', text: '「是你救了泰拉！孩子們都在傳唱你的事蹟呢！」', options: [{ label: '不敢當', action: { end: true } }] },
    },
  },
  // ----- Fountain Head -----
  {
    id: 'scholar', name: '學者 阿芮亞', nameEn: 'Aria the Scholar', root: 'start',
    entries: [
      { cond: { questComplete: 'ancient_lore' }, node: 'done' },
      { cond: { questActive: 'ancient_lore', item: 'ancient_relic' }, node: 'reward' },
      { cond: { questActive: 'ancient_lore' }, node: 'reminder' },
    ],
    nodes: {
      start: { id: 'start', text: '「泰拉文明留下了一件『上古遺物』，據說藏在荒野古墓深處。取回它，我將傳授你失傳的傳送法術。」', options: [{ label: '我去尋找', to: 'accept', action: { giveQuest: 'ancient_lore' } }, { label: '太危險了', action: { end: true } }] },
      accept: { id: 'accept', text: '「古墓在群島東南，務必小心不死者。」', options: [{ label: '明白', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「上古遺物還在荒野古墓裡。它對解開泰拉之謎至關重要。」', options: [{ label: '我會帶回來', action: { end: true } }] },
      reward: { id: 'reward', text: '「這就是上古遺物！正如約定，城鎮傳送術現在屬於你了。」', options: [{ label: '領取傳授', action: { completeQuest: 'ancient_lore', teachSpell: 'town_portal', end: true } }] },
      done: { id: 'done', text: '「有了這件遺物，我或許能解開泰拉群島的起源之謎。」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'fountain_keeper', name: '泉水守護者 莉芙', nameEn: 'Liv the Fountain Keeper', root: 'start',
    nodes: {
      start: { id: 'start', text: '「歡迎來到泉源鎮。鎮中的聖泉能洗滌疲憊。願清泉賜福於你。」', options: [{ label: '飲用聖泉（全體治療）', to: 'drink', action: { heal: true, cure: true } }, { label: '離開', action: { end: true } }] },
      drink: { id: 'drink', text: '「清涼的泉水流過喉間，傷痛盡消。」', options: [{ label: '感謝', action: { end: true } }] },
    },
  },
  // ----- Wildabar -----
  {
    id: 'jeweler', name: '珠寶商 薩丁', nameEn: 'Sardin the Jeweler', root: 'start',
    entries: [
      { cond: { questComplete: 'cyclops_bounty' }, node: 'done' },
      { cond: { questActive: 'cyclops_bounty', item: 'cyclops_eye' }, node: 'reward' },
      { cond: { questActive: 'cyclops_bounty' }, node: 'reminder' },
    ],
    nodes: {
      start: { id: 'start', text: '「巨人洞窟裡的獨眼巨人有一顆價值連城的眼珠。替我取來，重金酬謝，外加一件好東西。」', options: [{ label: '成交', to: 'accept', action: { giveQuest: 'cyclops_bounty' } }, { label: '聽起來很危險', action: { end: true } }] },
      accept: { id: 'accept', text: '「巨人洞窟在群島東北方。那獨眼巨人可不好對付，多帶點藥水。」', options: [{ label: '了解', action: { end: true } }] },
      reminder: { id: 'reminder', text: '「獨眼巨人之眼到手了嗎？洞窟在東北方。」', options: [{ label: '還在打', action: { end: true } }] },
      reward: { id: 'reward', text: '「好極了！這是你的酬勞，還有這枚力量護符，拿去吧！」', options: [{ label: '領取獎賞', action: { completeQuest: 'cyclops_bounty', giveItem: 'amulet_might', end: true } }] },
      done: { id: 'done', text: '「跟你做生意真痛快！」', options: [{ label: '離開', action: { end: true } }] },
    },
  },
  {
    id: 'mercenary', name: '老傭兵 布洛克', nameEn: 'Brock the Mercenary', root: 'start',
    nodes: {
      start: { id: 'start', text: '「小子，戰場上活下來的祕訣？睡前讓牧師補滿血，遇上不死者就用神聖法術，碰到一群雜魚先睡眠術。記住了。」', options: [{ label: '受教了', action: { end: true } }] },
    },
  },
  {
    id: 'gatekeeper', name: '守門人 達洛', nameEn: 'Darro the Gatekeeper', root: 'start',
    nodes: {
      start: { id: 'start', text: '「荒野古墓就在城外東南。沒有鐵鑰匙可進不了深處的墓室——那鑰匙就在古墓上層的寶箱裡。」', options: [{ label: '多謝提醒', action: { end: true } }] },
    },
  },
];

export const QUESTS: QuestDef[] = [
  { id: 'orb_quest', name: '泰拉星界寶珠', nameEn: 'The Orb of Terra', giver: 'tavern_keeper', itemRequired: 'orb_of_terra', desc: '從索皮加地城深處的巫妖王手中取回泰拉星界寶珠。', hint: '需要水晶鑰匙進入地城深層，擊敗巫妖王。', rewardGold: 500, rewardXp: 400, main: true },
  { id: 'goblin_threat', name: '哥布林威脅', nameEn: 'The Goblin Threat', giver: 'elder', clearedRequired: 'overworld:8,5', desc: '擊退盤踞在城外路口的哥布林部隊。', hint: '哥布林在地表中央的路口。', rewardGold: 150, rewardXp: 120 },
  { id: 'herb_gathering', name: '月光草採集', nameEn: 'Moonleaf Gathering', giver: 'herbalist', itemRequired: 'moonleaf', desc: '為藥師葛瑞塔採集地城裡的月光草。', hint: '月光草在索皮加地城一層的寶箱中。', rewardGold: 120, rewardXp: 100 },
  { id: 'lost_tome', name: '失落的法典', nameEn: 'The Lost Tome', giver: 'mage_apprentice', itemRequired: 'arcane_tome', desc: '為法師學徒費歐尋回遺落的奧術法典。', hint: '奧術法典在索皮加地城深層的寶箱中。', rewardGold: 200, rewardXp: 160 },
  { id: 'cyclops_bounty', name: '獨眼巨人懸賞', nameEn: 'Cyclops Bounty', giver: 'jeweler', itemRequired: 'cyclops_eye', desc: '擊敗巨人洞窟的獨眼巨人，取回牠的眼珠。', hint: '巨人洞窟在群島東北方。', rewardGold: 400, rewardXp: 350, rewardItem: 'amulet_might' },
  { id: 'ancient_lore', name: '上古遺物', nameEn: 'Ancient Lore', giver: 'scholar', itemRequired: 'ancient_relic', desc: '為學者阿芮亞尋回荒野古墓中的上古遺物。', hint: '上古遺物在荒野古墓，需擊敗飛龍。', rewardGold: 350, rewardXp: 300, main: true },
];

// ---------- Shops ----------
export const SHOPS: ShopDef[] = [
  // Sorpigal
  { id: 'weapon_smith', name: '索皮加武器鋪', nameEn: 'Sorpigal Weapons', kind: 'goods', town: 'sorpigal', stock: ['dagger', 'short_sword', 'mace', 'spear', 'long_sword', 'war_hammer', 'battle_axe', 'short_bow'] },
  { id: 'armorer', name: '索皮加防具鋪', nameEn: 'Sorpigal Armory', kind: 'goods', town: 'sorpigal', stock: ['cloth', 'robe', 'leather', 'studded', 'chain', 'buckler', 'kite_shield', 'leather_cap', 'iron_helm', 'leather_boots'] },
  { id: 'magic_guild', name: '魔法公會', nameEn: 'Magic Guild', kind: 'magic', town: 'sorpigal', stock: ['healing_potion', 'mana_potion', 'greater_healing', 'antidote', 'ration'], spells: ['flame_arrow', 'frostbite', 'sleep', 'haste', 'shield_spell', 'fireball', 'heal', 'bless', 'protection', 'cure_poison', 'turn_undead', 'remove_fear'] },
  { id: 'temple_sorpigal', name: '索皮加神殿', nameEn: 'Temple of Sorpigal', kind: 'temple', town: 'sorpigal', stock: [], healCost: 30 },
  { id: 'inn_sorpigal', name: '索皮加旅店', nameEn: 'Sorpigal Inn', kind: 'inn', town: 'sorpigal', stock: [], restCost: 0 },
  { id: 'training_sorpigal', name: '索皮加訓練場', nameEn: 'Sorpigal Training', kind: 'training', town: 'sorpigal', stock: [] },
  // Fountain Head
  { id: 'fh_magic', name: '泉源魔法塔', nameEn: 'Fountain Magic', kind: 'magic', town: 'fountainhead', stock: ['greater_healing', 'mana_potion', 'elixir', 'scroll_fireball'], spells: ['lightning', 'fear', 'town_portal', 'cone_cold', 'paralyze', 'cure_wounds', 'holy_word', 'raise_dead', 'heroism', 'mass_heal'] },
  { id: 'fh_goods', name: '泉源雜貨', nameEn: 'Fountain Goods', kind: 'goods', town: 'fountainhead', stock: ['long_bow', 'splint', 'tower_shield', 'great_helm', 'cloak_warmth', 'ring_protection', 'amulet_life'] },
  { id: 'temple_fh', name: '泉源神殿', nameEn: 'Fountain Temple', kind: 'temple', town: 'fountainhead', stock: [], healCost: 50 },
  { id: 'inn_fh', name: '泉源旅店', nameEn: 'Fountain Inn', kind: 'inn', town: 'fountainhead', stock: [], restCost: 0 },
  { id: 'training_fh', name: '泉源訓練場', nameEn: 'Fountain Training', kind: 'training', town: 'fountainhead', stock: [] },
  // Wildabar
  { id: 'wb_smith', name: '荒野武器庫', nameEn: 'Wildabar Arms', kind: 'goods', town: 'wildabar', stock: ['great_sword', 'long_bow', 'flame_sword', 'frost_brand', 'thunder_mace'] },
  { id: 'wb_armor', name: '荒野防具行', nameEn: 'Wildabar Armor', kind: 'goods', town: 'wildabar', stock: ['plate', 'dragon_plate', 'tower_shield', 'great_helm', 'cloak_shadow', 'boots_speed', 'ring_wizardry', 'amulet_might'] },
  { id: 'temple_wb', name: '荒野神殿', nameEn: 'Wildabar Temple', kind: 'temple', town: 'wildabar', stock: [], healCost: 70 },
  { id: 'inn_wb', name: '荒野旅店', nameEn: 'Wildabar Inn', kind: 'inn', town: 'wildabar', stock: [], restCost: 0 },
  { id: 'training_wb', name: '荒野訓練場', nameEn: 'Wildabar Training', kind: 'training', town: 'wildabar', stock: [] },
];

// Backwards-compat: town NPC list helper (sorpigal default)
export const TOWN_NPCS = ['elder', 'herbalist', 'mage_apprentice', 'priest', 'townsfolk'];

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
