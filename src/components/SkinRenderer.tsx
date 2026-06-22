/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SkinId } from '../types';

interface SkinRendererProps {
  skinId: SkinId;
  state: 'idle' | 'running' | 'jumping' | 'swimming' | 'hurt';
  frameCount: number;
  className?: string;
  id?: string;
}

export const SkinRenderer: React.FC<SkinRendererProps> = ({
  skinId,
  state,
  frameCount,
  className = '',
  id,
}) => {
  const isAltFrame = Math.floor(frameCount / 8) % 2 === 1;
  const isAltFrame3 = Math.floor(frameCount / 5) % 3; // 0, 1, 2 for running cycle

  const renderMarcioLucio = (color: string, overallsColor: string) => {
    // 16x16 Grid Pixel Art of classic retro plumber
    // Represented in 16 columns and 16 rows.
    // 0 = Transparent, 1 = Hat (color), 2 = Hair/Mustache/Boots (Brown #5c4033), 3 = Skin (#fcd0a1), 4 = Overalls (overallsColor), 5 = Undershirt (yellow/white), 6 = Yellow button (#ffd700), 7 = White eye
    const idleGrid = [
      [0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,2,2,2,3,3,2,3,0,0,0,0,0,0,0],
      [0,2,3,2,3,3,3,2,3,3,3,0,0,0,0,0],
      [0,2,3,2,2,3,3,3,2,3,3,3,0,0,0,0],
      [0,2,2,3,3,3,3,2,2,2,2,0,0,0,0,0],
      [0,0,0,3,3,3,3,3,3,3,0,0,0,0,0],
      [0,0,5,5,4,5,5,5,4,5,0,0,0,0,0],
      [0,5,5,5,4,5,5,5,4,5,5,5,0,0,0],
      [5,5,5,5,4,4,4,4,4,5,5,5,5,0,0],
      [3,3,5,4,6,4,4,4,6,4,5,3,3,0,0],
      [3,3,3,4,4,4,4,4,4,4,3,3,3,0,0],
      [3,3,4,4,4,4,4,4,4,4,4,3,3,0,0],
      [0,0,4,4,4,0,0,0,4,4,4,0,0,0,0],
      [0,2,2,2,0,0,0,0,0,2,2,2,0,0,0],
      [2,2,2,2,0,0,0,0,0,2,2,2,2,0,0]
    ];

    const run1Grid = [
      [0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,2,2,2,3,3,2,3,0,0,0,0,0,0],
      [0,0,2,3,2,3,3,3,2,3,3,3,0,0,0,0],
      [0,0,2,3,2,2,3,3,3,2,3,3,3,0,0,0],
      [0,0,2,2,3,3,3,3,2,2,2,2,0,0,0,0],
      [0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0],
      [0,0,0,5,5,4,5,5,5,0,0,0,0,0,0,0],
      [0,0,5,5,5,4,4,5,5,5,0,0,0,0,0,0],
      [0,5,5,5,5,4,4,4,4,5,5,0,0,0,0],
      [0,3,3,5,4,6,4,4,4,6,4,0,0,0,0],
      [0,0,0,4,4,4,4,4,4,4,4,0,0,0,0],
      [0,0,4,4,4,4,4,4,4,4,4,0,0,0,0],
      [0,4,4,4,4,0,0,0,4,4,4,4,0,0,0],
      [2,2,2,2,0,0,0,0,0,2,2,2,2,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    const run2Grid = [
      [0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,2,2,2,3,3,2,3,0,0,0,0,0,0],
      [0,0,2,3,2,3,3,3,2,3,3,3,0,0,0,0],
      [0,0,2,3,2,2,3,3,3,2,3,3,3,0,0,0],
      [0,0,2,2,3,3,3,3,2,2,2,2,0,0,0,0],
      [0,0,0,0,3,3,3,3,3,3,3,0,0,0,0,0],
      [0,0,0,0,5,4,5,5,5,0,0,0,0,0,0,0],
      [0,0,0,5,5,4,4,5,5,5,5,0,0,0,0],
      [0,0,5,5,5,4,4,4,4,5,5,5,0,0,0],
      [0,0,3,3,5,6,4,4,4,6,4,0,0,0,0],
      [0,0,0,0,4,4,4,4,4,4,4,0,0,0,0],
      [0,0,0,4,4,4,0,0,4,4,4,0,0,0,0],
      [0,0,4,4,4,4,0,0,0,4,4,4,0,0,0],
      [0,2,2,2,2,0,0,0,0,2,2,2,2,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    const jumpGrid = [
      [0,0,0,0,0,0,3,3,3,3,3,0,0,0,0,0],
      [0,0,0,0,0,3,3,3,3,3,3,3,0,0,0,0],
      [0,0,0,0,0,5,5,4,6,4,4,5,0,0,0,0],
      [0,0,0,0,5,5,5,4,4,4,4,5,5,0,0,0],
      [0,0,0,5,5,5,5,4,4,4,4,5,5,5,0,0],
      [0,0,3,3,5,5,4,4,4,4,4,4,5,3,3,0],
      [0,3,3,3,0,4,4,4,4,4,4,4,0,3,3,3],
      [0,3,3,0,0,4,4,4,4,4,4,4,0,0,3,3],
      [0,0,0,0,4,4,4,4,0,4,4,4,4,0,0,0],
      [0,0,0,2,2,2,2,0,0,0,2,2,2,2,0,0],
      [0,0,2,2,2,2,2,0,0,0,2,2,2,2,2,0],
      [0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0],
      [0,0,0,0,0,2,2,2,3,3,2,3,0,0,0,0],
      [0,0,0,0,2,3,2,3,3,3,2,3,3,3,0,0],
      [0,0,0,0,2,3,2,2,3,3,3,2,3,3,3,0]
    ];

    const swimGrid = [
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,2,2,2,3,3,2,3,0,0,0,0,0,0,0],
      [0,2,3,2,3,3,3,2,3,3,3,5,5,5,5,0],
      [0,2,3,2,2,3,3,3,2,3,3,3,4,4,4,0],
      [0,2,2,3,3,3,3,2,2,2,2,4,4,4,4,0],
      [0,0,0,3,3,3,3,3,3,3,4,4,6,4,4,0],
      [0,0,5,5,4,5,5,5,4,5,4,4,4,4,4,0],
      [0,5,5,5,4,5,5,5,4,5,5,4,4,4,0,0],
      [5,5,5,5,4,4,4,4,4,5,5,5,0,0,0,0],
      [3,3,5,4,6,4,4,4,6,4,5,0,0,0,0,0],
      [3,3,3,4,4,4,4,4,4,4,0,0,0,0,0,0],
      [0,4,4,4,4,4,4,4,4,4,2,2,2,2,0,0],
      [0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    const hurtGrid = [
      [0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,2,2,2,3,3,2,3,0,0,0,0,0,0,0],
      [0,2,3,2,2,3,3,2,2,3,3,0,0,0,0,0], // crossed eye look
      [0,2,3,2,2,3,3,3,2,3,3,3,0,0,0,0],
      [0,2,2,3,3,3,3,2,2,2,2,0,0,0,0,0],
      [0,0,0,3,3,2,2,3,3,3,0,0,0,0,0],
      [0,0,5,5,4,5,5,5,4,5,0,0,0,0,0],
      [0,5,5,5,4,5,5,5,4,5,5,5,0,0,0],
      [5,5,5,5,4,4,4,4,4,5,5,5,5,0,0],
      [3,3,5,4,6,4,4,4,6,4,5,3,3,0,0],
      [3,3,3,4,4,4,2,2,4,4,3,3,3,0,0], // hurt stance
      [0,0,4,4,4,2,2,2,2,4,4,0,0,0,0],
      [0,0,4,4,0,0,0,0,0,4,4,0,0,0,0],
      [0,2,2,0,0,0,0,0,0,0,2,2,0,0,0],
      [2,2,2,0,0,0,0,0,0,0,2,2,2,0,0]
    ];

    let chosenGrid = idleGrid;
    if (state === 'running') {
      chosenGrid = isAltFrame3 === 0 ? idleGrid : isAltFrame3 === 1 ? run1Grid : run2Grid;
    } else if (state === 'jumping') {
      chosenGrid = jumpGrid;
    } else if (state === 'swimming') {
      chosenGrid = swimGrid;
    } else if (state === 'hurt') {
      chosenGrid = hurtGrid;
    }

    const palette: { [key: number]: string } = {
      0: 'transparent',
      1: color,              // Hat & primary shirt trim
      2: '#5c4033',          // Hair/Mustache/Boots
      3: '#fcd0a1',          // Skin
      4: overallsColor,      // Overalls
      5: '#ffffff',          // Shirt undershirt / white accents
      6: '#ffd700',          // Yellow buttons
      7: '#4a4a4a',          // Dark eyes
    };

    return (
      <svg
        id={id}
        viewBox="0 0 16 16"
        className={`w-full h-full crisp-render ${className}`}
        style={{ imageRendering: 'pixelated' }}
      >
        {chosenGrid.map((row, rIdx) =>
          row.map((val, cIdx) => {
            if (val === 0) return null;
            return (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill={palette[val]}
              />
            );
          })
        )}
      </svg>
    );
  };

  const renderUglySanic = () => {
    // Ugly Sanic: Distorted blue hedgehog, MS-paint style spines, bloodshot wide eyes, smirk, skinny legs
    // Let's render custom procedural shapes inside the SVG to make it super hilarious!
    const isJumping = state === 'jumping';
    const isHurt = state === 'hurt';
    const isSwim = state === 'swimming';
    const bob = isAltFrame ? 2 : 0;
    
    return (
      <svg
        id={id}
        viewBox="0 0 64 64"
        className={`w-full h-full ${className}`}
      >
        {/* Shadow */}
        <ellipse cx="32" cy="58" rx="18" ry="4" fill="rgba(0,0,0,0.15)" />

        <g transform={isHurt ? 'rotate(180 32 32) translate(0, 5)' : isSwim ? 'rotate(90 32 32)' : `translate(0, ${bob})`}>
          {/* Spikes / Hair */}
          <path d="M 30,10 L 10,12 L 25,22 L 5,28 L 22,36 L 5,46 L 26,48 L 15,55 L 32,50" fill="#0000ff" stroke="#000" strokeWidth="2" />
          <path d="M 30,10 L 15,3 M 25,22 L 8,17 M 22,36 L 4,32" stroke="#ff0000" strokeWidth="1" /> {/* hilarious MS paint details */}

          {/* Body */}
          <circle cx="35" cy="38" r="14" fill="#0000ff" stroke="#000" strokeWidth="2" />
          <circle cx="35" cy="38" r="9" fill="#fcd0a1" /> {/* tan tummy */}

          {/* Head */}
          <ellipse cx="40" cy="24" rx="14" ry="12" fill="#0000ff" stroke="#000" strokeWidth="2" />
          <ellipse cx="44" cy="26" rx="8" ry="8" fill="#fcd0a1" /> {/* tan muzzle */}

          {/* Goofy Nose */}
          <ellipse cx="54" cy="24" rx="4" ry="3" fill="#000000" />

          {/* Hilarious bloodshot Eyes */}
          <circle cx="40" cy="18" r="6" fill="#ffffff" stroke="#000" strokeWidth="1.5" />
          <circle cx="48" cy="18" r="5" fill="#ffffff" stroke="#000" strokeWidth="1.5" />
          
          {/* Bloodshot veins */}
          <path d="M 36,15 L 39,17 M 36,19 L 38,18 M 51,15 L 49,17" stroke="#ff0000" strokeWidth="0.5" />
          
          <circle cx={isHurt ? '38' : '41'} cy="18" r="2" fill="#000" />
          <circle cx={isHurt ? '50' : '47'} cy="18" r="1.5" fill="#000" />

          {/* Smirk */}
          <path d={isHurt ? 'M 40,29 Q 44,30 46,27' : 'M 40,29 Q 46,31 48,27'} stroke="#000" strokeWidth="2" fill="none" />

          {/* Arms */}
          <path d="M 28,34 Q 20,40 16,35" stroke="#fcd0a1" strokeWidth="2.5" fill="none" />
          <path d="M 42,36 Q 52,44 56,38" stroke="#fcd0a1" strokeWidth="2.5" fill="none" />

          {/* Crazy Legs */}
          {state === 'running' ? (
            <g>
              {/* Blur wheel effect */}
              <circle cx="30" cy="50" r="10" fill="none" stroke="#ff0000" strokeWidth="3" strokeDasharray="4 8" className="animate-spin" style={{ transformOrigin: '30px 50px' }} />
              <circle cx="40" cy="50" r="10" fill="none" stroke="#ff0000" strokeWidth="3" strokeDasharray="6 6" className="animate-spin" style={{ transformOrigin: '40px 50px', animationDirection: 'reverse' }} />
            </g>
          ) : isJumping ? (
            <g>
              <path d="M 28,48 L 22,54 L 16,52" stroke="#000" strokeWidth="3" fill="none" />
              <path d="M 38,48 L 44,56 L 50,54" stroke="#000" strokeWidth="3" fill="none" />
              <rect x="12" y="50" width="6" height="4" fill="#ff0000" rx="2" />
              <rect x="48" y="52" width="6" height="4" fill="#ff0000" rx="2" />
            </g>
          ) : (
            <g>
              {/* Idle standing crazy legs */}
              <path d="M 28,48 L 26,56 L 20,56" stroke="#000" strokeWidth="3" fill="none" />
              <path d="M 38,48 L 40,56 L 46,56" stroke="#000" strokeWidth="3" fill="none" />
              <rect x="16" y="54" width="6" height="4" fill="#ff0000" rx="2" stroke="#000" strokeWidth="1" />
              <rect x="42" y="54" width="6" height="4" fill="#ff0000" rx="2" stroke="#000" strokeWidth="1" />
            </g>
          )}
        </g>
      </svg>
    );
  };

  const renderProfessional = () => {
    // Sleek glassmorphic cyber-drone glowing turquoise
    const isJumping = state === 'jumping';
    const isHurt = state === 'hurt';
    const isSwim = state === 'swimming';
    const timeScale = frameCount * 3;
    const hoverOffset = Math.sin(timeScale * 0.05) * 4;
    const corePulse = 0.8 + Math.sin(timeScale * 0.1) * 0.2;

    return (
      <svg
        id={id}
        viewBox="0 0 64 64"
        className={`w-full h-full dropped-shadow-lg ${className}`}
      >
        <defs>
          <radialGradient id="cyber-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f3ff" stopOpacity={corePulse} />
            <stop offset="60%" stopColor="#0066aa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#001122" stopOpacity="0.8" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient shadow */}
        <ellipse cx="32" cy="56" rx="14" ry="3" fill="#00f3ff" fillOpacity="0.1" />

        <g transform={`translate(0, ${isHurt ? '0' : hoverOffset})`}>
          {/* Glassmorphic rotating outer ring */}
          <circle
            cx="32"
            cy="32"
            r="22"
            fill="none"
            stroke="#00f3ff"
            strokeWidth="1.5"
            strokeOpacity="0.6"
            strokeDasharray={isHurt ? '5 20' : '15 15'}
            className={isHurt ? 'animate-bounce' : 'animate-[spin_4s_linear_infinite]'}
            style={{ transformOrigin: '32px 32px' }}
          />
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="#00ffff"
            strokeWidth="0.5"
            strokeOpacity="0.3"
            strokeDasharray="4 20"
            className="animate-[spin_8s_linear_infinite]"
            style={{ transformOrigin: '32px 32px', animationDirection: 'reverse' }}
          />

          {/* Telemetry wings / details if running / jumping */}
          {state === 'running' && (
            <g opacity="0.8">
              <line x1="8" y1="32" x2="18" y2="32" stroke="#00f3ff" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="46" y1="32" x2="56" y2="32" stroke="#00f3ff" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M 6,32 L 2,30 L 2,34 Z" fill="#00f3ff" />
              <path d="M 58,32 L 62,30 L 62,34 Z" fill="#00f3ff" />
            </g>
          )}

          {/* Main sphere hull */}
          <circle cx="32" cy="32" r="16" fill="url(#cyber-core)" stroke={isHurt ? '#ff3232' : '#00f3ff'} strokeWidth="1.5" />
          <circle cx="32" cy="32" r="10" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />

          {/* Drone Eye/Core */}
          <circle
            cx="32"
            cy={isJumping ? '26' : isHurt ? '35' : '32'}
            r="5"
            fill={isHurt ? '#ff0033' : '#ffffff'}
            filter="url(#glow)"
          />

          {/* Floating diagnostic nodes (Sleek professional theme) */}
          <circle cx="18" cy="18" r="2" fill="#00f3ff" opacity="0.6" />
          <circle cx="46" cy="18" r="2" fill="#00f3ff" opacity="0.6" />
          <line x1="18" y1="18" x2="24" y2="24" stroke="#00f3ff" strokeWidth="0.5" opacity="0.4" />
          <line x1="46" y1="18" x2="40" y2="24" stroke="#00f3ff" strokeWidth="0.5" opacity="0.4" />

          {/* Floating Wrench representation */}
          <g transform={`translate(${isSwim ? '25' : '32'}, ${isSwim ? '40' : '45'}) scale(0.65) rotate(${timeScale % 360})`} opacity="0.9">
            <path d="M -8,-2 C -10,-2 -11,-4 -11,-6 C -11,-8 -9,-10 -7,-10 C -5,-10 -4,-8 -4,-6" fill="none" stroke="#00f3ff" strokeWidth="2" />
            <line x1="-7" y1="-6" x2="7" y2="6" stroke="#00f3ff" strokeWidth="2.5" />
            <circle cx="7" cy="6" r="2.5" fill="#00f3ff" />
          </g>
        </g>
      </svg>
    );
  };

  switch (skinId) {
    case 'marcio':
      return renderMarcioLucio('#ef4444', '#2563eb'); // Red cap, Blue overalls
    case 'lucio':
      return renderMarcioLucio('#22c55e', '#ef4444'); // Green cap, Red overalls (classic Luigi swaps!)
    case 'sanic':
      return renderUglySanic();
    case 'professional':
      return renderProfessional();
    default:
      return renderMarcioLucio('#ef4444', '#2563eb');
  }
};
