import { City, Faction, GameState, Officer, PendingBattle } from './types';
import { buildScenario, SEASON_NAMES } from './data';

// ===========================================================================
// Three Kingdoms strategy engine. Framework-free and deterministic-ish (uses
// Math.random for combat/events). The GameState is fully serialisable.
// Turn model: factions act in order; a season passes when the order wraps.
// ===========================================================================

export const MAX_TURNS = 200;

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function createGame(playerFaction: string): GameState {
  const { cities, officers, factions, factionOrder } = buildScenario();
  factions[playerFaction].isPlayer = true;
  const state: GameState = {
    cities, officers, factions,
    order: factionOrder, current: 0,
    year: 190, season: 0,
    playerFaction, phase: 'map',
    log: ['群雄割據 — 190年 春。亂世開幕，問鼎中原。'],
    battle: null, pending: null, winner: null, turnCount: 0,
  };
  // Ensure the player's faction acts first for a smooth opening.
  state.order = [playerFaction, ...factionOrder.filter(f => f !== playerFaction)];
  beginFactionTurn(state);
  return state;
}

// ---- Queries --------------------------------------------------------------

export const curFaction = (s: GameState) => s.order[s.current];
export const isPlayerTurn = (s: GameState) => curFaction(s) === s.playerFaction && s.phase === 'map';
export const factionCities = (s: GameState, fid: string) =>
  Object.values(s.cities).filter(c => c.faction === fid);
export const cityOfficers = (s: GameState, c: City) => c.officers.map(id => s.officers[id]);
export const armyCapacity = (offs: Officer[]) => offs.reduce((n, o) => n + o.led * 120, 0);

function log(s: GameState, msg: string) {
  s.log.unshift(msg);
  if (s.log.length > 60) s.log.pop();
}

// ---- Turn flow ------------------------------------------------------------

export function beginFactionTurn(s: GameState) {
  const fid = curFaction(s);
  const f = s.factions[fid];
  if (!f.alive) { return; }
  // Seasonal upkeep for this faction's cities.
  for (const c of factionCities(s, fid)) {
    c.gold += Math.round(c.comm * 0.4 * (c.order / 100)) + 30;
    if (s.season === 2) c.food += Math.round(c.agri * 2.2); // 秋 harvest
    const eat = Math.round(c.troops / 50);
    c.food -= eat;
    if (c.food < 0) {
      const loss = Math.min(c.troops, (-c.food) * 25);
      c.troops -= loss; c.food = 0; c.loyalty = clamp(c.loyalty - 6, 0, 100);
    }
    c.order = clamp(c.order + (c.order < 60 ? 1 : -1), 0, 100);
    c.loyalty = clamp(c.loyalty + (c.order > 55 ? 1 : -1), 0, 100);
  }
  // Reset this faction's officers for the new season.
  for (const o of Object.values(s.officers)) if (o.faction === fid) o.done = false;
}

// Advance to the next living faction (and roll the season when wrapping).
export function nextFaction(s: GameState) {
  if (s.winner) return;
  let guard = 0;
  do {
    s.current++;
    if (s.current >= s.order.length) {
      s.current = 0;
      s.season = ((s.season + 1) % 4) as GameState['season'];
      if (s.season === 0) s.year++;
      s.turnCount++;
      maybeEvent(s);
      checkWin(s);
    }
    guard++;
  } while (!s.factions[s.order[s.current]].alive && guard < 50);
  beginFactionTurn(s);
}

export function endPlayerTurn(s: GameState) {
  if (!isPlayerTurn(s)) return;
  nextFaction(s);
}

// ---- Internal-affairs commands (each consumes one officer's season) -------

function actor(s: GameState, officerId: string): { o: Officer; c: City } | null {
  const o = s.officers[officerId];
  if (!o || o.done || !o.cityId) return null;
  const c = s.cities[o.cityId];
  if (!c || c.faction !== o.faction) return null;
  return { o, c };
}

