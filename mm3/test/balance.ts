import * as E from '../src/engine';
import { mapMap } from '../src/data/content';

function party(level: number) {
  const p = [
    E.makeCharacter(0, 'A', 'human', 'knight'),
    E.makeCharacter(1, 'B', 'elf', 'sorcerer'),
    E.makeCharacter(2, 'C', 'human', 'cleric'),
    E.makeCharacter(3, 'D', 'dwarf', 'barbarian'),
    E.makeCharacter(4, 'E', 'half-orc', 'archer'),
    E.makeCharacter(5, 'F', 'gnome', 'druid'),
  ];
  // give level-appropriate spells & gear roughly
  for (const c of p) {
    c.level = level; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp;
    if (c.classId === 'sorcerer') c.spells.push('fireball', 'lightning', 'frostbite', 'meteor');
    if (c.classId === 'cleric') c.spells.push('cure_wounds', 'mass_heal', 'turn_undead', 'bless', 'holy_word');
    if (c.classId === 'druid') c.spells.push('fireball', 'heal', 'mass_heal');
    // endgame gear for high-level probes (simulates a kitted-out party)
    if (level >= 10) {
      if (c.classId === 'knight') { c.equipment.weapon = 'holy_avenger'; c.equipment.armor = 'dragon_plate'; c.equipment.shield = 'tower_shield'; }
      else if (c.classId === 'barbarian') { c.equipment.weapon = 'great_sword'; c.equipment.armor = 'dragon_plate'; }
      else if (c.classId === 'archer') { c.equipment.weapon = 'long_bow'; c.equipment.armor = 'chain'; }
      else { c.equipment.weapon = c.classId === 'cleric' ? 'thunder_mace' : 'flame_sword'; }
      c.equipment.accessory = 'amulet_might'; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp;
    }
  }
  return p;
}
function autoResolve(g: any) {
  let guard = 0;
  while (g.combat && guard++ < 3000) {
    const a = E.currentActor(g);
    if (!a) break;
    if (a.side === 'party') {
      const actor = g.party[a.idx];
      const lowest = g.party.filter((c: any) => c.condition === 'ok' && c.hp > 0).sort((x: any, y: any) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      const heal = lowest && lowest.hp / lowest.maxHp < 0.45;
      if (heal && actor.spells.includes('mass_heal') && actor.sp >= 14) E.combatCast(g, 'mass_heal', -1);
      else if (heal && actor.spells.includes('cure_wounds') && actor.sp >= 6) E.combatCast(g, 'cure_wounds', g.party.indexOf(lowest));
      else if (heal && actor.spells.includes('heal') && actor.sp >= 3) E.combatCast(g, 'heal', g.party.indexOf(lowest));
      else if (actor.spells.includes('fireball') && actor.sp >= 6) E.combatCast(g, 'fireball', -1);
      else { const mi = E.firstAliveMonsterIdx(g); if (mi < 0) break; E.combatAttack(g, mi); }
    } else break;
  }
}
function trial(lvl: number, mapId: string, cell: string, N = 200) {
  const enc = mapMap[mapId].encounters![cell];
  let wins = 0, cas = 0;
  for (let i = 0; i < N; i++) {
    const g = E.newGame(); E.startAdventure(g, party(lvl)); g.prevExplore = 'dungeon';
    g.gems = 20;
    E.startCombat(g, 't:' + i, enc, mapId); autoResolve(g);
    if (g.screen !== 'gameover') { wins++; cas += g.party.filter((c: any) => c.condition !== 'ok').length; }
  }
  return { win: wins / N, cas: cas / Math.max(1, wins) };
}

const rows: [string, number, string, string][] = [
  ['L4 vs sea-cave sahuagin', 4, 'sea_caves', '3,3'],
  ['L5 vs sea serpent+sahuagin', 5, 'sea_caves', '3,8'],
  ['L6 vs dragon whelp', 6, 'sea_caves', '6,9'],
  ['L7 vs troll', 7, 'sea_caves', '9,6'],
  ['L9 vs Kraken (boss)', 9, 'sea_caves', '9,9'],
  ['L1 vs cyclops-cave ogres', 1, 'cyclops_cave', '6,5'],
  ['L1 vs crypt wraiths', 1, 'crypt_d1', '8,5'],
  ['L4 vs cyclops-cave ogres', 4, 'cyclops_cave', '6,5'],
  ['L6 vs Cyclops (boss)', 6, 'cyclops_cave', '7,9'],
  ['L8 vs Lich King (boss)', 8, 'sorpigal_d2', '10,7'],
  ['L8 vs Wyvern (boss)', 8, 'crypt_d1', '7,9'],
  ['L12 vs Terra Guardian (boss)', 12, 'terra_core', '4,7'],
  ['L16 vs Terra Guardian (boss)', 16, 'terra_core', '4,7'],
];
for (const [label, lvl, map, cell] of rows) {
  const r = trial(lvl, map, cell);
  console.log(`${label.padEnd(32)} win ${(r.win * 100).toFixed(0).padStart(3)}%  cas/win ${r.cas.toFixed(1)}`);
}
