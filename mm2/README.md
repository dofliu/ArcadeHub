# Might & Magic II — Gates to Another World (Tribute)

A standalone, **data-driven first-person dungeon RPG** inspired by *Might and Magic II:
Gates to Another World* (the land of **CRON**). This is an **original** game built in the
style of the classic — it does not reuse any original assets, data, or content (which are
copyrighted). It lives as an independent sub-project, separate from the ArcadeHub mini-game
framework.

> Status: **Milestone 11 — feel & persistence.** Monster lunge animations, more detailed foe
> sprites, per-dungeon atmosphere (cavern crystals/drips, sky orbs/sparkles), and multi-slot
> saves with remembered display/sound settings. Content stays fully data-driven.

### Faithful-to-MM2 touches

- **Party of 6** adventurers, plus up to **2 hirelings** recruited in town (8 total).
- **Eight classes** — Knight, Paladin, Archer, Cleric, Sorcerer, Robber, **Ninja**, **Barbarian**.
- **No free automap** — you must cast **Wizard Eye** to reveal it (as in MM2).
- Set in **CRON**, starting town **Middlegate**; the villain is a corrupt Guardian (a nod to Sheltem).

## What's in Milestone 1

A complete playthrough loop exercising every major system:

1. **Party creation** — roll 6 adventurers, pick race & class (7 core attributes: Might,
   Intellect, Personality, Endurance, Speed, Accuracy, Luck).
2. **Town hub** (Middlegate) — Weapon Smith, Armorer, Magic Guild, Temple, Inn, the Tavern
   (quest-giver), and **Hire** for recruiting hirelings.
3. **Overworld** — a top-down tile region connecting town and dungeon.
4. **Dungeon** — first-person pseudo-3D grid crawler with **Wizard-Eye-gated automap**, wandering
   monsters, treasure chests, **locked doors that need a key**, and stairs between levels.
5. **Turn-based combat** — initiative by Speed; Attack / Cast / Block / Use / Run; monster AI.
6. **Spellbook** — Sorcerer & Cleric spells, usable in and out of combat.
7. **Inventory & equipment** — weapon/armor/shield/helm/accessory slots, buy & sell.
8. **Quests & flags**, plus **save/load** to `localStorage`.

### Sound & EGA visuals

- **Synthesized sound effects** (`src/sound.ts`) — no audio assets; Web Audio tones for
  steps, doors, chests, gold, attacks/crits/hits, spells, heals, hurt/down, level-ups,
  victory/defeat, recruiting, and more. The pure engine stays browser-free: it queues
  event names onto `GameState.sfx` and the UI flushes them. A mute toggle sits in the header.
- **EGA monster sprites** (`src/sprites.ts`) — first step of the EGA visual revival. Monsters
  in combat now render as hand-drawn 16-colour EGA pixel sprites (rat, kobold, goblin, spider,
  skeleton, orc, zombie, acolyte, and the boss), with a blob fallback for any not yet drawn.
  Sprites are pure data, so the rest of the bestiary — and later the dungeon/overworld tiles —
  can be EGA-ified step by step.

### Milestone 2 — world & systems expansion

- **Multi-town world (data-driven)** — towns are now a `TownDef` table. Two towns:
  **Middlegate** (starter) and **Atlantium** (advanced shops & high-tier spells). Adding a
  town is pure data; the hub renders its shops/NPCs from `townMap[townId]`.
- **A second 2-level dungeon** — the **Sunken Caverns**, gated by a Rune Key, ending in the
  **Sea Serpent** boss who guards the Crown of the Deep. Boss rewards/flags are now per-encounter
  (`bossItem`/`bossFlag`), so each boss drops its own artifact.
- **Bigger overworld** connecting both towns and both dungeons, with wilderness encounters.
- **~12 new monsters** (bandit, wolf, ghoul, harpy, ogre, gargoyle, troll, witch, dark knight,
  minotaur, fire drake, sea serpent), several with new EGA sprites.
- **~20 new items** — weapons (spear → dragon blade), armors (ring → dragon plate), shields,
  helms, rings/cloaks, and consumables (antidote, elixir, greater mana).
- **~12 new spells**, including utility: **Town Portal** (recall to town), **Mass Heal**
  (party heal), **Haste** (party speed/AC), plus Acid Spray, Energy Blast, Ice Storm, Meteor,
  Restore, Smite, Greater Protection, Sunray.
- **Two new quests** across Atlantium (Crown of the Deep, the Ancient Scroll) that grant gear
  and teach a spell.

### Quality-of-life

