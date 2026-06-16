import React from 'react';
import { Character, GameState, StatusEffect } from '../types';
import { classMap, raceMap } from '../data/content';
import { PortraitOf } from './portraits';

export const Btn: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'gold' | 'danger';
  className?: string;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, variant = 'ghost', className = '', title, children }) => {
  const styles: Record<string, string> = {
    primary: 'bg-mm-arcane hover:bg-violet-500 text-white border-violet-400',
    gold: 'bg-mm-gold/20 hover:bg-mm-gold/40 text-mm-gold border-mm-gold/60',
    danger: 'bg-mm-blood/30 hover:bg-mm-blood/50 text-red-200 border-red-500/60',
    ghost: 'bg-mm-panel hover:bg-mm-edge text-mm-light border-mm-edge',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1.5 rounded-md border text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Panel: React.FC<{ title?: string; className?: string; children: React.ReactNode }> = ({ title, className = '', children }) => (
  <div className={`bg-mm-panel/90 border border-mm-edge rounded-lg p-3 ${className}`}>
    {title && <div className="font-rune text-mm-gold text-sm mb-2 tracking-wide">{title}</div>}
    {children}
  </div>
);

export const Bar: React.FC<{ value: number; max: number; color: string; icon?: React.ReactNode; height?: string }> = ({ value, max, color, icon, height = 'h-1.5' }) => (
  <div className="flex items-center gap-1">
    {icon}
    <div className={`flex-1 ${height} bg-black/50 rounded overflow-hidden`}>
      <div className={`h-full ${color} transition-all`} style={{ width: `${max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%` }} />
    </div>
  </div>
);

export const charLabel = (c: Character, en = false) =>
  `${c.name}・${en ? classMap[c.classId].nameEn : classMap[c.classId].name}`;

// status effect badges
const STATUS_ICON: Partial<Record<StatusEffect, { c: string; t: string }>> = {
  poisoned: { c: 'text-green-400', t: '毒' },
  diseased: { c: 'text-lime-600', t: '疫' },
  asleep: { c: 'text-blue-300', t: '眠' },
  paralyzed: { c: 'text-yellow-300', t: '痺' },
  afraid: { c: 'text-purple-300', t: '懼' },
  blessed: { c: 'text-amber-300', t: '祝' },
  shielded: { c: 'text-cyan-300', t: '盾' },
  hasted: { c: 'text-pink-300', t: '速' },
};
export const StatusBadges: React.FC<{ ch: Character }> = ({ ch }) => {
  const keys = (Object.keys(ch.status) as StatusEffect[]).filter(k => ch.status[k]);
  if (keys.length === 0) return null;
  return (
    <div className="flex gap-0.5 flex-wrap">
      {keys.map(k => STATUS_ICON[k] && (
        <span key={k} className={`text-[8px] leading-none px-0.5 rounded bg-black/50 ${STATUS_ICON[k]!.c}`}>{STATUS_ICON[k]!.t}</span>
      ))}
    </div>
  );
};

// ===== Bottom party roster (MM3-style portrait cards) =====
export const PartyRoster: React.FC<{
  g: GameState;
  active?: number;
  highlight?: number;
  onSelect?: (i: number) => void;
}> = ({ g, active, highlight, onSelect }) => (
  <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 w-full">
    {g.party.map((c, i) => {
      const down = c.condition !== 'ok' || c.hp <= 0;
      const dead = c.condition === 'dead';
      return (
        <button
          key={i}
          onClick={() => onSelect?.(i)}
          className={`relative text-left rounded-md border transition overflow-hidden ${
            down ? 'opacity-50 border-mm-edge bg-black/40'
              : highlight === i ? 'border-mm-neon bg-mm-neon/10 shadow-[0_0_12px_rgba(76,201,240,0.5)]'
              : active === i ? 'border-mm-gold bg-mm-gold/10'
              : 'border-[#46402f] bg-gradient-to-b from-[#2a2419] to-[#191420] hover:border-mm-gold/60'
          }`}
          style={{ boxShadow: 'inset 0 1px 2px rgba(255,240,200,0.08)' }}
        >
          <div className="flex gap-1.5 p-1.5">
            <div className="shrink-0 rounded border border-[#14100a] overflow-hidden self-start">
              <PortraitOf ch={c} size={40} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-center gap-1">
                <span className="font-bold text-mm-light text-[11px] truncate">{c.name}</span>
                <span className="text-mm-light/50 text-[9px] shrink-0">L{c.level}</span>
              </div>
              <div className="text-mm-light/40 text-[9px] truncate">{classMap[c.classId].name}</div>
              <div className="mt-0.5"><Bar value={c.hp} max={c.maxHp} color="bg-red-500" /></div>
              {c.maxSp > 0 && <div className="mt-0.5"><Bar value={c.sp} max={c.maxSp} color="bg-blue-500" /></div>}
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[8px] text-mm-light/40">{c.hp}/{c.maxHp}</span>
                <StatusBadges ch={c} />
              </div>
            </div>
          </div>
          {dead && <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-red-400 text-[10px] font-bold">死亡</div>}
          {!dead && down && <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-orange-300 text-[10px] font-bold">倒下</div>}
        </button>
      );
    })}
  </div>
);

// Backwards-compatible alias used by older code paths.
export const PartyBar = PartyRoster;