export function cmdDevelop(s: GameState, officerId: string, kind: 'agri' | 'comm' | 'order' | 'loyalty'): boolean {
  const a = actor(s, officerId); if (!a) return false;
  const { o, c } = a;
  if (c.gold < 40) return false;
  c.gold -= 40;
  const gain = Math.round(o.pol * 0.18 + ri(2, 8));
  if (kind === 'agri') c.agri = clamp(c.agri + gain, 0, 1000);
  else if (kind === 'comm') c.comm = clamp(c.comm + gain, 0, 1000);
  else if (kind === 'order') c.order = clamp(c.order + Math.round(gain * 0.6), 0, 100);
  else c.loyalty = clamp(c.loyalty + Math.round(gain * 0.6), 0, 100);
  o.done = true;
  return true;
}

export function cmdDraft(s: GameState, officerId: string, amount: number): boolean {
  const a = actor(s, officerId); if (!a) return false;
  const { o, c } = a;
  const cost = Math.round(amount / 8);
  if (amount <= 0 || c.gold < cost || c.pop < amount * 2) return false;
  c.gold -= cost; c.pop -= amount * 2;
  const eff = Math.round(amount * (0.7 + o.cha / 300));
  c.troops += eff;
  c.loyalty = clamp(c.loyalty - 2, 0, 100);
  o.done = true;
  return true;
}

export function cmdTrain(s: GameState, officerId: string): boolean {
  const a = actor(s, officerId); if (!a) return false;
  const { o, c } = a;
  c.defense = clamp(c.defense + Math.round(o.led * 0.05 + 1), 0, c.maxDefense);
  c.order = clamp(c.order + 1, 0, 100);
  o.done = true;
  return true;
}

export function cmdRecruit(s: GameState, officerId: string, targetId: string): boolean {
  const a = actor(s, officerId); if (!a) return false;
  const { o, c } = a;
  const t = s.officers[targetId];
  if (!t || t.faction !== null || t.cityId !== c.id) return false;
  const ruler = s.officers[s.factions[o.faction!].rulerId];
  const chance = clamp(20 + (o.cha + ruler.cha) / 4 - t.int / 6, 5, 92);
  o.done = true;
  if (ri(1, 100) <= chance) {
    t.faction = o.faction; t.loyalty = ri(60, 80);
    log(s, `${o.name} 成功招攬了 ${t.name}！`);
    return true;
  }
  log(s, `${o.name} 招攬 ${t.name} 失敗了…`);
  return false;
}

export function cmdDiplomacy(s: GameState, officerId: string, targetFaction: string): boolean {
  const a = actor(s, officerId); if (!a) return false;
  const { o, c } = a;
  if (c.gold < 100) return false;
  c.gold -= 100;
  const f = s.factions[o.faction!];
  const gain = Math.round(o.pol * 0.12 + ri(3, 10));
  f.diplomacy[targetFaction] = clamp((f.diplomacy[targetFaction] ?? 45) + gain, 0, 100);
  s.factions[targetFaction].diplomacy[o.faction!] =
    clamp((s.factions[targetFaction].diplomacy[o.faction!] ?? 45) + Math.round(gain * 0.6), 0, 100);
  o.done = true;
  log(s, `${o.name} 改善了與 ${s.factions[targetFaction].name} 的關係。`);
  return true;
}

// ---- Combat: launching an attack ------------------------------------------

export function canAttack(s: GameState, fromId: string, toId: string): boolean {
  const from = s.cities[fromId], to = s.cities[toId];
  if (!from || !to) return false;
  if (!from.neighbors.includes(toId)) return false;
  if (to.faction === from.faction) return false;
  return true;
}

// Build a PendingBattle by pulling an army out of the source city.
export function launchAttack(
  s: GameState, fromId: string, toId: string, officerIds: string[], soldiers: number,
): PendingBattle | null {
  const from = s.cities[fromId], to = s.cities[toId];
  if (!canAttack(s, fromId, toId)) return null;
  const offs = officerIds.map(id => s.officers[id]).filter(o => o && o.cityId === fromId && !o.done);
  if (offs.length === 0 || soldiers <= 0 || soldiers > from.troops) return null;
  const cap = armyCapacity(offs);
  const total = Math.min(soldiers, cap);
  from.troops -= total;
  const per = Math.floor(total / offs.length);
  const army = offs.map((o, i) => {
    o.done = true;
    const sld = i === offs.length - 1 ? total - per * (offs.length - 1) : per;
    o.soldiers = sld;
    return { officerId: o.id, soldiers: sld };
  });
  const pending: PendingBattle = { cityId: toId, attacker: from.faction!, defender: to.faction!, army };
  s.pending = pending;
  return pending;
}

