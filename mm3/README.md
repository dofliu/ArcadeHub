# Might & Magic III — Isles of Terra (Tribute)

A standalone, **data-driven first-person dungeon RPG** inspired by *Might and Magic III:
Isles of Terra*. This is an **original** game built in the style of the classic — it does
not reuse any original assets, data, or content (which are copyrighted). It lives as an
independent sub-project, separate from the ArcadeHub mini-game framework.

> Status: **Milestone 1 — playable vertical slice.** The engine and all core systems are in
> place and content is data-driven, so the world can keep being expanded in later milestones.

## What's in Milestone 1

A complete playthrough loop exercising every major system:

1. **Party creation** — roll 4 adventurers, pick race & class (7 core attributes: Might,
   Intellect, Personality, Endurance, Speed, Accuracy, Luck).
2. **Town hub** (Sorpigal) — Weapon Smith, Armorer, Magic Guild, Temple, Inn, and the Tavern
   where you pick up a quest.
3. **Overworld** — a top-down tile region connecting town and dungeon.
4. **Dungeon** — first-person pseudo-3D grid crawler with automap, wandering monsters,
   treasure chests, **locked doors that need a key**, and stairs between levels.
5. **Turn-based combat** — initiative by Speed; Attack / Cast / Block / Use / Run; monster AI.
6. **Spellbook** — Sorcerer & Cleric spells, usable in and out of combat.
7. **Inventory & equipment** — weapon/armor/shield/helm/accessory slots, buy & sell.
8. **Quests & flags**, plus **save/load** to `localStorage`.

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
cd mm3
npm install
npm run dev        # http://localhost:3100
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

## Roadmap (later milestones)

- More towns & overworld regions, day/night & travel
- NPC dialog trees & branching quest lines
- Traps, levers and puzzle mechanisms
- Larger bestiary, conditions (poison/sleep/paralyze) & resistances
- Character training/leveling at the Inn, hirelings
