/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SkinId = 'marcio' | 'lucio' | 'sanic' | 'professional';

export type GameModeId = 'smash_and_dash' | 'wet_world' | 'tunnel_of_doom' | 'drops_cascade' | 'boiler_deflector';

export interface Skin {
  id: SkinId;
  name: string;
  description: string;
  creator: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface Lesson {
  id: string;
  title: string;
  focus: string;
  patterns: string[];
  type: 'letters' | 'words' | 'sentences';
  minWpm: number;
}

export interface LessonCategory {
  id: string;
  name: string;
  subtitle: string;
  lessons: Lesson[];
}

// Typing analytics recorded during gameplay
export interface TypingMetrics {
  correctKeystrokes: number;
  totalKeystrokes: number;
  accuracy: number; // percentage
  wpm: number;
  streak: number;
  maxStreak: number;
  wordCount: number;
}

// Characters / Entities on screen for various game modes
export interface GameEntity {
  id: string;
  text: string; // character or word
  typedLength: number; // how many characters of this entity have been typed correctly
  x: number; // percentage or coordinate
  y: number; // percentage or coordinate
  width?: number;
  height?: number;
  speed: number;
  type: 'brick' | 'question_block' | 'goomba' | 'koopa' | 'bubble_drip' | 'steam_bolt' | 'metal_chunk' | 'rock' | 'chest';
  status: 'active' | 'hit' | 'stamped' | 'escaped';
  lane?: number; // for spacing
}
