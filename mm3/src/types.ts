// ===== Might & Magic III tribute — shared type definitions =====

export type Screen =
  | 'title'
  | 'create'
  | 'overworld'
  | 'dungeon'
  | 'combat'
  | 'town'
  | 'dialog'
  | 'shop'
  | 'sheet'
  | 'quests'
  | 'rest'
  | 'cast'
  | 'train'
  | 'saves'
  | 'victory'
  | 'gameover';

export type Dir = 0 | 1 | 2 | 3; // 0=N,1=E,2=S,3=W

// The seven classic attributes
export type AttrKey =
  | 'might'
  | 'intellect'
  | 'personality'
  | 'endurance'
  | 'speed'
  | 'accuracy'
  | 'luck';

export type Attrs = Record<AttrKey, number>;

export type Gender = 'male' | 'female';
export type Alignment = 'good' | 'neutral' | 'evil';

// schools: sorcerer (arcane), cleric (divine), both (druid), null (non-caster)
export type SpellSchool = 'sorcerer' | 'cleric';
export type CastSchool = SpellSchool | 'both' | null;
export type Element = 'fire' | 'cold' | 'electric' | 'poison' | 'energy' | 'magic' | 'holy';

export type EquipSlot = 'weapon' | 'armor' | 'shield' | 'helm' | 'accessory' | 'cloak' | 'boots';
export type ItemType = 'weapon' | 'armor' | 'shield' | 'helm' | 'accessory' | 'cloak' | 'boots' | 'consumable' | 'quest';

// transient status afflictions (value = rounds remaining; -1 = persists until cured/rest)
export type StatusEffect =
  | 'asleep'
  | 'afraid'
  | 'poisoned'
  | 'paralyzed'
  | 'cursed'
  | 'diseased'
  | 'blessed'
  | 'shielded'
  | 'hasted';

export type LifeState = 'ok' | 'unconscious' | 'dead';

// armor weight class for class restrictions
export type ArmorWeight = 'light' | 'medium' | 'heavy';

export interface Race {
  id: string;
  name: string;
  nameEn: string;
  mods: Partial<Attrs>;
  resist?: Partial<Record<Element, number>>;
  desc: string;
}

export interface ClassDef {
  id: string;
  name: string;
  nameEn: string;
  hitDie: number;       // HP per level contribution
  spDie: number;        // SP per level (0 = non-caster)
  school: CastSchool;
  baseAttack: number;   // to-hit bonus growth
  startSpells: string[];
  desc: string;
  primary: AttrKey;     // key attribute
  maxArmor: ArmorWeight;     // heaviest armor wearable
  canShield: boolean;
  critMult: number;     // crit chance helper (robber/ninja high)
  alignReq?: Alignment; // some classes restricted (none in our roster, reserved)
}

export interface Spell {
  id: string;
  name: string;
  nameEn: string;
  school: SpellSchool;
  level: number;
  cost: number;
  gemCost?: number;     // some powerful spells also cost gems
  target: 'enemy' | 'allEnemies' | 'ally' | 'party' | 'self';
  kind: 'damage' | 'heal' | 'buffAtk' | 'buffAc' | 'cureDead' | 'cureStatus' | 'light'
      | 'sleep' | 'fear' | 'poison' | 'paralyze' | 'haste' | 'shield' | 'bless'
      | 'town_portal' | 'fly' | 'lloyd';
  power: number;
  element?: Element;
  usableOutside: boolean;
  usableInside?: boolean; // some spells only outside (false default = both unless overridden)
  desc: string;
}

export interface ItemDef {
  id: string;
  name: string;
  nameEn: string;
  type: ItemType;
  slot?: EquipSlot;
  dmg?: [number, number]; // weapon damage min,max
  atkBonus?: number;
  acBonus?: number;
  value: number;
  twoHanded?: boolean;
  ranged?: boolean;
  weight?: ArmorWeight;       // for armor: weight class
  element?: Element;          // elemental weapon / damage type
  attrBonus?: Partial<Attrs>; // stat-boosting gear
  resist?: Partial<Record<Element, number>>;
  heal?: number;          // consumable hp
  restore?: number;       // consumable sp
  curesStatus?: StatusEffect[]; // consumable cures these
  charges?: number;       // wand / scroll charges
  castSpell?: string;     // consumable that casts a spell
  desc: string;
}

