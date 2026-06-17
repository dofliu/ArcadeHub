import { City, Faction, Officer, UnitType } from './types';

// ===========================================================================
// 群雄割據 scenario (~190 AD). All content lives here so the engine stays pure.
// buildScenario() returns fresh, mutable copies for a new game.
// ===========================================================================

interface CityDef {
  id: string; name: string; x: number; y: number; faction: string;
  agri: number; comm: number; pop: number; gold: number; food: number;
  troops: number; defense: number;
}

const CITY_DEFS: CityDef[] = [
  { id: 'ji', name: '薊', x: 660, y: 95, faction: 'gongsun', agri: 300, comm: 260, pop: 180000, gold: 1200, food: 9000, troops: 9000, defense: 70 },
  { id: 'ye', name: '鄴', x: 565, y: 205, faction: 'yuanshao', agri: 460, comm: 420, pop: 300000, gold: 2200, food: 16000, troops: 14000, defense: 80 },
  { id: 'pingyuan', name: '平原', x: 665, y: 235, faction: 'liubei', agri: 280, comm: 240, pop: 140000, gold: 900, food: 6000, troops: 5000, defense: 55 },
  { id: 'beihai', name: '北海', x: 775, y: 270, faction: 'kongrong', agri: 320, comm: 300, pop: 160000, gold: 1100, food: 8000, troops: 6000, defense: 60 },
  { id: 'chenliu', name: '陳留', x: 560, y: 305, faction: 'caocao', agri: 420, comm: 460, pop: 260000, gold: 2000, food: 13000, troops: 11000, defense: 72 },
  { id: 'luoyang', name: '洛陽', x: 470, y: 315, faction: 'dongzhuo', agri: 500, comm: 520, pop: 360000, gold: 3000, food: 20000, troops: 18000, defense: 88 },
  { id: 'changan', name: '長安', x: 330, y: 295, faction: 'dongzhuo', agri: 440, comm: 400, pop: 280000, gold: 2200, food: 15000, troops: 12000, defense: 82 },
  { id: 'xiliang', name: '西涼', x: 165, y: 235, faction: 'mateng', agri: 240, comm: 220, pop: 150000, gold: 1000, food: 7000, troops: 9000, defense: 64 },
  { id: 'wan', name: '宛', x: 470, y: 405, faction: 'yuanshu', agri: 360, comm: 340, pop: 200000, gold: 1500, food: 10000, troops: 9000, defense: 66 },
  { id: 'xiangyang', name: '襄陽', x: 450, y: 470, faction: 'liubiao', agri: 480, comm: 440, pop: 300000, gold: 2400, food: 17000, troops: 12000, defense: 78 },
  { id: 'jianye', name: '建業', x: 705, y: 475, faction: 'sunjian', agri: 420, comm: 480, pop: 260000, gold: 2300, food: 14000, troops: 11000, defense: 74 },
  { id: 'chengdu', name: '成都', x: 270, y: 475, faction: 'liuzhang', agri: 520, comm: 460, pop: 340000, gold: 2600, food: 19000, troops: 10000, defense: 80 },
  { id: 'hanzhong', name: '漢中', x: 345, y: 405, faction: 'zhanglu', agri: 320, comm: 280, pop: 160000, gold: 1200, food: 9000, troops: 8000, defense: 70 },
];

const EDGES: [string, string][] = [
  ['ji', 'ye'], ['ye', 'pingyuan'], ['ye', 'chenliu'], ['ye', 'luoyang'],
  ['pingyuan', 'beihai'], ['pingyuan', 'chenliu'], ['beihai', 'chenliu'], ['beihai', 'jianye'],
  ['chenliu', 'luoyang'], ['chenliu', 'wan'], ['chenliu', 'jianye'],
  ['luoyang', 'changan'], ['luoyang', 'wan'],
  ['changan', 'xiliang'], ['changan', 'hanzhong'],
  ['wan', 'xiangyang'], ['xiangyang', 'jianye'], ['xiangyang', 'chengdu'], ['xiangyang', 'hanzhong'],
  ['chengdu', 'hanzhong'],
];

