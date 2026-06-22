/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SkinId, GameModeId, Lesson, TypingMetrics } from './types';
import { LESSON_CATEGORIES } from './lessons';
import { SkinRenderer } from './components/SkinRenderer';
import { SmashDashGame } from './components/SmashDashGame';
import { WetWorldGame } from './components/WetWorldGame';
import { TunnelDoomGame } from './components/TunnelDoomGame';
import { DropsCascadeGame } from './components/DropsCascadeGame';
import { BoilerDeflectorGame } from './components/BoilerDeflectorGame';
import {
  resumeAudioContext,
  toggleMute,
  isAudioMuted,
  playCoin,
  playWinTheme,
  playGameOver
} from './audio';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Award,
  Sparkles,
  BookOpen,
  User,
  Trophy,
  Activity,
  ArrowRight
} from 'lucide-react';

const SKINS_DATA: {
  id: SkinId;
  name: string;
  creator: string;
  tagline: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
}[] = [
  {
    id: 'marcio',
    name: 'Marcio',
    creator: 'The Crimson Plumber',
    tagline: 'Standard NES styling',
    description: 'Traditional red and blue pixel overalls. He headbutts bricks with pride.',
    primaryColor: 'from-rose-500 to-rose-600',
    secondaryColor: 'text-rose-450'
  },
  {
    id: 'lucio',
    name: 'Lucio',
    creator: 'The Emerald Sibling',
    tagline: 'High jumping plumber counterpart',
    description: 'Traditional green styling. Ideal for sewer lines and deep pipe inspection.',
    primaryColor: 'from-emerald-500 to-emerald-600',
    secondaryColor: 'text-emerald-450'
  },
  {
    id: 'sanic',
    name: 'Ugly Sanic',
    creator: 'The Speed Demon',
    tagline: 'Slightly cursed fast blue hedgehog',
    description: 'Drawn in MS Paint with bloodshot eyes. Foot-tapping speed at 200WPM.',
    primaryColor: 'from-blue-600 to-indigo-600',
    secondaryColor: 'text-blue-450'
  },
  {
    id: 'professional',
    name: 'Elite Pro',
    creator: 'VOM Systems Drone',
    tagline: 'Cybernetic floating diagnostic system',
    description: 'Sleek neon cyber-drone utilizing glassmorphic forcefields and metadata shields.',
    primaryColor: 'from-cyan-500 to-cyan-600',
    secondaryColor: 'text-cyan-450'
  }
];

