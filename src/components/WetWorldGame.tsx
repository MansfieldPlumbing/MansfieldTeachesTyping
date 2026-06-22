/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SkinId, Lesson, TypingMetrics, GameEntity } from '../types';
import { SkinRenderer } from './SkinRenderer';
import { KeyboardOverlay } from './KeyboardOverlay';
import { playPing, playClank, playWinTheme, playGameOver } from '../audio';

interface WetWorldGameProps {
  skinId: SkinId;
  lesson: Lesson;
  onFinish: (metrics: TypingMetrics, wasSuccessful: boolean) => void;
  onPause: () => void;
}

export const WetWorldGame: React.FC<WetWorldGameProps> = ({
  skinId,
  lesson,
  onFinish,
  onPause,
}) => {
  // Game states
  const [metrics, setMetrics] = useState<TypingMetrics>({
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    accuracy: 100,
    wpm: 0,
    streak: 0,
    maxStreak: 0,
    wordCount: 0,
  });

  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'ended'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  
  // Flattening lesson patterns into words list
  // To simulate the Wet World "Word completion" game
  const wordsListRef = useRef<string[]>([]);
  useEffect(() => {
    // Collect all words from lesson patterns
    const words = lesson.patterns
      .join(' ')
      .split(/\s+/)
      .filter(w => w.trim().length > 0);
    wordsListRef.current = words;
  }, [lesson]);

  const [wordIndex, setWordIndex] = useState<number>(0);
  const [letterIndex, setLetterIndex] = useState<number>(0);
  const [playerState, setPlayerState] = useState<'idle' | 'swimming' | 'hurt'>('swimming');
  
  // Stream tracking
  const currentWord = wordsListRef.current[wordIndex] || 'vent';
  const activeChar = currentWord[letterIndex] || ' ';

  const [bubbleOffset, setBubbleOffset] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  // Decorative floating fishes / bubbles inside water
  const [sceneryBubbles, setSceneryBubbles] = useState<{ id: number; x: number; y: number; speed: number; size: number }[]>([]);

  // Initialize bubbles
  useEffect(() => {
    const list = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100 + 100, // starts below screen
      speed: 0.5 + Math.random() * 1.5,
      size: 4 + Math.random() * 8
    }));
    setSceneryBubbles(list);
  }, []);

  // Countdown clock ticker
  useEffect(() => {
    if (gameState !== 'countdown') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState('playing');
          startTimeRef.current = Date.now();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Game clock timer ticker
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState('ended');
          onFinish(metrics, metrics.wpm >= lesson.minWpm && metrics.accuracy >= 80);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, metrics, onFinish, lesson]);

  // Render loop animation frames ticker
  useEffect(() => {
    let animId: number;
    const update = () => {
      frameCountRef.current += 1;
      setFrameCount(frameCountRef.current);

      if (gameState === 'playing' && playerState === 'swimming') {
        setBubbleOffset((prev) => prev + 0.3); // water drift
        
        // Float scenery bubbles upward
        setSceneryBubbles((prev) =>
          prev.map((b) => {
            let nextY = b.y - b.speed;
            if (nextY < -10) {
              nextY = 110; // wrap around
              return { ...b, y: nextY, x: Math.random() * 100 };
            }
            return { ...b, y: nextY };
          })
        );
      }

      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [gameState, playerState]);

  // Dynamic WPM tracker
  useEffect(() => {
    if (gameState !== 'playing') return;
    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
    if (elapsedSeconds < 2) return;

    const correctKeystrokes = metrics.correctKeystrokes;
    const minutes = elapsedSeconds / 60;
    const calculatedWpm = Math.max(0, Math.round((correctKeystrokes / 5) / minutes));

    setMetrics((prev) => ({
      ...prev,
      wpm: calculatedWpm
    }));
  }, [wordIndex, letterIndex, gameState]);

  // Key down listener to process word typing
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        onPause();
        return;
      }

      if (e.key.length > 1) return; // ignore shifts, tabs, etc.

      const pressedKey = e.key;
      const expectedKey = activeChar;

      const isCorrect = pressedKey === expectedKey;

      setMetrics((prev) => {
        const total = prev.totalKeystrokes + 1;
        const correct = isCorrect ? prev.correctKeystrokes + 1 : prev.correctKeystrokes;
        const streak = isCorrect ? prev.streak + 1 : 0;
        const maxStreak = Math.max(prev.maxStreak, streak);
        const accuracy = Math.round((correct / total) * 100);

        return {
          ...prev,
          totalKeystrokes: total,
          correctKeystrokes: correct,
          streak,
          maxStreak,
          accuracy,
        };
      });

      if (isCorrect) {
        // letter caught! Swim animation triggers!
        setPlayerState('swimming');
        playPing(); // bubble pop/ping

        setLetterIndex((prevLetterIdx) => {
          const nextLetterIdx = prevLetterIdx + 1;
          
          // Checked full word completed!
          if (nextLetterIdx >= currentWord.length) {
            playPing(); // Double ping for word clear
            
            setWordIndex((prevWordIdx) => {
              const nextWordIdx = prevWordIdx + 1;
              if (nextWordIdx >= wordsListRef.current.length) {
                // finished all words
                setGameState('ended');
                playWinTheme();
                onFinish({
                  ...metrics,
                  correctKeystrokes: metrics.correctKeystrokes + 1,
                  totalKeystrokes: metrics.totalKeystrokes + 1,
                  accuracy: Math.round(((metrics.correctKeystrokes + 1) / (metrics.totalKeystrokes + 1)) * 100),
                  wpm: metrics.wpm,
                  streak: metrics.streak + 1,
                  maxStreak: Math.max(metrics.maxStreak, metrics.streak + 1),
                  wordCount: metrics.wordCount + 1
                }, true);
              }
              return nextWordIdx;
            });
            return 0; // reset letter index for next word
          }
          return nextLetterIdx;
        });
      } else {
        // Typo
        setPlayerState('hurt');
        playClank();
        setTimeout(() => setPlayerState('swimming'), 280);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeChar, currentWord, letterIndex, wordIndex, metrics, onPause, onFinish]);

  return (
    <div id="wet-world-root" className="flex flex-col gap-6 w-full select-none">
      {/* HUD Bar */}
      <div id="wet-world-hud" className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 shadow-md font-mono text-xs text-slate-350">
        <div className="flex gap-6">
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">WPM</span>
            <span className="text-lg font-bold text-cyan-400">{metrics.wpm}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Accuracy</span>
            <span className="text-lg font-bold text-emerald-400">{metrics.accuracy}%</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Words</span>
            <span className="text-lg font-bold text-indigo-400">{wordIndex} <span className="text-xs text-slate-600">/ {wordsListRef.current.length}</span></span>
          </div>
        </div>

        {/* Level Objective Badge */}
        <div className="hidden sm:block text-center border-x border-slate-800 px-6">
          <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Game Mode</span>
          <span className="text-sm font-retro text-cyan-300">WET WORLD</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Time Left</span>
            <span className={`text-lg font-bold ${timeLeft < 25 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Underwater Swimming Stage */}
      <div id="wet-world-stage" className="relative h-64 w-full bg-blue-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Sky / Deep ocean background with gradients */}
        <div 
          className="absolute inset-0 transition-all duration-300 bg-gradient-to-b from-cyan-950 via-blue-950 to-slate-950"
        />

        {/* Dynamic backdrop water filters */}
        <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none animate-pulse"></div>

        {/* Leaking pipes decorative sewer ceiling */}
        <div className="absolute top-0 inset-x-0 h-6 bg-slate-900/60 border-b-2 border-cyan-900/30 flex justify-around opacity-40">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-12 h-4 bg-zinc-800 border-x border-zinc-700/60 rounded-b"></div>
          ))}
        </div>

        {/* Countdown layer */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center font-retro">
            <span className="text-[10px] text-slate-500 mb-2">Aquatic lesson starts in</span>
            <span className="text-6xl text-cyan-400 animate-ping">{countdown}</span>
          </div>
        )}

        {/* Render floating scenery bubbles */}
        {sceneryBubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute bg-white/10 border border-white/20 rounded-full pointer-events-none"
            style={{
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
            }}
          />
        ))}

        {/* Character floating swimmer container */}
        <div 
          className="absolute z-15 transition-all duration-75"
          style={{
            left: '25%', // swimming anchor
            top: '40%',
            width: '64px',
            height: '64px',
            transform: playerState === 'hurt' ? 'rotate(15deg) scale(0.95)' : 'none',
          }}
        >
          <SkinRenderer
            skinId={skinId}
            state={playerState === 'hurt' ? 'hurt' : 'swimming'}
            frameCount={frameCount}
          />

          {/* Swim bubbles trail */}
          {playerState === 'swimming' && frameCount % 6 < 3 && (
            <div className="absolute -left-4 top-1/2 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
          )}
        </div>

        {/* Word Bubble Obstacle Blocking Path */}
        <div 
          className="absolute right-12 md:right-24 top-1/3 z-20 flex flex-col items-center"
        >
          {/* Cute glowing aquatic jellyfish bubble housing the active word */}
          <div className="relative animate-bounce p-5 bg-cyan-900/40 border border-cyan-400/50 backdrop-blur rounded-3xl flex flex-col items-center shadow-lg shadow-cyan-400/10 min-w-44">
            {/* Jellyfish tentacles */}
            <div className="flex gap-2 absolute bottom-[-12px] opacity-40 justify-center">
              <div className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-5 bg-cyan-400 rounded-full animate-pulse delay-75"></div>
              <div className="w-1 h-4 bg-cyan-400 rounded-full animate-pulse delay-100"></div>
            </div>

            <span className="text-[10px] text-cyan-400 uppercase tracking-widest block mb-2 font-mono">Type Word to Clear</span>
            
            {/* Word letters with highlight progression rendering */}
            <div className="flex font-retro text-lg sm:text-2xl select-none tracking-widest uppercase">
              {currentWord.split('').map((letter, idx) => {
                const isTyped = idx < letterIndex;
                const isCurrent = idx === letterIndex;
                return (
                  <span
                    key={idx}
                    className={`transition-all duration-75 ${
                      isTyped 
                        ? 'text-emerald-400 font-extrabold line-through scale-95 opacity-50' 
                        : isCurrent 
                          ? 'text-amber-400 font-sans font-extrabold animate-pulse border-b-2 border-amber-400' 
                          : 'text-slate-300'
                    }`}
                  >
                    {letter}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive keyboard highlight guidance */}
      <KeyboardOverlay targetChar={activeChar} />

      {/* Pause instructions */}
      <div className="text-center font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-1">
        Press <kbd className="px-1.5 py-0.5 bg-slate-850 border border-slate-750 rounded">ESC</kbd> to Pause or Exit lesson
      </div>
    </div>
  );
};
