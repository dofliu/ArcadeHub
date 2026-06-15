// Headless engine smoke test — exercises core flows without the DOM.
import * as E from '../src/engine';
import { mapMap, npcMap, HIRELINGS, classMap, townMap } from '../src/data/content';
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
g.clearedEncounters.push('overworld:6,10');
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

// 13) Engine queues sound-effect events (flushed by the UI, not the engine)
console.log('Sound queue:');
const gs = E.newGame();
assert(gs.sfx.length === 0, 'new game has an empty sfx queue');
const solo = [E.makeCharacter(0, 'A', 'human', 'knight')];
for (const c of solo) { c.level = 8; E.recompute(c); c.hp = c.maxHp; }
E.startAdventure(gs, solo);
gs.pos = { mapId: 'dungeon1', x: 3, y: 3, dir: 1 };
gs.screen = 'dungeon';
E.tryStep(gs, 3, 4);
assert(gs.sfx.includes('step'), 'movement queues a "step" sfx event');

// 14) Milestone 2 — multi-town, second dungeon boss, new spells
console.log('Milestone 2 world:');
const m2 = E.newGame();
const p3 = [
  E.makeCharacter(0, 'A', 'human', 'knight'),
  E.makeCharacter(1, 'B', 'elf', 'sorcerer'),
  E.makeCharacter(2, 'C', 'gnome', 'cleric'),
];
for (const c of p3) { c.level = 14; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp; }
E.startAdventure(m2, p3);
// enter Atlantium via its overworld portal
m2.pos = { mapId: 'overworld', x: 16, y: 2, dir: 1 };
m2.screen = 'overworld';
E.enterCell(m2);
assert(m2.townId === 'atlantium' && m2.screen === 'town', 'stepping on Atlantium portal sets town');
assert(townMap['atlantium'].shops.includes('arcane_emporium'), 'Atlantium has its advanced magic shop');

// second dungeon boss drops its own artifact (sea_crown), not the orb
m2.screen = 'dungeon';
m2.pos = { mapId: 'caverns2', x: 9, y: 7, dir: 1 };
const seaEnc = mapMap['caverns2'].encounters!['10,7'];
E.startCombat(m2, 'caverns2:10,7', seaEnc, 'caverns2');
let guard = 0;
while (m2.combat && guard++ < 1200) {
  const a = E.currentActor(m2);
  if (!a) break;
  if (a.side === 'party') {
    const mi = E.firstAliveMonsterIdx(m2);
    if (mi < 0) break;
    E.combatAttack(m2, mi);
  } else break;
}
assert(m2.combat === null, 'sea serpent fight terminated');
if (m2.flags['boss2_dead']) {
  assert(m2.backpack.includes('sea_crown'), 'sea serpent drops the Crown of the Deep');
  assert(!m2.backpack.includes('orb_of_time'), 'second boss does not drop the first boss artifact');
}

// new spells: Town Portal (recall) and Mass Heal (partyHeal)
console.log('New spells:');
const m3 = E.newGame();
const sorc = E.makeCharacter(0, 'M', 'elf', 'sorcerer');
sorc.level = 10; E.recompute(sorc); sorc.sp = sorc.maxSp; sorc.spells.push('town_portal');
const prst = E.makeCharacter(1, 'H', 'human', 'cleric');
prst.level = 10; E.recompute(prst); prst.spells.push('mass_heal');
E.startAdventure(m3, [sorc, prst]);
m3.screen = 'dungeon'; m3.pos = { mapId: 'dungeon1', x: 3, y: 3, dir: 1 };
const okRecall = E.castOutside(m3, 0, 'town_portal', 0);
assert(okRecall && m3.screen === 'town', 'Town Portal returns the party to town');
sorc.hp = 1; prst.hp = 1; prst.sp = prst.maxSp;
E.castOutside(m3, 1, 'mass_heal', 1);
assert(sorc.hp > 1 && prst.hp > 1, 'Mass Heal restores the whole party');

