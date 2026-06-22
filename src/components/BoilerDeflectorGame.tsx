/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SkinId, Lesson, TypingMetrics } from '../types';
import { SkinRenderer } from './SkinRenderer';
import { KeyboardOverlay } from './KeyboardOverlay';
import { playSizzle, playClank, playWinTheme, playGameOver } from '../audio';

interface BoilerDeflectorGameProps {
  skinId: SkinId;
  lesson: Lesson;
  onFinish: (metrics: TypingMetrics, wasSuccessful: boolean) => void;
  onPause: () => void;
}

interface FlyingChunk {
  id: string;
  word: string;
  typedLength: number;
  x: number; // percentage from center (0 to 100)
  y: number; // percentage from center (0 to 100)
  angle: number; // in radians
  distance: number; // distance from center (0 to 100)
  speed: number;
}

export const BoilerDeflectorGame: React.FC<BoilerDeflectorGameProps> = ({
  skinId,
  lesson,
  onFinish,
  onPause,
}) => {
  // Game state
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
  const [psi, setPsi] = useState<number>(0); // 100 PSI = explosion!
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'ended' | 'exploded'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);

  // Flying debris chunks
  const [chunks, setChunks] = useState<FlyingChunk[]>([]);
  
  // Welding solder laser gun trace line
  const [laserBeam, setLaserBeam] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    active: boolean;
  } | null>(null);

  const wordsListRef = useRef<string[]>([]);
  const wordReadIndexRef = useRef<number>(0);
  
  const frameCountRef = useRef<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  // Word lock-in focus during typing
  const [lockedChunkId, setLockedChunkId] = useState<string | null>(null);

  // Load words
  useEffect(() => {
    const rawWords = lesson.patterns
      .join(' ')
      .split(/\s+/)
      .filter(w => w.trim().length > 0);
    wordsListRef.current = rawWords;
    wordReadIndexRef.current = 0;
  }, [lesson]);

  // Periodic debris spawning
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnInterval = setInterval(() => {
      setChunks((prev) => {
        if (prev.length >= 3) return prev; // max 3 active chunks to maintain focus

        const words = wordsListRef.current;
        if (words.length === 0) return prev;

        const nextWord = words[wordReadIndexRef.current % words.length];
        wordReadIndexRef.current += 1;

        // Generate coordinates radiating outwards from center boiler
        const angle = Math.random() * Math.PI * 2;
        
        return [
          ...prev,
          {
            id: `chunk-${Date.now()}-${Math.random()}`,
            word: nextWord,
            typedLength: 0,
            x: 50,
            y: 50,
            angle,
            distance: 5, // starts close to center boiler
            speed: 0.18 + (metrics.wpm / 150), // speed adapts to typers' strength!
          }
        ];
      });
    }, 1500);

    return () => clearInterval(spawnInterval);
  }, [gameState, metrics.wpm]);

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

  // Time limit 120s countdown ticker
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState('ended');
          onFinish(metrics, metrics.wpm >= lesson.minWpm && psi < 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, metrics, onFinish, lesson, psi]);

  // physics updates (requestAnimationFrame)
  useEffect(() => {
    let animId: number;
    const update = () => {
      frameCountRef.current += 1;
      setFrameCount(frameCountRef.current);

      if (gameState === 'playing') {
        setChunks((prev) => {
          const updated: FlyingChunk[] = [];

          prev.forEach((chunk) => {
            const nextDistance = chunk.distance + chunk.speed * 1.8;

            // Escaped of bounds! Hit the boundaries of the pressure chamber!
            if (nextDistance >= 48) {
              setPsi((currPsi) => {
                const nextPsi = currPsi + 20;
                if (nextPsi >= 100) {
                  setGameState('exploded');
                  playGameOver();
                  
                  setTimeout(() => {
                    onFinish(metrics, false);
                  }, 1500);
                }
                return nextPsi;
              });
              playClank(); // gauge hit alarm buzzer
              
              // De-lock if locked onto this escaping chunk
              setLockedChunkId((lockedId) => (lockedId === chunk.id ? null : lockedId));
            } else {
              // Calculate x and y radiating from center (50, 50)
              const radians = chunk.angle;
              const nextX = 50 + Math.cos(radians) * nextDistance;
              const nextY = 50 + Math.sin(radians) * nextDistance;

              updated.push({
                ...chunk,
                distance: nextDistance,
                x: nextX,
                y: nextY,
              });
            }
          });

          return updated;
        });
      }

      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [gameState, metrics, onFinish]);

  // Dynamic WPM updater
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
  }, [chunks, gameState]);

  // Keypress event listener
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

      setChunks((prevChunks) => {
        let activeChunk: FlyingChunk | null = null;

        // 1. Identify which chunk is targeted
        if (lockedChunkId) {
          activeChunk = prevChunks.find((c) => c.id === lockedChunkId) || null;
        } else {
          // Look for any chunk whose next letter starts with pressed key
          activeChunk = prevChunks.find((c) => c.word[0] === pressedKey) || null;
        }

        if (!activeChunk) {
          // Typo! Dissonant buzzer sound
          playClank();
          setMetrics((prev) => ({
            ...prev,
            totalKeystrokes: prev.totalKeystrokes + 1,
            streak: 0,
            accuracy: Math.round((prev.correctKeystrokes / (prev.totalKeystrokes + 1)) * 100),
          }));
          return prevChunks;
        }

        // 2. Validate correct character
        const expectedChar = activeChunk.word[activeChunk.typedLength];
        const isCorrect = pressedKey === expectedChar;

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
          const nextLength = activeChunk.typedLength + 1;
          playSizzle(); // laser crackle

          // Solder laser trace animation from center to chunk
          setLaserBeam({
            startX: 50,
            startY: 85, // engineer welded bottom-center
            endX: activeChunk.x,
            endY: activeChunk.y,
            active: true
          });
          setTimeout(() => setLaserBeam(null), 100);

          if (nextLength >= activeChunk.word.length) {
            // Deleted chunk! Silver solder patched coin!
            playSizzle(); 
            setLockedChunkId(null);
            
            // Increment word metrics
            setMetrics((prev) => ({
              ...prev,
              wordCount: prev.wordCount + 1,
            }));

            return prevChunks.filter((c) => c.id !== activeChunk!.id);
          } else {
            // Lock onto this word until fully solved
            setLockedChunkId(activeChunk.id);

            return prevChunks.map((c) => {
              if (c.id === activeChunk!.id) {
                return { ...c, typedLength: nextLength };
              }
              return c;
            });
          }
        } else {
          // Mis-stroke on focused word
          playClank();
          setLockedChunkId(null); // release word lock on error
          return prevChunks.map((c) => {
            if (c.id === activeChunk!.id) {
              return { ...c, typedLength: 0 }; // reset typing progress
            }
            return c;
          });
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, lockedChunkId]);

  // Target letter for keyboard highlight mapping
  const activeFocusedChunk = chunks.find((c) => c.id === lockedChunkId);
  const targetChar = activeFocusedChunk 
    ? activeFocusedChunk.word[activeFocusedChunk.typedLength] 
    : (chunks[0]?.word[0] || (wordsListRef.current[wordReadIndexRef.current % (wordsListRef.current.length || 1)]?.[0] || ''));

  return (
    <div id="boiler-deflector-root" className="flex flex-col gap-6 w-full select-none">
      {/* HUD PSI board bar */}
      <div id="boiler-hud" className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 shadow-md font-mono text-xs text-slate-350">
        <div className="flex gap-6">
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">WPM</span>
            <span className="text-lg font-bold text-amber-400">{metrics.wpm}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Accuracy</span>
            <span className="text-lg font-bold text-emerald-400">{metrics.accuracy}%</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Boiler Pressure</span>
            <span className={`text-lg font-bold ${psi > 60 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>{psi} PSI</span>
          </div>
        </div>

        {/* Level Title */}
        <div className="hidden sm:block text-center border-x border-slate-800 px-6">
          <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Tux Adapted</span>
          <span className="text-sm font-retro text-rose-500">BOILER DEFLECTOR</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Time Left</span>
            <span className={`text-lg font-bold ${timeLeft < 25 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Main Deflection Radiant Chamber Stage */}
      <div id="boiler-stage" className="relative h-72 w-full bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Chamber background cross lines */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #444 25%, transparent 25%), 
              linear-gradient(-45deg, #444 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #444 75%), 
              linear-gradient(-45deg, transparent 75%, #444 75%)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0'
          }}
        />

        {/* Big pressure gauges warning lights inside chamber */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className={`w-3 h-3 rounded-full border border-black/40 ${psi > 60 ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
          <div className={`w-3 h-3 rounded-full border border-black/40 ${psi > 30 ? 'bg-yellow-500 animate-ping' : 'bg-slate-700'}`} />
        </div>

        {/* Horizontal pipelines border indicators */}
        <div className="absolute inset-x-0 h-1.5 bottom-0 bg-rose-900 border-t border-rose-800/80"></div>

        {/* Countdown overlay screen */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center font-retro">
            <span className="text-[10px] text-slate-500 mb-2 font-mono">Welder Laser gun ready. Deflect steam chunks!</span>
            <span className="text-6xl text-rose-500 animate-ping">{countdown}</span>
          </div>
        )}

        {/* Explosion disaster overlay board */}
        {gameState === 'exploded' && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur z-35 flex flex-col items-center justify-center font-retro">
            <span className="text-2xl text-rose-500 animate-ping mb-2">BOILER EXPLOSION!</span>
            <span className="text-[10px] text-rose-400 font-mono">Pressure Exceeded Limit! Repairing...</span>
          </div>
        )}

        {/* Welder solder laser gun drawing SVG */}
        {laserBeam && laserBeam.active && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-25">
            <line
              x1={`${laserBeam.startX}%`}
              y1={`${laserBeam.startY}%`}
              x2={`${laserBeam.endX}%`}
              y2={`${laserBeam.endY}%`}
              stroke="#06b6d4"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="animate-pulse"
              filter="drop-shadow(0px 0px 4px #06b6d4)"
            />
            {/* inner high hot core */}
            <line
              x1={`${laserBeam.startX}%`}
              y1={`${laserBeam.startY}%`}
              x2={`${laserBeam.endX}%`}
              y2={`${laserBeam.endY}%`}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Center Boiling System Core Dial */}
        <div 
          className="absolute z-15 flex flex-col items-center select-none pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Industrial pressure core */}
          <div className={`w-16 h-16 rounded-full border-4 relative flex flex-col items-center justify-center shadow-xl ${
            psi > 60 
              ? 'bg-rose-950 border-rose-500 animate-bounce' 
              : 'bg-zinc-900 border-zinc-700'
          }`}>
            <span className="text-[8px] text-slate-500 font-mono uppercase">PRESSURE</span>
            {/* Spinning needle */}
            <div 
              className="w-1 h-6 bg-rose-500 absolute origin-bottom bottom-1/2 left-1/2 -translate-x-1/2 transition-transform duration-300"
              style={{ transform: `rotate(${(psi / 100) * 180 - 90}deg)` }}
            />
          </div>
        </div>

        {/* Moving Outward Debris words chunks */}
        {chunks.map((chunk) => {
          const isFocused = chunk.id === lockedChunkId;
          return (
            <div
              key={chunk.id}
              className="absolute z-25 select-none transition-all duration-75 flex flex-col items-center"
              style={{
                left: `${chunk.x}%`,
                top: `${chunk.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '140px',
              }}
            >
              {/* Flying metal chunk mesh box */}
              <div className={`p-2.5 rounded-2xl border backdrop-blur text-center shadow-lg transition-all duration-100 ${
                isFocused 
                  ? 'bg-cyan-950 border-cyan-400 ring-2 ring-cyan-400 scale-105' 
                  : 'bg-slate-900/90 border-slate-700'
              }`}>
                {/* Letters list word display */}
                <div className="flex justify-center font-retro text-[10px] sm:text-xs">
                  {chunk.word.split('').map((letter, idx) => {
                    const isTyped = idx < chunk.typedLength;
                    return (
                      <span
                        key={idx}
                        className={`${
                          isTyped ? 'text-cyan-400 font-extrabold pb-0.5' : 'text-slate-200'
                        }`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Red danger indicator distance pointer line */}
              {chunk.distance > 30 && (
                <div className="text-[8px] text-rose-500 uppercase tracking-widest font-mono font-bold animate-pulse mt-1 select-none">
                  ▲ WARNING ▲
                </div>
              )}
            </div>
          );
        })}

        {/* Engineer base holding weld gun bottom-center */}
        <div 
          className="absolute z-20"
          style={{
            left: '50%',
            bottom: '8px',
            transform: 'translateX(-50%)',
            width: '48px',
            height: '48px',
          }}
        >
          <SkinRenderer
            skinId={skinId}
            state={lockedChunkId ? 'swimming' : 'idle'}
            frameCount={frameCount}
          />
        </div>
      </div>

      {/* Keyboard Helper highlighters */}
      <KeyboardOverlay targetChar={targetChar} />

      {/* Esc hint block */}
      <div className="text-center font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-1">
        Press <kbd className="px-1.5 py-0.5 bg-slate-850 border border-slate-750' rounded">ESC</kbd> to Pause or Exit lesson
      </div>
    </div>
  );
};
