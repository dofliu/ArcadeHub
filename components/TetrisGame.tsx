import React, { useState, useEffect, useRef } from 'react';
import { TETROMINOS, TETRIS_HEIGHT, TETRIS_WIDTH } from '../constants';
import { TetrominoType, GameResult, GameType } from '../types';
import { Play, RotateCw, ArrowDown, ArrowLeft, ArrowRight, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface TetrisGameProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

// Helper to create empty board
const createStage = () => 
  Array.from(Array(TETRIS_HEIGHT), () => 
    Array(TETRIS_WIDTH).fill([0, 'clear'])
  );

const randomTetromino = () => {
  const tetrominos = 'IJLOSTZ';
  const randTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)] as TetrominoType;
  return TETROMINOS[randTetromino];
};

const TetrisGame: React.FC<TetrisGameProps> = ({ onGameOver, language }) => {
  const [stage, setStage] = useState(createStage());
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isAuto, setIsAuto] = useState(false);

  const [player, setPlayer] = useState({
    pos: { x: 0, y: 0 },
    tetromino: TETROMINOS['I'].shape,
    collided: false,
    type: 'I',
    color: TETROMINOS['I'].color
  });

  const movePlayer = (dir: number) => {
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      setPlayer(prev => ({
        ...prev,
        pos: { x: prev.pos.x + dir, y: prev.pos.y }
      }));
      if (!isAuto) soundService.playMove();
    }
  };

  const startGame = (auto: boolean = false) => {
    setStage(createStage());
    setDropTime(auto ? 50 : 1000);
    setScore(0);
    setGameOver(false);
    setIsAuto(auto);
    const newPiece = randomTetromino();
    setPlayer({
      pos: { x: TETRIS_WIDTH / 2 - 2, y: 0 },
      tetromino: newPiece.shape,
      collided: false,
      type: newPiece.type as string,
      color: newPiece.color
    });
    soundService.playMove();
  };

  const checkCollision = (playerObj: any, stageArr: any[], { x: moveX, y: moveY }: { x: number, y: number }) => {
    for (let y = 0; y < playerObj.tetromino.length; y += 1) {
      for (let x = 0; x < playerObj.tetromino[y].length; x += 1) {
        if (playerObj.tetromino[y][x] !== 0) {
          if (
            !stageArr[y + playerObj.pos.y + moveY] ||
            !stageArr[y + playerObj.pos.y + moveY][x + playerObj.pos.x + moveX] ||
            stageArr[y + playerObj.pos.y + moveY][x + playerObj.pos.x + moveX][1] !== 'clear'
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // --- Auto Play Logic ---
  const autoMoveRef = useRef(false);

  useEffect(() => {
    if (!isAuto || gameOver || player.collided) return;
    
    // Only calculate once per piece spawn
    if (autoMoveRef.current) return; 
    autoMoveRef.current = true;

    // Simple AI: Iterate all rotations and positions, score them
    let bestScore = -Infinity;
    let bestX = 0;
    let bestRotation = 0;

    const originalShape = player.tetromino;
    let currentShape = JSON.parse(JSON.stringify(originalShape));

    for (let r = 0; r < 4; r++) {
      // For this rotation, try all X
      for (let x = -2; x < TETRIS_WIDTH; x++) {
        // Check if x is valid for this shape
        // Simulate dropping
        let y = 0;
        // Check if valid start
        const testPlayer = { ...player, pos: { x, y }, tetromino: currentShape };
        if (checkCollision(testPlayer, stage, { x: 0, y: 0 })) continue;

        // Drop until collision
        while (!checkCollision(testPlayer, stage, { x: 0, y: 1 })) {
          y++;
          testPlayer.pos.y = y;
        }

        // Score this state
        // Heuristics: +Height(bad), +Holes(bad), +LinesCleared(good)
        let height = TETRIS_HEIGHT - y;
        let lines = 0;
        let holes = 0;
        // Simply counting holes below the piece is complex without full board clone
        // Simplified: Maximize Y (lower is better), Minimize Height added
        
        // To do it properly, we need to conceptually place the piece on the board
        // This is computationally heavy for JS main thread if not careful, 
        // so we stick to very simple heuristic: Maximize Drop Y
        
        const score = y; 
        
        if (score > bestScore) {
           bestScore = score;
           bestX = x;
           bestRotation = r;
        }
      }
      // Rotate for next loop
      currentShape = rotate(currentShape, 1);
    }

    // Execute Moves
    // We can't just jump to state, we have to animate/set state sequentially or instant
    // For demo purpose, let's teleport the X and Rotation, then let gravity do the rest
    
    // Apply rotation
    let targetShape = originalShape;
    for(let i=0; i<bestRotation; i++) {
       targetShape = rotate(targetShape, 1);
    }

    setPlayer(prev => ({
       ...prev,
       tetromino: targetShape,
       pos: { x: bestX, y: prev.pos.y }
    }));

  }, [isAuto, player.type, player.collided]); // Re-run when new piece spawns (type changes or collision reset)

  // Reset the ref when a new piece spawns
  useEffect(() => {
      autoMoveRef.current = false;
  }, [player.type]);

  const drop = () => {
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      setPlayer(prev => ({
        ...prev,
        pos: { x: prev.pos.x, y: prev.pos.y + 1 }
      }));
    } else {
      if (player.pos.y < 1) {
        setGameOver(true);
        setDropTime(null);
        setIsAuto(false);
        soundService.playExplosion();
        if (!isAuto) {
           onGameOver({ game: language === 'zh' ? '俄羅斯方塊' : 'Tetris', gameId: GameType.TETRIS, score });
        }
      }
      setPlayer(prev => ({ ...prev, collided: true }));
      if(!isAuto) soundService.playMove(); 
    }
  };

  const keyUp = ({ keyCode }: { keyCode: number }) => {
    if (!gameOver) {
      if (keyCode === 40) {
        setDropTime(1000);
      }
    }
  };

  const dropPlayer = () => {
    setDropTime(null);
    drop();
  };

  const rotate = (matrix: any[], dir: number) => {
    const rotatedTetro = matrix.map((_, index) =>
      matrix.map(col => col[index])
    );
    if (dir > 0) return rotatedTetro.map((row: any[]) => row.reverse());
    return rotatedTetro.reverse();
  };

  const playerRotate = (stageArr: any[], dir: number) => {
    const clonedPlayer = JSON.parse(JSON.stringify(player));
    clonedPlayer.tetromino = rotate(clonedPlayer.tetromino, dir);

    const pos = clonedPlayer.pos.x;
    let offset = 1;
    while (checkCollision(clonedPlayer, stageArr, { x: 0, y: 0 })) {
      clonedPlayer.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > clonedPlayer.tetromino[0].length) {
        rotate(clonedPlayer.tetromino, -dir);
        clonedPlayer.pos.x = pos;
        return;
      }
    }
    setPlayer(clonedPlayer);
    if(!isAuto) soundService.playRotate();
  };

  useEffect(() => {
    const updateStage = (prevStage: any[]) => {
      const newStage = prevStage.map(row =>
        row.map((cell: any[]) => (cell[1] === 'clear' ? [0, 'clear'] : cell))
      );

      player.tetromino.forEach((row: any[], y: number) => {
        row.forEach((value: number, x: number) => {
          if (value !== 0) {
            const stageY = y + player.pos.y;
            const stageX = x + player.pos.x;
            if (newStage[stageY] && newStage[stageY][stageX]) {
               newStage[stageY][stageX] = [
                 value,
                 `${player.collided ? 'merged' : 'clear'}`,
                 player.color
               ];
            }
          }
        });
      });

      if (player.collided) {
        const newPiece = randomTetromino();
        setPlayer({
          pos: { x: TETRIS_WIDTH / 2 - 2, y: 0 },
          tetromino: newPiece.shape,
          collided: false,
          type: newPiece.type as string,
          color: newPiece.color
        });

        const finalStage = newStage.reduce((ack, row) => {
           if (row.every((cell: any[]) => cell[0] !== 0)) {
             setScore(prev => prev + 100);
             soundService.playScore();
             ack.unshift(new Array(newStage[0].length).fill([0, 'clear']));
             return ack;
           }
           ack.push(row);
           return ack;
        }, []);
        
        return finalStage;
      }

      return newStage;
    };

    setStage(prev => updateStage(prev));
  }, [player.collided, player.pos.x, player.pos.y, player.tetromino, player.color]);

  useEffect(() => {
    if (!dropTime) return;
    const id = setInterval(() => {
      drop();
    }, dropTime);
    return () => clearInterval(id);
  }, [dropTime, drop]);

  const move = ({ key }: { key: string }) => {
    if (!gameOver && !isAuto) {
      if (key === 'ArrowLeft') movePlayer(-1);
      if (key === 'ArrowRight') movePlayer(1);
      if (key === 'ArrowDown') dropPlayer();
      if (key === 'ArrowUp') playerRotate(stage, 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => move({ key: e.key });
    const handleKeyUp = (e: KeyboardEvent) => keyUp({ keyCode: e.keyCode });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    }
  }, [player, stage, gameOver, isAuto]);

  return (
    <div className="flex flex-col items-center">
       <div className="flex justify-between w-full max-w-[250px] mb-4">
          <div className="font-pixel text-arcade-neon">SCORE: {score}</div>
          {!dropTime && !gameOver ? null : (
             <div className="flex gap-2">
                {!gameOver && !isAuto && (
                    <button onClick={() => startGame(true)} className="flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon">
                      <Bot size={14} />
                    </button>
                )}
                {isAuto && (
                   <button onClick={() => setIsAuto(false)} className="text-xs bg-red-500 px-2 py-1 rounded animate-pulse text-white">
                      STOP
                   </button>
                )}
                {!isAuto && (
                  <button onClick={() => startGame(false)} className="text-sm bg-arcade-primary px-3 py-1 rounded hover:bg-red-600 transition">
                    {gameOver ? (language === 'zh' ? '再試一次' : 'Retry') : (language === 'zh' ? '開始' : 'Start')}
                  </button>
                )}
             </div>
          )}
       </div>

       <div 
         className="bg-gray-900 border-4 border-arcade-secondary grid gap-[1px]"
         style={{
            gridTemplateRows: `repeat(${TETRIS_HEIGHT}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${TETRIS_WIDTH}, minmax(0, 1fr))`,
            width: '250px',
            height: '500px'
         }}
       >
          {stage.map((row, y) => 
            row.map((cell: any[], x: number) => (
              <div 
                key={`${y}-${x}`} 
                className={`w-full h-full ${cell[0] === 0 ? 'bg-gray-900' : cell[2] || 'bg-gray-500'}`}
                style={{ border: cell[0] !== 0 ? '1px solid rgba(0,0,0,0.2)' : 'none' }}
              />
            ))
          )}
       </div>

       {!isAuto && (
        <div className="grid grid-cols-3 gap-3 mt-6 md:hidden w-[250px]">
            <button className="p-3 bg-arcade-secondary rounded active:bg-arcade-primary flex justify-center" onClick={() => playerRotate(stage, 1)}><RotateCw /></button>
            <button className="p-3 bg-arcade-secondary rounded active:bg-arcade-primary flex justify-center" onClick={dropPlayer}><ArrowDown /></button>
            <div /> 
            <button className="p-3 bg-arcade-secondary rounded active:bg-arcade-primary flex justify-center" onClick={() => movePlayer(-1)}><ArrowLeft /></button>
            <div />
            <button className="p-3 bg-arcade-secondary rounded active:bg-arcade-primary flex justify-center" onClick={() => movePlayer(1)}><ArrowRight /></button>
        </div>
       )}
    </div>
  );
};

export default TetrisGame;