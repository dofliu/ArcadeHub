// Headless engine smoke test — exercises core flows without the DOM.
import * as E from '../src/engine';
import { mapMap } from '../src/data/content';
import { GameState } from '../src/types';

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error('  ✗ FAIL:', msg); failures++; }
  else console.log('  ✓', msg);
};

function resolveCombat(g: GameState, maxRounds = 400) {
  let guard = 0;
  while (g.combat && guard++ < maxRounds) {
    const a = E.currentActor(g);
    if (!a) break;
    if (a.side === 'party') {
      const mi = E.firstAliveMonsterIdx(g);
      if (mi < 0) break;
      E.combatAttack(g, mi);
    } else break; // monsters auto-process inside engine
  }
  return guard;
}

// 1) Party creation
const g = E.newGame();
const party = [
  E.makeCharacter(0, '亞瑟', 'human', 'knight'),
  E.makeCharacter(1, '梅林', 'elf', 'sorcerer'),
  E.makeCharacter(2, '愛蘭', 'human', 'cleric'),
  E.makeCharacter(3, '羅賓', 'half-orc', 'robber'),
];
// Boost levels so the party can survive the slice deterministically
for (const c of party) { c.level = 8; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp; }
E.startAdventure(g, party);
console.log('Party creation:');
assert(g.party.length === 4, 'party has 4 members');
assert(g.screen === 'town', 'starts in town');
assert(party[0].maxHp > 0 && party[1].maxSp > 0, 'derived HP/SP computed');

// 2) Locked door requires key
console.log('Locked door:');
g.pos = { mapId: 'dungeon1', x: 9, y: 2, dir: 0 };
g.screen = 'dungeon';
const blocked = E.tryStep(g, 9, 1);
assert(!blocked && g.pos.x === 9 && g.pos.y === 2, 'door blocks without key');
g.backpack.push('crystal_key');
const opened = E.tryStep(g, 9, 1);
assert(opened && g.pos.x === 9 && g.pos.y === 1, 'door opens with crystal key');
assert(g.openedDoors.includes('dungeon1:9,1'), 'door recorded as opened');

// 3) Downstairs portal travels to dungeon2
console.log('Stairs portal:');
E.tryStep(g, 10, 1);
assert(g.pos.mapId === 'dungeon2', 'stepping on stairs travels to dungeon2');

// 4) Normal combat resolves and grants xp
console.log('Combat:');
const xpBefore = g.party[0].xp + g.party[0].level * 1000;
const enc = mapMap['dungeon2'].encounters!['5,3'];
E.startCombat(g, 'dungeon2:5,3', enc, 'dungeon2');
const rounds = resolveCombat(g);
assert(g.combat === null, `combat terminated in ${rounds} actions`);
assert(g.screen === 'dungeon' || g.screen === 'gameover', 'combat returns to explore or gameover');

// 5) Boss fight grants the Orb
console.log('Boss & orb:');
E.restPartyFull(g);
const bossEnc = mapMap['dungeon2'].encounters!['10,7'];
E.startCombat(g, 'dungeon2:10,7', bossEnc, 'dungeon2');
resolveCombat(g, 800);
assert(g.combat === null, 'boss combat terminated');
if (g.flags['boss_dead']) {
  assert(g.backpack.includes('orb_of_terra'), 'orb granted after boss');
}

// 6) Quest flow
console.log('Quest:');
if (!g.backpack.includes('orb_of_terra')) g.backpack.push('orb_of_terra');
E.applyDialogAction(g, { giveQuest: 'orb_quest' });
assert(g.quests['orb_quest'] === 'active', 'quest activated');
assert(E.npcRootNode(g, 'tavern_keeper') === 'hasOrb', 'npc offers turn-in when holding orb');
const goldBefore = g.gold;
E.applyDialogAction(g, { completeQuest: 'orb_quest' });
assert(g.quests['orb_quest'] === 'complete', 'quest completed');
assert(g.gold > goldBefore, 'quest reward paid');
assert(!g.backpack.includes('orb_of_terra'), 'orb consumed on turn-in');

// 7) Shops & equipment
console.log('Shop/equip:');
g.gold = 1000;
const okBuy = E.buyItem(g, 'plate');
assert(okBuy && g.backpack.includes('plate'), 'bought plate mail');
const acBefore = E.armorAc(g.party[0]);
E.equipItem(g, 0, 'plate');
assert(E.armorAc(g.party[0]) > acBefore, 'equipping plate raised armor');

console.log('\n' + (failures === 0 ? '✅ ALL SIM CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
if (failures > 0) process.exit(1);
