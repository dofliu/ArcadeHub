# Might & Magic II — Gates to Another World (Tribute)

A standalone, **data-driven first-person dungeon RPG** inspired by *Might and Magic II:
Gates to Another World* (the land of **CRON**). This is an **original** game built in the
style of the classic — it does not reuse any original assets, data, or content (which are
copyrighted). It lives as an independent sub-project, separate from the ArcadeHub mini-game
framework.

> Status: **Milestone 1 — playable vertical slice.** The engine and all core systems are in
> place and content is data-driven, so the world can keep being expanded in later milestones.

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
