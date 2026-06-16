import { Pose } from './types';

// Pose library shared by every fighter. Coordinates are in the fighter's local
// space: origin at the feet centre, +x forward (facing direction), +y up.
// A fighter stands ~118px tall. Drawing derives shoulders from `chest` and
// hips from `pelvis`, so a pose only specifies these joints.

const base: Pose = {
  head: { x: 2, y: 116 }, chest: { x: 0, y: 90 }, pelvis: { x: 0, y: 52 },
  elbowF: { x: 12, y: 78 }, handF: { x: 16, y: 60 },
  elbowB: { x: -10, y: 78 }, handB: { x: -14, y: 60 },
  kneeF: { x: 9, y: 26 }, footF: { x: 12, y: 0 },
  kneeB: { x: -10, y: 26 }, footB: { x: -14, y: 0 },
};

// Helper: clone the base pose, then override selected joints.
const make = (overrides: Partial<Pose>): Pose => ({
  head: { ...base.head }, chest: { ...base.chest }, pelvis: { ...base.pelvis },
  elbowF: { ...base.elbowF }, handF: { ...base.handF },
  elbowB: { ...base.elbowB }, handB: { ...base.handB },
  kneeF: { ...base.kneeF }, footF: { ...base.footF },
  kneeB: { ...base.kneeB }, footB: { ...base.footB },
  ...overrides,
});