- **Combat keyboard shortcuts** — `A` attack, `D` defend, `S` spells, `I` items, `R` run, and
  number keys to pick a target/spell/item (`Esc` cancels). Targets/spells/items are numbered, and a
  shortcut hint shows in the action panel — fully playable without the mouse.
- The on-screen movement pad is hidden on desktop (arrow keys handle movement) so the message log
  has room; it still appears on touch screens.

### Milestone 11 — feel & persistence

- **Monster lunge** — a monster lunges forward (and scales up) as it attacks, on top of the
  existing struck-monster flash/knock.
- **More detailed foes** — added 16-wide original sprites for kobold, giant rat, ghoul, wolf and
  zombie (joining goblin/skeleton/orc), all with a fallback to the 12px set.
- **Per-dungeon atmosphere** — the Sunken Caverns get cyan crystal sconces, a bluish wash and
  water drips; the Sky Temple gets pale light orbs, a bright wash and drifting sparkles; Middlegate
  keeps flickering torches.
- **Multi-slot saves** — an autosave plus three manual slots, each showing the lead/day/gold/time;
  a Saves screen handles save/load/delete and the title's Continue loads the most recent slot.
- **Remembered settings** — VGA/EGA and sound preferences persist across sessions.

### Milestone 10 — animation & theming

- **Flickering torches** — flames and glow pulse over time via an ambient redraw loop that runs in
  the dungeon and in combat.
- **Combat hit reactions** — struck monsters flash white (gold on a crit) and jolt; spells flash in
  their element colour.
- **Per-dungeon stone palettes** — Middlegate is warm tan, the Sunken Caverns shift cold teal, the
  Sky Temple a pale cold blue; the combat chamber matches the dungeon you're fighting in.
- **Higher-resolution foes** — new 16-wide original sprites for goblin, skeleton and orc (with a
  fallback to the 12px set), sized by width for a consistent on-screen scale.

### Milestone 9 — visual polish

- **Wall torches** with warm additive glow light the dungeon and combat chambers.
- **Edge vignettes** focus the eye and add depth.
- **Outlined monster sprites** (1px dark silhouette) read more cleanly against the room.
- **Overworld** gets ground shadows under buildings, and the party marker is now the **party
  leader's EGA figure** standing on the tile (with a facing dot) instead of a plain triangle.

### Milestone 8 — VGA render

- **Dropped the lossy EGA pass** for the main scenes — it was pixelating and 16-colour-snapping
  everything into muddy gray. Scenes now render in full colour.
- **Dungeon** — warm torchlit stone: beveled brick front walls (highlight/shadow per brick),
  gradient-shaded receding side walls, and an alternating-band perspective floor/ceiling.
- **Combat** — a proper stone chamber (brick back wall + angled side walls + tiled floor), with
  **larger monster sprites** and ground shadows so they sit in the room.
- **Overworld** — richer terrain tiles (textured grass, waved water, snow-capped peaks, trees)
  and clearer markers (towns as buildings, dungeons as cave mouths).
- **VGA/EGA toggle** in the header (defaults to VGA). All art is still original procedural drawing.

### Milestone 7 — textured, framed backgrounds

- **Stone-brick dungeon** — the first-person view now renders original procedural brick walls
  (front faces + receding side trapezoids with mortar courses and joints), shaded by depth, over
  a perspective-tiled floor and ceiling that converge to a vanishing point — a more solid, 3D feel.
- **Framed viewport** — every scene gets an MM2-style bright double-line frame.
- **Combat room** — the battle backdrop is now a textured stone chamber (brick back wall + tiled
  floor) so monsters read as standing in a room, not floating on a gradient.
- All art is **original procedural drawing** — no copied sprites, textures, names or box art.

### Milestone 6 — combat FX, more towns & system depth

- **Combat visual effects** — the engine queues `CombatFx` events (hit/crit/spell/heal/death/
  party-hit) that the UI animates over the combat canvas with an rAF loop: impact bursts,
  element-coloured spell flashes, death puffs, and edge flashes when the party is hit or healed.
- **Two more towns** — Murkmire and Cliffport (six towns total), each with shops and a bounty
  quest, on the same overworld.
- **Equipment class restrictions** — sorcerers are limited to daggers/staves and light armour,
  clerics can't wield blades, heavy plate needs a fighter class. The sheet and shop disable
  items that a character can't use.
- **Training grounds** — a town service that permanently raises an attribute for gold
  (a gold sink), recomputing HP/SP.
- **Traps** — dungeon trap tiles and trapped chests damage the whole party.
- **Equipment/race-reactive figures** — the standing figures now retint by equipped armour and
  weapon and by race, so upgrades visibly change a character's look.

