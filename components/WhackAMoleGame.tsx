import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { RefreshCw, Play, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface WhackAMoleProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const GRID_SIZE = 3; 
const GAME_DURATION = 30; 

const WhackAMoleGame: React.FC<WhackAMoleProps> = ({ onGameOver, language }) => {
  const [score, setScore] = useState(0);
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const moleTimerRef = useRef<number | null>(null);
  const autoHitTimerRef = useRef<number | null>(null);

  const startGame = (auto: boolean = false) => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(true);
    setIsAuto(auto);
    setActiveMole(null);
    soundService.playMove();
    
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    startMoleCycle();
  };

  const startMoleCycle = () => {
    const popMole = () => {
      const randomHole = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      setActiveMole(randomHole);
      
      const stayTime = Math.random() * 500 + 500;
      
      moleTimerRef.current = window.setTimeout(() => {
         setActiveMole(null);
         moleTimerRef.current = window.setTimeout(popMole, Math.random() * 500 + 200);
      }, stayTime);
    };
    popMole();
  };

  // Game Over Check
  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
        if (autoHitTimerRef.current) clearTimeout(autoHitTimerRef.current);
        setActiveMole(null);
        soundService.playWin();
        if (!isAuto) {
            onGameOver({ 
                game: language === 'zh' ? '打地鼠' : 'Whack-a-Mole', 
                gameId: GameType.WHACKAMOLE, 
                score: score 
            });
        } else {
            setIsAuto(false);
        }
    }
  }, [timeLeft, isPlaying, score, onGameOver, language, isAuto]);

  // Cleanup
  useEffect(() => {
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
        if (autoHitTimerRef.current) clearTimeout(autoHitTimerRef.current);
    };
  }, []);


  const whack = (index: number) => {
    if (!isPlaying) return;
    if (index === activeMole) {
      setScore(s => s + 10);
      setActiveMole(null);
      if(!isAuto) soundService.playScore(); // Mute score sound in auto to prevent spam
      
      if (moleTimerRef.current) clearTimeout(moleTimerRef.current);
      moleTimerRef.current = window.setTimeout(() => {
         const popMole = () => {
            if(!isPlaying) return; 
            const randomHole = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
            setActiveMole(randomHole);
            const stayTime = Math.random() * 500 + 400;
            moleTimerRef.current = window.setTimeout(() => {
                setActiveMole(null);
                moleTimerRef.current = window.setTimeout(popMole, Math.random() * 400 + 200);
            }, stayTime);
         };
         popMole();
      }, 200);

    } else {
        if(!isAuto) soundService.playExplosion(); 
    }
  };

  // Auto Bot Logic
  useEffect(() => {
    if (isAuto && activeMole !== null) {
        // Simulate reaction time
        const reactionTime = Math.random() * 200 + 100; 
        autoHitTimerRef.current = window.setTimeout(() => {
            if (activeMole !== null) { // Double check
                whack(activeMole);
            }
        }, reactionTime);
    }
    return () => {
        if (autoHitTimerRef.current) clearTimeout(autoHitTimerRef.current);
    }
  }, [isAuto, activeMole]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="flex justify-between w-full mb-4 px-4 items-center">
        <div className="bg-arcade-secondary px-4 py-2 rounded text-center">
           <div className="text-xs text-gray-400">{language === 'zh' ? '時間' : 'TIME'}</div>
           <div className={`text-xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
        </div>
        <div className="text-3xl font-pixel text-arcade-neon">{score}</div>
        {!isPlaying && (
            <div className="flex gap-2">
                 <button onClick={() => startGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                    <Bot size={14} /> {t('autoMode', language)}
                </button>
                <button onClick={() => startGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
                  {score === 0 ? <Play size={20} /> : <RefreshCw size={20} />}
                </button>
            </div>
        )}
        {isPlaying && isAuto && (
             <button onClick={() => { setIsPlaying(false); setIsAuto(false); }} className="text-xs bg-red-500 px-3 py-1 rounded animate-pulse text-white">
                {t('stopAuto', language)}
             </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 p-6 bg-amber-900/30 rounded-xl border-4 border-amber-800">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => (
          <div
            key={index}
            onClick={() => !isAuto && whack(index)}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-black/40 rounded-full relative overflow-hidden cursor-pointer shadow-inner border-b-4 border-white/10 active:scale-95 transition-transform"
          >
             <div 
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-20 bg-amber-600 rounded-t-full transition-transform duration-100 ease-out ${activeMole === index ? 'translate-y-2' : 'translate-y-24'}`}
             >
                <div className="absolute top-6 left-3 w-3 h-3 bg-black rounded-full opacity-80"></div>
                <div className="absolute top-6 right-3 w-3 h-3 bg-black rounded-full opacity-80"></div>
                <div className="absolute top-10 left-1/2 -translate-x-1/2 w-6 h-4 bg-pink-300 rounded-full"></div>
                <div className="absolute top-9 left-1/2 -translate-x-1/2 w-4 h-3 bg-black rounded-full"></div>
             </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-gray-400">
         {language === 'zh' ? '點擊地鼠得分！' : 'Click the moles to score!'}
      </p>
    </div>
  );
};

export default WhackAMoleGame;