export const battleInvolvesPlayer = (s: GameState, p: PendingBattle) =>
  p.attacker === s.playerFaction || p.defender === s.playerFaction;

// Abstract resolution for AI-vs-AI fights (no tactical map).
export function autoResolveBattle(s: GameState, p: PendingBattle) {
  const to = s.cities[p.cityId];
  const atkOffs = p.army.map(a => s.officers[a.officerId]);
  const defOffs = cityOfficers(s, to);
  const atkPow = p.army.reduce((n, a) => {
    const o = s.officers[a.officerId];
    return n + a.soldiers * (0.6 + (o.led * 0.6 + o.war * 0.4) / 250);
  }, 0) * (0.85 + Math.random() * 0.3);
  const defPow = (to.troops * (0.6 + defOffs.reduce((m, o) => Math.max(m, (o.led + o.war) / 250), 0.3))
    * (1 + to.defense / 160)) * (0.85 + Math.random() * 0.3) + 400;

  const attackerWon = atkPow > defPow;
  const ratio = attackerWon ? defPow / atkPow : atkPow / defPow;
  if (attackerWon) {
    const survivors = Math.max(1, Math.round(p.army.reduce((n, a) => n + a.soldiers, 0) * (0.4 + 0.4 * (1 - ratio))));
    applyConquest(s, p, true, survivors, atkOffs, defOffs);
  } else {
    const survivors = Math.max(0, Math.round(p.army.reduce((n, a) => n + a.soldiers, 0) * (0.3 * (1 - ratio))));
    applyConquest(s, p, false, survivors, atkOffs, defOffs);
    to.troops = Math.max(0, Math.round(to.troops * (0.5 + 0.3 * ratio)));
  }
  s.pending = null;
}

// Apply the outcome of a battle (used by both auto-resolve and tactical battle).
// attackerSurvivors = total surviving attacker soldiers.
export function applyConquest(
  s: GameState, p: PendingBattle, attackerWon: boolean,
  attackerSurvivors: number, atkOffs: Officer[], defOffs: Officer[],
) {
  const to = s.cities[p.cityId];
  const fromCity = factionCities(s, p.attacker)[0]; // a home city to retreat to
  for (const o of atkOffs) o.soldiers = 0;

  if (attackerWon) {
    const loser = to.faction!;
    log(s, `${s.factions[p.attacker].name} 攻陷了 ${to.name}！`);
    // Defending officers: captured -> may join, flee, or be released.
    for (const o of defOffs) {
      const joinChance = clamp(30 + s.officers[s.factions[p.attacker].rulerId].cha / 3 - o.loyalty / 3, 5, 80);
      if (ri(1, 100) <= joinChance) {
        o.faction = p.attacker; o.loyalty = ri(50, 70);
        log(s, `${o.name} 歸順了 ${s.factions[p.attacker].name}。`);
      } else {
        o.faction = null; // becomes a free officer in the captured city
        o.loyalty = 50;
      }
      o.soldiers = 0;
    }
    to.officers = [...defOffs.map(o => o.id)]; // remain as residents (some now free)
    // Move attacking officers into the captured city.
    for (const o of atkOffs) {
      if (o.cityId) s.cities[o.cityId].officers = s.cities[o.cityId].officers.filter(id => id !== o.id);
      o.cityId = to.id;
      if (!to.officers.includes(o.id)) to.officers.push(o.id);
    }
    to.faction = p.attacker;
    to.troops = attackerSurvivors;
    to.order = clamp(to.order - 20, 0, 100);
    to.loyalty = clamp(to.loyalty - 25, 0, 100);
    // Did the loser get eliminated?
    if (factionCities(s, loser).length === 0) eliminateFaction(s, loser);
  } else {
    log(s, `${s.factions[p.attacker].name} 對 ${to.name} 的攻勢被擊退。`);
    // Attackers retreat home with survivors.
    if (fromCity) {
      fromCity.troops += attackerSurvivors;
    }
  }
  checkWin(s);
}

function eliminateFaction(s: GameState, fid: string) {
  s.factions[fid].alive = false;
  log(s, `${s.factions[fid].name} 滅亡了。`);
  // Any remaining officers of that faction become free.
  for (const o of Object.values(s.officers)) if (o.faction === fid) { o.faction = null; o.loyalty = 50; }
}

