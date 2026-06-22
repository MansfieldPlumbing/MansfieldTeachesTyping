/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SkinId, Lesson, TypingMetrics } from '../types';
import { SkinRenderer } from './SkinRenderer';
import { KeyboardOverlay } from './KeyboardOverlay';
import { playBonk, playClank, playWinTheme, playGameOver } from '../audio';

interface TunnelDoomGameProps {
  skinId: SkinId;
  lesson: Lesson;
  onFinish: (metrics: TypingMetrics, wasSuccessful: boolean) => void;
  onPause: () => void;
}

export const TunnelDoomGame: React.FC<TunnelDoomGameProps> = ({
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
  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'ended'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  
  // Sentences list from lesson blueprint
  const sentenceStream = lesson.patterns;
  const [sentenceIndex, setSentenceIndex] = useState<number>(0);
  const [charIndex, setCharIndex] = useState<number>(0);
  
  const currentSentence = sentenceStream[sentenceIndex] || 'The pipeline is leaking.';
  const activeChar = currentSentence[charIndex];

  const [playerState, setPlayerState] = useState<'idle' | 'running' | 'jumping' | 'swimming' | 'hurt'>('running');
  const frameCountRef = useRef<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  // Debris obstacle state
  const [incomingRockOffset, setIncomingRockOffset] = useState<number>(100);
  const [rockImpact, setRockImpact] = useState<boolean>(false);

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

  // Main 120 seconds countdown ticker
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

  // Game animation frame ticker
  useEffect(() => {
    let animId: number;
    const update = () => {
      frameCountRef.current += 1;
      setFrameCount(frameCountRef.current);

      if (gameState === 'playing' && playerState === 'running') {
        setScrollOffset((prev) => prev + 0.2); // tunnel background scrolling

        // Slide rocks towards player
        setIncomingRockOffset((prev) => {
          let next = prev - 0.5;
          if (next < 20 && !rockImpact && playerState === 'running') {
            // Rock is close! Player needs to type characters to jump/dodge it!
          }
          if (next < -10) {
            setRockImpact(false);
            return 110; // spawn next rock
          }
          return next;
        });
      }

      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [gameState, playerState, rockImpact]);

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
  }, [sentenceIndex, charIndex, gameState]);

  // Keypress keyboard trigger
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

      if (e.key.length > 1) return; // avoid Ctrl, Caps, Shift, etc.

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
        // Correct segment typed!
        // Stagger jumping/swimming animations depending on spacebar or punctuation
        if (expectedKey === ' ') {
          // Slide/duck action for spaces! Plumber slides smoothly
          setPlayerState('swimming');
          setTimeout(() => setPlayerState('running'), 180);
        } else if (['.', '!', '?', ','].includes(expectedKey)) {
          // Leap high over hurdles on punctuations!
          setPlayerState('jumping');
          setTimeout(() => setPlayerState('running'), 350);
        }

        setCharIndex((prevCharIdx) => {
          const nextCharIdx = prevCharIdx + 1;

          // Checked sentence completed!
          if (nextCharIdx >= currentSentence.length) {
            playWinTheme();

            setSentenceIndex((prevSentIdx) => {
              const nextSentIdx = prevSentIdx + 1;

              if (nextSentIdx >= sentenceStream.length) {
                // completed entire sentence lesson course!
                setGameState('ended');
                onFinish({
                  ...metrics,
                  correctKeystrokes: metrics.correctKeystrokes + 1,
                  totalKeystrokes: metrics.totalKeystrokes + 1,
                  accuracy: Math.round(((metrics.correctKeystrokes + 1) / (metrics.totalKeystrokes + 1)) * 100),
                  wpm: metrics.wpm,
                  streak: metrics.streak + 1,
                  maxStreak: Math.max(metrics.maxStreak, metrics.streak + 1),
                  wordCount: metrics.wordCount + currentSentence.split(' ').length
                }, true);
              }
              return nextSentIdx;
            });
            return 0; // reset char index
          }
          return nextCharIdx;
        });
      } else {
        // Hurting typo collision with rock bonk!
        setPlayerState('hurt');
        setRockImpact(true);
        playBonk();
        setTimeout(() => setPlayerState('running'), 400);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeChar, currentSentence, sentenceIndex, sentenceStream, metrics, onPause, onFinish]);

  // Scroll ratio Calculations
  const progressRatio = currentSentence.length > 0 ? (charIndex / currentSentence.length) * 100 : 0;

  return (
    <div id="tunnel-doom-root" className="flex flex-col gap-6 w-full select-none">
      {/* HUD Bar */}
      <div id="tunnel-doom-hud" className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-6 py-3 shadow-md font-mono text-xs text-slate-350">
        <div className="flex gap-6">
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">WPM</span>
            <span className="text-lg font-bold text-amber-500">{metrics.wpm}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Accuracy</span>
            <span className="text-lg font-bold text-emerald-400">{metrics.accuracy}%</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Sentence</span>
            <span className="text-lg font-bold text-cyan-400">{sentenceIndex + 1} <span className="text-xs text-slate-650">/ {sentenceStream.length}</span></span>
          </div>
        </div>

        {/* Level Objective Badge */}
        <div className="hidden sm:block text-center border-x border-slate-800 px-6">
          <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Lesson Topic</span>
          <span className="text-sm font-retro text-yellow-500">TUNNEL OF DOOM</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Time Left</span>
            <span className={`text-lg font-bold ${timeLeft < 25 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Main Sentence ribbon overlay and track */}
      <div id="sentence-board" className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col gap-3 min-h-32 justify-center">
        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest block mb-1">Type standard punctuation & spaces accurately:</span>
        
        {/* Full Sentence Scrolling Tape */}
        <div className="flex flex-wrap gap-x-1.5 font-retro text-content leading-relaxed text-sm md:text-lg select-none">
          {currentSentence.split('').map((letter, idx) => {
            const isTyped = idx < charIndex;
            const isCurrent = idx === charIndex;
            return (
              <span
                key={idx}
                className={`transition-all duration-75 relative rounded ${
                  isTyped 
                    ? 'text-slate-600 font-extrabold line-through' 
                    : isCurrent 
                      ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/10 font-bold px-0.5 animate-pulse' 
                      : 'text-slate-200'
                }`}
              >
                {/* Visual indicator of blank spaces */}
                {letter === ' ' ? (
                  <span className={`font-mono text-xs opacity-40 mx-0.5 ${isCurrent ? 'text-amber-400 opacity-90' : 'text-slate-500'}`}>␣</span>
                ) : (
                  letter
                )}
              </span>
            );
          })}
        </div>

        {/* Custom Progress slide bottom line bar */}
        <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden border border-slate-850">
          <div 
            className="bg-amber-400 h-full rounded-full transition-all duration-200"
            style={{ width: `${progressRatio}%` }}
          />
        </div>
      </div>

      {/* Side Scroller subterranean leaky tunnel layout */}
      <div id="tunnel-stage" className="relative h-44 w-full bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Background leaking cavern texture */}
        <div 
          className="absolute inset-0 bg-repeat-x opacity-40 bg-zinc-900"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #18181b 0px, #18181b 10px, #27272a 10px, #27272a 20px)',
            backgroundPosition: `${-scrollOffset * 4}px 0px`
          }}
        />

        {/* Heavy leaking wooden support beams repeating background */}
        <div 
          className="absolute inset-y-0 left-0 right-0 h-full pointer-events-none opacity-30 bg-repeat-x"
          style={{
            backgroundImage: 'linear-gradient(90deg, #3f220f 8px, transparent 8px, transparent 120px)',
            backgroundPosition: `${-scrollOffset * 4.5}px 0px`,
            backgroundSize: '120px 100%'
          }}
        />

        {/* Horizontal dripping steam copper pipelines */}
        <div className="absolute top-4 left-0 right-0 h-3 bg-yellow-900/40 border-y border-yellow-800 flex justify-end opacity-60">
          <div className="w-10 h-6 bg-yellow-950 border border-slate-700 rounded-full animate-pulse mr-12"></div>
        </div>

        {/* Countdown layer */}
        {gameState === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center font-retro">
            <span className="text-[10px] text-slate-500 mb-2">Sentence training starts in</span>
            <span className="text-6xl text-amber-400 animate-ping">{countdown}</span>
          </div>
        )}

        {/* Character element container */}
        <div 
          className="absolute z-15 transition-all duration-75"
          style={{
            left: '20%', // fixed anchor
            bottom: playerState === 'jumping' ? '32px' : playerState === 'swimming' ? '4px' : '8px',
            width: '56px',
            height: '56px',
          }}
        >
          <SkinRenderer
            skinId={skinId}
            state={playerState}
            frameCount={frameCount}
          />

          {/* Falling dirt/mud impact particle splashes */}
          {rockImpact && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 z-30">
              <div className="w-1.5 h-1.5 bg-yellow-800 rounded-full animate-ping"></div>
              <div className="w-1.5 h-1.5 bg-yellow-900 rounded-full animate-ping delay-75"></div>
              <div className="w-2 h-2 bg-slate-800 rounded-full animate-ping delay-100"></div>
            </div>
          )}
        </div>

        {/* Incoming ceiling hazard rock falling down */}
        <div
          className="absolute z-15 flex flex-col items-center select-none pointer-events-none"
          style={{
            left: `${incomingRockOffset}%`,
            bottom: rockImpact ? '4px' : '44px',
            width: '36px',
            height: '36px',
            opacity: incomingRockOffset > 102 ? 0 : 1,
            transform: rockImpact ? 'rotate(90deg) scale(0.6)' : 'none',
            transition: rockImpact ? 'all 0.1s ease-out' : 'none'
          }}
        >
          {/* Falling raw grey clay concrete block */}
          <div className="w-8 h-8 bg-zinc-800 border-2 border-zinc-700 rounded-md relative flex items-center justify-center m-1 shadow-lg shadow-black/80">
            <div className="absolute top-1 left-1 w-2 h-1 bg-zinc-650 rounded"></div>
            <div className="absolute bottom-1.5 right-1 w-3 h-1 bg-zinc-750"></div>
            <div className="w-4 h-4 border border-zinc-800 bg-rose-900/50 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Level Floor */}
        <div className="absolute bottom-0 inset-x-0 h-4 bg-zinc-800 border-t border-zinc-700/80"></div>
      </div>

      {/* Finger guidances keyboard highlight overlay */}
      <KeyboardOverlay targetChar={activeChar} />

      {/* Pause exit keyboard triggers */}
      <div className="text-center font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-1">
        Press <kbd className="px-1.5 py-0.5 bg-slate-850 border border-slate-755 rounded">ESC</kbd> to Pause or Exit lesson
      </div>
    </div>
  );
};
