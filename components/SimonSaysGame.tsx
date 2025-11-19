
import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface SimonSaysProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

type Color = 'green' | 'red' | 'yellow' | 'blue';
const COLORS: Color[] = ['green', 'red', 'yellow', 'blue'];

const COLOR_CONFIG = {
  green: { color: 'bg-green-500', active: 'bg-green-300 shadow-[0_0_30px_#22c55e]', freq: 415.30 }, // G#4
  red: { color: 'bg-red-500', active: 'bg-red-300 shadow-[0_0_30px_#ef4444]', freq: 311.13 },   // D#4
  yellow: { color: 'bg-yellow-500', active: 'bg-yellow-200 shadow-[0_0_30px_#eab308]', freq: 277.18 }, // C#4
  blue: { color: 'bg-blue-500', active: 'bg-blue-300 shadow-[0_0_30px_#3b82f6]', freq: 207.65 }   // G#3
};

const SimonSaysGame: React.FC<SimonSaysProps> = ({ onGameOver, language }) => {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playbackIdx, setPlaybackIdx] = useState<number | null>(null);
  const [playerInputIdx, setPlayerInputIdx] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING_SEQUENCE' | 'PLAYER_TURN' | 'GAME_OVER'>('IDLE');
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [score, setScore] = useState(0);
  const [isAuto, setIsAuto] = useState(false);
  const autoTimerRef = useRef<number | null>(null);

  const startGame = (auto: boolean = false) => {
    setSequence([]);
    setScore(0);
    setGameState('IDLE');
    setIsAuto(auto);
    
    // Start first round
    setTimeout(() => {
      addToSequence([]);
    }, 500);
  };

  const addToSequence = (currentSeq: Color[]) => {
    const nextColor = COLORS[Math.floor(Math.random() * 4)];
    const newSeq = [...currentSeq, nextColor];
    setSequence(newSeq);
    setPlaybackIdx(0);
    setGameState('PLAYING_SEQUENCE');
    setPlayerInputIdx(0);
  };

  // Playback Sequence Logic
  useEffect(() => {
    if (gameState === 'PLAYING_SEQUENCE' && playbackIdx !== null) {
      if (playbackIdx < sequence.length) {
        const color = sequence[playbackIdx];
        setActiveColor(color);
        soundService.playTone(COLOR_CONFIG[color].freq, 'sine', 0.3, 0.2);
        
        const speed = Math.max(200, 800 - sequence.length * 30);
        
        setTimeout(() => {
          setActiveColor(null);
          setTimeout(() => {
            setPlaybackIdx(playbackIdx + 1);
          }, 100); // Small gap between notes
        }, speed);
      } else {
        setGameState('PLAYER_TURN');
        setPlaybackIdx(null);
      }
    }
  }, [gameState, playbackIdx, sequence]);

  const handleColorClick = (color: Color) => {
    if (gameState !== 'PLAYER_TURN') return;

    // Flash Logic
    setActiveColor(color);
    soundService.playTone(COLOR_CONFIG[color].freq, 'sine', 0.3, 0.2);
    setTimeout(() => setActiveColor(null), 300);

    // Verify
    if (color === sequence[playerInputIdx]) {
       const nextIdx = playerInputIdx + 1;
       setPlayerInputIdx(nextIdx);
       
       if (nextIdx === sequence.length) {
         // Round Complete
         setScore(s => s + 1);
         setGameState('IDLE');
         setTimeout(() => {
            addToSequence(sequence);
         }, 1000);
       }
    } else {
       // Wrong
       soundService.playExplosion();
       setGameState('GAME_OVER');
       setIsAuto(false);
       if (!isAuto) {
           onGameOver({ game: 'Simon Says', gameId: GameType.SIMONSAYS, score });
       }
    }
  };

  // Auto Play (Perfect Memory)
  useEffect(() => {
    if (isAuto && gameState === 'PLAYER_TURN') {
       const colorToClick = sequence[playerInputIdx];
       // Simulate "thinking" time
       const thinkTime = Math.random() * 300 + 200;
       autoTimerRef.current = window.setTimeout(() => {
           handleColorClick(colorToClick);
       }, thinkTime);
    }
    return () => {
       if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    }
  }, [isAuto, gameState, playerInputIdx, sequence]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
       <div className="flex justify-between w-full mb-8 px-4 items-center">
         <div className="bg-arcade-secondary px-4 py-2 rounded text-center">
            <div className="text-xs text-gray-400">ROUND</div>
            <div className="text-xl font-bold text-white">{sequence.length}</div>
         </div>
         <div className="text-2xl font-pixel text-arcade-neon">{gameState === 'PLAYER_TURN' ? (language === 'zh' ? '你的回合' : 'YOUR TURN') : (gameState === 'PLAYING_SEQUENCE' ? (language === 'zh' ? '注意看!' : 'WATCH!') : '')}</div>
         <div className="flex gap-2">
             <button onClick={() => startGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
             </button>
             <button onClick={() => startGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
                {gameState === 'IDLE' || gameState === 'GAME_OVER' ? <Play size={20} /> : <RefreshCw size={20} />}
             </button>
         </div>
       </div>

       <div className="relative w-64 h-64 sm:w-80 sm:h-80">
          {/* Green (Top Left) */}
          <button
            onClick={() => handleColorClick('green')}
            className={`absolute top-0 left-0 w-1/2 h-1/2 rounded-tl-full border-4 border-gray-900 transition-all duration-100 ${activeColor === 'green' ? COLOR_CONFIG.green.active : COLOR_CONFIG.green.color}`}
          />
          {/* Red (Top Right) */}
          <button
            onClick={() => handleColorClick('red')}
            className={`absolute top-0 right-0 w-1/2 h-1/2 rounded-tr-full border-4 border-gray-900 transition-all duration-100 ${activeColor === 'red' ? COLOR_CONFIG.red.active : COLOR_CONFIG.red.color}`}
          />
          {/* Yellow (Bottom Left) */}
          <button
            onClick={() => handleColorClick('yellow')}
            className={`absolute bottom-0 left-0 w-1/2 h-1/2 rounded-bl-full border-4 border-gray-900 transition-all duration-100 ${activeColor === 'yellow' ? COLOR_CONFIG.yellow.active : COLOR_CONFIG.yellow.color}`}
          />
          {/* Blue (Bottom Right) */}
          <button
            onClick={() => handleColorClick('blue')}
            className={`absolute bottom-0 right-0 w-1/2 h-1/2 rounded-br-full border-4 border-gray-900 transition-all duration-100 ${activeColor === 'blue' ? COLOR_CONFIG.blue.active : COLOR_CONFIG.blue.color}`}
          />
          
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-gray-900 rounded-full border-4 border-gray-800 flex items-center justify-center z-10">
             <span className="font-pixel text-white text-lg">SIMON</span>
          </div>
       </div>

       <p className="mt-8 text-sm text-gray-500">
         {t('simonSaysControls', language)}
       </p>
    </div>
  );
};

export default SimonSaysGame;