export function checkWin(s: GameState) {
  const alive = Object.values(s.factions).filter(f => f.alive);
  if (alive.length === 1) {
    s.winner = alive[0].id;
    s.phase = 'gameover';
    log(s, `${alive[0].name} 統一了天下！`);
  } else if (s.turnCount >= MAX_TURNS) {
    // Largest realm wins on timeout.
    let best = alive[0];
    for (const f of alive) if (factionCities(s, f.id).length > factionCities(s, best.id).length) best = f;
    s.winner = best.id; s.phase = 'gameover';
  }
}

// ---- Random events --------------------------------------------------------

function maybeEvent(s: GameState) {
  if (Math.random() < 0.45) {
    const cities = Object.values(s.cities);
    const c = cities[ri(0, cities.length - 1)];
    const roll = Math.random();
    if (roll < 0.3) { c.food += Math.round(c.agri); log(s, `${c.name} 豐收，兵糧大增。`); }
    else if (roll < 0.55) { c.gold += 500; log(s, `${c.name} 商貿興盛，獲得資金。`); }
    else if (roll < 0.75) { const d = Math.round(c.troops * 0.1); c.troops -= d; c.loyalty = clamp(c.loyalty - 8, 0, 100); log(s, `${c.name} 發生疫病，兵力受損。`); }
    else { c.food = Math.max(0, c.food - Math.round(c.agri * 0.8)); log(s, `${c.name} 遭逢旱災，兵糧減少。`); }
  }
}

// ---- AI -------------------------------------------------------------------

// Runs the current (AI) faction's actions. Returns true if it triggered a
// battle that involves the player (the caller should switch to the battle UI).
// Idempotent across calls thanks to per-officer `done` flags.
export function runFactionAI(s: GameState): boolean {
  const fid = curFaction(s);
  const f = s.factions[fid];
  if (!f.alive || fid === s.playerFaction) return false;

  for (const c of factionCities(s, fid)) {
    const offs = cityOfficers(s, c).filter(o => o.faction === fid && !o.done);
    if (offs.length === 0) continue;

    // Consider attacking an adjacent enemy city.
    const targets = c.neighbors.map(id => s.cities[id]).filter(t => t.faction && t.faction !== fid);
    let attacked = false;
    if (targets.length && c.troops > 3500 && offs.length >= 1) {
      // Pick the weakest reachable enemy we likely beat, respecting alliances.
      targets.sort((a, b) =>
        (a.troops + a.defense * 50) - (b.troops + b.defense * 50));
      const tgt = targets[0];
      const rel = f.diplomacy[tgt.faction!] ?? 45;
      const enemyCities = factionCities(s, tgt.faction!).length;
      const myPow = c.troops * (1 + offs[0].led / 200);
      const enPow = tgt.troops * (1 + tgt.defense / 120) + 1500;
      const base = f.ai === 'aggressive' ? 0.95 : f.ai === 'balanced' ? 1.15 : 1.4;
      const mult = base * (enemyCities <= 1 ? 0.8 : 1); // press the advantage to finish off the weak
      if (rel < 70 && myPow > enPow * mult) {
        const leaders = offs.slice(0, Math.min(3, offs.length)).map(o => o.id);
        const send = Math.min(c.troops, Math.round(c.troops * 0.7));
        const pending = launchAttack(s, c.id, tgt.id, leaders, send);
        if (pending) {
          attacked = true;
          if (battleInvolvesPlayer(s, pending)) return true; // hand to player (defence)
          autoResolveBattle(s, pending);
        }
      }
    }
    if (attacked) continue;

    // Otherwise: develop / draft / recruit with each idle officer.
    for (const o of cityOfficers(s, c).filter(x => x.faction === fid && !x.done)) {
      const free = cityOfficers(s, c).find(x => x.faction === null);
      if (free && o.cha > 65 && Math.random() < 0.5) { cmdRecruit(s, o.id, free.id); continue; }
      if (c.gold > 400 && c.troops < 20000 && Math.random() < 0.45) { cmdDraft(s, o.id, 3000); continue; }
      const kinds: ('agri' | 'comm' | 'order' | 'loyalty')[] = ['agri', 'comm', 'order', 'loyalty'];
      cmdDevelop(s, o.id, kinds[ri(0, 3)]);
    }
  }
  return false;
}

export { SEASON_NAMES };