interface FactionDef { id: string; ruler: string; color: string; ai: Faction['ai']; }
const FACTION_DEFS: FactionDef[] = [
  { id: 'gongsun', ruler: '公孫瓚', color: '#3b82f6', ai: 'aggressive' },
  { id: 'yuanshao', ruler: '袁紹', color: '#a855f7', ai: 'balanced' },
  { id: 'liubei', ruler: '劉備', color: '#22c55e', ai: 'balanced' },
  { id: 'kongrong', ruler: '孔融', color: '#14b8a6', ai: 'defensive' },
  { id: 'caocao', ruler: '曹操', color: '#2563eb', ai: 'aggressive' },
  { id: 'dongzhuo', ruler: '董卓', color: '#7f1d1d', ai: 'aggressive' },
  { id: 'mateng', ruler: '馬騰', color: '#f97316', ai: 'balanced' },
  { id: 'yuanshu', ruler: '袁術', color: '#eab308', ai: 'aggressive' },
  { id: 'liubiao', ruler: '劉表', color: '#dc2626', ai: 'defensive' },
  { id: 'sunjian', ruler: '孫堅', color: '#e11d48', ai: 'aggressive' },
  { id: 'liuzhang', ruler: '劉璋', color: '#92400e', ai: 'defensive' },
  { id: 'zhanglu', ruler: '張魯', color: '#8b5cf6', ai: 'defensive' },
];

// id, name, LED, WAR, INT, POL, CHA, faction, city, type
type OD = [string, string, number, number, number, number, number, string | null, string, UnitType];
const OFFICER_DEFS: OD[] = [
  // 公孫瓚
  ['gongsunzan', '公孫瓚', 82, 85, 62, 60, 70, 'gongsun', 'ji', 'cavalry'],
  ['zhaoyun', '趙雲', 91, 96, 76, 65, 81, 'gongsun', 'ji', 'cavalry'],
  ['gongsunyue', '公孫越', 68, 72, 50, 48, 55, 'gongsun', 'ji', 'cavalry'],
  // 袁紹
  ['yuanshao', '袁紹', 80, 70, 75, 78, 88, 'yuanshao', 'ye', 'infantry'],
  ['yanliang', '顏良', 84, 94, 48, 40, 60, 'yuanshao', 'ye', 'cavalry'],
  ['wenchou', '文醜', 83, 93, 46, 38, 58, 'yuanshao', 'ye', 'cavalry'],
  ['tianfeng', '田豐', 70, 40, 94, 88, 70, 'yuanshao', 'ye', 'infantry'],
  // 劉備
  ['liubei', '劉備', 78, 73, 75, 80, 99, 'liubei', 'pingyuan', 'infantry'],
  ['guanyu', '關羽', 95, 97, 75, 62, 92, 'liubei', 'pingyuan', 'infantry'],
  ['zhangfei', '張飛', 90, 98, 44, 30, 45, 'liubei', 'pingyuan', 'cavalry'],
  ['jianyong', '簡雍', 50, 35, 70, 76, 78, 'liubei', 'pingyuan', 'infantry'],
  // 孔融
  ['kongrong', '孔融', 55, 40, 80, 82, 84, 'kongrong', 'beihai', 'infantry'],
  ['taishici', '太史慈', 86, 92, 66, 58, 78, 'kongrong', 'beihai', 'archer'],
  // 曹操
  ['caocao', '曹操', 92, 78, 91, 94, 96, 'caocao', 'chenliu', 'cavalry'],
  ['xiahoudun', '夏侯惇', 89, 90, 64, 62, 78, 'caocao', 'chenliu', 'cavalry'],
  ['dianwei', '典韋', 80, 97, 36, 30, 62, 'caocao', 'chenliu', 'infantry'],
  ['xunyu', '荀彧', 72, 38, 95, 96, 86, 'caocao', 'chenliu', 'infantry'],
  ['guojia', '郭嘉', 68, 35, 98, 88, 82, 'caocao', 'chenliu', 'infantry'],
  // 董卓
  ['dongzhuo', '董卓', 82, 86, 60, 54, 40, 'dongzhuo', 'luoyang', 'cavalry'],
  ['lvbu', '呂布', 98, 100, 38, 26, 50, 'dongzhuo', 'luoyang', 'cavalry'],
  ['lijue', '李傕', 74, 80, 52, 44, 40, 'dongzhuo', 'changan', 'cavalry'],
  ['huaxiong', '華雄', 80, 89, 40, 34, 50, 'dongzhuo', 'changan', 'infantry'],
  ['jiaxu', '賈詡', 70, 42, 97, 84, 64, 'dongzhuo', 'luoyang', 'infantry'],
  // 馬騰
  ['mateng', '馬騰', 85, 88, 60, 58, 78, 'mateng', 'xiliang', 'cavalry'],
  ['machao', '馬超', 92, 97, 56, 42, 84, 'mateng', 'xiliang', 'cavalry'],
  ['pangde', '龐德', 87, 91, 64, 50, 70, 'mateng', 'xiliang', 'cavalry'],
  // 袁術
  ['yuanshu', '袁術', 65, 60, 58, 64, 60, 'yuanshu', 'wan', 'infantry'],
  ['jiling', '紀靈', 78, 85, 52, 46, 56, 'yuanshu', 'wan', 'infantry'],
  // 劉表
  ['liubiao', '劉表', 68, 55, 76, 80, 82, 'liubiao', 'xiangyang', 'infantry'],
  ['caomao', '蔡瑁', 70, 68, 60, 66, 50, 'liubiao', 'xiangyang', 'archer'],
  ['huangzhong', '黃忠', 90, 95, 62, 52, 76, null, 'xiangyang', 'archer'],     // 在野
  ['zhugeliang', '諸葛亮', 96, 50, 100, 98, 92, null, 'xiangyang', 'infantry'], // 在野
  // 孫堅
  ['sunjian', '孫堅', 88, 90, 70, 68, 86, 'sunjian', 'jianye', 'cavalry'],
  ['sunce', '孫策', 90, 92, 68, 64, 90, 'sunjian', 'jianye', 'cavalry'],
  ['huanggai', '黃蓋', 82, 84, 64, 60, 72, 'sunjian', 'jianye', 'infantry'],
  ['zhouyu', '周瑜', 94, 72, 96, 86, 92, null, 'jianye', 'archer'],            // 在野
  ['ganning', '甘寧', 85, 93, 60, 44, 70, null, 'jianye', 'archer'],           // 在野
  // 劉璋
  ['liuzhang', '劉璋', 50, 45, 58, 66, 60, 'liuzhang', 'chengdu', 'infantry'],
  ['yanyan', '嚴顏', 82, 84, 66, 58, 70, 'liuzhang', 'chengdu', 'infantry'],
  // 張魯
  ['zhanglu', '張魯', 58, 50, 70, 68, 72, 'zhanglu', 'hanzhong', 'infantry'],
  ['yangren', '楊任', 74, 78, 54, 48, 52, 'zhanglu', 'hanzhong', 'archer'],
];

