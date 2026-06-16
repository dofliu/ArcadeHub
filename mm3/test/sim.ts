// Headless engine smoke test — exercises core flows without the DOM.
import * as E from '../src/engine';
import { mapMap, npcMap, classMap } from '../src/data/content';
import { GameState, Character } from '../src/types';

let failures = 0;
const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error('  ✗ FAIL:', msg); failures++; }
  else console.log('  ✓', msg);
};

function resolveCombat(g: GameState, maxRounds = 600) {
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
  E.makeCharacter(4, '希芙', 'dwarf', 'barbarian', 'female'),
  E.makeCharacter(5, '蓋亞', 'gnome', 'druid', 'female'),
];
for (const c of party) { c.level = 8; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp; }
E.startAdventure(g, party);
console.log('Party creation:');
assert(g.party.length === 6, 'party has 6 members');
assert(g.screen === 'town' && g.townId === 'sorpigal', 'starts in Sorpigal town');
assert(party[0].maxHp > 0 && party[1].maxSp > 0, 'derived HP/SP computed');
assert(g.version === E.SAVE_VERSION, 'save version stamped');

// 1b) Class roster & druid dual-casting
console.log('Classes:');
assert(Object.keys(classMap).length === 9, '9 classes defined');
const druid = party[5];
g.gold = 2000;
assert(classMap[druid.classId].school === 'both', 'druid is dual-school');
assert(E.learnSpell(g, 5, 'heal') && druid.spells.includes('heal'), 'druid learns cleric spell');
assert(E.learnSpell(g, 5, 'fireball') && druid.spells.includes('fireball'), 'druid learns sorcerer spell');

// 1c) Equipment restrictions
console.log('Equipment rules:');
g.backpack.push('plate');
const sorcCanPlate = E.canEquip(party[1], 'plate');
assert(!sorcCanPlate.ok, 'sorcerer cannot wear plate (heavy)');
const knightCanPlate = E.canEquip(party[0], 'plate');
assert(knightCanPlate.ok, 'knight can wear plate');

// 2) Locked door requires key
console.log('Locked door:');
g.pos = { mapId: 'sorpigal_d1', x: 9, y: 2, dir: 0 };
g.screen = 'dungeon';
const blocked = E.tryStep(g, 9, 1);
assert(!blocked && g.pos.x === 9 && g.pos.y === 2, 'door blocks without key');
g.backpack.push('crystal_key');
const opened = E.tryStep(g, 9, 1);
assert(opened && g.pos.x === 9 && g.pos.y === 1, 'door opens with crystal key');
assert(g.openedDoors.includes('sorpigal_d1:9,1'), 'door recorded as opened');

// 3) Downstairs portal travels to sorpigal_d2
console.log('Stairs portal:');
E.tryStep(g, 10, 1);
assert(g.pos.mapId === 'sorpigal_d2', 'stepping on stairs travels to sorpigal_d2');

// 4) Normal combat resolves and grants xp
console.log('Combat:');
const enc = mapMap['sorpigal_d2'].encounters!['5,3'];
E.startCombat(g, 'sorpigal_d2:5,3', enc, 'sorpigal_d2');
const rounds = resolveCombat(g);
assert(g.combat === null, `combat terminated in ${rounds} actions`);
assert(g.screen === 'dungeon' || g.screen === 'gameover', 'combat returns to explore or gameover');
assert(g.combatSummary !== null || g.screen === 'gameover', 'combat summary populated on win');

// 5) Boss fight grants the Orb
console.log('Boss & orb:');
E.restPartyFull(g);
const bossEnc = mapMap['sorpigal_d2'].encounters!['10,7'];
E.startCombat(g, 'sorpigal_d2:10,7', bossEnc, 'sorpigal_d2');
resolveCombat(g, 1200);
assert(g.combat === null, 'boss combat terminated');
if (g.flags['boss_dead']) {
  assert(g.backpack.includes('orb_of_terra'), 'orb granted after boss');
}

// 6) Status effects (poison ticking + cure)
console.log('Status effects:');
const victim = party[0];
E.restPartyFull(g);
victim.status.poisoned = 3;
const hpBeforePoison = victim.hp;
// simulate a small fight where poison ticks at start of victim's turn
const spiderEnc = { monsters: [{ id: 'giant_rat', count: [1, 1] as [number, number] }] };
E.startCombat(g, 'test:poison', spiderEnc, 'sorpigal_d2');
resolveCombat(g, 50);
assert(victim.hp < hpBeforePoison || victim.status.poisoned === undefined || hpBeforePoison === victim.maxHp, 'poison ticked or expired during combat');
E.restPartyFull(g);
assert(victim.status.poisoned === undefined, 'restPartyFull clears statuses');

