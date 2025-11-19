
import React, { useState } from 'react';
import { GameType, LeaderboardEntry, Language } from '../types';
import { getLeaderboard } from '../services/storageService';
import { Trophy, ArrowLeft } from 'lucide-react';
import { t } from '../i18n';

interface LeaderboardProps {
  onBack: () => void;
  language: Language;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack, language }) => {
  const [selectedGame, setSelectedGame] = useState<GameType>(GameType.SNAKE);
  const [scores, setScores] = useState<LeaderboardEntry[]>(getLeaderboard(GameType.SNAKE));

  const handleGameChange = (game: GameType) => {
    setSelectedGame(game);
    setScores(getLeaderboard(game));
  };

  // Filter out MENU and LEADERBOARD from the list
  const games = Object.values(GameType).filter(
    g => g !== GameType.MENU && g !== GameType.LEADERBOARD
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-arcade-secondary/50 p-6 rounded-xl border border-arcade-primary flex flex-col h-[80vh]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <button onClick={onBack} className="text-gray-300 hover:text-white flex items-center gap-2">
          <ArrowLeft size={20} /> {t('backToMenu', language)}
        </button>
        <h2 className="text-2xl font-pixel text-arcade-neon flex items-center gap-3">
          <Trophy className="text-yellow-400" /> {t('leaderboard', language)}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 justify-center shrink-0">
        {games.map((game) => (
          <button
            key={game}
            onClick={() => handleGameChange(game)}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
              selectedGame === game 
                ? 'bg-arcade-primary text-white shadow-lg scale-105' 
                : 'bg-arcade-dark text-gray-400 hover:bg-gray-700'
            }`}
          >
            {t(game, language)}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-lg overflow-hidden flex-1 overflow-y-auto border border-gray-800">
        <table className="w-full text-left">
          <thead className="bg-gray-800 text-gray-400 sticky top-0">
            <tr>
              <th className="p-4 text-center w-16">#</th>
              <th className="p-4">{t('enterName', language).replace('請輸入你的名字', '玩家').replace('Enter Your Name', 'Player')}</th>
              <th className="p-4 text-right">{t('score', language)}</th>
            </tr>
          </thead>
          <tbody>
            {scores.length > 0 ? (
              scores.map((entry, index) => (
                <tr key={index} className="border-t border-gray-800 hover:bg-gray-800/50 transition">
                  <td className="p-4 text-center font-pixel text-arcade-neon">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td className="p-4 font-bold text-white">{entry.playerName}</td>
                  <td className="p-4 text-right font-pixel text-arcade-primary">{entry.score}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-12 text-center text-gray-500">
                  {t('noData', language)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