export function buildScenario(): {
  cities: Record<string, City>;
  officers: Record<string, Officer>;
  factions: Record<string, Faction>;
  factionOrder: string[];
} {
  const cities: Record<string, City> = {};
  for (const d of CITY_DEFS) {
    cities[d.id] = {
      id: d.id, name: d.name, x: d.x, y: d.y, neighbors: [],
      faction: d.faction, gold: d.gold, food: d.food,
      agri: d.agri, comm: d.comm, order: 70, loyalty: 70, pop: d.pop,
      troops: d.troops, defense: d.defense, maxDefense: d.defense + 10, officers: [],
    };
  }
  for (const [a, b] of EDGES) {
    cities[a].neighbors.push(b);
    cities[b].neighbors.push(a);
  }

  const officers: Record<string, Officer> = {};
  for (const o of OFFICER_DEFS) {
    const [id, name, led, war, int, pol, cha, faction, city, type] = o;
    officers[id] = {
      id, name, led, war, int, pol, cha,
      faction, cityId: city, loyalty: faction ? 78 : 50,
      soldiers: 0, unitType: type, done: false,
    };
    cities[city].officers.push(id);
  }

  const factions: Record<string, Faction> = {};
  for (const d of FACTION_DEFS) {
    const rulerId = OFFICER_DEFS.find(o => o[7] === d.id)![0];
    factions[d.id] = {
      id: d.id, name: d.ruler + '軍', rulerId, color: d.color,
      isPlayer: false, alive: true, ai: d.ai, diplomacy: {},
    };
  }
  // Initialise neutral diplomacy.
  for (const a of Object.keys(factions))
    for (const b of Object.keys(factions))
      if (a !== b) factions[a].diplomacy[b] = 45;

  return { cities, officers, factions, factionOrder: FACTION_DEFS.map(f => f.id) };
}

export const SEASON_NAMES = ['春', '夏', '秋', '冬'];
