// ===== Might & Magic II tribute — shared type definitions =====

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
  | 'hire'
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

export type SpellSchool = 'sorcerer' | 'cleric';
export type EquipSlot = 'weapon' | 'armor' | 'shield' | 'helm' | 'accessory';
export type ItemType = 'weapon' | 'armor' | 'shield' | 'helm' | 'accessory' | 'consumable' | 'quest';

export interface Race {
  id: string;
  name: string;
  nameEn: string;
  mods: Partial<Attrs>;
  desc: string;
}

export interface ClassDef {
  id: string;
  name: string;
  nameEn: string;
  hitDie: number;       // HP per level contribution
  spDie: number;        // SP per level (0 = non-caster)
  school: SpellSchool | null;
  baseAttack: number;   // to-hit bonus growth
  startSpells: string[];
  desc: string;
  primary: AttrKey;     // key attribute
}

export interface Spell {
  id: string;
  name: string;
  nameEn: string;
  school: SpellSchool;
  level: number;
  cost: number;
  target: 'enemy' | 'allEnemies' | 'ally' | 'party' | 'self';
  kind: 'damage' | 'heal' | 'partyHeal' | 'buffAtk' | 'buffAc' | 'haste' | 'cureDead' | 'cure' | 'light' | 'sleep' | 'recall';
  power: number;
  element?: 'fire' | 'cold' | 'shock' | 'holy' | 'poison' | 'energy';
  usableOutside: boolean;
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
  heal?: number;          // consumable hp
  restore?: number;       // consumable sp
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
  spellId?: string;       // monster may cast
  resist?: Partial<Record<'fire' | 'cold' | 'shock' | 'holy' | 'poison' | 'energy', number>>;
  inflicts?: { poison?: number; paralyze?: number }; // chance (0..1) to inflict on a hit
  boss?: boolean;
  color: string;
  desc: string;
}

export interface Character {
  id: number;
  name: string;
  raceId: string;
  classId: string;
  level: number;
  xp: number;
  attrs: Attrs;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  condition: 'ok' | 'unconscious' | 'dead';
  equipment: Partial<Record<EquipSlot, string>>; // item def ids
  spells: string[];
  // transient combat flags
  blocking?: boolean;
  buffAtk?: number;
  buffAc?: number;
  buffSpeed?: number;
  status?: Status;
}

// Status ailments (turn counters).
export interface Status {
  poison?: number;
  sleep?: number;
  paralyze?: number;
}

// ----- Maps -----
export type Terrain = '#' | '.' | '~' | '^' | 'T' | 'D' | 'S'; // wall, floor, water, mountain, tree, door-area, special
export interface TileMap {
  id: string;
  name: string;
  nameEn: string;
  kind: 'overworld' | 'dungeon';
  level?: number;
  grid: string[];
  // interactive cells keyed by "x,y"
  encounters?: Record<string, EncounterDef>;
  chests?: Record<string, ChestDef>;
  doors?: Record<string, DoorDef>;
  portals?: Record<string, Portal>;   // step here to travel
  npcs?: Record<string, string>;      // cell -> npc id (overworld/town markers)
  traps?: Record<string, TrapDef>;    // "x,y" -> trap
  start?: { x: number; y: number; dir: Dir };
}

export interface TrapDef {
  damage: [number, number];
  text?: string;
}

export interface EncounterDef {
  monsters: { id: string; count: [number, number] }[];
  once?: boolean;
  boss?: boolean;
  bossItem?: string;   // item granted when this boss is defeated
  bossFlag?: string;   // flag set when this boss is defeated (default 'boss_dead')
  final?: boolean;     // winning this ends the game (victory screen)
}

export interface ChestDef {
  gold?: [number, number];
  items?: string[];
  trapped?: boolean;
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
  town?: string;        // town id when toScreen === 'town'
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
  teachSpell?: string;  // teach to first eligible caster
  openShop?: string;    // shop id
  heal?: boolean;       // temple/inn full heal
  finalBattle?: boolean;// start the endgame boss fight
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
  clearCell?: string;   // "mapId:x,y" encounter that must be cleared to turn in
  rewardGold: number;
  rewardXp: number;
}
export type QuestState = 'inactive' | 'active' | 'complete';

// ----- Shops -----
export interface ShopDef {
  id: string;
  name: string;
  nameEn: string;
  kind: 'goods' | 'magic' | 'temple' | 'inn';
  stock: string[];      // item ids sold
  spells?: string[];    // spell ids taught (magic guild)
}

// ----- Towns -----
export interface TownDef {
  id: string;
  name: string;
  nameEn: string;
  desc: string;
  shops: string[];      // shop ids available in this town
  npcs: string[];       // npc ids the player can talk to here
}

// ----- Combat -----
export interface CombatMonster {
  uid: number;
  defId: string;
  hp: number;
  maxHp: number;
  status?: Status;
}
export interface Combat {
  monsters: CombatMonster[];
  order: { side: 'party' | 'monster'; idx: number }[];
  turn: number;
  round: number;
  cell: string;
  mapId: string;
  boss: boolean;
  bossItem?: string;
  bossFlag?: string;
  final?: boolean;
  awaitingTarget: null | { kind: 'attack' | 'spell'; spellId?: string };
}

// ----- Whole game state -----
export interface GameState {
  screen: Screen;
  prevExplore: 'overworld' | 'dungeon';
  party: Character[];
  active: number;          // active character index for menus
  townId: string;          // current/last town id
  gold: number;
  food: number;
  day: number;
  backpack: string[];      // shared item ids
  pos: { mapId: string; x: number; y: number; dir: Dir };
  flags: Record<string, boolean>;
  quests: Record<string, QuestState>;
  clearedEncounters: string[]; // "mapId:x,y"
  lootedChests: string[];
  openedDoors: string[];
  triggeredTraps: string[];    // "mapId:x,y"
  combat: Combat | null;
  dialog: { npcId: string; node: string } | null;
  shopId: string | null;
  log: string[];
  messages: string[];      // transient toasts (top)
  sfx: string[];           // queued sound-effect event names (flushed by the UI)
  fx: CombatFx[];          // queued combat visual effects (flushed by the UI)
}

export interface CombatFx {
  kind: 'hit' | 'crit' | 'spell' | 'heal' | 'death' | 'partyhit' | 'lunge';
  side: 'monster' | 'party';
  idx: number;
  element?: string;
}
