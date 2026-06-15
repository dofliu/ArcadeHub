// ===== EGA pixel sprites for monsters (step 1 of the EGA visual revival). =====
// Authoring format: each sprite is an array of rows; each character is a palette
// index in hex (0-f), '.' = transparent. Add/edit sprites here — pure data.

// Classic 16-colour EGA palette.
export const EGA = [
  '#000000', '#0000AA', '#00AA00', '#00AAAA', // 0 black 1 blue 2 green 3 cyan
  '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA', // 4 red 5 magenta 6 brown 7 lgray
  '#555555', '#5555FF', '#55FF55', '#55FFFF', // 8 dgray 9 bblue a bgreen b bcyan
  '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF', // c bred d bmag e yellow f white
];

export const MONSTER_SPRITES: Record<string, string[]> = {
  giant_rat: [
    '............',
    '...8....8...',
    '...88..88...',
    '..8cc88cc8..',
    '..87788778..',
    '.8777777778.',
    '.8777777776.',
    '.8777777778.',
    '..87788778..',
    '...8....8...',
    '............',
    '............',
  ],
  kobold: [
    '............',
    '....6666....',
    '...6cccc6...',
    '...666666...',
    '....6666....',
    '...666666...',
    '..66666666..',
    '..6.6666.6..',
    '..6.6666.6..',
    '....6..6....',
    '...66..66...',
    '............',
  ],
  goblin: [
    '............',
    '...a....a...',
    '...aa..aa...',
    '...aaaaaa...',
    '..aaeaaeaa..',
    '..aaaaaaaa..',
    '..a2aaaa2a..',
    '...aaaaaa...',
    '..aa.aa.aa..',
    '.a..a..a..a.',
    '....a..a....',
    '............',
  ],
  cave_spider: [
    '............',
    '..5......5..',
    '...5....5...',
    '....5..5....',
    '...855558...',
    '..85cccc58..',
    '..85555558..',
    '...855558...',
    '....5..5....',
    '...5....5...',
    '..5......5..',
    '............',
  ],
  skeleton: [
    '....ffff....',
    '...ffffff...',
    '...f0ff0f...',
    '...ffffff...',
    '....f00f....',
    '.....ff.....',
    '..fffffffff.',
    '..f.f.f.f.f.',
    '..fffffffff.',
    '....f..f....',
    '...ff..ff...',
    '............',
  ],
  orc: [
    '............',
    '...222222...',
    '..22222222..',
    '..2c2222c2..',
    '..22222222..',
    '..2f2222f2..',
    '.6222222226.',
    '.6222222226.',
    '..22222222..',
    '...2....2...',
    '..22....22..',
    '............',
  ],
  zombie: [
    '............',
    '...266662...',
    '..26e66e62..',
    '..26666662..',
    '...266662...',
    '..26666662..',
    '.6266666626.',
    '.6.266662.6.',
    '...266662...',
    '...26..62...',
    '..26....62..',
    '............',
  ],
  dark_acolyte: [
    '....5555....',
    '...555555...',
    '..55cccc55..',
    '..55dddd55..',
    '...555555...',
    '..55555555..',
    '.5555555555.',
    '.5555555555.',
    '.5555555555.',
    '..55555555..',
    '..5......5..',
    '............',
  ],
  // Boss — 14 wide for extra presence.
  corrupt_guardian: [
    '......dd......',
    '....dd55dd....',
    '...d555555d...',
    '..d55bbbb55d..',
    '..d5bcccb5d...',
    '..d55bbbb55d..',
    '..d5555555d...',
    '.d555eeee555d.',
    '.d555eeee555d.',
    '.d5555555555d.',
    '..d55555555d..',
    '..8d5d55d5d8..',
    '..8.d....d.8..',
    '..88......88..',
  ],
  // ---- Milestone 2 monsters ----
  wolf: [
    '............',
    '....8.......',
    '...878......',
    '..87e78.....',
    '..877788....',
    '.8777777 8..',
    '.8777777778.',
    '.8777777778.',
    '..8.88.88...',
    '..8.88.88...',
    '............',
    '............',
  ],
  ghoul: [
    '............',
    '...2aa2.....',
    '..2acca2....',
    '..2aaaa2....',
    '...2aa2.....',
    '..2aaaa2....',
    '.2aaaaaa2...',
    '.2a2aa2a2...',
    '..2a..a2....',
    '..2a..a2....',
    '.22....22...',
    '............',
  ],
  ogre: [
    '............',
    '..666666....',
    '.66cccc66...',
    '.66666666...',
    '.66f66f66...',
    '.66666666...',
    '6666666666..',
    '.6666666666.',
    '.66666666...',
    '..66..66....',
    '.66....66...',
    '............',
  ],
  troll: [
    '............',
    '...2aa2.....',
    '..2acca2....',
    '..2aaaa2....',
    '...2aa2.....',
    '..2aaaa2....',
    '.2aaaaaa2...',
    '.2aaaaaa2...',
    '..2aaaa2....',
    '..2a..a2....',
    '.2a....a2...',
    '............',
  ],
  dark_knight: [
    '....8888....',
    '...811118...',
    '...8c11c8...',
    '...811118...',
    '....8118....',
    '..88811188..',
    '.8111111118.',
    '.8118811118.',
    '.8118.8118..',
    '..118.811...',
    '..88...88...',
    '............',
  ],
  witch: [
    '.....8......',
    '....888.....',
    '...88888....',
    '..8888888...',
    '...5dd5.....',
    '..5dccd5....',
    '..55dd55....',
    '..555555....',
    '.55555555...',
    '..5.55.5....',
    '..5....5....',
    '............',
  ],
  minotaur: [
    '..f......f..',
    '..f6....6f..',
    '...666666...',
    '..6cc66cc6..',
    '..66f66f66..',
    '...666666...',
    '..66666666..',
    '.6666666666.',
    '.66f6666f66.',
    '..66....66..',
    '.66......66.',
    '............',
  ],
  // Boss — 14 wide serpent
  sea_serpent: [
    '....bb........',
    '...b99b.......',
    '..b99999b.....',
    '..b9e9e9b.....',
    '..b999999b....',
    '...b9999b.....',
    '....b99bb.....',
    '.....b999b....',
    '......b99b....',
    '.....b99b.....',
    '....b99b......',
    '...b99b.......',
    '..b99b........',
    '..bb..........',
  ],
  // ---- Milestone 3 monsters ----
  bandit: [
    '............',
    '...6666.....',
    '..600006....',
    '..6e00e6....',
    '..666666....',
    '.66666666...',
    '.6.6666.6...',
    '.6.6666.6...',
    '...6..6.....',
    '..66..66....',
    '............',
    '............',
  ],
  harpy: [
    '............',
    '6..........6',
    '66...77...66',
    '.66.7777.66.',
    '..6.7ee7.6..',
    '..6.7777.6..',
    '...77777....',
    '...77777....',
    '....7.7.....',
    '...6...6....',
    '..6.....6...',
    '............',
  ],
  gargoyle: [
    '............',
    '8..8..8..8..',
    '.8.888.8.8..',
    '..888888....',
    '..8ccccc8...',
    '..8888888...',
    '.888888888..',
    '.8.88888.8..',
    '..8.888.8...',
    '...8...8....',
    '..88...88...',
    '............',
  ],
  fire_drake: [
    '............',
    '....cc......',
    '...c44c.....',
    '..c4ee4c....',
    '..c4444c....',
    '.c444444c...',
    'c44444444c..',
    '.c444444c...',
    '..c4444c....',
    '...c44c.....',
    '....cc.c....',
    '............',
  ],
  // Final boss — 14 wide
  sheltem: [
    '......ee......',
    '.....e44e.....',
    '....c4444c....',
    '...c4ffff4c...',
    '...c44444c4...',
    '..c4444444c...',
    '.c444444444c..',
    '.4c444444c4...',
    '.4.c4444c.4...',
    '..cc4444cc....',
    '...c4444c.....',
    '...c4..4c.....',
    '..cc....cc....',
    '..cc....cc....',
  ],
  // ---- Milestone 4 monsters (Sky Temple) ----
  giant_bat: [
    '............',
    '.d......d...',
    '.dd....dd...',
    '..dd..dd....',
    '..ddd5ddd...',
    '..d5ccc5d...',
    '...d555d....',
    '....555.....',
    '.....5......',
    '............',
    '............',
    '............',
  ],
  stone_golem: [
    '............',
    '..7777777...',
    '..7777777...',
    '..7888887...',
    '..7c888c7...',
    '..7888887...',
    '.777777777..',
    '.7.78887.7..',
    '.7.7888.7...',
    '...77.77....',
    '..77...77...',
    '............',
  ],
  storm_elemental: [
    '....bb......',
    '...b99b.....',
    '..b9bb9b....',
    '..b9ff9b....',
    '..b9999b....',
    '...b99b.....',
    '..b9bb9b....',
    '.b9b..b9b...',
    'b9b....b9b..',
    '.b......b...',
    '............',
    '............',
  ],
  // Sky Temple boss — 14 wide
  storm_djinn: [
    '......ee......',
    '.....b99b.....',
    '....b9999b....',
    '...b9ffff9b...',
    '...b99999b....',
    '..b9999999b...',
    '.b999999999b.',
    '.b999999999b.',
    '..b99999999b.',
    '...b9999999...',
    '....b99999....',
    '.....b999.....',
    '......b9......',
    '......b.......',
  ],
};

