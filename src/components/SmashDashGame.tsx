/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SkinId, Lesson, TypingMetrics, GameEntity } from '../types';
import { SkinRenderer } from './SkinRenderer';
import { KeyboardOverlay } from './KeyboardOverlay';
import { playCoin, playStomp, playClank, playWinTheme, playGameOver } from '../audio';

interface SmashDashGameProps {
  skinId: SkinId;
  lesson: Lesson;
  onFinish: (metrics: TypingMetrics, wasSuccessful: boolean) => void;
  onPause: () => void;
}

export const SmashDashGame: React.FC<SmashDashGameProps> = ({
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

  const [timeLeft, setTimeLeft] = useState<number>(120); // 120-second session countdown
  const [charIndex, setCharIndex] = useState<number>(0);
  const [playerState, setPlayerState] = useState<'idle' | 'running' | 'jumping' | 'hurt'>('running');
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'ended'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  
  // Lesson characters stream
  // Flattening all patterns of the lesson to a single sequence
  const streamText = lesson.patterns.join('   '); // spaces in between sentences
  const activeChar = streamText[charIndex];

  // Visual Obstacles List
  const [entities, setEntities] = useState<GameEntity[]>([]);

  const frameCountRef = useRef<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const scrollOffsetRef = useRef<number>(0);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  // Sound triggering safeguard
  const firstKeyRef = useRef<boolean>(false);

  // Generate initial sequence of obstacles matching the characters
  useEffect(() => {
    const list: GameEntity[] = [];
    let currentX = 40; // start distance
    for (let i = 0; i < streamText.length; i++) {
      const char = streamText[i];
      if (char === ' ') {
        currentX += 15; // gap for spacing
        continue;
      }
      
      const isBlock = i % 2 === 0;
      list.push({
        id: `entity-${i}`,
        text: char,
        typedLength: 0,
        x: currentX,
        y: isBlock ? 32 : 55, // Bricks high, Goombas low
        type: isBlock ? 'question_block' : 'goomba',
        speed: 0,
        status: 'active'
      });
      currentX += 28; // spacing between active obstacles
    }
    setEntities(list);
  }, [lesson, streamText]);

  // Countdown effect
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

  // Main 120s Game counter
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

  // Render loop update for running animations
  useEffect(() => {
    let animId: number;
    const update = () => {
      frameCountRef.current += 1;
      setFrameCount(frameCountRef.current);

      if (gameState === 'playing' && playerState === 'running') {
        scrollOffsetRef.current += 0.15; // scroll background
        setScrollOffset(scrollOffsetRef.current);
      }

      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [gameState, playerState]);

  // Dynamic WPM updater
  useEffect(() => {
    if (gameState !== 'playing') return;
    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
    if (elapsedSeconds < 2) return;
    
    // WPM = (correct chars / 5) / minutes
    const correctKeystrokes = metrics.correctKeystrokes;
    const minutes = elapsedSeconds / 60;
    const calculatedWpm = Math.max(0, Math.round((correctKeystrokes / 5) / minutes));

    setMetrics((prev) => ({
      ...prev,
      wpm: calculatedWpm
    }));
  }, [charIndex, gameState]);

  // Key press listener
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent standard browser scrolling behavior
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
      }

      if (e.key === 'Escape') {
        onPause();
        return;
      }

      // Ignore utility keys (Modifier keys etc.)
      if (e.key.length > 1 && e.key !== 'Spacebar' && e.key !== ' ') {
        return;
      }

      const pressedKey = e.key === ' ' ? ' ' : e.key;
      const expectedKey = activeChar;

      // Handle blank space transitions effortlessly
      if (expectedKey === ' ') {
        if (pressedKey === ' ') {
          // move forward through empty spaces
          setCharIndex(prev => {
            const nextIndex = prev + 1;
            // check reached end of lesson length
            if (nextIndex >= streamText.length) {
              setGameState('ended');
              playWinTheme();
              onFinish({
                ...metrics,
                correctKeystrokes: metrics.correctKeystrokes + 1,
                totalKeystrokes: metrics.totalKeystrokes + 1,
                accuracy: Math.round(((metrics.correctKeystrokes + 1) / (metrics.totalKeystrokes + 1)) * 100)
              }, true);
            }
            return nextIndex;
          });
        }
        return;
      }

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
        // Find matching active entity for this character index
        // Since activeChar is not a space, we must have a block/enemy associated with it
        const listIndex = entities.findIndex(ent => ent.text === expectedKey && ent.status === 'active' && ent.x >= 20);
        
        if (listIndex !== -1) {
          const entity = entities[listIndex];
          const isHighBlock = entity.y < 45;

          if (isHighBlock) {
            setPlayerState('jumping');
            playCoin();
            setTimeout(() => setPlayerState('running'), 250);
          } else {
            // stomp action
            setPlayerState('jumping');
            playStomp();
            setTimeout(() => setPlayerState('running'), 250);
          }

          // Mark entity as cleared/hit
          setEntities(prev => prev.map((ent, idx) => {
            if (idx === listIndex) {
              return { ...ent, status: 'hit' };
            }
            return ent;
          }));
        }

        setCharIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex >= streamText.length) {
            setGameState('ended');
            playWinTheme();
            onFinish({
              ...metrics,
              correctKeystrokes: metrics.correctKeystrokes + 1,
              totalKeystrokes: metrics.totalKeystrokes + 1,
              accuracy: Math.round(((metrics.correctKeystrokes + 1) / (metrics.totalKeystrokes + 1)) * 105), // high success padding
              wpm: metrics.wpm,
              streak: metrics.streak + 1,
              maxStreak: Math.max(metrics.maxStreak, metrics.streak + 1),
              wordCount: metrics.wordCount + 1
            }, true);
          }
          return nextIndex;
        });

      } else {
        // Missed key - Trip/Hurt animation state
        setPlayerState('hurt');
        playClank();
        setTimeout(() => setPlayerState('running'), 280);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeChar, charIndex, entities, metrics, onFinish, streamText]);

  // Adjust entities visual offset position depending on current typing character index
  // Moving obstacles from right to left as a reaction to correctly matched character typing!
  const shiftOffset = charIndex * 24;

  return (
    <div id="smash-dash-root" className="flex flex-col gap-6 w-full select-none">
      {/* HUD Bar */}
      <div id="smash-dash-hud" className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 shadow-md font-mono text-xs text-slate-350">
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
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Streak</span>
            <span className="text-lg font-bold text-cyan-400">{metrics.streak} <span className="text-xs text-slate-600">/ {metrics.maxStreak} max</span></span>
          </div>
        </div>

        {/* Level Objective Badge */}
        <div className="hidden sm:block text-center border-x border-slate-800 px-6">
          <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Target Row</span>
          <span className="text-sm font-retro text-slate-300">{lesson.focus}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Time Left</span>
            <span className={`text-lg font-bold ${timeLeft < 25 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Main Side Scroller Stage Area */}
      <div id="smash-dash-stage" className="relative h-64 w-full bg-indigo-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Sky Background with brick accents */}
        <div 
          className="absolute inset-0 bg-repeat-x transition-all duration-300"
          style={{
            backgroundImage: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 100%)',
            backgroundPosition: `${-scrollOffset * 4}px 0px`
          }}
        />

        {/* Leaking green ceiling pipes decorative layer */}
        <div className="absolute top-0 left-0 right-0 h-4 border-b border-emerald-900/50 bg-emerald-950 opacity-60 flex justify-around">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-8 h-6 bg-emerald-800 border-x border-b border-slate-700/60 rounded-b"></div>
          ))}
        </div>

        {/* Floating clouds scrolling */}
        <div 
          className="absolute top-8 left-0 right-0 h-12 bg-repeat-x opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #38bdf8 10%, transparent 60%)',
            backgroundSize: '180px 40px',
            backgroundPosition: `${-scrollOffset * 10}px 0px`
          }}
        />

        {/* Countdown Overlap screen */}
        {gameState === 'countdown' && (
          <div id="countdown-modal" className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center font-retro">
            <span className="text-[10px] text-slate-500 mb-2">Lesson starts in</span>
            <span className="text-6xl text-amber-400 animate-ping">{countdown}</span>
          </div>
        )}

        {/* Game Stage Scenery Floor */}
        <div id="smash-dash-floor" className="absolute bottom-0 inset-x-0 h-12 bg-slate-800 border-t-2 border-slate-750 flex items-center">
          <div 
            className="w-full h-full bg-repeat-x opacity-80"
            style={{
              backgroundImage: 'linear-gradient(90deg, #1e293b 25%, transparent 25%, transparent 50%, #1e293b 50%, #1e293b 75%, transparent 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: `${-scrollOffset * 18}px 0px`
            }}
          />
        </div>

        {/* Character element container */}
        <div 
          id="player-container"
          className="absolute z-15 transition-all duration-75"
          style={{
            left: '20%', // fixed anchor
            bottom: playerState === 'jumping' ? '48px' : '12px',
            width: '56px',
            height: '56px',
          }}
        >
          <SkinRenderer
            skinId={skinId}
            state={playerState === 'jumping' ? 'jumping' : playerState === 'hurt' ? 'hurt' : 'running'}
            frameCount={frameCount}
          />

          {/* Stomping dynamic indicator trail */}
          {playerState === 'jumping' && (
            <div className="absolute -bottom-2 inset-x-0 mx-auto w-3 h-1 bg-amber-400/40 rounded-full blur animate-ping"></div>
          )}
        </div>

        {/* Active Stream Obstacles mapping */}
        <div 
          className="absolute inset-0 z-10 transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${-shiftOffset}px)` }}
        >
          {entities.map((ent, idx) => {
            const isTarget = idx === charIndex;
            const isHit = ent.status === 'hit';

            // Calculate x scaling based on absolute coordinates + starting offset
            return (
              <div
                key={ent.id}
                className="absolute transition-all duration-200"
                style={{
                  left: `${ent.x * 12}px`,
                  bottom: `${ent.y === 32 ? '96px' : '12px'}`, // Bricks high, Goombas low
                  width: '48px',
                  height: '48px',
                  opacity: isHit ? 0 : 1,
                  transform: isHit ? 'scale(0.5) translateY(-30px)' : 'none',
                }}
              >
                {/* Visual block/enemy designs */}
                {ent.type === 'question_block' ? (
                  <div className={`w-10 h-10 rounded border-2 flex flex-col items-center justify-center relative shadow-lg ${
                    isTarget 
                      ? 'bg-amber-400 border-amber-300 animate-bounce shadow-amber-400/30' 
                      : 'bg-orange-800 border-orange-700'
                  }`}>
                    {/* Retro Brick detail */}
                    <div className="absolute inset-0 border border-black/10 m-0.5"></div>
                    <span className={`font-retro text-sm ${isTarget ? 'text-slate-900 font-extrabold' : 'text-orange-400'}`}>
                      ?
                    </span>

                    {/* Float character letter */}
                    <div className="absolute -top-7 px-2 py-0.5 bg-slate-900/90 border border-slate-700 rounded text-center text-xs font-mono text-slate-300 font-bold min-w-6">
                      {ent.text}
                    </div>
                  </div>
                ) : (
                  // Goomba retro creature style
                  <div className={`w-10 h-10 flex flex-col items-center justify-end relative rounded-full ${
                    isTarget 
                      ? 'scale-110' 
                      : 'scale-100'
                  }`}>
                    <div className={`w-9 h-8 border-2 rounded-t-xl rounded-b-md relative flex items-center justify-center ${
                      isTarget 
                        ? 'bg-rose-600 border-rose-400 animate-pulse shadow-lg shadow-rose-600/30' 
                        : 'bg-emerald-850 border-emerald-750'
                    }`}>
                      {/* Goofy character eyes */}
                      <div className="flex gap-2 absolute top-1.5 justify-center">
                        <div className="w-1.5 h-3 bg-white rounded-full flex items-center justify-center">
                          <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                        </div>
                        <div className="w-1.5 h-3 bg-white rounded-full flex items-center justify-center">
                          <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    {/* Little feet */}
                    <div className="flex gap-3 -mt-0.5 z-10">
                      <div className="w-2.5 h-2 bg-slate-700 border border-slate-600 rounded"></div>
                      <div className="w-2.5 h-2 bg-slate-700 border border-slate-600 rounded"></div>
                    </div>

                    {/* Float character letter */}
                    <div className="absolute -top-7 px-2 py-0.5 bg-slate-900/90 border border-slate-700 rounded text-center text-xs font-mono text-slate-300 font-bold min-w-6">
                      {ent.text}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive keyboard guide displaying finger position */}
      <KeyboardOverlay targetChar={activeChar} />

      {/* PAUSE ESCAPE hint block */}
      <div className="text-center font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-1">
        Press <kbd className="px-1.5 py-0.5 bg-slate-850 border border-slate-750 rounded">ESC</kbd> to Pause or Exit lesson
      </div>
    </div>
  );
};
