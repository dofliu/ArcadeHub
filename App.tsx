
import React, { useState, useEffect } from 'react';
import { GameType, GameResult, Language, AIPersona } from './types';
import SnakeGame from './components/SnakeGame';
import TetrisGame from './components/TetrisGame';
import Game2048 from './components/Game2048';
import BreakoutGame from './components/BreakoutGame';
import MinesweeperGame from './components/MinesweeperGame';
import MemoryGame from './components/MemoryGame';
import WhackAMoleGame from './components/WhackAMoleGame';
import SpaceInvadersGame from './components/SpaceInvadersGame';
import SimonSaysGame from './components/SimonSaysGame';
import DinoGame from './components/DinoGame';
import FroggerGame from './components/FroggerGame';
import ReversiGame from './components/ReversiGame';
import GomokuGame from './components/GomokuGame';
import PixelJumpGame from './components/PixelJumpGame';
import Leaderboard from './components/Leaderboard';
import AICommentary from './components/AICommentary';
import { Gamepad2, Grid3x3, Move, Bomb, BoxSelect, Trophy, User, Volume2, VolumeX, Languages, BrainCircuit, MousePointer2, Rocket, Disc, ArrowUpCircle, Skull, Smile, Zap, Footprints, AlignJustify, CircleDot, Circle, Activity } from 'lucide-react';
import { saveScore } from './services/storageService';
import { soundService } from './services/soundService';
import { t } from './i18n';