export default function App() {
  // Screen States: 'menu' | 'playing' | 'results'
  const [screen, setScreen] = useState<'menu' | 'playing' | 'results'>('menu');
  const [chosenSkin, setChosenSkin] = useState<SkinId>('marcio');
  const [chosenLesson, setChosenLesson] = useState<Lesson | null>(null);
  const [chosenMode, setChosenMode] = useState<GameModeId>('smash_and_dash');
  
  // Phase layout filter
  const [currentPhase, setCurrentPhase] = useState<'letters' | 'words' | 'sentences' | null>(null);
  
  // Pause management
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Audio system state
  const [mute, setMute] = useState<boolean>(false);

  // End metrics state
  const [gameResult, setGameResult] = useState<{
    metrics: TypingMetrics;
    passed: boolean;
  } | null>(null);

  // Animation ticks for preview state
  const [previewFrame, setPreviewFrame] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewFrame((prev) => prev + 1);
    }, 60);
    return () => clearInterval(timer);
  }, []);

  // Sync mute state on initial load
  useEffect(() => {
    setMute(isAudioMuted());
  }, []);

  const handleMuteToggle = () => {
    const isNowMuted = toggleMute();
    setMute(isNowMuted);
    playCoin(); // soft test sound trigger
  };

  const handleStartLesson = (lesson: Lesson, mode: GameModeId) => {
    setChosenLesson(lesson);
    setChosenMode(mode);
    setScreen('playing');
    setIsPaused(false);
    resumeAudioContext();
  };

  const handleGameFinished = (finalMetrics: TypingMetrics, wasSuccessful: boolean) => {
    setGameResult({
      metrics: finalMetrics,
      passed: wasSuccessful,
    });
    setScreen('results');
  };

  const handleExitToMenu = () => {
    setScreen('menu');
    setChosenLesson(null);
    setGameResult(null);
    setIsPaused(false);
    setCurrentPhase(null);
  };

  const handleRetryLesson = () => {
    if (!chosenLesson) return;
    setScreen('playing');
    setIsPaused(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-150 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      
      {/* Top Universal Navbar */}
      <nav id="navbar" className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <button
          onClick={handleExitToMenu}
          className="flex items-center gap-3 cursor-pointer group text-left bg-transparent border-0 p-0"
        >
          <span className="font-retro font-bold text-sm tracking-widest text-white">IFTP</span>
          <span className="hidden sm:inline text-xs text-zinc-500 font-sans group-hover:text-zinc-405 transition-colors">
            · I Fix the Pipes
          </span>
        </button>

        {/* Clean, low-profile dropdown skins + mute toolbar */}
        <div className="flex items-center gap-3 select-none">
          {/* Active Skin dropdown selection */}
          <div className="flex items-center gap-2 bg-zinc-900/40 border border-zinc-800 px-3 py-1 rounded-xl">
            <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Skin:</span>
            <select
              value={chosenSkin}
              onChange={(e) => {
                setChosenSkin(e.target.value as SkinId);
                playCoin();
              }}
              className="bg-transparent text-zinc-200 text-xs font-retro outline-none cursor-pointer pr-1 py-0.5 border-0"
            >
              <option value="marcio">Marcio</option>
              <option value="lucio">Lucio</option>
              <option value="sanic">Ugly Sanic</option>
              <option value="professional">Elite Pro</option>
            </select>
            {/* Miniature frame preview with animation */}
            <div className="w-5 h-5 flex items-center justify-center overflow-hidden border-l border-zinc-800 pl-1.5 bg-zinc-950/40 rounded">
              <SkinRenderer
                skinId={chosenSkin}
                state="running"
                frameCount={previewFrame}
              />
            </div>
          </div>

          <button
            onClick={handleMuteToggle}
            className="p-1 px-2.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-1.5"
            title="Toggle audio"
          >
            {mute ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-500" />}
            <span className="text-[10px] uppercase tracking-wider">{mute ? 'Mute' : 'Sound'}</span>
          </button>
        </div>
      </nav>

      {/* Main Screen Router Box */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 flex flex-col justify-center">
        
        {/* State A: Main Menu Selection Map */}
        {screen === 'menu' && (
          <div className="flex flex-col gap-10 animate-fade-in py-6">
            
            {/* Initial 3-Options Front Page (modeled on art4quinn) */}
            {currentPhase === null && (
              <>
                {/* Header Jumbotron */}
                <div className="text-left space-y-2 mb-4">
                  <h2 className="font-retro text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    I Fix the Pipes
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 font-sans max-w-md">
                    Structured high-precision typing exercises built for structural plumbers and technicians.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  {/* 01 Letters */}
                  <button
                    onClick={() => {
                      setCurrentPhase('letters');
                      playCoin();
                    }}
                    className="w-full text-left group border border-zinc-900 hover:border-zinc-800 bg-zinc-900/10 hover:bg-zinc-905 p-6 rounded-2xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-5">
                      <span className="font-retro text-2xl font-black text-zinc-700 group-hover:text-amber-500 transition-colors">
                        01
                      </span>
                      <div>
                        <h3 className="font-retro text-sm font-bold text-zinc-200 group-hover:text-white">
                          Letters
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 max-w-md font-sans">
                          Home-row alignment, character repetition, and reach drills.
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono text-zinc-500 group-hover:text-amber-500 transition-colors">
                      Open <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>

                  {/* 02 Words */}
                  <button
                    onClick={() => {
                      setCurrentPhase('words');
                      playCoin();
                    }}
                    className="w-full text-left group border border-zinc-900 hover:border-zinc-800 bg-zinc-900/10 hover:bg-zinc-905 p-6 rounded-2xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-5">
                      <span className="font-retro text-2xl font-black text-zinc-700 group-hover:text-cyan-500 transition-colors">
                        02
                      </span>
                      <div>
                        <h3 className="font-retro text-sm font-bold text-zinc-200 group-hover:text-white">
                          Words
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 max-w-md font-sans">
                          Terminology flow spelling, construction words, and chamber defense.
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono text-zinc-500 group-hover:text-cyan-500 transition-colors">
                      Open <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>

                  {/* 03 Sentences */}
                  <button
                    onClick={() => {
                      setCurrentPhase('sentences');
                      playCoin();
                    }}
                    className="w-full text-left group border border-zinc-900 hover:border-zinc-800 bg-zinc-900/10 hover:bg-zinc-905 p-6 rounded-2xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-5">
                      <span className="font-retro text-2xl font-black text-zinc-700 group-hover:text-emerald-500 transition-colors">
                        03
                      </span>
                      <div>
                        <h3 className="font-retro text-sm font-bold text-zinc-200 group-hover:text-white">
                          Sentences
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 max-w-md font-sans">
                          Sewer telemetry quotes, complete shifts, and spacing precision.
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono text-zinc-500 group-hover:text-emerald-500 transition-colors">
                      Open <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Expanded Phase Sub-lessons View List */}
            {currentPhase !== null && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                  <button
                    onClick={() => {
                      setCurrentPhase(null);
                      playCoin();
                    }}
                    className="py-1 px-3 bg-zinc-900 hover:bg-zinc-805 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer font-retro"
                  >
                    ← Back
                  </button>
                  <div>
                    <h3 className="font-retro text-sm font-bold text-white capitalize">
                      {currentPhase} Index
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-sans">
                      Select a precise course to instantiate game simulator.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LESSON_CATEGORIES.map((category) => {
                    const matchingLessons = category.lessons.filter((l) => l.type === currentPhase);
                    if (matchingLessons.length === 0) return null;

                    return (
                      <div key={category.id} className="bg-zinc-900/10 border border-zinc-900 rounded-2xl p-5 space-y-4">
                        <div className="border-b border-zinc-900 pb-2">
                          <h4 className="font-retro text-[10px] font-bold text-zinc-400 capitalize">{category.name}</h4>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{category.subtitle}</p>
                        </div>

                        <div className="space-y-4">
                          {matchingLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="bg-zinc-950/60 border border-zinc-900 hover:border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all"
                            >
                              <div>
                                <h5 className="font-retro text-xs font-bold text-zinc-150">
                                  {lesson.title}
                                </h5>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[9px] text-zinc-400 font-mono bg-zinc-900 border border-zinc-850 rounded px-1.5 py-0.5 font-bold">
                                    Target: {lesson.focus}
                                  </span>
                                  <span className="text-[9px] text-zinc-500 font-mono uppercase bg-zinc-905 rounded px-1.5 py-0.5">
                                    Min: {lesson.minWpm} WPM
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-2 border-t border-zinc-905">
                                {lesson.type === 'letters' && (
                                  <>
                                    <button
                                      onClick={() => handleStartLesson(lesson, 'smash_and_dash')}
                                      className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 rounded-lg text-[9px] text-amber-500 font-mono uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-amber-500" />
                                      Scroll Run
                                    </button>
                                    <button
                                      onClick={() => handleStartLesson(lesson, 'drops_cascade')}
                                      className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-cyan-500/10 border border-zinc-800 hover:border-cyan-500/30 rounded-lg text-[9px] text-cyan-500 font-mono uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-cyan-500" />
                                      Waterfall
                                    </button>
                                  </>
                                )}

                                {lesson.type === 'words' && (
                                  <>
                                    <button
                                      onClick={() => handleStartLesson(lesson, 'wet_world')}
                                      className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-cyan-500/10 border border-zinc-800 hover:border-cyan-500/30 rounded-lg text-[9px] text-cyan-500 font-mono uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-cyan-500" />
                                      Deep Swim
                                    </button>
                                    <button
                                      onClick={() => handleStartLesson(lesson, 'boiler_deflector')}
                                      className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 rounded-lg text-[9px] text-amber-500 font-mono uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Play className="w-2.5 h-2.5 fill-amber-500" />
                                      Reactor PSI
                                    </button>
                                  </>
                                )}

                                {lesson.type === 'sentences' && (
                                  <button
                                    onClick={() => handleStartLesson(lesson, 'tunnel_of_doom')}
                                    className="w-full py-1.5 px-4 bg-zinc-900 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 rounded-lg text-[9px] text-amber-500 font-mono uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <Play className="w-3 h-3 fill-amber-500" />
                                    Tunnel Run
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* State B: Immersive Gameplay Frame Bezel Container */}
        {screen === 'playing' && chosenLesson && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in py-2 max-w-3xl mx-auto w-full">
            <div className="w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-4 md:p-6 shadow-2xl relative">
              
              {/* Pause modal overlay display */}
              {isPaused && (
                <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-sm rounded-2xl z-40 flex flex-col items-center justify-center font-retro select-none">
                  <span className="text-2xl text-amber-500 animate-pulse uppercase tracking-wider mb-8">LESSON PAUSED</span>
                  
                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs justify-center">
                    <button
                      onClick={() => setIsPaused(false)}
                      className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-100 text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 font-bold"
                    >
                      Resume
                    </button>
                    <button
                      onClick={handleRetryLesson}
                      className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-855 border border-zinc-800 text-zinc-100 text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 font-bold"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Restart
                    </button>
                    <button
                      onClick={handleExitToMenu}
                      className="py-2.5 px-4 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-400 text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 font-bold"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              )}

              {/* Game components selectors */}
              {chosenMode === 'smash_and_dash' && (
                <SmashDashGame
                  skinId={chosenSkin}
                  lesson={chosenLesson}
                  onFinish={handleGameFinished}
                  onPause={() => setIsPaused(true)}
                />
              )}

              {chosenMode === 'wet_world' && (
                <WetWorldGame
                  skinId={chosenSkin}
                  lesson={chosenLesson}
                  onFinish={handleGameFinished}
                  onPause={() => setIsPaused(true)}
                />
              )}

              {chosenMode === 'tunnel_of_doom' && (
                <TunnelDoomGame
                  skinId={chosenSkin}
                  lesson={chosenLesson}
                  onFinish={handleGameFinished}
                  onPause={() => setIsPaused(true)}
                />
              )}

              {chosenMode === 'drops_cascade' && (
                <DropsCascadeGame
                  skinId={chosenSkin}
                  lesson={chosenLesson}
                  onFinish={handleGameFinished}
                  onPause={() => setIsPaused(true)}
                />
              )}

              {chosenMode === 'boiler_deflector' && (
                <BoilerDeflectorGame
                  skinId={chosenSkin}
                  lesson={chosenLesson}
                  onFinish={handleGameFinished}
                  onPause={() => setIsPaused(true)}
                />
              )}
            </div>
          </div>
        )}

        {/* State C: Session Diagnostics & results panel dashboard */}
        {screen === 'results' && gameResult && chosenLesson && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in py-4 max-w-2xl mx-auto w-full font-mono">
            
            <div className="w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6">
              
              {/* Outer Glowing status seal */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 relative z-10 mx-auto">
                  {gameResult.passed ? (
                    <Award className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <span className="font-retro text-rose-500 font-extrabold text-lg">!</span>
                  )}
                </div>

                <h3 className={`font-retro text-sm font-bold tracking-widest uppercase ${gameResult.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {gameResult.passed ? 'Session Passed' : 'Session Incomplete'}
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto font-sans leading-relaxed">
                  {gameResult.passed
                    ? `Requirements fulfilled. Met speed of ${chosenLesson.minWpm} WPM and 80% accuracy.`
                    : `Requirements not met. Ensure speed is above ${chosenLesson.minWpm} WPM and accuracy is above 80%.`}
                </p>
              </div>

              {/* Grid indicators statistics dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3.5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-0.5">Speed</span>
                  <span className="text-base font-bold font-retro text-zinc-200 block">{gameResult.metrics.wpm} WPM</span>
                  <span className="text-[9px] text-zinc-650 font-sans block">Goal: {chosenLesson.minWpm}</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3.5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-0.5">Accuracy</span>
                  <span className="text-base font-bold font-retro text-zinc-200 block">{gameResult.metrics.accuracy}%</span>
                  <span className="text-[9px] text-zinc-650 font-sans block">Goal: 80%</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3.5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-0.5">Max Streak</span>
                  <span className="text-base font-bold font-retro text-zinc-200 block">{gameResult.metrics.maxStreak}</span>
                  <span className="text-[9px] text-zinc-650 font-sans block">Consecutive keys</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3.5">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block mb-0.5">Chars Type</span>
                  <span className="text-base font-bold font-retro text-zinc-200 block">{gameResult.metrics.totalKeystrokes}</span>
                  <span className="text-[9px] text-zinc-650 font-sans block">Total count</span>
                </div>
              </div>

              {/* Actions choices triggers */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={handleRetryLesson}
                  className="py-2.5 px-6 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
                <button
                  onClick={handleExitToMenu}
                  className="py-2.5 px-6 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs tracking-wider uppercase rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Index Panel
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Clean minimal footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 px-10 text-center font-mono text-[9px] text-zinc-600 tracking-widest uppercase flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 max-w-4xl w-full mx-auto select-none mt-auto">
        <span>Mansfield Plumbing System</span>
        <a href="https://github.com/MansfieldPlumbing/art4quinn" target="_blank" rel="noreferrer" className="hover:text-zinc-450 normal-case hover:underline">github.com/MansfieldPlumbing/art4quinn</a>
      </footer>

    </div>
  );
}
