
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinate, Direction, GameResult, GameType } from '../types';
import { SNAKE_GRID_SIZE } from '../constants';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, RefreshCw, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface SnakeGameProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const GRID_W = 20;
const GRID_H = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const SPEED = 100; 
const AUTO_SPEED = 150; // Slower for better demo viewing
const OBSTACLE_COUNT = 8;

const SnakeGame: React.FC<SnakeGameProps> = ({ onGameOver, language }) => {
  const [snake, setSnake] = useState<Coordinate[]>(INITIAL_SNAKE);
  // Use Ref to hold the latest snake state for immediate AI calculation without render lag
  const snakeRef = useRef<Coordinate[]>(INITIAL_SNAKE);
  
  const [food, setFood] = useState<Coordinate>({ x: 5, y: 5 });
  const [obstacles, setObstacles] = useState<Coordinate[]>([]);
  const [direction, setDirection] = useState<Direction>(Direction.UP);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [score, setScore] = useState(0);
  
  const directionRef = useRef<Direction>(Direction.UP);

  const generateObstacles = useCallback((currentSnake: Coordinate[]) => {
    const newObstacles: Coordinate[] = [];
    while (newObstacles.length < OBSTACLE_COUNT) {
      const obs = {
        x: Math.floor(Math.random() * GRID_W),
        y: Math.floor(Math.random() * GRID_H)
      };
      // Avoid snake
      const hitSnake = currentSnake.some(s => s.x === obs.x && s.y === obs.y);
      // Avoid existing obstacles
      const hitObs = newObstacles.some(o => o.x === obs.x && o.y === obs.y);
      // Avoid too close to center (initial spawn area) to prevent instant death
      const inCenter = obs.x > 8 && obs.x < 12 && obs.y > 8 && obs.y < 12;
      // Avoid immediate surroundings of the head to be super safe
      const nearHead = Math.abs(obs.x - currentSnake[0].x) < 3 && Math.abs(obs.y - currentSnake[0].y) < 3;

      if (!hitSnake && !hitObs && !inCenter && !nearHead) {
        newObstacles.push(obs);
      }
    }
    return newObstacles;
  }, []);

  const generateFood = useCallback((currentSnake: Coordinate[], currentObstacles: Coordinate[]): Coordinate => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_W),
        y: Math.floor(Math.random() * GRID_H)
      };
      const hitSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      const hitObstacle = currentObstacles.some(obs => obs.x === newFood.x && obs.y === newFood.y);
      if (!hitSnake && !hitObstacle) break;
    }
    return newFood;
  }, []);

  const resetGame = (auto: boolean = false) => {
    const initialSnake = [...INITIAL_SNAKE];
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    
    const newObstacles = generateObstacles(initialSnake);
    setObstacles(newObstacles);
    setFood(generateFood(initialSnake, newObstacles));
    setDirection(Direction.UP);
    directionRef.current = Direction.UP;
    setScore(0);
    setIsPlaying(true);
    setIsAuto(auto);
    soundService.playMove();
  };

  const changeDirection = (newDir: Direction) => {
    const currentDir = directionRef.current;
    if (newDir === Direction.UP && currentDir === Direction.DOWN) return;
    if (newDir === Direction.DOWN && currentDir === Direction.UP) return;
    if (newDir === Direction.LEFT && currentDir === Direction.RIGHT) return;
    if (newDir === Direction.RIGHT && currentDir === Direction.LEFT) return;
    
    setDirection(newDir);
    directionRef.current = newDir;
  };

  // --- Advanced AI Logic ---

  const isValidPos = (pos: Coordinate, currentSnake: Coordinate[]) => {
    // Wall
    if (pos.x < 0 || pos.x >= GRID_W || pos.y < 0 || pos.y >= GRID_H) return false;
    // Obstacles
    if (obstacles.some(o => o.x === pos.x && o.y === pos.y)) return false;
    // Body (Check all segments)
    // Note: Tail will move, but for safety in pathfinding, treat it as solid
    if (currentSnake.some(s => s.x === pos.x && s.y === pos.y)) return false;
    return true;
  };

  const getNeighbor = (pos: Coordinate, dir: Direction): Coordinate => {
    switch(dir) {
      case Direction.UP: return { x: pos.x, y: pos.y - 1 };
      case Direction.DOWN: return { x: pos.x, y: pos.y + 1 };
      case Direction.LEFT: return { x: pos.x - 1, y: pos.y };
      case Direction.RIGHT: return { x: pos.x + 1, y: pos.y };
    }
  };

  // BFS to find shortest path to Food
  const findPathToFood = (start: Coordinate, target: Coordinate, currentSnake: Coordinate[]): Direction | null => {
    const queue: { pos: Coordinate; firstMove: Direction | null }[] = [
      { pos: start, firstMove: null }
    ];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);

    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const opposites = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT
    };
    
    // Critical: Don't reverse current direction
    const badDir = opposites[directionRef.current];

    while (queue.length > 0) {
      const { pos, firstMove } = queue.shift()!;

      if (pos.x === target.x && pos.y === target.y) {
        return firstMove;
      }

      for (const dir of dirs) {
        // Logic Check: If this is the very first step, it cannot be the opposite of current direction
        if (firstMove === null && dir === badDir) continue;

        const nextPos = getNeighbor(pos, dir);
        const key = `${nextPos.x},${nextPos.y}`;

        if (isValidPos(nextPos, currentSnake) && !visited.has(key)) {
          visited.add(key);
          queue.push({ 
            pos: nextPos, 
            firstMove: firstMove || dir 
          });
        }
      }
    }
    return null;
  };

  // Flood Fill to calculate open space (Survival Mode)
  const countAccessibleSpace = (start: Coordinate, currentSnake: Coordinate[]): number => {
    const queue = [start];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);
    let count = 0;

    while (queue.length > 0) {
      const pos = queue.shift()!;
      count++;

      const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
      for (const dir of dirs) {
        const nextPos = getNeighbor(pos, dir);
        const key = `${nextPos.x},${nextPos.y}`;
        if (isValidPos(nextPos, currentSnake) && !visited.has(key)) {
          visited.add(key);
          queue.push(nextPos);
        }
      }
    }
    return count;
  };

  const getNextAutoMove = (currentSnake: Coordinate[]) => {
    const head = currentSnake[0];
    
    // Step 1: Try to find path to food
    const bestMoveToFood = findPathToFood(head, food, currentSnake);
    
    if (bestMoveToFood) {
       return bestMoveToFood;
    }

    // Step 2: If no path to food (blocked), pick the move with most open space (Survival)
    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const opposites = {
        [Direction.UP]: Direction.DOWN,
        [Direction.DOWN]: Direction.UP,
        [Direction.LEFT]: Direction.RIGHT,
        [Direction.RIGHT]: Direction.LEFT
    };

    let safestMove = directionRef.current;
    let maxSpace = -1;

    for (const dir of dirs) {
      if (dir === opposites[directionRef.current]) continue; // Don't reverse

      const nextPos = getNeighbor(head, dir);
      if (isValidPos(nextPos, currentSnake)) {
        const space = countAccessibleSpace(nextPos, currentSnake);
        if (space > maxSpace) {
          maxSpace = space;
          safestMove = dir;
        }
      }
    }

    return safestMove;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isAuto) return; // Disable controls in auto mode
    switch (e.key) {
      case 'ArrowUp': changeDirection(Direction.UP); break;
      case 'ArrowDown': changeDirection(Direction.DOWN); break;
      case 'ArrowLeft': changeDirection(Direction.LEFT); break;
      case 'ArrowRight': changeDirection(Direction.RIGHT); break;
    }
  }, [isAuto]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying) return;

    const moveSnake = () => {
      // Use the Ref to get the absolute latest state for AI calculation
      const currentSnakeState = snakeRef.current;

      if (isAuto) {
        const nextDir = getNextAutoMove(currentSnakeState);
        if (nextDir) {
           setDirection(nextDir);
           directionRef.current = nextDir;
        }
      }

      // Calculate new head based on current confirmed direction
      const head = currentSnakeState[0];
      const currentDir = directionRef.current;
      const newHead = { ...head };

      if (currentDir === Direction.UP) newHead.y -= 1;
      if (currentDir === Direction.DOWN) newHead.y += 1;
      if (currentDir === Direction.LEFT) newHead.x -= 1;
      if (currentDir === Direction.RIGHT) newHead.x += 1;

      // Collision Check
      if (newHead.x < 0 || newHead.x >= GRID_W || newHead.y < 0 || newHead.y >= GRID_H || 
          currentSnakeState.some(segment => segment.x === newHead.x && segment.y === newHead.y) ||
          obstacles.some(obs => obs.x === newHead.x && obs.y === newHead.y)) {
        
        setIsPlaying(false);
        soundService.playExplosion();
        if (!isAuto) {
           onGameOver({ game: language === 'zh' ? '貪食蛇' : 'Snake', gameId: GameType.SNAKE, score });
        } else {
           setIsAuto(false); 
        }
        return;
      }

      const newSnake = [newHead, ...currentSnakeState];

      // Eat Food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        soundService.playScore();
        setFood(generateFood(newSnake, obstacles));
      } else {
        newSnake.pop();
      }

      // Update State and Ref
      setSnake(newSnake);
      snakeRef.current = newSnake;
    };

    const gameLoop = setInterval(moveSnake, isAuto ? AUTO_SPEED : SPEED);
    return () => clearInterval(gameLoop);
  }, [isPlaying, food, generateFood, onGameOver, score, language, obstacles, isAuto]);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="flex justify-between w-full mb-4 px-2">
        <div className="font-pixel text-arcade-neon">SCORE: {score}</div>
        {!isPlaying && (
           <div className="flex gap-2">
             <button onClick={() => resetGame(true)} className="flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon">
               <Bot size={14} /> {t('autoMode', language)}
             </button>
             <button onClick={() => resetGame(false)} className="flex items-center gap-2 text-sm bg-arcade-primary px-3 py-1 rounded hover:bg-red-600 transition">
               {score === 0 ? <Play size={16} /> : <RefreshCw size={16} />}
               {score === 0 ? (language === 'zh' ? '開始' : 'Start') : (language === 'zh' ? '重來' : 'Retry')}
             </button>
           </div>
        )}
        {isPlaying && isAuto && (
            <button onClick={() => { setIsPlaying(false); setIsAuto(false); }} className="flex items-center gap-2 text-xs bg-red-500 px-3 py-1 rounded animate-pulse">
               {t('stopAuto', language)}
            </button>
        )}
      </div>

      <div 
        className="bg-gray-900 border-4 border-arcade-secondary relative shadow-lg"
        style={{ 
          width: GRID_W * SNAKE_GRID_SIZE, 
          height: GRID_H * SNAKE_GRID_SIZE 
        }}
      >
        {/* Obstacles */}
        {obstacles.map((obs, i) => (
          <div
            key={`obs-${i}`}
            className="absolute bg-gray-700 border border-gray-600 rounded-sm flex items-center justify-center"
            style={{
              width: SNAKE_GRID_SIZE,
              height: SNAKE_GRID_SIZE,
              left: obs.x * SNAKE_GRID_SIZE,
              top: obs.y * SNAKE_GRID_SIZE,
            }}
          >
             <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          </div>
        ))}

        {/* Snake */}
        {snake.map((segment, i) => (
          <div
            key={`${segment.x}-${segment.y}-${i}`}
            className={`absolute transition-all duration-100 ${i === 0 ? (isAuto ? 'bg-arcade-neon z-10' : 'bg-green-400 z-10') : (isAuto ? 'bg-cyan-700' : 'bg-green-600')}`}
            style={{
              width: SNAKE_GRID_SIZE - 1,
              height: SNAKE_GRID_SIZE - 1,
              left: segment.x * SNAKE_GRID_SIZE,
              top: segment.y * SNAKE_GRID_SIZE,
              borderRadius: i === 0 ? '4px' : '1px'
            }}
          >
             {i === 0 && (
                <div className="absolute inset-0 flex items-center justify-center gap-[2px]">
                   <div className="w-1 h-1 bg-black rounded-full"></div>
                   <div className="w-1 h-1 bg-black rounded-full"></div>
                </div>
             )}
          </div>
        ))}
        
        {/* Food */}
        <div
          className="absolute bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"
          style={{
            width: SNAKE_GRID_SIZE - 4,
            height: SNAKE_GRID_SIZE - 4,
            left: food.x * SNAKE_GRID_SIZE + 2,
            top: food.y * SNAKE_GRID_SIZE + 2,
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-6 md:hidden">
        <div />
        <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary" onClick={() => changeDirection(Direction.UP)}><ArrowUp /></button>
        <div />
        <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary" onClick={() => changeDirection(Direction.LEFT)}><ArrowLeft /></button>
        <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary" onClick={() => changeDirection(Direction.DOWN)}><ArrowDown /></button>
        <button className="p-4 bg-arcade-secondary rounded-lg active:bg-arcade-primary" onClick={() => changeDirection(Direction.RIGHT)}><ArrowRight /></button>
      </div>
    </div>
  );
};

export default SnakeGame;