function App() {
  const [activeGame, setActiveGame] = useState<GameType>(GameType.MENU);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [aiPersona, setAiPersona] = useState<AIPersona>('sarcastic');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  // Try to load name from storage on boot
  useEffect(() => {
    const savedName = localStorage.getItem('arcade_player_name');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      localStorage.setItem('arcade_player_name', playerName);
      setIsLoggedIn(true);
      soundService.playMove(); // Also initializes Audio Context
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundService.setEnabled(newState);
    if (newState) soundService.playMove();
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
    soundService.playMove();
  };

  const changePersona = (persona: AIPersona) => {
    setAiPersona(persona);
    setShowPersonaMenu(false);
    soundService.playMove();
  };

  const handleGameOver = (result: GameResult) => {
    setLastResult(result);
    if (playerName) {
      saveScore(result.gameId, playerName, result.score);
    }
  };

  const closeCommentary = () => {
    setLastResult(null);
  };

  const backToMenu = () => {
    setActiveGame(GameType.MENU);
    setLastResult(null);
    soundService.playMove();
  };

  const renderGame = () => {
    switch (activeGame) {
      case GameType.SNAKE:
        return <SnakeGame onGameOver={handleGameOver} language={language} />;
      case GameType.TETRIS:
        return <TetrisGame onGameOver={handleGameOver} language={language} />;
      case GameType.GAME2048:
        return <Game2048 onGameOver={handleGameOver} language={language} />;
      case GameType.BREAKOUT:
        return <BreakoutGame onGameOver={handleGameOver} language={language} />;
      case GameType.MINESWEEPER:
        return <MinesweeperGame onGameOver={handleGameOver} language={language} />;
      case GameType.MEMORY:
        return <MemoryGame onGameOver={handleGameOver} language={language} />;
      case GameType.WHACKAMOLE:
        return <WhackAMoleGame onGameOver={handleGameOver} language={language} />;
      case GameType.SPACEINVADERS:
        return <SpaceInvadersGame onGameOver={handleGameOver} language={language} />;
      case GameType.SIMONSAYS:
        return <SimonSaysGame onGameOver={handleGameOver} language={language} />;
      case GameType.DINO:
        return <DinoGame onGameOver={handleGameOver} language={language} />;
      case GameType.FROGGER:
        return <FroggerGame onGameOver={handleGameOver} language={language} />;
      case GameType.REVERSI:
        return <ReversiGame onGameOver={handleGameOver} language={language} />;
      case GameType.GOMOKU:
        return <GomokuGame onGameOver={handleGameOver} language={language} />;
      case GameType.PIXELJUMP:
        return <PixelJumpGame onGameOver={handleGameOver} language={language} />;
      case GameType.LEADERBOARD:
        return <Leaderboard onBack={backToMenu} language={language} />;
      default:
        return null;
    }
  };

  // Welcome/Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-arcade-dark text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="scanline"></div>
        <div className="crt-overlay fixed inset-0 z-50"></div>
        <div className="crt-vignette fixed inset-0 z-40"></div>
        
        <div className="max-w-md w-full bg-arcade-secondary p-8 rounded-xl border-2 border-arcade-primary shadow-[0_0_50px_rgba(233,69,96,0.2)] text-center relative z-50">
          <div className="flex justify-center mb-6">
             <div className="bg-arcade-primary p-4 rounded-full shadow-lg animate-bounce">
               <Gamepad2 size={48} />
             </div>
          </div>
          <h1 className="text-4xl font-bold font-pixel text-transparent bg-clip-text bg-gradient-to-r from-arcade-neon to-arcade-primary mb-2">
            {t('appTitle', language)}
          </h1>
          <p className="text-gray-400 mb-8">{t('subtitle', language)}</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={t('enterName', language)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-arcade-neon transition"
                maxLength={12}
              />
            </div>
            <button 
              type="submit"
              disabled={!playerName.trim()}
              className="w-full bg-arcade-primary hover:bg-red-600 disabled:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all font-pixel shadow-lg"
            >
              {t('startButton', language)}
            </button>
          </form>

          <div className="mt-6 flex justify-center gap-4">
             <button onClick={toggleLanguage} className="flex items-center gap-2 text-xs text-gray-500 hover:text-white">
               <Languages size={14} /> {language === 'zh' ? 'English' : '繁體中文'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  const GameCard = ({ type, icon: Icon, color }: { type: GameType, icon: any, color: string }) => (
    <div 
      onClick={() => { soundService.playMove(); setActiveGame(type); }}
      className="group relative bg-arcade-secondary rounded-xl p-1 overflow-hidden cursor-pointer hover:-translate-y-2 transition-all duration-300"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative bg-gray-900 p-6 rounded-lg h-full flex flex-col items-center text-center border border-gray-800 group-hover:border-transparent">
        <div className={`p-4 rounded-full mb-4 group-hover:scale-110 transition-transform bg-gray-800 group-hover:bg-transparent`}>
          <Icon className={`w-8 h-8 ${color.replace('from-', 'text-').split(' ')[0]}`} />
        </div>
        <h3 className="text-xl font-bold mb-2">{t(type, language)}</h3>
        <p className="text-gray-400 text-sm">{t(type + '_desc', language)}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-arcade-dark text-white flex flex-col font-sans relative overflow-hidden">
      {/* CRT Effects */}
      <div className="scanline"></div>
      <div className="crt-overlay fixed inset-0 z-50"></div>
      <div className="crt-vignette fixed inset-0 z-40"></div>

      {/* Header */}
      <header className="p-4 md:p-6 border-b border-gray-800 bg-arcade-accent/95 backdrop-blur flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3" role="button" onClick={backToMenu}>
          <div className="bg-arcade-primary p-2 rounded-lg shadow-[0_0_15px_rgba(233,69,96,0.5)] hidden md:block">
             <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tighter font-pixel text-transparent bg-clip-text bg-gradient-to-r from-arcade-neon to-arcade-primary cursor-pointer hover:opacity-80 transition">
            ARCADE HUB AI
          </h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
           <div className="hidden md:flex items-center gap-2 text-sm text-arcade-neon border border-arcade-neon/30 px-3 py-1 rounded-full">
              <User size={14} />
              <span>{playerName}</span>
           </div>

           {/* Persona Selector */}
           <div className="relative">
              <button 
                onClick={() => setShowPersonaMenu(!showPersonaMenu)} 
                className="p-2 hover:bg-gray-800 rounded-full transition text-yellow-400"
                title={t('selectPersona', language)}
              >
                 {aiPersona === 'sarcastic' ? <Zap size={20} /> : (aiPersona === 'encouraging' ? <Smile size={20} /> : <Skull size={20} />)}
              </button>
              {showPersonaMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-arcade-secondary border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                   <button onClick={() => changePersona('sarcastic')} className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm flex gap-2 items-center">
                      <Zap size={14} className="text-purple-400"/> {t('personaSarcastic', language)}
                   </button>
                   <button onClick={() => changePersona('encouraging')} className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm flex gap-2 items-center">
                      <Smile size={14} className="text-yellow-400"/> {t('personaEncouraging', language)}
                   </button>
                   <button onClick={() => changePersona('pirate')} className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm flex gap-2 items-center">
                      <Skull size={14} className="text-red-400"/> {t('personaPirate', language)}
                   </button>
                </div>
              )}
           </div>

           <button onClick={toggleSound} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-white">
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
           </button>

           <button onClick={toggleLanguage} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-white font-bold text-xs">
              {language === 'zh' ? 'EN' : '中'}
           </button>

           {activeGame !== GameType.MENU && (
            <button 
              onClick={backToMenu}
              className="text-sm text-gray-400 hover:text-white transition whitespace-nowrap"
            >
              {t('backToMenu', language)}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 flex flex-col items-center justify-center relative z-30">
        {activeGame === GameType.MENU ? (
          <div className="w-full max-w-6xl animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
                {t('selectGame', language)}
              </h2>
              
              <div className="mt-6 flex justify-center">
                <button 
                  onClick={() => { soundService.playMove(); setActiveGame(GameType.LEADERBOARD); }}
                  className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-600/50 px-6 py-2 rounded-full transition"
                >
                  <Trophy size={18} /> {t('leaderboard', language)}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-8">
              <GameCard type={GameType.SNAKE} icon={Move} color="from-green-400 to-blue-600" />
              <GameCard type={GameType.TETRIS} icon={Grid3x3} color="from-purple-400 to-pink-600" />
              <GameCard type={GameType.GAME2048} icon={BoxSelect} color="from-yellow-400 to-orange-600" />
              <GameCard type={GameType.BREAKOUT} icon={ArrowUpCircle} color="from-cyan-400 to-blue-600" />
              <GameCard type={GameType.MINESWEEPER} icon={Bomb} color="from-red-400 to-rose-600" />
              <GameCard type={GameType.MEMORY} icon={BrainCircuit} color="from-pink-400 to-fuchsia-600" />
              <GameCard type={GameType.WHACKAMOLE} icon={MousePointer2} color="from-amber-400 to-yellow-600" />
              <GameCard type={GameType.SPACEINVADERS} icon={Rocket} color="from-indigo-400 to-violet-600" />
              <GameCard type={GameType.SIMONSAYS} icon={Disc} color="from-lime-400 to-green-600" />
              <GameCard type={GameType.DINO} icon={Footprints} color="from-stone-400 to-stone-600" />
              <GameCard type={GameType.FROGGER} icon={AlignJustify} color="from-emerald-400 to-emerald-700" />
              <GameCard type={GameType.REVERSI} icon={CircleDot} color="from-gray-200 to-gray-600" />
              <GameCard type={GameType.GOMOKU} icon={Circle} color="from-orange-200 to-amber-700" />
              <GameCard type={GameType.PIXELJUMP} icon={Activity} color="from-teal-400 to-cyan-600" />
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center animate-fade-in relative z-30">
            {renderGame()}
            
            {activeGame !== GameType.LEADERBOARD && (
               <div className="mt-6 p-4 bg-gray-800/50 rounded-lg text-sm text-gray-400 text-center max-w-md backdrop-blur-md border border-gray-700">
                  <p className="font-bold text-arcade-neon mb-1">{t('controls', language)}</p>
                  <p>{
                     activeGame === GameType.SNAKE ? t('snakeControls', language) :
                     activeGame === GameType.TETRIS ? t('tetrisControls', language) :
                     activeGame === GameType.GAME2048 ? t('g2048Controls', language) :
                     activeGame === GameType.BREAKOUT ? t('breakoutControls', language) :
                     activeGame === GameType.MINESWEEPER ? t('minesweeperControls', language) :
                     activeGame === GameType.MEMORY ? t('memoryControls', language) :
                     activeGame === GameType.WHACKAMOLE ? t('whackamoleControls', language) :
                     activeGame === GameType.SPACEINVADERS ? t('spaceInvadersControls', language) :
                     activeGame === GameType.DINO ? t('dinoControls', language) :
                     activeGame === GameType.FROGGER ? t('froggerControls', language) :
                     activeGame === GameType.REVERSI ? t('reversiControls', language) :
                     activeGame === GameType.GOMOKU ? t('gomokuControls', language) :
                     activeGame === GameType.PIXELJUMP ? t('pixelJumpControls', language) :
                     t('simonSaysControls', language)
                  }</p>
               </div>
            )}
          </div>
        )}

        {lastResult && (
          <AICommentary 
            result={lastResult} 
            onClose={closeCommentary} 
            language={language}
            persona={aiPersona}
          />
        )}
      </main>
      
      <footer className="p-4 text-center text-gray-600 text-xs relative z-30">
        © 2025 Arcade AI Hub. Powered by Google Gemini.
      </footer>
    </div>
  );
}

export default App;
