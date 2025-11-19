
import React, { useEffect, useState } from 'react';
import { getGameCommentary } from '../services/geminiService';
import { GameResult, Language, AIPersona } from '../types';
import { Sparkles, Bot, Skull, Heart } from 'lucide-react';
import { t } from '../i18n';

interface AICommentaryProps {
  result: GameResult | null;
  onClose: () => void;
  language: Language;
  persona: AIPersona;
}

const AICommentary: React.FC<AICommentaryProps> = ({ result, onClose, language, persona }) => {
  const [commentary, setCommentary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (result) {
      setLoading(true);
      getGameCommentary(result.game, result.score, language, persona)
        .then(text => {
          setCommentary(text);
        })
        .catch(() => setCommentary(language === 'zh' ? "AI 正在休息中..." : "AI is sleeping..."))
        .finally(() => setLoading(false));
    }
  }, [result, language, persona]);

  if (!result) return null;

  const getIcon = () => {
    switch(persona) {
      case 'pirate': return <Skull className="w-8 h-8" />;
      case 'encouraging': return <Heart className="w-8 h-8" />;
      default: return <Bot className="w-8 h-8" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-arcade-secondary border-2 border-arcade-neon rounded-xl p-6 max-w-md w-full shadow-2xl transform transition-all scale-100 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4 text-arcade-neon">
          {getIcon()}
          <h3 className="text-xl font-bold font-pixel">{t('gameOver', language)}</h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-300 text-sm uppercase tracking-wider">{t('score', language)}</p>
          <p className="text-4xl font-bold text-white font-pixel">{result.score}</p>
        </div>

        <div className="bg-arcade-dark p-4 rounded-lg mb-6 min-h-[80px] flex items-center relative border border-gray-700">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 animate-pulse">
              <Sparkles className="w-4 h-4" />
              <span className="font-pixel">{t('aiThinking', language)}</span>
            </div>
          ) : (
            <p className="text-lg text-gray-100 leading-relaxed">"{commentary}"</p>
          )}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 bg-arcade-primary hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors font-pixel text-sm"
          >
            {t('playAgain', language)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AICommentary;