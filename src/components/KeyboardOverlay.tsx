/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface KeyboardOverlayProps {
  targetChar: string;
}

interface FingerMapping {
  hand: 'left' | 'right';
  finger: 'pinky' | 'ring' | 'middle' | 'index' | 'thumb';
  color: string;
}

// Map characters to correct hand and finger
function getFingerMapping(char: string): FingerMapping {
  const c = char.toLowerCase();

  if (c === ' ' || c === 'space') {
    return { hand: 'right', finger: 'thumb', color: 'bg-indigo-500' }; // Use right thumb by default for space
  }

  const leftPinky = ['q', 'a', 'z', '1', '!', '`', '~', 'shift', 'caps'];
  if (leftPinky.includes(c)) return { hand: 'left', finger: 'pinky', color: 'bg-emerald-500' };

  const leftRing = ['w', 's', 'x', '2', '@'];
  if (leftRing.includes(c)) return { hand: 'left', finger: 'ring', color: 'bg-teal-500' };

  const leftMiddle = ['e', 'd', 'c', '3', '#'];
  if (leftMiddle.includes(c)) return { hand: 'left', finger: 'middle', color: 'bg-cyan-500' };

  const leftIndex = ['r', 't', 'f', 'g', 'v', 'b', '4', '5', '$', '%'];
  if (leftIndex.includes(c)) return { hand: 'left', finger: 'index', color: 'bg-sky-500' };

  const rightIndex = ['y', 'u', 'h', 'j', 'n', 'm', '6', '7', '^', '&'];
  if (rightIndex.includes(c)) return { hand: 'right', finger: 'index', color: 'bg-blue-500' };

  const rightMiddle = ['i', 'k', ',', '<', '8', '*'];
  if (rightMiddle.includes(c)) return { hand: 'right', finger: 'middle', color: 'bg-purple-500' };

  const rightRing = ['o', 'l', '.', '>', '9', '('];
  if (rightRing.includes(c)) return { hand: 'right', finger: 'ring', color: 'bg-fuchsia-500' };

  // Everything else goes to right pinky (p, ;, /, Punctuation, shift key, etc.)
  return { hand: 'right', finger: 'pinky', color: 'bg-pink-500' };
}