// Higher-resolution original sprites for the common foes (preferred over the
// 12px set when present). 16 wide, three shading tones each — my own pixel art.
export const DETAILED_SPRITES: Record<string, string[]> = {
  goblin: [
    '................',
    '...a........a...',
    '...2a......a2...',
    '....2aaaaaa2....',
    '...2aaaaaaaa2...',
    '..2aaaaaaaaaa2..',
    '..2aeaaaaaaea2..',
    '..2aaaaaaaaaa2..',
    '..2a0aaaaaa0a2..',
    '...2affffffa2...',
    '...22aaaaaa22...',
    '..2aa2aaaa2aa2..',
    '.2a2aa2aa2aa2a2.',
    '.2a..2aaaa2..a2.',
    '..2...2aa2...2..',
    '......2aa2......',
    '.....22..22.....',
    '................',
  ],
  skeleton: [
    '................',
    '.....ffff.......',
    '....ffffff......',
    '....f0ff0f......',
    '....ffffff......',
    '.....f00f.......',
    '.....ffff.......',
    '......ff........',
    '...f7ffff7f.....',
    '..f7f7ff7f7f....',
    '..7f7ffff7f7....',
    '..7f7ffff7f7....',
    '...7ffffff7.....',
    '....f7ff7f......',
    '....f.ff.f......',
    '...f..ff..f.....',
    '..ff..ff..ff....',
    '................',
  ],
  orc: [
    '................',
    '....266662......',
    '...26666662.....',
    '..2666666662....',
    '..26c66c6662....',
    '..2666666662....',
    '..26f6666f62....',
    '..2666666662....',
    '.86666666668....',
    '.86622266668....',
    '..8662226668....',
    '..2666666662....',
    '...26666662.....',
    '...266..662.....',
    '..266....662....',
    '..66......66....',
    '.266......662...',
    '................',
  ],
};

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  cx: number,
  baseY: number,
  px: number,
) {
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const x0 = Math.round(cx - (w * px) / 2);
  const y0 = Math.round(baseY - h * px);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const idx = parseInt(ch, 16);
      if (Number.isNaN(idx)) continue;
      ctx.fillStyle = EGA[idx];
      ctx.fillRect(x0 + x * px, y0 + y * px, px, px);
    }
  }
}

