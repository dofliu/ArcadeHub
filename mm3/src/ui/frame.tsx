import React from 'react';
import { Dir } from '../types';

// ===== MM3-style carved-stone frame, gargoyle corners, compass, resource readouts =====

// A single carved gargoyle / demon-face corner ornament.
export const Gargoyle: React.FC<{ size?: number; flip?: boolean; flipY?: boolean }> = ({ size = 38, flip, flipY }) => (
  <svg width={size} height={size} viewBox="0 0 40 40"
    style={{ transform: `scale(${flip ? -1 : 1}, ${flipY ? -1 : 1})` }} shapeRendering="geometricPrecision">
    <defs>
      <radialGradient id="garg" cx="0.4" cy="0.35" r="0.8">
        <stop offset="0" stopColor="#6b6354" />
        <stop offset="0.6" stopColor="#46402f" />
        <stop offset="1" stopColor="#2a2519" />
      </radialGradient>
    </defs>
    {/* stone block */}
    <rect x="1" y="1" width="38" height="38" rx="3" fill="url(#garg)" stroke="#1c1810" strokeWidth="1.2" />
    {/* horns */}
    <path d="M8 13 L4 4 L13 10 Z" fill="#7a715b" stroke="#1c1810" strokeWidth="0.8" />
    <path d="M32 13 L36 4 L27 10 Z" fill="#7a715b" stroke="#1c1810" strokeWidth="0.8" />
    {/* brow */}
    <path d="M7 17 Q20 11 33 17 L33 21 Q20 16 7 21 Z" fill="#5a533f" />
    {/* eyes */}
    <circle cx="14" cy="21" r="3.2" fill="#0c0913" />
    <circle cx="26" cy="21" r="3.2" fill="#0c0913" />
    <circle cx="14" cy="21" r="1.3" fill="#e7b53b" />
    <circle cx="26" cy="21" r="1.3" fill="#e7b53b" />
    {/* snarling mouth */}
    <path d="M11 28 Q20 35 29 28 L27 31 Q20 36 13 31 Z" fill="#0c0913" />
    <path d="M13 29 L15 32 M18 30 L18 33 M22 30 L22 33 M25 29 L27 32" stroke="#cfc6a8" strokeWidth="0.9" />
  </svg>
);

// The carved stone frame wrapping the main viewport (3D view / combat).
export const StoneFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative ${className}`} style={{
    padding: 14,
    borderRadius: 10,
    background: 'linear-gradient(135deg,#5b5340 0%,#3a3527 25%,#4a4332 50%,#2c2719 75%,#46402f 100%)',
    boxShadow: 'inset 0 2px 4px rgba(255,240,200,0.12), inset 0 -3px 6px rgba(0,0,0,0.6), 0 6px 20px rgba(0,0,0,0.7)',
    border: '2px solid #1c1810',
  }}>
    {/* carved bevel ridges */}
    <div className="pointer-events-none absolute inset-[6px] rounded-md" style={{
      boxShadow: 'inset 0 0 0 2px rgba(20,16,8,0.7), inset 0 0 0 4px rgba(120,108,80,0.35)',
    }} />
    {/* inner well */}
    <div className="relative rounded-sm overflow-hidden" style={{ border: '2px solid #14100a', boxShadow: 'inset 0 0 18px rgba(0,0,0,0.85)' }}>
      {children}
    </div>
    {/* gargoyle corners */}
    <div className="absolute -top-2 -left-2"><Gargoyle /></div>
    <div className="absolute -top-2 -right-2"><Gargoyle flip /></div>
    <div className="absolute -bottom-2 -left-2"><Gargoyle flipY /></div>
    <div className="absolute -bottom-2 -right-2"><Gargoyle flip flipY /></div>
  </div>
);

// A smaller carved panel for side widgets.
export const CarvedPanel: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`relative rounded-md ${className}`} style={{
    padding: title ? '6px 8px 8px' : 8,
    background: 'linear-gradient(160deg,#3a3527,#26221a)',
    boxShadow: 'inset 0 1px 2px rgba(255,240,200,0.1), inset 0 -2px 4px rgba(0,0,0,0.55)',
    border: '1.5px solid #14100a',
  }}>
    {title && <div className="text-[10px] tracking-widest text-[#c9b27a] mb-1 text-center font-rune">{title}</div>}
    {children}
  </div>
);

// Compass dial showing the party's facing direction.
const DIR_LABEL = ['北', '東', '南', '西'];
export const Compass: React.FC<{ dir: Dir; size?: number }> = ({ dir, size = 84 }) => {
  // needle points to current facing; N at top
  const angle = dir * 90; // 0=N up, rotates clockwise
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id="compassbg" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#2a2440" />
          <stop offset="1" stopColor="#0c0913" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#compassbg)" stroke="#46402f" strokeWidth="4" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1c1810" strokeWidth="1" />
      {/* cardinal marks */}
      {[0, 1, 2, 3].map(i => {
        const a = (i * 90) * Math.PI / 180;
        const x = 50 + Math.sin(a) * 34, y = 50 - Math.cos(a) * 34;
        return <text key={i} x={x} y={y + 4} textAnchor="middle" fontSize="11"
          fill={i === dir ? '#e7b53b' : '#6f6890'} fontWeight={i === dir ? 'bold' : 'normal'}>{DIR_LABEL[i]}</text>;
      })}
      {/* needle */}
      <g transform={`rotate(${angle} 50 50)`}>
        <polygon points="50,16 44,52 56,52" fill="#9b2226" />
        <polygon points="50,84 44,48 56,48" fill="#4cc9f0" />
        <circle cx="50" cy="50" r="4" fill="#e7b53b" stroke="#1c1810" strokeWidth="1" />
      </g>
    </svg>
  );
};