export const KeyboardOverlay: React.FC<KeyboardOverlayProps> = ({ targetChar }) => {
  const mapping = getFingerMapping(targetChar);

  const keyboardRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
  ];

  const checkActiveKey = (key: string) => {
    if (!targetChar) return false;
    const cleanTarget = targetChar.toUpperCase();
    if (cleanTarget === ' ' && key === 'SPACE') return true;
    
    // Shift checks
    if (key === 'L-SHIFT' && targetChar !== targetChar.toLowerCase() && targetChar !== ' ' && !['1','2','3','4','5','6','7','8','9','0'].includes(targetChar)) {
      // capital letters require Shift
      return mapping.hand === 'right'; // If typing right hand key, hold left shift
    }
    if (key === 'R-SHIFT' && targetChar !== targetChar.toLowerCase() && targetChar !== ' ' && !['1','2','3','4','5','6','7','8','9','0'].includes(targetChar)) {
      return mapping.hand === 'left'; // If typing left hand key, hold right shift
    }

    if (key === ';') return cleanTarget === ';' || cleanTarget === ':';
    if (key === ',') return cleanTarget === ',' || cleanTarget === '<';
    if (key === '.') return cleanTarget === '.' || cleanTarget === '>';
    if (key === '/') return cleanTarget === '/' || cleanTarget === '?';
    if (key === "'") return cleanTarget === "'" || cleanTarget === '"';
    if (key === '-') return cleanTarget === '-' || cleanTarget === '_';
    if (key === '=') return cleanTarget === '=' || cleanTarget === '+';

    return key === cleanTarget;
  };

  const getFingerLabel = (m: FingerMapping) => {
    const fingerNames = {
      pinky: 'Pinky',
      ring: 'Ring F.',
      middle: 'Middle F.',
      index: 'Index F.',
      thumb: 'Thumb'
    };
    return `${m.hand.toUpperCase()} ${fingerNames[m.finger]}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-6 items-center justify-between w-full max-w-4xl mx-auto shadow-xl">
      {/* 2D Keyboard representation */}
      <div className="flex-1 flex flex-col gap-1 w-full max-w-2xl select-none">
        {keyboardRows.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-1 justify-center">
            {/* Lead padding keys for visual structure */}
            {rIdx === 1 && <div className="w-10 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">Tab</div>}
            {rIdx === 2 && <div className="w-12 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">Caps</div>}
            {rIdx === 3 && <div className={`w-14 h-8 sm:h-10 rounded flex items-center justify-center text-[10px] font-mono transition-all ${checkActiveKey('L-SHIFT') ? 'bg-amber-500 text-slate-950 font-bold scale-105 shadow' : 'bg-slate-800 text-slate-500'}`}>Shift</div>}

            {row.map((key) => {
              const active = checkActiveKey(key);
              return (
                <div
                  key={key}
                  className={`w-7 h-8 sm:w-10 sm:h-10 rounded flex items-center justify-center text-xs sm:text-sm font-mono transition-all duration-100 ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-bold scale-105 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-800'
                  }`}
                >
                  {key}
                </div>
              );
            })}

            {/* Ending padding keys */}
            {rIdx === 0 && <div className="w-12 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">Back</div>}
            {rIdx === 1 && <div className="w-8 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">\</div>}
            {rIdx === 2 && <div className="w-14 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">Enter</div>}
            {rIdx === 3 && <div className={`w-14 h-8 sm:h-10 rounded flex items-center justify-center text-[10px] font-mono transition-all ${checkActiveKey('R-SHIFT') ? 'bg-amber-500 text-slate-950 font-bold scale-105 shadow' : 'bg-slate-800 text-slate-500'}`}>Shift</div>}
          </div>
        ))}
        {/* Spacebar Row */}
        <div className="flex gap-1 justify-center mt-1">
          <div className="w-20 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">Ctrl</div>
          <div className="w-12 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">Alt</div>
          <div
            className={`w-48 sm:w-64 h-8 sm:h-10 rounded transition-all duration-100 flex items-center justify-center ${
              checkActiveKey('SPACE')
                ? 'bg-amber-500 text-slate-910 font-bold scale-105'
                : 'bg-slate-800/80 border border-slate-700/50'
            }`}
          >
            <div className="w-24 border-t border-slate-600/50"></div>
          </div>
          <div className="w-12 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">Alt</div>
          <div className="w-20 h-8 sm:h-10 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-500 font-mono">Ctrl</div>
        </div>
      </div>

      {/* Hand helper details */}
      <div className="w-full md:w-48 flex flex-col items-center justify-center bg-slate-950/50 border border-slate-800/50 rounded-lg p-3 self-stretch font-mono">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Finger Guide</span>
        
        {/* Target Indicator badge */}
        <div className="my-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-md text-center">
          <span className="text-[10px] text-slate-400 block">NEXT KEY</span>
          <span className="text-xl font-retro text-amber-400">
            {targetChar === ' ' ? 'SPACE' : targetChar || 'none'}
          </span>
        </div>

        {/* 2D Hands display graphic */}
        <div className="flex gap-6 mt-1 mb-2">
          {/* Left Hand SVG */}
          <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 40 40" className="w-12 h-12">
              <g fill="none" stroke="#475569" strokeWidth="1.5">
                {/* Hand silhouette */}
                <path d="M 6,34 C 6,28 10,24 16,24 C 22,24 24,28 24,34" strokeWidth="1" />
                {/* Fingers */}
                <line x1="8" y1="24" x2="8" y2="10" className={mapping.hand === 'left' && mapping.finger === 'pinky' ? 'stroke-amber-400 stroke-2' : ''} />
                <line x1="12" y1="24" x2="12" y2="6" className={mapping.hand === 'left' && mapping.finger === 'ring' ? 'stroke-amber-400 stroke-2' : ''} />
                <line x1="16" y1="24" x2="16" y2="4" className={mapping.hand === 'left' && mapping.finger === 'middle' ? 'stroke-amber-400 stroke-2' : ''} />
                <line x1="20" y1="24" x2="20" y2="8" className={mapping.hand === 'left' && mapping.finger === 'index' ? 'stroke-amber-400 stroke-2' : ''} />
                <line x1="26" y1="28" x2="31" y2="24" className={mapping.hand === 'left' && mapping.finger === 'thumb' ? 'stroke-amber-400 stroke-2' : ''} />
              </g>
              {/* Highlight dynamic dot */}
              {mapping.hand === 'left' && (
                <circle
                  cx={mapping.finger === 'pinky' ? 8 : mapping.finger === 'ring' ? 12 : mapping.finger === 'middle' ? 16 : mapping.finger === 'index' ? 20 : 31}
                  cy={mapping.finger === 'pinky' ? 10 : mapping.finger === 'ring' ? 6 : mapping.finger === 'middle' ? 4 : mapping.finger === 'index' ? 8 : 24}
                  r="3"
                  className="fill-amber-400 animate-pulse"
                />
              )}
            </svg>
            <span className={`text-[10px] ${mapping.hand === 'left' ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>LEFT</span>
          </div>

          {/* Right Hand SVG */}
          <div className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 40 40" className="w-12 h-12">
              <g fill="none" stroke="#475569" strokeWidth="1.5">
                {/* Hand silhouette */}
                <path d="M 34,34 C 34,28 30,24 24,24 C 18,24 16,28 16,34" strokeWidth="1" />
                {/* Fingers */}
                <line x1="32" y1="24" x2="32" y2="10" className={mapping.hand === 'right' && mapping.finger === 'pinky' ? 'stroke-amber-400 stroke-2' : ''} />
                <line x1="28" y1="24" x2="28" y2="6" className={mapping.hand === 'right' && mapping.finger === 'ring' ? 'stroke-amber-400 stroke-2' : ''} />
                <line x1="24" y1="24" x2="24" y2="4" className={mapping.hand === 'right' && mapping.finger === 'middle' ? 'stroke-amber-400 stroke-2' : ''} />
                <line x1="20" y1="24" x2="20" y2="8" className={mapping.hand === 'right' && mapping.finger === 'index' ? 'stroke-amber-400 stroke-2' : ''} />
                <line x1="14" y1="28" x2="9" y2="24" className={mapping.hand === 'right' && mapping.finger === 'thumb' ? 'stroke-amber-400 stroke-2' : ''} />
              </g>
              {/* Highlight dynamic dot */}
              {mapping.hand === 'right' && (
                <circle
                  cx={mapping.finger === 'pinky' ? 32 : mapping.finger === 'ring' ? 28 : mapping.finger === 'middle' ? 24 : mapping.finger === 'index' ? 20 : 9}
                  cy={mapping.finger === 'pinky' ? 10 : mapping.finger === 'ring' ? 6 : mapping.finger === 'middle' ? 4 : mapping.finger === 'index' ? 8 : 24}
                  r="3"
                  className="fill-amber-400 animate-pulse"
                />
              )}
            </svg>
            <span className={`text-[10px] ${mapping.hand === 'right' ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>RIGHT</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-350 text-center font-bold px-1 bg-slate-900 border border-slate-850 rounded">
          {getFingerLabel(mapping)}
        </span>
      </div>
    </div>
  );
};
