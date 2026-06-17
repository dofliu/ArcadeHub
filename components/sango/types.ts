// Type definitions for the Three Kingdoms (三國志) strategy game.
// The engine is framework-free and the GameState is serialisable, following
// the data-driven pattern used by the MM2/MM3 sub-apps.

export type UnitType = 'infantry' | 'cavalry' | 'archer';
export type Season = 0 | 1 | 2 | 3; // 春 夏 秋 冬

export interface Officer {
  id: string;
  name: string;
  led: number;   // 統率 — army command / defence
  war: number;   // 武力 — melee strength
  int: number;   // 智力 — stratagems / defence vs stratagem
  pol: number;   // 政治 — development efficiency
  cha: number;   // 魅力 — recruiting / draft
  faction: string | null;  // owning faction id; null = free officer (在野)
  cityId: string | null;   // city where the officer resides
  loyalty: number;         // 忠誠 0..100
  soldiers: number;        // troops the officer is leading (0 when not in an army)
  unitType: UnitType;
  done: boolean;           // has acted this season
}

export interface City {
  id: string;
  name: string;
  x: number; y: number;       // position on the strategic map
  neighbors: string[];        // adjacent city ids (roads)
  faction: string | null;     // owner faction id
  gold: number;               // 資金
  food: number;               // 兵糧
  agri: number;               // 農業 (0..1000) -> food production
  comm: number;               // 商業 (0..1000) -> gold production
  order: number;              // 治安 (0..100)
  loyalty: number;            // 民忠 (0..100)
  pop: number;                // 人口
  troops: number;             // 守備兵 (garrison not led by a named officer)
  defense: number;            // 城防 (0..100)
  maxDefense: number;
  officers: string[];         // resident officer ids
}

export interface Faction {
  id: string;
  name: string;               // e.g. 曹操軍
  rulerId: string;
  color: string;
  isPlayer: boolean;
  alive: boolean;
  ai: 'aggressive' | 'balanced' | 'defensive';
  diplomacy: Record<string, number>; // relation to other factions (0..100)
}

export interface BattleUnit {
  officerId: string;
  side: 'atk' | 'def';
  x: number; y: number;
  hp: number; maxHp: number;   // troops
  type: UnitType;
  morale: number;              // 0..100, routs at 0
  moved: boolean;
  acted: boolean;
  fire: number;                // remaining burning turns
}

export type Terrain = 'plain' | 'forest' | 'mountain' | 'water' | 'wall' | 'gate' | 'castle';

export interface BattleState {
  w: number; h: number;
  tiles: Terrain[][];
  units: BattleUnit[];
  side: 'atk' | 'def';         // whose phase
  round: number;
  maxRounds: number;
  cityId: string;
  attacker: string;            // faction id
  defender: string;            // faction id
  defenderOfficers: string[];  // defender officer ids at battle start (for result)
  castle: { x: number; y: number };
  log: string[];
  result: 'atk' | 'def' | null;
  selected: number | null;     // index into units (player UI)
  reachable: { x: number; y: number }[];
  mode: 'move' | 'fire' | null;
  anim: BattleAnim | null;
}

export interface BattleAnim {
  kind: 'attack' | 'fire' | 'rout';
  x: number; y: number;
  tx?: number; ty?: number;
  timer: number;
  text?: string;
}

export interface PendingBattle {
  cityId: string;
  attacker: string;
  defender: string;
  army: { officerId: string; soldiers: number }[];
}

export type Phase = 'map' | 'battle' | 'gameover';

export interface GameState {
  cities: Record<string, City>;
  officers: Record<string, Officer>;
  factions: Record<string, Faction>;
  order: string[];             // faction turn order
  current: number;             // index into order
  year: number;
  season: Season;
  playerFaction: string;
  phase: Phase;
  log: string[];
  battle: BattleState | null;
  pending: PendingBattle | null;
  winner: string | null;
  turnCount: number;
}