// 15) Milestone 3 — more towns, bounties, ailments, endgame
console.log('Milestone 3 — towns & bounties:');
const w = E.newGame();
const wp = [E.makeCharacter(0, 'A', 'human', 'knight'), E.makeCharacter(1, 'B', 'gnome', 'cleric')];
for (const c of wp) { c.level = 20; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp; }
E.startAdventure(w, wp);
w.screen = 'overworld'; w.pos = { mapId: 'overworld', x: 9, y: 2, dir: 1 }; E.enterCell(w);
assert(w.townId === 'tundara' && w.screen === 'town', 'Tundara portal sets town');
w.screen = 'overworld'; w.pos = { mapId: 'overworld', x: 16, y: 11, dir: 1 }; E.enterCell(w);
assert(w.townId === 'vulcania', 'Vulcania portal sets town');
assert(townMap['tundara'] && townMap['vulcania'], 'four towns total');
// bounty quest readiness via clearCell
E.applyDialogAction(w, { giveQuest: 'bounty_drake' });
assert(E.npcEntryNode(w, 'vulcania_smith') === 'reminder', 'bounty waits before clear');
w.clearedEncounters.push('overworld:13,5');
assert(E.npcEntryNode(w, 'vulcania_smith') === 'reward', 'bounty ready once drake cleared');

console.log('Ailments:');
const a2 = E.newGame();
const cl = E.makeCharacter(0, 'C', 'human', 'cleric');
cl.level = 8; E.recompute(cl); cl.sp = cl.maxSp; cl.spells.push('cure_ailment');
E.startAdventure(a2, [cl]);
cl.status = { poison: 3, sleep: 2 };
E.castOutside(a2, 0, 'cure_ailment', 0);
assert(!cl.status?.poison && !cl.status?.sleep, 'Cure Ailment clears status');
cl.status = { poison: 2 };
a2.backpack.push('antidote');
E.useConsumable(a2, 'antidote', 0);
assert(!cl.status?.poison, 'Antidote clears poison');

console.log('Endgame:');
const e2 = E.newGame();
const heroes = [0, 1, 2, 3].map(i => E.makeCharacter(i, 'H' + i, 'human', i === 2 ? 'cleric' : 'knight'));
for (const c of heroes) { c.level = 40; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp; c.equipment.weapon = 'dragon_blade'; }
E.startAdventure(e2, heroes);
e2.quests['orb_quest'] = 'complete';
E.applyDialogAction(e2, { completeQuest: 'caverns_quest' });
assert(e2.flags['endgame_ready'] === true, 'endgame unlocks when both artifacts returned');
E.applyDialogAction(e2, { finalBattle: true });
assert(e2.combat !== null && e2.screen === 'combat', 'final battle starts');
let fg = 0;
while (e2.combat && fg++ < 4000) {
  const a = E.currentActor(e2);
  if (!a) break;
  if (a.side === 'party') { const mi = E.firstAliveMonsterIdx(e2); if (mi < 0) break; E.combatAttack(e2, mi); }
  else break;
}
assert(e2.combat === null, 'final battle terminates');
if (e2.flags['game_won']) {
  assert(e2.screen === 'victory', 'winning the final battle shows the victory screen');
}

