import React from 'react';
import { Character, Gender } from '../types';

// ===== Procedural pixel-art portraits (SVG). Faces vary by race / gender / class. =====
// Drawn on a 16x16 logical grid scaled to the requested size — crisp "pixel" look.

const SKIN: Record<string, string> = {
  human: '#d9a06b', elf: '#e6c6a8', dwarf: '#cf8a5c', gnome: '#e0b48c', 'half-orc': '#7e9b5a',
};
const SKIN_SHADE: Record<string, string> = {
  human: '#b07a48', elf: '#c39e7e', dwarf: '#a8643c', gnome: '#bb8a62', 'half-orc': '#5e7740',
};
const HAIR: string[] = ['#3a2a18', '#6b4423', '#1c1c22', '#a8884c', '#9a3b2a', '#cfcfcf', '#4a3b6b'];

// per-class headgear colour + style key
const CLASS_GEAR: Record<string, { color: string; style: string; trim?: string }> = {
  knight:    { color: '#9aa3ad', style: 'helm', trim: '#e7b53b' },
  paladin:   { color: '#cdd3da', style: 'helm', trim: '#ffd166' },
  archer:    { color: '#5a7a3a', style: 'hood' },
  cleric:    { color: '#e8e2c0', style: 'hood', trim: '#ffd166' },
  sorcerer:  { color: '#5a3e8c', style: 'wizard', trim: '#7c5cff' },
  robber:    { color: '#2c2c34', style: 'mask' },
  ninja:     { color: '#1a1a22', style: 'mask', trim: '#9b2226' },
  barbarian: { color: '#7a4a22', style: 'horns' },
  druid:     { color: '#3a6b3a', style: 'crown', trim: '#88c070' },
};

interface FaceProps { raceId: string; classId: string; gender: Gender; portraitId: number; size?: number; }

// A tiny helper to make a pixel rect on the 16-grid
const px = (x: number, y: number, w: number, h: number, fill: string, key: string) =>
  <rect key={key} x={x} y={y} width={w} height={h} fill={fill} />;

