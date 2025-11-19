import React, { useState, useEffect, useRef } from 'react';
import { GameResult, GameType } from '../types';
import { RefreshCw, HelpCircle, Bot } from 'lucide-react';
import { soundService } from '../services/soundService';
import { t } from '../i18n';

interface MemoryGameProps {
  onGameOver: (result: GameResult) => void;
  language: 'zh' | 'en';
}

const CARD_PAIRS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐯', '🦁', '🐮', '🐷', '🐸', '🐙', '🐵', '🐔'
]; 

const GRID_SIZE = 4; 

interface Card {
  id: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryGame: React.FC<MemoryGameProps> = ({ onGameOver, language }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  
  const autoTimeoutRef = useRef<number | null>(null);

  const initGame = (auto: boolean = false) => {
    const selectedEmojis = CARD_PAIRS.slice(0, (GRID_SIZE * GRID_SIZE) / 2);
    const deck = [...selectedEmojis, ...selectedEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        content: emoji,
        isFlipped: false,
        isMatched: false
      }));
    
    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
    setIsLocked(false);
    setIsAuto(auto);
    soundService.playMove();
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleCardClick = (index: number) => {
    if (isLocked || cards[index].isFlipped || cards[index].isMatched) return;

    if (!isAuto) soundService.playRotate();

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    
    const newFlippedIndices = [...flippedIndices, index];
    setFlippedIndices(newFlippedIndices);

    if (newFlippedIndices.length === 2) {
      setIsLocked(true);
      setMoves(m => m + 1);

      const [firstIndex, secondIndex] = newFlippedIndices;
      
      if (newCards[firstIndex].content === newCards[secondIndex].content) {
        // Match
        if(!isAuto) soundService.playScore();
        setTimeout(() => {
          newCards[firstIndex].isMatched = true;
          newCards[secondIndex].isMatched = true;
          setCards(newCards);
          setFlippedIndices([]);
          setIsLocked(false);

          // Check Win
          if (newCards.every(c => c.isMatched)) {
             const finalScore = Math.max(100, 1000 - (moves * 10));
             setIsAuto(false);
             soundService.playWin();
             if(!isAuto) {
                 onGameOver({ 
                    game: language === 'zh' ? '記憶翻牌' : 'Memory Match', 
                    gameId: GameType.MEMORY, 
                    score: finalScore 
                 });
             }
          }
        }, 500);
      } else {
        // No Match
        setTimeout(() => {
          newCards[firstIndex].isFlipped = false;
          newCards[secondIndex].isFlipped = false;
          setCards(newCards);
          setFlippedIndices([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  // Auto Play Logic
  useEffect(() => {
    if (isAuto && !isLocked) {
        autoTimeoutRef.current = window.setTimeout(() => {
            // Find first unmatched card
            const unmatched = cards.map((c, i) => ({...c, originalIndex: i})).filter(c => !c.isMatched);
            
            if (unmatched.length > 0) {
                // If we have one flipped, find its pair
                if (flippedIndices.length === 1) {
                    const current = cards[flippedIndices[0]];
                    const pair = unmatched.find(c => c.content === current.content && c.originalIndex !== flippedIndices[0]);
                    if (pair) {
                        handleCardClick(pair.originalIndex);
                    }
                } else {
                    // Flip the first unmatched one
                    handleCardClick(unmatched[0].originalIndex);
                }
            }
        }, 600);
    }
    return () => {
        if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    }
  }, [isAuto, isLocked, flippedIndices, cards]);


  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="flex justify-between w-full mb-4 px-4 items-center">
        <div className="bg-arcade-secondary px-4 py-2 rounded">
          <span className="text-gray-400 text-xs block">{language === 'zh' ? '步數' : 'MOVES'}</span>
          <span className="text-xl font-bold text-white">{moves}</span>
        </div>
        <div className="flex gap-2">
            <button onClick={() => initGame(true)} className={`flex items-center gap-1 text-xs bg-arcade-accent px-2 py-1 rounded hover:bg-arcade-secondary transition border border-arcade-neon/50 text-arcade-neon ${isAuto ? 'animate-pulse bg-red-500/20' : ''}`}>
                <Bot size={14} /> {isAuto ? t('stopAuto', language) : t('autoMode', language)}
            </button>
            <button onClick={() => initGame(false)} className="bg-arcade-primary p-2 rounded hover:bg-red-600 transition">
               <RefreshCw size={20} />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 p-2 bg-gray-800 rounded-lg">
        {cards.map((card, index) => (
          <div
            key={card.id}
            onClick={() => !isAuto && handleCardClick(index)}
            className={`
              w-16 h-16 sm:w-20 sm:h-20 cursor-pointer rounded-lg flex items-center justify-center text-3xl transition-all duration-300 transform
              ${card.isFlipped || card.isMatched ? 'bg-arcade-secondary rotate-y-180' : 'bg-arcade-accent hover:bg-gray-700'}
              ${card.isMatched ? 'opacity-50' : ''}
            `}
            style={{ perspective: '1000px' }}
          >
            {card.isFlipped || card.isMatched ? (
              <span className="animate-fade-in">{card.content}</span>
            ) : (
              <HelpCircle className="text-gray-600 w-8 h-8" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryGame;