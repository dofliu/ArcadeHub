
import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { RefreshCw, Bot, Layers } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface MahjongProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

interface Tile {
  id: number;
  type: string;
  value: string; // Unicode char or identifier
  x: number; // Grid coordinates
  y: number;
  z: number; // Layer
  visible: boolean;
}

// Simplified Mahjong Unicode Ranges or Custom Set
// Using a subset for better playability on small screens
const TILE_TYPES = [
  // Dots
  '🀙','🀚','🀛','🀜','🀝','🀞','🀟','🀠','🀡',
  // Bamboo
  '🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘',
  // Characters
  '🀇','🀈','🀉','🀊','🀋','🀌','🀍','🀎','🀏',
  // Winds
  '🀀','🀁','🀂','🀃',
  // Dragons
  '🀄','🀅','🀆'
];

const TILE_WIDTH = 36;
const TILE_HEIGHT = 48;

const MahjongGame: React.FC<MahjongProps> = ({ onGameOver, language }) => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const autoTimerRef = useRef<number | null>(null);

  // Turtle Layout Generator
  const generateLayout = () => {
    // Create a pair list first
    let deck: string[] = [];
    // We need even number of each tile.
    // 144 total standard. Let's target ~64-80 for arcade quick play.
    // 36 types. 2 pairs of each = 72 tiles.
    // Or 18 types * 4 = 72 tiles.
    const selectedTypes = TILE_TYPES.slice(0, 18); // First 18 types
    for (const type of selectedTypes) {
      deck.push(type, type, type, type);
    }
    // Shuffle
    deck.sort(() => Math.random() - 0.5);

    const newTiles: Tile[] = [];
    let deckIdx = 0;

    // Simple Pyramid Layout Structure (Grid Units)
    // 2x2 grid unit per tile usually? Let's just use 1x1 grid unit but render larger
    // To ensure overlap logic works, we check distance < 1.
    
    // Layer 0: 6x6 grid
    for(let x=1; x<=6; x++) {
        for(let y=1; y<=6; y++) {
             if(deckIdx >= deck.length) break;
             newTiles.push({ id: deckIdx, type: deck[deckIdx], value: deck[deckIdx], x: x*2, y: y*2, z: 0, visible: true });
             deckIdx++;
        }
    }
    // Layer 1: 4x4 centered
    for(let x=2; x<=5; x++) {
        for(let y=2; y<=5; y++) {
            if(deckIdx >= deck.length) break;
            newTiles.push({ id: deckIdx, type: deck[deckIdx], value: deck[deckIdx], x: x*2, y: y*2, z: 1, visible: true });
            deckIdx++;
        }
    }
    // Layer 2: 2x2 centered
    for(let x=3; x<=4; x++) {
        for(let y=3; y<=4; y++) {
            if(deckIdx >= deck.length) break;
            newTiles.push({ id: deckIdx, type: deck[deckIdx], value: deck[deckIdx], x: x*2, y: y*2, z: 2, visible: true });
            deckIdx++;
        }
    }
    // Layer 3: 1 top
    if(deckIdx < deck.length) {
        newTiles.push({ id: deckIdx, type: deck[deckIdx], value: deck[deckIdx], x: 7, y: 7, z: 3, visible: true });
    }
    
    return newTiles;
  };

  const initGame = (auto: boolean = false) => {
      const layout = generateLayout();
      setTiles(layout);
      setScore(0);
      setSelectedTileId(null);
      setGameOver(false);
      setIsAuto(auto);
      soundService.playMove();
  };

  useEffect(() => {
      initGame();
  }, []);

  // Check if tile is free
  // A tile is free if:
  // 1. No tile on top (z+1) that overlaps
  // 2. Left OR Right side is empty (same z)
  const isFree = (tile: Tile, currentTiles: Tile[]) => {
      if (!tile.visible) return false;

      // Check Top (Any tile with z > tile.z and overlapping x,y)
      // Our grid is x,y. Tile size approx 2x2 in grid units.
      // Overlap: abs(t2.x - t1.x) < 2 && abs(t2.y - t1.y) < 2
      const hasTop = currentTiles.some(t => 
          t.visible && 
          t.z === tile.z + 1 && 
          Math.abs(t.x - tile.x) < 2 && 
          Math.abs(t.y - tile.y) < 2
      );
      if (hasTop) return false;

      // Check Left (z same, x < tile.x, overlap y)
      // Immediate neighbor: t.x = tile.x - 2
      const hasLeft = currentTiles.some(t => 
          t.visible && 
          t.z === tile.z && 
          t.x === tile.x - 2 && 
          Math.abs(t.y - tile.y) < 2
      );

      // Check Right
      const hasRight = currentTiles.some(t => 
        t.visible && 
        t.z === tile.z && 
        t.x === tile.x + 2 && 
        Math.abs(t.y - tile.y) < 2
      );

      return !hasLeft || !hasRight;
  };

  const handleTileClick = (tile: Tile) => {
      if (gameOver) return;
      if (!isFree(tile, tiles)) return;

      if (selectedTileId === null) {
          setSelectedTileId(tile.id);
          soundService.playMove(); // Click sound
      } else {
          if (selectedTileId === tile.id) {
              setSelectedTileId(null); // Deselect
          } else {
              const selectedTile = tiles.find(t => t.id === selectedTileId);
              if (selectedTile && selectedTile.value === tile.value) {
                  // Match!
                  const newTiles = tiles.map(t => {
                      if (t.id === tile.id || t.id === selectedTileId) {
                          return { ...t, visible: false };
                      }
                      return t;
                  });
                  setTiles(newTiles);
                  setSelectedTileId(null);
                  setScore(s => s + 100);
                  if (!isAuto) soundService.playScore();

                  // Check Win
                  if (newTiles.every(t => !t.visible)) {
                      setGameOver(true);
                      soundService.playWin();
                      if (!isAuto) {
                          onGameOver({ game: 'Mahjong', gameId: GameType.MAHJONG, score: score + 1000 });
                      } else {
                          setIsAuto(false);
                      }
                  }
              } else {
                  // No match
                  setSelectedTileId(tile.id); // Switch selection
                  soundService.playMove();
              }
          }
      }
  };

  // Auto Solver
  useEffect(() => {
      if (isAuto && !gameOver) {
          autoTimerRef.current = window.setTimeout(() => {
              // Find all free tiles
              const freeTiles = tiles.filter(t => t.visible && isFree(t, tiles));
              
              // Find matches
              let pairFound = false;
              for(let i=0; i<freeTiles.length; i++) {
                  for(let j=i+1; j<freeTiles.length; j++) {
                      if (freeTiles[i].value === freeTiles[j].value) {
                          // Select first
                          setSelectedTileId(freeTiles[i].id);
                          setTimeout(() => {
                              handleTileClick(freeTiles[j]);
                          }, 200);
                          pairFound = true;
                          break;
                      }
                  }
                  if (pairFound) break;
              }

              if (!pairFound && freeTiles.length > 0) {
                  // Stuck or no matches visible? 
                  // For demo, just stop or reshuffle (not implemented). 
                  setIsAuto(false);
              }
          }, 600);
      }
      return () => {
          if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      }
  }, [isAuto, tiles, selectedTileId, gameOver]);

  return (
    <div className="flex flex-col items-center">
       <div className="flex justify-between w-full max-w-[320px] mb-4 px-2 items-center">
         <div className="font-pixel text-arcade-neon">SCORE: {score}</div>
         <div className="flex gap-2">
             <button onClick={() => initGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
            </button>
            <button onClick={() => initGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
               {gameOver ? <RefreshCw size={20} /> : <Layers size={20} />}
            </button>
         </div>
       </div>

       {/* Game Board */}
       <div className="relative bg-green-900 rounded-lg border-8 border-[#8b5a2b] shadow-2xl overflow-hidden" style={{ width: 340, height: 340 }}>
           <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
           
           {/* Center container */}
           <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ width: 280, height: 280 }}>
               {tiles.map(tile => {
                   if (!tile.visible) return null;
                   const isSelected = selectedTileId === tile.id;
                   const free = isFree(tile, tiles);
                   
                   return (
                       <div
                           key={tile.id}
                           onClick={() => handleTileClick(tile)}
                           className={`
                               absolute flex items-center justify-center 
                               transition-all duration-200 cursor-pointer
                               ${isSelected ? 'z-50 transform -translate-y-2' : ''}
                           `}
                           style={{
                               width: TILE_WIDTH,
                               height: TILE_HEIGHT,
                               left: tile.x * 18, // Scale grid to pixels
                               top: tile.y * 18,
                               zIndex: tile.z * 10 + tile.y, // Layering logic
                               backgroundColor: '#fdf6e3',
                               border: '1px solid #d4c4a8',
                               borderRadius: '4px',
                               boxShadow: isSelected 
                                  ? '0 10px 20px rgba(0,0,0,0.3), inset 0 -4px 0 #e0d0b0'
                                  : '2px 4px 6px rgba(0,0,0,0.4), inset 0 -4px 0 #e0d0b0',
                               color: free ? '#000' : '#999',
                               filter: free ? 'brightness(100%)' : 'brightness(70%)'
                           }}
                       >
                           <span className="text-3xl leading-none select-none">{tile.value}</span>
                       </div>
                   );
               })}
           </div>
       </div>
       
       {gameOver && (
           <div className="mt-4 text-arcade-neon font-pixel animate-bounce text-xl">
               CLEARED!
           </div>
       )}
       <p className="mt-2 text-xs text-gray-400 text-center max-w-[300px]">
          {t('mahjongControls', language)}
       </p>
    </div>
  );
};

export default MahjongGame;