export interface MonsterDef {
  id: string;
  name: string;
  nameEn: string;
  hp: number;
  ac: number;
  attack: number;         // to-hit bonus
  dmg: [number, number];
  speed: number;
  xp: number;
  gold: [number, number];
  gems?: [number, number];
  spellId?: string;       // monster may cast
  inflicts?: { status: StatusEffect; chance: number; rounds: number }; // on melee hit
  resist?: Partial<Record<Element, number>>;
  family?: 'undead' | 'beast' | 'humanoid' | 'dragon' | 'demon' | 'elemental' | 'construct' | 'aberration';
  ranged?: boolean;
  boss?: boolean;
  size?: 'small' | 'normal' | 'large' | 'huge';
  color: string;
  color2?: string;
  sprite?: string;        // sprite kind for renderer
  desc: string;
}

export interface Character {
  id: number;
  name: string;
  raceId: string;
  classId: string;
  gender: Gender;
  alignment: Alignment;
  portraitId: number;     // index into portrait set for the race/gender
  level: number;
  xp: number;
  attrs: Attrs;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  ac?: number;            // cached, optional
  condition: LifeState;
  status: Partial<Record<StatusEffect, number>>;
  equipment: Partial<Record<EquipSlot, string>>; // item def ids
  spells: string[];
  skills?: string[];      // thievery, etc (reserved)
  // transient combat flags
  blocking?: boolean;
  buffAtk?: number;
  buffAc?: number;
  buffSpeed?: number;
}

// ----- Maps -----
// wall, floor, water, mountain, tree, door-area, special, grass, road, sand, lava, bridge
export type Terrain = '#' | '.' | '~' | '^' | 'T' | 'D' | 'S' | 'g' | 'r' | 's' | 'L' | 'b';
export interface TileMap {
  id: string;
  name: string;
  nameEn: string;
  kind: 'overworld' | 'dungeon';
  level?: number;
  region?: string;
  grid: string[];
  skyColor?: string;       // dungeon/overworld ambient tint
  // interactive cells keyed by "x,y"
  encounters?: Record<string, EncounterDef>;
  chests?: Record<string, ChestDef>;
  doors?: Record<string, DoorDef>;
  portals?: Record<string, Portal>;   // step here to travel
  npcs?: Record<string, string>;      // cell -> npc id (overworld/town markers)
  signs?: Record<string, string>;     // cell -> message shown on step
  events?: Record<string, MapEvent>;  // cell -> scripted event
  start?: { x: number; y: number; dir: Dir };
}

export interface MapEvent {
  text?: string;
  setFlag?: string;
  onceFlag?: string;     // only fires if this flag not set; sets it after
  giveItem?: string;
  giveGold?: number;
  damage?: [number, number]; // trap
  healParty?: boolean;       // fountain / shrine
  teachSpell?: string;
  attrBoost?: { attr: AttrKey; amount: number }; // permanent stat shrine
}

export interface EncounterDef {
  monsters: { id: string; count: [number, number] }[];
  once?: boolean;
  boss?: boolean;
  surprise?: boolean;
}

export interface ChestDef {
  gold?: [number, number];
  gems?: [number, number];
  items?: string[];
  trapped?: boolean;
  trapDmg?: [number, number];
}

export interface DoorDef {
  locked?: boolean;
  keyItem?: string;     // required item id to open
  flag?: string;        // set this flag when opened
  text?: string;
}

export interface Portal {
  toMap: string;
  to: { x: number; y: number; dir?: Dir };
  label?: string;
  toScreen?: Screen;    // e.g. entering town
  town?: string;        // town id when toScreen==='town'
  needFlag?: string;    // gated portal
}