// 16) Milestone 4 — Sky Temple dungeon, djinn boss, sky quest
console.log('Milestone 4 — Sky Temple:');
const sk = E.newGame();
const skp = [0, 1, 2, 3].map(i => E.makeCharacter(i, 'S' + i, 'human', i === 2 ? 'sorcerer' : 'knight'));
for (const c of skp) { c.level = 30; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp; c.equipment.weapon = 'storm_blade'; }
E.startAdventure(sk, skp);
// overworld portal to the sky temple
sk.screen = 'overworld'; sk.pos = { mapId: 'overworld', x: 9, y: 11, dir: 1 }; E.enterCell(sk);
assert(sk.pos.mapId === 'sky_temple1' && sk.screen === 'dungeon', 'Sky Temple portal enters the dungeon');
const djinnEnc = mapMap['sky_temple1'].encounters!['10,7'];
E.startCombat(sk, 'sky_temple1:10,7', djinnEnc, 'sky_temple1');
let sg = 0;
while (sk.combat && sg++ < 2000) {
  const a = E.currentActor(sk);
  if (!a) break;
  if (a.side === 'party') { const mi = E.firstAliveMonsterIdx(sk); if (mi < 0) break; E.combatAttack(sk, mi); }
  else break;
}
assert(sk.combat === null, 'storm djinn fight terminates');
if (sk.flags['djinn_dead']) assert(sk.backpack.includes('sky_shard'), 'storm djinn drops the Sky Shard');
// sky quest teaches lightning
const skm = E.newGame();
const astro = [E.makeCharacter(0, 'M', 'elf', 'sorcerer')];
astro[0].level = 12; E.recompute(astro[0]);
E.startAdventure(skm, astro);
E.applyDialogAction(skm, { giveQuest: 'sky_quest' });
skm.backpack.push('sky_shard');
assert(E.npcEntryNode(skm, 'astronomer') === 'reward', 'astronomer ready with the shard');
E.applyDialogAction(skm, { completeQuest: 'sky_quest', teachSpell: 'lightning' });
assert(astro[0].spells.includes('lightning'), 'sky quest teaches Lightning Bolt');

// 17) Milestone 6 — towns, equip restrictions, training, traps
console.log('Milestone 6:');
const m6 = E.newGame();
const m6p = [E.makeCharacter(0, 'K', 'human', 'knight'), E.makeCharacter(1, 'M', 'elf', 'sorcerer')];
for (const c of m6p) { c.level = 10; E.recompute(c); c.hp = c.maxHp; c.sp = c.maxSp; }
E.startAdventure(m6, m6p);
// new towns reachable via portals
m6.screen = 'overworld'; m6.pos = { mapId: 'overworld', x: 2, y: 7, dir: 1 }; E.enterCell(m6);
assert(m6.townId === 'murkmire' && m6.screen === 'town', 'Murkmire portal sets town');
m6.screen = 'overworld'; m6.pos = { mapId: 'overworld', x: 16, y: 4, dir: 1 }; E.enterCell(m6);
assert(m6.townId === 'cliffport', 'Cliffport portal sets town');
assert(townMap['murkmire'] && townMap['cliffport'], 'six towns total');

// equip restrictions
assert(E.equipReason('sorcerer', 'plate') !== null, 'sorcerer cannot wear plate');
assert(E.equipReason('knight', 'plate') === null, 'knight can wear plate');
assert(E.equipReason('sorcerer', 'dagger') === null, 'sorcerer can wield a dagger');
assert(E.equipReason('cleric', 'long_sword') !== null, 'cleric cannot wield a blade');
m6.backpack.push('plate');
E.equipItem(m6, 1, 'plate'); // sorcerer
assert(m6.party[1].equipment.armor !== 'plate', 'restricted item is not equipped');

// training raises an attribute for gold
const mightBefore = m6.party[0].attrs.might;
m6.gold = 5000;
E.trainAttr(m6, 0, 'might');
assert(m6.party[0].attrs.might === mightBefore + 1, 'training raises an attribute');

// trap damages the party
const tr = E.newGame();
const trp = [E.makeCharacter(0, 'A', 'human', 'knight')];
for (const c of trp) { c.level = 20; E.recompute(c); c.hp = c.maxHp; }
E.startAdventure(tr, trp);
tr.screen = 'dungeon'; tr.pos = { mapId: 'dungeon2', x: 3, y: 2, dir: 2 };
const hpBefore = tr.party[0].hp;
E.tryStep(tr, 3, 3); // trap cell
assert(tr.party[0].hp < hpBefore, 'stepping on a trap damages the party');
assert(tr.triggeredTraps.includes('dungeon2:3,3'), 'trap recorded as triggered');

console.log('\n' + (failures === 0 ? '✅ ALL SIM CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`));
if (failures > 0) process.exit(1);