export const POSES: Record<string, Pose> = {
  idle: base,

  idle2: make({
    head: { x: 2, y: 114 }, chest: { x: 0, y: 88 },
    handF: { x: 16, y: 58 }, handB: { x: -14, y: 58 },
  }),

  walkF: make({
    pelvis: { x: 2, y: 50 },
    kneeF: { x: 16, y: 24 }, footF: { x: 22, y: 2 },
    kneeB: { x: -14, y: 22 }, footB: { x: -20, y: 0 },
    handF: { x: 18, y: 62 }, handB: { x: -12, y: 56 },
  }),

  walkB: make({
    pelvis: { x: -2, y: 50 },
    kneeF: { x: 4, y: 22 }, footF: { x: 6, y: 0 },
    kneeB: { x: -16, y: 24 }, footB: { x: -22, y: 2 },
    handF: { x: 14, y: 56 }, handB: { x: -16, y: 62 },
  }),

  crouch: make({
    head: { x: 4, y: 78 }, chest: { x: 2, y: 56 }, pelvis: { x: 0, y: 30 },
    elbowF: { x: 14, y: 46 }, handF: { x: 18, y: 36 },
    elbowB: { x: -10, y: 46 }, handB: { x: -12, y: 36 },
    kneeF: { x: 18, y: 16 }, footF: { x: 16, y: 0 },
    kneeB: { x: -18, y: 16 }, footB: { x: -16, y: 0 },
  }),

  jump: make({
    head: { x: 4, y: 108 }, chest: { x: 2, y: 84 }, pelvis: { x: 0, y: 50 },
    elbowF: { x: 14, y: 74 }, handF: { x: 20, y: 84 },
    elbowB: { x: -12, y: 74 }, handB: { x: -16, y: 82 },
    kneeF: { x: 14, y: 34 }, footF: { x: 8, y: 24 },
    kneeB: { x: -12, y: 34 }, footB: { x: -18, y: 22 },
  }),

  // --- Normals ---------------------------------------------------------------
  jab: make({
    chest: { x: 2, y: 90 },
    elbowF: { x: 24, y: 90 }, handF: { x: 40, y: 92 },
    handB: { x: -10, y: 64 },
  }),

  strongPunch: make({
    head: { x: 6, y: 114 }, chest: { x: 8, y: 88 }, pelvis: { x: 4, y: 50 },
    elbowF: { x: 28, y: 86 }, handF: { x: 48, y: 86 },
    elbowB: { x: -14, y: 80 }, handB: { x: -22, y: 70 },
    kneeF: { x: 16, y: 24 }, footF: { x: 22, y: 0 },
  }),

  lowKick: make({
    head: { x: 4, y: 78 }, chest: { x: 2, y: 56 }, pelvis: { x: -4, y: 30 },
    elbowF: { x: 12, y: 46 }, handF: { x: 10, y: 34 },
    elbowB: { x: -14, y: 48 }, handB: { x: -20, y: 40 },
    kneeF: { x: 26, y: 14 }, footF: { x: 46, y: 8 },
    kneeB: { x: -16, y: 16 }, footB: { x: -16, y: 0 },
  }),

  highKick: make({
    head: { x: -2, y: 112 }, chest: { x: -4, y: 86 }, pelvis: { x: -2, y: 48 },
    elbowF: { x: 6, y: 74 }, handF: { x: 2, y: 58 },
    elbowB: { x: -18, y: 76 }, handB: { x: -26, y: 64 },
    kneeF: { x: 26, y: 58 }, footF: { x: 50, y: 78 },
    kneeB: { x: -10, y: 24 }, footB: { x: -16, y: 0 },
  }),

  crouchKick: make({
    head: { x: 4, y: 76 }, chest: { x: 0, y: 54 }, pelvis: { x: -6, y: 28 },
    elbowF: { x: 10, y: 44 }, handF: { x: 6, y: 34 },
    elbowB: { x: -16, y: 46 }, handB: { x: -22, y: 38 },
    kneeF: { x: 22, y: 12 }, footF: { x: 44, y: 4 },
    kneeB: { x: -14, y: 14 }, footB: { x: -14, y: 0 },
  }),

  crouchPunch: make({
    head: { x: 4, y: 76 }, chest: { x: 2, y: 56 }, pelvis: { x: 0, y: 30 },
    elbowF: { x: 18, y: 52 }, handF: { x: 36, y: 54 },
    elbowB: { x: -10, y: 46 }, handB: { x: -12, y: 36 },
    kneeF: { x: 18, y: 16 }, footF: { x: 16, y: 0 },
    kneeB: { x: -18, y: 16 }, footB: { x: -16, y: 0 },
  }),

  jumpKick: make({
    head: { x: 6, y: 106 }, chest: { x: 4, y: 82 }, pelvis: { x: 0, y: 48 },
    elbowF: { x: 12, y: 72 }, handF: { x: 18, y: 80 },
    elbowB: { x: -12, y: 72 }, handB: { x: -16, y: 80 },
    kneeF: { x: 22, y: 36 }, footF: { x: 42, y: 28 },
    kneeB: { x: -10, y: 36 }, footB: { x: -16, y: 30 },
  }),

  // --- Specials --------------------------------------------------------------
  fireball: make({
    head: { x: 0, y: 110 }, chest: { x: -2, y: 86 }, pelvis: { x: -4, y: 48 },
    elbowF: { x: 18, y: 80 }, handF: { x: 36, y: 76 },
    elbowB: { x: 8, y: 82 }, handB: { x: 28, y: 70 },
    kneeF: { x: 12, y: 24 }, footF: { x: 18, y: 0 },
    kneeB: { x: -16, y: 24 }, footB: { x: -22, y: 0 },
  }),

  fireballWindup: make({
    head: { x: -4, y: 112 }, chest: { x: -6, y: 86 }, pelvis: { x: -2, y: 48 },
    elbowF: { x: -14, y: 78 }, handF: { x: -24, y: 70 },
    elbowB: { x: -16, y: 80 }, handB: { x: -26, y: 64 },
  }),

  uppercut: make({
    head: { x: 4, y: 124 }, chest: { x: 4, y: 96 }, pelvis: { x: 2, y: 56 },
    elbowF: { x: 12, y: 110 }, handF: { x: 16, y: 132 },
    elbowB: { x: -10, y: 84 }, handB: { x: -14, y: 70 },
    kneeF: { x: 16, y: 34 }, footF: { x: 14, y: 8 },
    kneeB: { x: -8, y: 30 }, footB: { x: -16, y: 0 },
  }),

  spinKick: make({
    head: { x: -4, y: 110 }, chest: { x: -2, y: 84 }, pelvis: { x: 0, y: 48 },
    elbowF: { x: 18, y: 86 }, handF: { x: 30, y: 92 },
    elbowB: { x: -18, y: 84 }, handB: { x: -30, y: 90 },
    kneeF: { x: 30, y: 50 }, footF: { x: 52, y: 56 },
    kneeB: { x: -12, y: 22 }, footB: { x: -18, y: 0 },
  }),

  super: make({
    head: { x: 2, y: 112 }, chest: { x: 0, y: 88 }, pelvis: { x: -4, y: 48 },
    elbowF: { x: 20, y: 82 }, handF: { x: 40, y: 80 },
    elbowB: { x: 12, y: 84 }, handB: { x: 32, y: 74 },
    kneeF: { x: 14, y: 24 }, footF: { x: 20, y: 0 },
    kneeB: { x: -18, y: 26 }, footB: { x: -24, y: 0 },
  }),

  // --- Reactions -------------------------------------------------------------
  block: make({
    head: { x: -4, y: 114 }, chest: { x: -4, y: 88 },
    elbowF: { x: 8, y: 84 }, handF: { x: 14, y: 100 },
    elbowB: { x: 2, y: 80 }, handB: { x: 8, y: 94 },
  }),

  crouchBlock: make({
    head: { x: 0, y: 76 }, chest: { x: -2, y: 56 }, pelvis: { x: 0, y: 30 },
    elbowF: { x: 8, y: 50 }, handF: { x: 14, y: 64 },
    elbowB: { x: 2, y: 48 }, handB: { x: 8, y: 60 },
    kneeF: { x: 18, y: 16 }, footF: { x: 16, y: 0 },
    kneeB: { x: -18, y: 16 }, footB: { x: -16, y: 0 },
  }),

  hit: make({
    head: { x: -10, y: 114 }, chest: { x: -8, y: 88 }, pelvis: { x: -2, y: 52 },
    elbowF: { x: -2, y: 80 }, handF: { x: 2, y: 96 },
    elbowB: { x: -18, y: 78 }, handB: { x: -24, y: 66 },
  }),

  crouchHit: make({
    head: { x: -8, y: 76 }, chest: { x: -6, y: 56 }, pelvis: { x: 0, y: 30 },
    elbowF: { x: -2, y: 48 }, handF: { x: 0, y: 60 },
    elbowB: { x: -16, y: 46 }, handB: { x: -22, y: 38 },
    kneeF: { x: 18, y: 16 }, footF: { x: 16, y: 0 },
    kneeB: { x: -18, y: 16 }, footB: { x: -16, y: 0 },
  }),

  launched: make({
    head: { x: -12, y: 118 }, chest: { x: -6, y: 90 }, pelvis: { x: 2, y: 54 },
    elbowF: { x: 6, y: 100 }, handF: { x: 14, y: 112 },
    elbowB: { x: -16, y: 96 }, handB: { x: -24, y: 104 },
    kneeF: { x: 18, y: 36 }, footF: { x: 28, y: 30 },
    kneeB: { x: -8, y: 34 }, footB: { x: -18, y: 40 },
  }),

  knockdown: make({
    head: { x: -34, y: 14 }, chest: { x: -18, y: 16 }, pelvis: { x: 4, y: 14 },
    elbowF: { x: -26, y: 8 }, handF: { x: -40, y: 6 },
    elbowB: { x: -24, y: 22 }, handB: { x: -38, y: 24 },
    kneeF: { x: 22, y: 18 }, footF: { x: 38, y: 14 },
    kneeB: { x: 20, y: 8 }, footB: { x: 36, y: 4 },
  }),

  victory: make({
    head: { x: 2, y: 118 }, chest: { x: 0, y: 92 },
    elbowF: { x: 10, y: 108 }, handF: { x: 8, y: 132 },
    elbowB: { x: -12, y: 80 }, handB: { x: -16, y: 64 },
  }),

  dizzy: make({
    head: { x: -2, y: 112 }, chest: { x: -2, y: 88 },
    elbowF: { x: 14, y: 74 }, handF: { x: 20, y: 58 },
    elbowB: { x: -14, y: 74 }, handB: { x: -20, y: 58 },
    kneeF: { x: 12, y: 24 }, footF: { x: 16, y: 0 },
    kneeB: { x: -14, y: 24 }, footB: { x: -18, y: 0 },
  }),
};