export const Portrait: React.FC<FaceProps & { className?: string }> = ({ raceId, classId, gender, portraitId, size = 48, className }) => {
  const skin = SKIN[raceId] || '#d9a06b';
  const shade = SKIN_SHADE[raceId] || '#b07a48';
  const hair = HAIR[portraitId % HAIR.length];
  const gear = CLASS_GEAR[classId] || { color: '#888', style: 'none' };
  const female = gender === 'female';
  const els: React.ReactNode[] = [];

  // niche background
  els.push(px(0, 0, 16, 16, '#0c0913', 'bg'));
  els.push(<rect key="bgg" x={0} y={0} width={16} height={16} fill="url(#nichegrad)" />);

  // shoulders / neck
  els.push(px(5, 14, 6, 2, shade, 'neck'));
  els.push(px(3, 15, 10, 1, '#241c2e', 'shoulder'));

  // head base (4..11 wide, 3..13 tall)
  els.push(px(4, 4, 8, 9, skin, 'head'));
  els.push(px(4, 4, 1, 9, shade, 'headL'));
  els.push(px(11, 4, 1, 9, shade, 'headR'));
  els.push(px(4, 12, 8, 1, shade, 'jaw'));

  // ears
  els.push(px(3, 7, 1, 2, skin, 'earL'));
  els.push(px(12, 7, 1, 2, skin, 'earR'));
  if (raceId === 'elf') { els.push(px(3, 6, 1, 1, skin, 'elfL')); els.push(px(12, 6, 1, 1, skin, 'elfR')); }

  // eyes
  const eyeColor = raceId === 'half-orc' ? '#c43b2a' : '#23314a';
  els.push(px(6, 7, 1, 2, eyeColor, 'eyeL'));
  els.push(px(9, 7, 1, 2, eyeColor, 'eyeR'));
  els.push(px(5, 6, 2, 1, shade, 'browL'));
  els.push(px(9, 6, 2, 1, shade, 'browR'));

  // nose + mouth
  els.push(px(8, 9, 1, 2, shade, 'nose'));
  els.push(px(6, 11, 4, 1, '#7a3b34', 'mouth'));

  // half-orc tusks
  if (raceId === 'half-orc') { els.push(px(6, 11, 1, 1, '#f0ead6', 'tuskL')); els.push(px(9, 11, 1, 1, '#f0ead6', 'tuskR')); }

  // beard (dwarf male, barbarian male)
  if (!female && (raceId === 'dwarf' || classId === 'barbarian')) {
    els.push(px(5, 11, 6, 3, hair, 'beard'));
    els.push(px(6, 11, 4, 1, skin, 'lip'));
  }

  // hair by gender (unless fully covered by helm/hood/wizard)
  const covered = gear.style === 'helm' || gear.style === 'wizard';
  if (!covered) {
    els.push(px(4, 3, 8, 2, hair, 'hairtop'));
    els.push(px(4, 3, 1, 4, hair, 'hairL'));
    els.push(px(11, 3, 1, 4, hair, 'hairR'));
    if (female) {
      els.push(px(3, 4, 1, 9, hair, 'hairLongL'));
      els.push(px(12, 4, 1, 9, hair, 'hairLongR'));
    }
  }

  // class headgear
  switch (gear.style) {
    case 'helm':
      els.push(px(3, 2, 10, 4, gear.color, 'helm'));
      els.push(px(3, 2, 10, 1, '#e9edf2', 'helmTop'));
      els.push(px(7, 4, 2, 6, gear.color, 'noseguard'));
      if (gear.trim) els.push(px(3, 5, 10, 1, gear.trim, 'helmTrim'));
      // re-draw eyes over noseguard gap
      els.push(px(6, 7, 1, 2, eyeColor, 'eyeL2'));
      els.push(px(9, 7, 1, 2, eyeColor, 'eyeR2'));
      break;
    case 'hood':
      els.push(px(3, 2, 10, 3, gear.color, 'hood'));
      els.push(px(3, 2, 1, 11, gear.color, 'hoodL'));
      els.push(px(12, 2, 1, 11, gear.color, 'hoodR'));
      if (gear.trim) els.push(px(6, 1, 4, 1, gear.trim, 'halo'));
      break;
    case 'wizard':
      els.push(<polygon key="wzhat" points="8,0 3,4 13,4" fill={gear.color} />);
      els.push(px(3, 4, 10, 1, gear.trim || '#fff', 'wzbrim'));
      els.push(px(7, 1, 2, 2, gear.trim || '#fff', 'wzstar'));
      break;
    case 'mask':
      els.push(px(4, 7, 8, 2, gear.color, 'mask'));
      els.push(px(6, 7, 1, 2, '#fff', 'meyeL'));
      els.push(px(9, 7, 1, 2, '#fff', 'meyeR'));
      els.push(px(4, 3, 8, 2, gear.color, 'bandana'));
      if (gear.trim) els.push(px(4, 4, 8, 1, gear.trim, 'bandtrim'));
      break;
    case 'horns':
      els.push(<polygon key="hornL" points="4,4 2,1 5,3" fill="#e9e2d0" />);
      els.push(<polygon key="hornR" points="12,4 14,1 11,3" fill="#e9e2d0" />);
      break;
    case 'crown':
      els.push(px(4, 2, 8, 1, gear.trim || '#88c070', 'crownband'));
      els.push(px(4, 1, 1, 2, gear.color, 'leaf1'));
      els.push(px(7, 0, 2, 2, gear.color, 'leaf2'));
      els.push(px(11, 1, 1, 2, gear.color, 'leaf3'));
      break;
  }

  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className}
      style={{ imageRendering: 'pixelated', display: 'block' }} shapeRendering="crispEdges">
      <defs>
        <radialGradient id="nichegrad" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#3a2e1a" />
          <stop offset="1" stopColor="#100c06" />
        </radialGradient>
      </defs>
      {els}
    </svg>
  );
};

export const PortraitOf: React.FC<{ ch: Character; size?: number; className?: string }> = ({ ch, size, className }) => (
  <Portrait raceId={ch.raceId} classId={ch.classId} gender={ch.gender} portraitId={ch.portraitId} size={size} className={className} />
);
