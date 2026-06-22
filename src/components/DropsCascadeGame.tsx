/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SkinId, Lesson, TypingMetrics, GameEntity } from '../types';
import { SkinRenderer } from './SkinRenderer';
import { KeyboardOverlay } from './KeyboardOverlay';
import { playPing, playClank, playWinTheme, playGameOver } from '../audio';

interface DropsCascadeGameProps {
  skinId: SkinId;
  lesson: Lesson;
  onFinish: (metrics: TypingMetrics, wasSuccessful: boolean) => void;
  onPause: () => void;
}

export const DropsCascadeGame: React.FC<DropsCascadeGameProps> = ({
  skinId,
  lesson,
  onFinish,
  onPause,
}) => {
  // Game metrics
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
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'ended' | 'flooded'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [misses, setMisses] = useState<number>(0); // 5 misses = Flooded level!

  // Active falling droplets list
  const [activeDrops, setActiveDrops] = useState<{
    id: string;
    char: string;
    x: number; // 5% to 95% left offset
    y: number; // 0% (top) to 100% (bottom)
    speed: number;
  }[]>([]);

  // Plumber slider position
  const [plumberX, setPlumberX] = useState<number>(50); // percentage 50% starts center
  const [playerState, setPlayerState] = useState<'idle' | 'running' | 'jumping' | 'swimming' | 'hurt'>('idle');

  // Stream sequence matching training rows
  const streamTextRef = useRef<string[]>([]);
  const charReadIndexRef = useRef<number>(0);

  const frameCountRef = useRef<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  // Load stream
  useEffect(() => {
    const chars = lesson.patterns.join(' ').replace(/\s+/g, ' ').split('');
    streamTextRef.current = chars.filter(c => c !== ' '); // remove blank spaces for waterfall cascade
    charReadIndexRef.current = 0;
  }, [lesson]);

  // Spawn new drops periodically during play
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnInterval = setInterval(() => {
      // Spawn only sub-limit active drops on screen density
      const maxOnScreen = 3;
      setActiveDrops((prev) => {
        if (prev.length >= maxOnScreen) return prev;

        const charList = streamTextRef.current;
        if (charList.length === 0) return prev;

        const nextCharIndex = charReadIndexRef.current % charList.length;
        const char = charList[nextCharIndex];
        charReadIndexRef.current += 1;

        // Spread spawns across lanes to prevent overlapping
        const laneX = 10 + Math.random() * 80;

        return [
          ...prev,
          {
            id: `drop-${Date.now()}-${Math.random()}`,
            char,
            x: laneX,
            y: 0,
            speed: 0.18 + Math.random() * 0.18, // speed of falling droplet
          }
        ];
      });
    }, 1200);

    return () => clearInterval(spawnInterval);
  }, [gameState]);

  // Countdown timer clock
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

  // Countdown 120s timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState('ended');
          onFinish(metrics, metrics.wpm >= lesson.minWpm && misses < 5);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, metrics, onFinish, lesson, misses]);

  // Physics animation update ticker (requestAnimationFrame)
  useEffect(() => {
    let animId: number;
    const update = () => {
      frameCountRef.current += 1;
      setFrameCount(frameCountRef.current);

      if (gameState === 'playing') {
        // Drop physics gravity downward
        setActiveDrops((prev) => {
          const updated: typeof prev = [];
          
          prev.forEach((drop) => {
            const nextY = drop.y + drop.speed;
            
            if (nextY >= 92) {
              // Missed droplet! Spilled puddle on basement floor
              setMisses((currMiss) => {
                const nextMiss = currMiss + 1;
                if (nextMiss >= 5) {
                  setGameState('flooded');
                  setPlayerState('hurt');
                  playGameOver();
                  
                  // Trigger failed callback
                  setTimeout(() => {
                    onFinish(metrics, false);
                  }, 1200);
                }
                return nextMiss;
              });
              playClank(); // buzz
            } else {
              updated.push({ ...drop, y: nextY });
            }
          });

          return updated;
        });
      }

      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [gameState, onFinish, metrics]);

  // Dynamic WPM statistics calculator
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
  }, [plumberX, gameState]);

  // Keypress catcher listeners
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

      if (e.key.length > 1) return;

      const pressedKey = e.key;

      // Find lowest matched falling droplet on screen
      let matchedIndex = -1;
      let maxDropY = -1;

      activeDrops.forEach((drop, idx) => {
        if (drop.char === pressedKey && drop.y > maxDropY) {
          maxDropY = drop.y;
          matchedIndex = idx;
        }
      });

      const isCorrect = matchedIndex !== -1;

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
        const targetDrop = activeDrops[matchedIndex];
        
        // Slide / catch drop flawlessly
        setPlumberX(targetDrop.x);
        setPlayerState('jumping'); // raise bucket to catch drop!
        playPing(); // bubble drip caught sound

        // Remove drop from screen
        setActiveDrops((prev) => prev.filter((_, idx) => idx !== matchedIndex));
        
        setTimeout(() => setPlayerState('idle'), 250);
      } else {
        // Typo
        setPlayerState('hurt');
        playClank();
        setTimeout(() => setPlayerState('idle'), 280);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeDrops, metrics, onPause]);

  // Target key is next nearest drop character to help overlay highlights
  const nearestDrop = activeDrops.reduce((near, d) => (d.y > near.y ? d : near), { char: '', y: -1 });
  const targetChar = nearestDrop.char || (streamTextRef.current[charReadIndexRef.current % (streamTextRef.current.length || 1)] || '');

  return (
    <div id="drops-cascade-root" className="flex flex-col gap-6 w-full select-none">
      {/* HUD metrics board */}
      <div id="drops-cascade-hud" className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 shadow-md font-mono text-xs text-slate-350">
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
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Sewer Floods</span>
            <span className="text-lg font-bold text-rose-400">{misses} <span className="text-xs text-slate-650">/ 5 max</span></span>
          </div>
        </div>

        {/* Level Title */}
        <div className="hidden sm:block text-center border-x border-slate-800 px-6">
          <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Leaking Deflector</span>
          <span className="text-sm font-retro text-cyan-400">DROPS CASCADE</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Time Left</span>
            <span className={`text-lg font-bold ${timeLeft < 25 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Main Cascade Falling Water Stage */}
      <div id="drops-stage" className="relative h-64 w-full bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Waterfall grid background */}
        <div 
          className="absolute inset-0 opacity-10 bg-repeat"
          style={{
            backgroundImage: 'radial-gradient(circle, #0891b2 5%, transparent 10%)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Rusty leaking ceiling pipeline valves */}
        <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 border-b-2 border-amber-950 flex justify-around shadow z-20">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-10 h-4 bg-zinc-805 border-x border-b border-yellow-800 rounded-b flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan-700 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Countdown Overlay board */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center font-retro">
            <span className="text-[10px] text-slate-500 mb-2 font-mono">Catch leaking pipes droplets!</span>
            <span className="text-6xl text-cyan-400 animate-ping">{countdown}</span>
          </div>
        )}

        {/* Flooded Overlay screen */}
        {gameState === 'flooded' && (
          <div className="absolute inset-0 bg-rose-950/85 backdrop-blur z-35 flex flex-col items-center justify-center font-retro">
            <span className="text-xl text-rose-400 animate-bounce mb-2">SYSTEM FLOODED!</span>
            <span className="text-[10px] text-rose-500 font-mono">Water Pump Shorted Out! Resetting...</span>
          </div>
        )}

        {/* Render bottom puddle leaks depending on current misses count */}
        {misses > 0 && (
          <div 
            className="absolute bottom-4 inset-x-0 h-2 bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-600 animate-pulse z-15 select-none pointer-events-none rounded"
            style={{
              height: `${misses * 4}px`,
              opacity: 0.6 + (misses * 0.08)
            }}
          />
        )}

        {/* Active Falling Droplets */}
        {activeDrops.map((drop) => {
          return (
            <div
              key={drop.id}
              className="absolute z-10 transition-all duration-75 flex flex-col items-center justify-center"
              style={{
                left: `${drop.x}%`,
                top: `${drop.y}%`,
                width: '32px',
                height: '40px',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Leaking water droplet SVG */}
              <svg viewBox="0 0 30 40" className="w-8 h-10 filter drop-shadow">
                <path
                  d="M15,2 C15,2 30,18 30,28 C30,35 23,38 15,38 C7,38 0,35 0,28 C0,18 15,2 15,2 Z"
                  fill="#06b6d4"
                  fillOpacity="0.85"
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                />
              </svg>
              {/* Display Single Letter inside droplet centered */}
              <span className="absolute font-retro text-xs text-white font-extrabold pb-0.5 select-none uppercase">
                {drop.char}
              </span>
            </div>
          );
        })}

        {/* Slidable bucket plumber container */}
        <div
          className="absolute z-20 transition-all duration-150 ease-out"
          style={{
            left: `${plumberX}%`,
            bottom: '12px',
            width: '56px',
            height: '56px',
            transform: 'translateX(-50%)',
          }}
        >
          {/* Retro skin presenter */}
          <SkinRenderer
            skinId={skinId}
            state={playerState}
            frameCount={frameCount}
          />

          {/* Extend bucket tool graphic centered above head during catcher */}
          {playerState === 'jumping' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 border border-slate-900 rounded px-1.5 py-0.5 text-[8px] font-mono text-slate-950 font-bold uppercase select-none animate-bounce shadow">
              CATCH!
            </div>
          )}
        </div>

        {/* Level Basement Floor */}
        <div id="stage-basement" className="absolute bottom-0 inset-x-0 h-3 bg-zinc-800 border-t border-zinc-700"></div>
      </div>

      {/* Dynamic interactive guide helper overlay highlights */}
      <KeyboardOverlay targetChar={targetChar} />

      {/* Escape hint pauses */}
      <div className="text-center font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-1">
        Press <kbd className="px-1.5 py-0.5 bg-slate-850 border border-slate-750 rounded">ESC</kbd> to Pause or Exit lesson
      </div>
    </div>
  );
};
