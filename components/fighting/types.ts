// Shared type definitions for the fighting game module.
// The engine is intentionally framework-free so it can be unit-tested and
// rendered by any front-end (mirrors the engine/render split used by MM2/MM3).

export type MoveType = 'normal' | 'special' | 'super' | 'throw';
export type HitHeight = 'high' | 'mid' | 'low' | 'overhead';

// A single 2D joint in a fighter's local space.
// Origin is the feet centre on the ground; +x points "forward" (the way the
// fighter is facing) and +y points up. Values are in fighter pixels.
export interface Joint { x: number; y: number; }

// A full body pose: a skeleton of named joints. Shoulders/hips are derived
// from chest/pelvis at draw time so a pose only needs these eleven points.
export interface Pose {
  head: Joint;
  chest: Joint;
  pelvis: Joint;
  elbowF: Joint; handF: Joint;   // front arm (nearer the camera/opponent)
  elbowB: Joint; handB: Joint;   // back arm
  kneeF: Joint; footF: Joint;    // front leg
  kneeB: Joint; footB: Joint;    // back leg
}

export interface HitBox { x: number; y: number; w: number; h: number; }

export interface ProjectileSpec {
  speed: number;
  w: number;
  h: number;
  yOffset: number;   // spawn height above feet
  damage: number;
  hitstun: number;
  blockstun: number;
  life: number;      // frames before it fizzles
  color: string;
  glow: string;
  super?: boolean;
}

export interface Move {
  name: string;
  type: MoveType;
  startup: number;     // frames before the hitbox is live
  active: number;      // frames the hitbox is live
  recovery: number;    // frames of vulnerable recovery
  damage: number;
  chip: number;        // damage dealt on block
  hitstun: number;     // frames the victim is stunned when hit
  blockstun: number;   // frames the victim is stunned when blocking
  hitHeight: HitHeight;
  // Hitbox in local space relative to feet centre, +x forward.
  hitbox: HitBox;
  knockback: { x: number; y: number };
  meterGain: number;   // meter the attacker earns when it lands
  meterCost: number;   // meter required to perform the move
  cancelable: boolean; // can be cancelled into specials/supers on hit
  launches: boolean;   // sends the victim airborne / knockdown
  startupPose: string;
  activePose: string;
  projectile?: ProjectileSpec;
  forwardMomentum?: number; // self-propulsion while active (e.g. spin kick)
  invulnStartup?: boolean;  // invulnerable during startup (anti-air uppercuts)
  airOnly?: boolean;
  groundOnly?: boolean;
  sfx?: 'hit' | 'special' | 'super' | 'whiff';
}

// A special-move input recipe in numpad notation, e.g. QCF = [2,3,6].
export interface Command {
  motion: number[];        // facing-relative numpad directions
  buttons: ('lp' | 'hp' | 'lk' | 'hk')[];
  move: string;            // key into the character's move table
  priority: number;        // higher wins when several commands match
}

export interface Character {
  id: string;
  name: string;
  title: string;
  // Palette used by the procedural sprite renderer.
  palette: {
    skin: string; skinShade: string;
    gi: string; giShade: string;     // outfit
    hair: string; accent: string;    // belt / gloves / trim
    aura: string;                    // super / fireball colour
  };
  walkSpeed: number;
  jumpStrength: number;
  maxHealth: number;
  moves: Record<string, Move>;
  commands: Command[];
}

export type FighterStateName =
  | 'idle' | 'walkF' | 'walkB' | 'crouch' | 'jump'
  | 'attack' | 'block' | 'crouchBlock'
  | 'hit' | 'crouchHit' | 'launched' | 'knockdown' | 'getup'
  | 'victory' | 'ko' | 'dizzy';

export interface Projectile {
  owner: 0 | 1;
  x: number; y: number;
  vx: number;
  spec: ProjectileSpec;
  life: number;
  hit: boolean;
}

export interface HitSpark {
  x: number; y: number;
  life: number; maxLife: number;
  kind: 'hit' | 'block' | 'super';
  color: string;
}

export interface RoundBanner {
  text: string;
  timer: number;
  big: boolean;
}
