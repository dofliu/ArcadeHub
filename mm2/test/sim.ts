// Headless engine smoke test — exercises core flows without the DOM.
import * as E from '../src/engine';
import { mapMap, npcMap, HIRELINGS, classMap } from '../src/data/content';
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

// 1) Party creation — MM2 supports a party of 6
const g = E.newGame();
const party = [
  E.makeCharacter(0, '亞瑟', 'human', 'knight'),
  E.makeCharacter(1, '蘭斯', 'human', 'paladin'),
  E.makeCharacter(2, '梅林', 'elf', 'sorcerer'),
  E.makeCharacter(3, '愛蘭', 'gnome', 'cleric'),
  E.makeCharacter(4, '葛拉', 'half-orc', 'barbarian'),
  E.makeCharacter(5, '影', 'human', 'ninja'),
];
// Boost levels so the party can survive the slice deterministically
for (const c of party) { c.level = 8; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp; }
E.startAdventure(g, party);
console.log('Party creation:');
assert(g.party.length === 6, 'party has 6 members');
assert(g.screen === 'town', 'starts in town');
assert(party[0].maxHp > 0 && party[2].maxSp > 0, 'derived HP/SP computed');
assert(g.party[4].classId === 'barbarian' && g.party[5].classId === 'ninja', 'ninja & barbarian classes present');
assert(E.critChance(g.party[5]) > E.critChance(g.party[0]), 'ninja has higher crit than knight');

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

// 5) Boss fight grants the Orb of Time
console.log('Boss & orb:');
E.restPartyFull(g);
const bossEnc = mapMap['dungeon2'].encounters!['10,7'];
E.startCombat(g, 'dungeon2:10,7', bossEnc, 'dungeon2');
resolveCombat(g, 800);
assert(g.combat === null, 'boss combat terminated');
if (g.flags['boss_dead']) {
  assert(g.backpack.includes('orb_of_time'), 'orb of time granted after boss');
}

// 6) Quest flow
console.log('Quest:');
if (!g.backpack.includes('orb_of_time')) g.backpack.push('orb_of_time');
E.applyDialogAction(g, { giveQuest: 'orb_quest' });
assert(g.quests['orb_quest'] === 'active', 'quest activated');
assert(E.npcRootNode(g, 'tavern_keeper') === 'hasOrb', 'npc offers turn-in when holding orb');
const goldBefore = g.gold;
E.applyDialogAction(g, { completeQuest: 'orb_quest' });
assert(g.quests['orb_quest'] === 'complete', 'quest completed');
assert(g.gold > goldBefore, 'quest reward paid');
assert(!g.backpack.includes('orb_of_time'), 'orb consumed on turn-in');

// 7) Shops & equipment
console.log('Shop/equip:');
g.gold = 1000;
const okBuy = E.buyItem(g, 'plate');
assert(okBuy && g.backpack.includes('plate'), 'bought plate mail');
const acBefore = E.armorAc(g.party[0]);
E.equipItem(g, 0, 'plate');
assert(E.armorAc(g.party[0]) > acBefore, 'equipping plate raised armor');

// 8) NPC dialog trees & conditional entries (goblin side quest, no item turn-in)
console.log('NPC dialog & side quests:');
assert(E.npcEntryNode(g, 'elder') === 'start', 'elder offers quest when inactive');
E.applyDialogAction(g, { giveQuest: 'goblin_threat' });
assert(E.npcEntryNode(g, 'elder') === 'reminder', 'elder reminds while goblins remain');
g.clearedEncounters.push('overworld:7,6');
assert(E.npcEntryNode(g, 'elder') === 'reward', 'elder offers reward once goblins cleared');
const goldB = g.gold;
E.applyDialogAction(g, { completeQuest: 'goblin_threat', giveItem: 'ring_protection' });
assert(g.quests['goblin_threat'] === 'complete' && g.gold > goldB && g.backpack.includes('ring_protection'), 'goblin quest paid out + bonus item');
assert(E.npcEntryNode(g, 'elder') === 'done', 'elder shows done node after completion');

// 9) Item turn-in quest teaching a spell
console.log('Item turn-in + teach spell:');
E.applyDialogAction(g, { giveQuest: 'herb_gathering' });
assert(E.npcEntryNode(g, 'herbalist') === 'reminder', 'herbalist waits without moonleaf');
g.backpack.push('moonleaf');
assert(E.npcEntryNode(g, 'herbalist') === 'reward', 'herbalist ready once moonleaf held');
E.applyDialogAction(g, { completeQuest: 'herb_gathering', teachSpell: 'cure_wounds' });
assert(!g.backpack.includes('moonleaf'), 'moonleaf consumed on turn-in');
const taughtCure = g.party.some(c => classMap[c.classId].school === 'cleric' && c.spells.includes('cure_wounds'));
assert(taughtCure, 'cure_wounds taught to a cleric-school caster');

// 10) condMet primitives + option filtering
console.log('Conditions:');
assert(E.condMet(g, { questComplete: 'goblin_threat' }) === true, 'condMet questComplete');
assert(E.condMet(g, { item: 'nonexistent' }) === false, 'condMet missing item false');
assert(E.condMet(g, { notFlag: 'never_set' }) === true, 'condMet notFlag true');
const startNode = npcMap['tavern_keeper'].nodes['start'];
assert(startNode.options.filter(o => E.condMet(g, o.cond)).length === startNode.options.length, 'unconditional options stay visible');

// 11) MM2 hirelings (party up to 8)
console.log('Hirelings:');
g.gold = 1000;
const before = g.party.length;
assert(before === 6, 'party starts at 6 before hiring');
const okHire = E.recruitHireling(g, HIRELINGS[0]);
assert(okHire && g.party.length === before + 1, 'hireling joins the party');
assert(g.flags[`hired_${HIRELINGS[0].id}`] === true, 'hireling flagged as recruited');
assert(E.recruitHireling(g, HIRELINGS[0]) === false, 'cannot hire the same hireling twice');
E.recruitHireling(g, HIRELINGS[1]);
const okThird = E.recruitHireling(g, HIRELINGS[2]);
assert(!okThird || g.party.length <= E.MAX_PARTY, 'party never exceeds MAX_PARTY (8)');

// 12) Wizard Eye gates the automap
console.log('Wizard Eye:');
assert(!g.flags['wizard_eye'], 'automap hidden before Wizard Eye');
const mage = g.party.find(c => c.classId === 'sorcerer')!;
mage.spells.push('wizard_eye'); mage.sp = 20;
E.castOutside(g, g.party.indexOf(mage), 'wizard_eye', g.party.indexOf(mage));
assert(g.flags['wizard_eye'] === true, 'Wizard Eye reveals the automap');

console.log('\n' + (failures === 0 ? '✅ ALL SIM CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
if (failures > 0) process.exit(1);
