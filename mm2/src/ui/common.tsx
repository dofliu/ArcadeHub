import React from 'react';
import { Character, GameState } from '../types';
import { classMap, raceMap } from '../data/content';
import { Heart, Sparkles } from 'lucide-react';

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

export const Bar: React.FC<{ value: number; max: number; color: string; icon?: React.ReactNode }> = ({ value, max, color, icon }) => (
  <div className="flex items-center gap-1">
    {icon}
    <div className="flex-1 h-1.5 bg-black/50 rounded overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0}%` }} />
    </div>
  </div>
);

export const charLabel = (c: Character, en = false) =>
  `${c.name}・${en ? classMap[c.classId].nameEn : classMap[c.classId].name}`;

export const PartyBar: React.FC<{
  g: GameState;
  active?: number;
  highlight?: number;
  onSelect?: (i: number) => void;
}> = ({ g, active, highlight, onSelect }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
    {g.party.map((c, i) => {
      const down = c.condition !== 'ok' || c.hp <= 0;
      return (
        <button
          key={i}
          onClick={() => onSelect?.(i)}
          className={`text-left p-2 rounded-md border text-[11px] transition ${
            down ? 'opacity-45 border-mm-edge bg-black/30'
              : highlight === i ? 'border-mm-neon bg-mm-neon/10 shadow-[0_0_12px_rgba(76,201,240,0.4)]'
              : active === i ? 'border-mm-gold bg-mm-gold/10'
              : 'border-mm-edge bg-mm-panel hover:bg-mm-edge'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="font-bold text-mm-light truncate">{c.name}</span>
            <span className="text-mm-light/50">L{c.level}</span>
          </div>
          <div className="text-mm-light/40 text-[10px] mb-1 flex items-center gap-1">
            <span>{raceMap[c.raceId].name}{classMap[c.classId].name}</span>
            {(c.status?.poison || 0) > 0 && <span className="text-green-400" title="中毒">☠</span>}
            {(c.status?.sleep || 0) > 0 && <span className="text-blue-300" title="沉睡">Z</span>}
            {(c.status?.paralyze || 0) > 0 && <span className="text-yellow-300" title="麻痺">✋</span>}
          </div>
          <Bar value={c.hp} max={c.maxHp} color="bg-red-500" icon={<Heart size={9} className="text-red-400" />} />
          {c.maxSp > 0 && (
            <div className="mt-0.5">
              <Bar value={c.sp} max={c.maxSp} color="bg-blue-500" icon={<Sparkles size={9} className="text-blue-300" />} />
            </div>
          )}
          {down && <div className="text-red-400 text-[10px] mt-0.5">倒下</div>}
        </button>
      );
    })}
  </div>
);