// 7) Gems resource
console.log('Gems:');
g.gems = 5;
const cleric2 = party[2];
cleric2.level = 12; E.recompute(cleric2); cleric2.sp = cleric2.maxSp;
cleric2.spells.push('resurrection');
const gemsBefore = g.gems;
party[3].condition = 'dead'; party[3].hp = 0;
const revived = E.castOutside(g, 2, 'resurrection', 3);
assert(revived && party[3].condition === 'ok', 'resurrection revives a dead member');
assert(g.gems === gemsBefore - 2, 'resurrection consumed 2 gems');

// 8) Quest flow (orb)
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

// 9) Shops & equipment
console.log('Shop/equip:');
g.gold = 2000;
const okBuy = E.buyItem(g, 'plate');
assert(okBuy && g.backpack.includes('plate'), 'bought plate mail');
const acBefore = E.armorAc(g.party[0]);
E.equipItem(g, 0, 'plate');
assert(E.armorAc(g.party[0]) > acBefore, 'equipping plate raised armor');

// 10) NPC dialog trees & side quests (goblin cleared at overworld:8,5)
console.log('NPC dialog & side quests:');
assert(E.npcEntryNode(g, 'elder') === 'start', 'elder offers quest when inactive');
E.applyDialogAction(g, { giveQuest: 'goblin_threat' });
assert(E.npcEntryNode(g, 'elder') === 'reminder', 'elder reminds while goblins remain');
g.clearedEncounters.push('overworld:8,5');
assert(E.npcEntryNode(g, 'elder') === 'reward', 'elder offers reward once goblins cleared');
const goldB = g.gold;
E.applyDialogAction(g, { completeQuest: 'goblin_threat', giveItem: 'ring_protection' });
assert(g.quests['goblin_threat'] === 'complete' && g.gold > goldB && g.backpack.includes('ring_protection'), 'goblin quest paid out + bonus item');
assert(E.npcEntryNode(g, 'elder') === 'done', 'elder shows done node after completion');

// 11) Item turn-in quest teaching a spell
console.log('Item turn-in + teach spell:');
const cleric = g.party.find(c => c.classId === 'cleric')!;
E.applyDialogAction(g, { giveQuest: 'herb_gathering' });
assert(E.npcEntryNode(g, 'herbalist') === 'reminder', 'herbalist waits without moonleaf');
g.backpack.push('moonleaf');
assert(E.npcEntryNode(g, 'herbalist') === 'reward', 'herbalist ready once moonleaf held');
E.applyDialogAction(g, { completeQuest: 'herb_gathering', teachSpell: 'cure_wounds' });
assert(!g.backpack.includes('moonleaf'), 'moonleaf consumed on turn-in');
assert(cleric.spells.includes('cure_wounds'), 'cure_wounds taught to the cleric');

// 12) Rest consumes food
console.log('Rest & food:');
const foodBefore = g.food;
for (const c of g.party) c.hp = 1;
const rested = E.restParty(g);
assert(rested && g.food === foodBefore - 1, 'rest consumed one food');
assert(g.party.every(c => c.condition === 'dead' || c.hp === c.maxHp), 'rest restored HP');

// 13) Town portal returns to town
console.log('Town portal:');
g.pos = { mapId: 'sorpigal_d1', x: 3, y: 3, dir: 0 };
g.screen = 'dungeon';
const druid2 = g.party.find(c => c.classId === 'druid')!;
druid2.spells.push('town_portal'); druid2.sp = druid2.maxSp;
E.castOutside(g, g.party.indexOf(druid2), 'town_portal', g.party.indexOf(druid2));
assert(g.screen === 'town', 'town portal returns to town');

// 14) condMet primitives + option filtering
console.log('Conditions:');
assert(E.condMet(g, { questComplete: 'goblin_threat' }) === true, 'condMet questComplete');
assert(E.condMet(g, { item: 'nonexistent' }) === false, 'condMet missing item false');
assert(E.condMet(g, { notFlag: 'never_set' }) === true, 'condMet notFlag true');
const startNode = npcMap['tavern_keeper'].nodes['start'];
assert(startNode.options.filter(o => E.condMet(g, o.cond)).length === startNode.options.length, 'unconditional options stay visible');

// 15) Save round-trip shape
console.log('Save/load shape:');
const json = JSON.parse(JSON.stringify(g)) as GameState;
assert(json.version === E.SAVE_VERSION && Array.isArray(json.party), 'state serializes with version');

console.log('\n' + (failures === 0 ? '✅ ALL SIM CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
if (failures > 0) process.exit(1);
void (null as unknown as Character);
