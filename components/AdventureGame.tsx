
import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { Play, RefreshCw, Bot, Dice5, Flag, Skull, Coins, Sparkles } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface AdventureProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const MAP_SIZE = 30; // Total steps

type EventType = 'START' | 'EMPTY' | 'COIN' | 'TRAP' | 'CHANCE' | 'END';

interface Node {
  id: number;
  type: EventType;
  value?: number;
}

const AdventureGame: React.FC<AdventureProps> = ({ onGameOver, language }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [playerPos, setPlayerPos] = useState(0);
  const [score, setScore] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [log, setLog] = useState<string>("");
  const [gameOver, setGameOver] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const autoTimerRef = useRef<number | null>(null);

  const generateMap = () => {
    const newNodes: Node[] = [];
    for(let i=0; i<MAP_SIZE; i++) {
        let type: EventType = 'EMPTY';
        let val = 0;

        if (i === 0) type = 'START';
        else if (i === MAP_SIZE - 1) type = 'END';
        else {
            const rand = Math.random();
            if (rand < 0.25) {
                type = 'COIN'; 
                val = 50;
            } else if (rand < 0.45) {
                type = 'TRAP';
                val = -30;
            } else if (rand < 0.55) {
                type = 'CHANCE';
            }
        }
        newNodes.push({ id: i, type, value: val });
    }
    return newNodes;
  };

  const initGame = (auto: boolean = false) => {
      setNodes(generateMap());
      setPlayerPos(0);
      setScore(0);
      setDiceValue(null);
      setLog(language === 'zh' ? "冒險開始！" : "Adventure Begins!");
      setGameOver(false);
      setIsAuto(auto);
      soundService.playMove();
  };

  useEffect(() => {
      initGame();
  }, []);

  const handleEvent = (node: Node) => {
      let msg = "";
      let scoreChange = 0;

      if (node.type === 'COIN') {
          scoreChange = 50;
          msg = language === 'zh' ? "獲得金幣 +50!" : "Found Coins +50!";
          soundService.playScore();
      } else if (node.type === 'TRAP') {
          scoreChange = -30;
          msg = language === 'zh' ? "踩到陷阱 -30!" : "It's a Trap -30!";
          soundService.playExplosion();
      } else if (node.type === 'CHANCE') {
          const chance = Math.random();
          if (chance > 0.5) {
              scoreChange = 100;
              msg = language === 'zh' ? "命運眷顧！+100!" : "Lucky Day! +100!";
              soundService.playScore();
          } else {
              scoreChange = -50;
              msg = language === 'zh' ? "運氣不好... -50" : "Unlucky... -50";
              soundService.playExplosion();
          }
      } else if (node.type === 'END') {
          msg = language === 'zh' ? "抵達終點！" : "Reached the End!";
          soundService.playWin();
          setGameOver(true);
          if (!isAuto) {
              onGameOver({ game: language === 'zh' ? '大富翁' : 'Adventure Run', gameId: GameType.ADVENTURE, score: score + 500 });
          } else {
              setIsAuto(false);
          }
      }

      if (msg) setLog(msg);
      setScore(s => Math.max(0, s + scoreChange));
  };

  const rollDice = () => {
      if (isRolling || gameOver) return;
      
      setIsRolling(true);
      soundService.playMove();
      
      // Animation effect
      let count = 0;
      const rollInterval = setInterval(() => {
          setDiceValue(Math.floor(Math.random() * 6) + 1);
          count++;
          if (count > 8) {
              clearInterval(rollInterval);
              const finalRoll = Math.floor(Math.random() * 6) + 1;
              setDiceValue(finalRoll);
              movePlayer(finalRoll);
              setIsRolling(false);
          }
      }, 80);
  };

  const movePlayer = (steps: number) => {
      let current = playerPos;
      let target = current + steps;

      // Bounce logic
      if (target >= MAP_SIZE) {
          const overshoot = target - (MAP_SIZE - 1);
          target = (MAP_SIZE - 1) - overshoot;
      }

      // Move step by step visual
      let stepCount = 0;
      const totalSteps = Math.abs(target - current) + (target < current ? 0 : 0); // Simplified animation handling
      
      // To animate simple movement from A to B, even if B < A (bounce back)
      // We just set state directly for simplicity in this version or use a timeout
      // Bounce back visualization is complex. Let's just jump to target for MVP
      
      setPlayerPos(target);
      
      // Handle Event
      handleEvent(nodes[target]);
  };

  // Auto Play
  useEffect(() => {
      if (isAuto && !gameOver && !isRolling) {
          autoTimerRef.current = window.setTimeout(() => {
              rollDice();
          }, 1500);
      }
      return () => {
          if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      }
  }, [isAuto, gameOver, isRolling, playerPos]);

  // Render Board Logic
  const renderBoard = () => {
      // Draw S-shape path
      // 5 columns, 6 rows = 30 nodes
      // Row 0: 0->4
      // Row 1: 9<-5
      // Row 2: 10->14
      // ...
      const grid = [];
      for(let r=0; r<6; r++) {
          const rowCells = [];
          for(let c=0; c<5; c++) {
              let id;
              if (r % 2 === 0) {
                  id = r * 5 + c;
              } else {
                  id = r * 5 + (4 - c);
              }
              
              if (id < nodes.length) {
                  const node = nodes[id];
                  const isPlayerHere = playerPos === id;
                  
                  let bg = 'bg-gray-700';
                  let icon = null;
                  
                  if (node.type === 'START') { bg = 'bg-green-800'; icon = <Flag size={16}/>; }
                  else if (node.type === 'END') { bg = 'bg-yellow-600'; icon = <Flag size={16} className="text-white"/>; }
                  else if (node.type === 'COIN') { bg = 'bg-yellow-900'; icon = <Coins size={14} className="text-yellow-400"/>; }
                  else if (node.type === 'TRAP') { bg = 'bg-red-900'; icon = <Skull size={14} className="text-red-400"/>; }
                  else if (node.type === 'CHANCE') { bg = 'bg-purple-900'; icon = <Sparkles size={14} className="text-purple-400"/>; }
                  
                  rowCells.push(
                      <div key={id} className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${bg} border-2 border-gray-600 flex items-center justify-center shadow-md`}>
                          <span className="absolute top-0.5 left-1 text-[8px] text-gray-400">{id}</span>
                          {icon}
                          {isPlayerHere && (
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                   <div className="w-8 h-8 bg-arcade-neon rounded-full border-2 border-white shadow-[0_0_10px_#00fff5] animate-bounce flex items-center justify-center text-black font-bold text-xs">
                                       P
                                   </div>
                              </div>
                          )}
                      </div>
                  );
              }
          }
          grid.push(<div key={r} className="flex gap-2">{rowCells}</div>);
      }
      return grid;
  };

  return (
    <div className="flex flex-col items-center">
       <div className="flex justify-between w-full max-w-[340px] mb-4 px-2 items-center">
         <div className="font-pixel text-arcade-neon text-sm">{score} PTS</div>
         <div className="flex gap-2">
             <button onClick={() => initGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
            </button>
            <button onClick={() => initGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
               {gameOver ? <RefreshCw size={20} /> : <RefreshCw size={20} />}
            </button>
         </div>
       </div>

       {/* Board Container */}
       <div className="bg-gray-800 p-4 rounded-xl border-4 border-arcade-secondary flex flex-col gap-2 items-center">
           {renderBoard()}
       </div>

       {/* Controls Area */}
       <div className="mt-4 w-full max-w-[340px] flex items-center justify-between bg-gray-900 p-4 rounded-lg border border-gray-700">
           <div className="flex flex-col">
               <span className="text-gray-500 text-xs uppercase">Event Log</span>
               <span className="text-arcade-neon font-pixel text-xs sm:text-sm h-5 overflow-hidden whitespace-nowrap">{log}</span>
           </div>
           
           <button 
              onClick={rollDice} 
              disabled={isRolling || isAuto || gameOver}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all ${isRolling || isAuto || gameOver ? 'bg-gray-700 opacity-50' : 'bg-arcade-primary hover:bg-red-600 active:scale-95'}`}
           >
               {isRolling ? (
                   <RefreshCw size={24} className="animate-spin text-white" />
               ) : (
                   <Dice5 size={24} className="text-white" />
               )}
               <span className="text-white font-bold text-xl leading-none mt-1">{diceValue ?? '?'}</span>
           </button>
       </div>
       
       <p className="mt-2 text-xs text-gray-500">
          {t('adventureControls', language)}
       </p>
    </div>
  );
};

export default AdventureGame;