### Milestone 5 — MM2-style party interface

- **EGA standing figures** (`sprites.ts`) — an original humanoid template whose symbolic cells
  (skin / head / garb / trim / weapon / eye) are recoloured per class, giving each of the eight
  classes its own paper-doll figure.
- **Right-hand party roster** (`PartyPanel`) — the party moved from a bottom strip to a vertical
  right-side panel of portraits, each showing the figure, name/level/class, HP/SP and status,
  closer to the original game's layout. On narrow screens it wraps below the view. Clicking a
  portrait opens that character's sheet; the active combatant is highlighted.

### Milestone 4 — full EGA visuals & more content

- **Whole-screen EGA pass** (`render.ts`) — every scene (first-person dungeon, overworld,
  combat, title) runs through `egaPost`: a pixelation + nearest-colour snap to the 16-colour
  EGA palette, so the entire game shares one cohesive retro look (canvas also renders
  `pixelated`). Overworld tiles gained EGA-style detailing (grass speckle, water lines,
  snow-capped peaks).
- **Sky Temple** — a third dungeon reached from the southern overworld, guarded by the **Storm
  Djinn** boss (drops the Sky Shard). New monsters: giant bat, stone golem, storm elemental,
  storm djinn — all with EGA sprites. New gear (Storm Blade, Mithril Plate) and a new Atlantium
  quest (the Astronomer teaches Lightning Bolt).

### Milestone 3 — more towns, full EGA bestiary, ailments & endgame

- **Four towns** — added **Tundara** (frozen north) and **Vulcania** (volcanic forge) to
  Middlegate and Atlantium, on an enlarged overworld, each with shops, an NPC and a **bounty
  quest** (clear a wilderness encounter). Quest turn-ins generalised via `clearCell`.
- **Every monster now has an EGA sprite** — added bandit, harpy, gargoyle, fire drake, and the
  final boss Sheltem; the combat blob fallback is no longer used.
- **Status ailments** — **poison** (damage over time), **sleep** (skip turns, wakes on damage),
  and **paralyze** (skip turns). Monsters inflict them on hit (spider/ghoul poison, gargoyle &
  Sheltem paralyze); the Sleep spell now actually sleeps enemies; **Cure Ailment** + **Antidote**
  remove them; inn/temple/victory clear them. Status shows on the party bar and over monsters.
- **Endgame** — returning both artifacts unlocks the **Sheltem** confrontation from Middlegate's
  tavern; defeating him triggers the **victory screen** and an epilogue.

### NPC dialog trees & quest lines

A fully **data-driven dialog/quest system** (`src/data/content.ts`):

- **Conditional dialog** — every option and each NPC's entry node is gated by a `DialogCond`
  (held item, flag, quest state, cleared encounter). NPCs react to your progress.
- **Six town NPCs** with branching trees, plus a **Quest Log** (active/complete, hints,
  "ready to turn in" indicators).
- **Four quests** wired through the system:
  - *The Orb of Time* (main) — key → boss (the corrupt Guardian) → return the Orb.
  - *The Goblin Threat* — clear an overworld warband, rewarded by the Elder.
  - *Moonleaf Gathering* — fetch an item; the Herbalist teaches a cleric-school caster a new spell.
  - *The Lost Tome* — fetch an item; the Apprentice teaches your Sorcerer Fireball.
- Dialog actions: `giveQuest`, `completeQuest` (consumes a required item), `teachSpell`,
  `giveItem`, `giveGold`, `setFlag`, `openShop`, `heal`.

Adding a new NPC, quest, or branch is pure data — no engine changes required.

## Architecture

```
src/
  types.ts            All TypeScript interfaces (single source of truth)
  data/               Pure content tables (races, classes, spells, monsters, items, maps, npcs, quests)
  engine/             Pure game logic (party, world, combat, save) operating on a GameState draft
  render.ts           All canvas drawing (first-person, overworld, automap, combat scene)
  ui/                 React screens (Title, CreateParty, Explore, Combat, Town, Dialog, Sheets)
  main.tsx            Entry
```

The engine is intentionally separated from React: screens dispatch intents, pure reducers
produce the next `GameState`. Adding content = editing the `data/` tables.

## Run

```bash
cd mm2
npm install
npm run dev        # http://localhost:3200
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Roadmap (later milestones)

- More towns & overworld regions, day/night & travel
- Branching multi-stage quests & reputation
- Traps, levers and puzzle mechanisms
- Larger bestiary, conditions (poison/sleep/paralyze) & resistances
- Character training/leveling at the Inn, hirelings