// ----- NPC / Dialog / Quests -----
// A condition gate; every field present must hold (logical AND).
export interface DialogCond {
  item?: string;            // backpack has item
  notItem?: string;         // backpack lacks item
  flag?: string;            // flag is set
  notFlag?: string;         // flag is not set
  questActive?: string;     // quest is active
  questComplete?: string;   // quest is complete
  questInactive?: string;   // quest not yet started
  cleared?: string;         // "mapId:x,y" encounter cleared
  minGold?: number;
}

export interface DialogNode {
  id: string;
  text: string;
  options: DialogOption[];
}
export interface DialogOption {
  label: string;
  to?: string;          // next node id
  action?: DialogAction;
  cond?: DialogCond;    // only shown when condition holds
}
export interface DialogAction {
  giveQuest?: string;
  completeQuest?: string;
  setFlag?: string;
  giveItem?: string;
  giveGold?: number;
  takeGold?: number;
  giveGems?: number;
  teachSpell?: string;  // teach to first eligible caster
  trainLevel?: boolean; // level up eligible members (trainer)
  openShop?: string;    // shop id
  heal?: boolean;       // temple/inn full heal
  cure?: boolean;       // remove negative statuses
  end?: boolean;
}
export interface NPCEntry {
  cond: DialogCond;
  node: string;
}
export interface NPCDef {
  id: string;
  name: string;
  nameEn: string;
  root: string;         // fallback root dialog node id
  entries?: NPCEntry[]; // conditional entry points, first match wins
  nodes: Record<string, DialogNode>;
}

export interface QuestDef {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  hint?: string;
  giver?: string;       // npc id
  itemRequired?: string;// consumed on turn-in
  clearedRequired?: string; // "mapId:x,y" must be cleared
  rewardGold: number;
  rewardXp: number;
  rewardItem?: string;
  main?: boolean;       // main-story quest
}
export type QuestState = 'inactive' | 'active' | 'complete';

// ----- Shops -----
export interface ShopDef {
  id: string;
  name: string;
  nameEn: string;
  kind: 'goods' | 'magic' | 'temple' | 'inn' | 'training' | 'tavern' | 'blacksmith';
  town?: string;
  stock: string[];      // item ids sold
  spells?: string[];    // spell ids taught (magic guild)
  restCost?: number;
  healCost?: number;
}

// ----- Combat -----
export interface CombatMonster {
  uid: number;
  defId: string;
  hp: number;
  maxHp: number;
  status: Partial<Record<StatusEffect, number>>;
}
export interface Combat {
  monsters: CombatMonster[];
  order: { side: 'party' | 'monster'; idx: number }[];
  turn: number;
  round: number;
  cell: string;
  mapId: string;
  boss: boolean;
  surprise?: boolean;
  awaitingTarget: null | { kind: 'attack' | 'spell'; spellId?: string };
  fx?: CombatFx | null;     // last visual effect for renderer
}

export interface CombatFx {
  kind: 'hit' | 'crit' | 'spell' | 'heal' | 'death' | 'miss';
  targetSide: 'party' | 'monster';
  targetIdx: number;
  element?: Element;
  amount?: number;
  ttl: number;              // frames / ticks remaining (renderer animates)
}

// ----- Whole game state -----
export interface CombatSummary {
  xp: number;
  gold: number;
  gems: number;
  drops: string[];
  levelUps: string[];
  boss: boolean;
}

export interface GameState {
  version: number;
  screen: Screen;
  prevExplore: 'overworld' | 'dungeon';
  party: Character[];
  active: number;          // active character index for menus
  gold: number;
  gems: number;
  food: number;
  day: number;
  minutes: number;         // in-game clock
  townId: string;          // current town
  backpack: string[];      // shared item ids
  pos: { mapId: string; x: number; y: number; dir: Dir };
  flags: Record<string, boolean>;
  quests: Record<string, QuestState>;
  clearedEncounters: string[]; // "mapId:x,y"
  lootedChests: string[];
  openedDoors: string[];
  visitedMaps: string[];
  combat: Combat | null;
  combatSummary: CombatSummary | null;
  dialog: { npcId: string; node: string } | null;
  shopId: string | null;
  sign: string | null;     // transient sign/event text
  log: string[];
  messages: string[];      // transient toasts (top)
  settings: { music: boolean; sound: boolean };
}
