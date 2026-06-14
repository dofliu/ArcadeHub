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