// Draw the sprite's silhouette in one colour (used for outlines/shadows).
export function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  cx: number,
  baseY: number,
  px: number,
  color: string,
) {
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const x0 = Math.round(cx - (w * px) / 2);
  const y0 = Math.round(baseY - h * px);
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      if (Number.isNaN(parseInt(ch, 16))) continue;
      ctx.fillRect(x0 + x * px, y0 + y * px, px, px);
    }
  }
}

// A single humanoid template; symbolic cells (K skin, H head/helm, C garb,
// D trim, W weapon, E eye) are recoloured per class — pure data.
const CHAR_TEMPLATE: string[] = [
  '.....HHHH...',
  '....HHHHHH..',
  '....HKKKKH..',
  '....KEKKEK..',
  '....KKKKKK..',
  '.....CCC...W',
  '...CCCCCCC.W',
  '..CCCCCCCC.W',
  '..DCCCCCCD.W',
  '..D.CCCC.D.W',
  '...CCCCCC...',
  '...CC..CC...',
  '...CC..CC...',
  '..DD....DD..',
  '............',
];

// Per-class palette: maps template symbols to EGA palette hex chars.
const CLASS_PALETTE: Record<string, Record<string, string>> = {
  //                 skin head garb trim weapon
  knight:    { K: '6', H: '7', C: '7', D: '8', W: 'f', E: '0' },
  paladin:   { K: '6', H: 'e', C: 'e', D: '6', W: '7', E: '0' },
  archer:    { K: '6', H: '6', C: '2', D: '2', W: '6', E: '0' },
  cleric:    { K: '6', H: 'e', C: 'f', D: '7', W: '6', E: '0' },
  sorcerer:  { K: '6', H: '5', C: '5', D: '1', W: '9', E: '0' },
  robber:    { K: '6', H: '8', C: '8', D: '0', W: '7', E: 'f' },
  ninja:     { K: '6', H: '0', C: '8', D: '0', W: '7', E: 'f' },
  barbarian: { K: '6', H: '6', C: '4', D: '6', W: '8', E: '0' },
};

// Skin tone by race.
const RACE_SKIN: Record<string, string> = { human: '6', elf: '7', dwarf: '6', gnome: '6', 'half-orc': '2' };

export function charSpriteRows(
  classId: string,
  opts?: { raceId?: string; weaponId?: string; armorId?: string },
): string[] {
  const pal = { ...(CLASS_PALETTE[classId] || CLASS_PALETTE['knight']) };
  // skin by race
  if (opts?.raceId && RACE_SKIN[opts.raceId]) pal.K = RACE_SKIN[opts.raceId];
  // garb tint by equipped armor (robes/cloth keep the class colour)
  const a = opts?.armorId || '';
  if (['plate', 'splint_mail', 'mithril_plate', 'dragon_plate'].includes(a)) { pal.C = '7'; pal.D = '8'; }
  else if (['chain', 'scale_mail', 'ring_mail'].includes(a)) { pal.C = '8'; pal.D = '7'; }
  else if (a === 'leather') { pal.C = '6'; pal.D = '8'; }
  // weapon colour by equipped weapon
  const w = opts?.weaponId || '';
  if (w.includes('bow') || w === 'crossbow') pal.W = '2';
  else if (w.includes('staff') || w.includes('wand')) pal.W = '6';
  else if (w === 'dagger') pal.W = '7';
  else if (w) pal.W = 'f';
  return CHAR_TEMPLATE.map(row =>
    row.split('').map(ch => (ch === '.' ? '.' : pal[ch] || ch)).join('')
  );
}
export const CHAR_W = CHAR_TEMPLATE[0].length;
export const CHAR_H = CHAR_TEMPLATE.length;
