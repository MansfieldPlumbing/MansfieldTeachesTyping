# Mario Teaches Typing (MTT) Reference & Mechanics Recipes

This reference covers the detailed gameplay loop, level mechanics, and user feedback systems model of **Mario Teaches Typing (1992/1995)**. These are adapted for the typing tutor engine **"i fix the pipes"**.

---

## 1. Core Levels & Mechanics

### Level 1: Mario's Smash and Dash (Target: Letters & Digits / Home Row)
* **Visual Theme:** Standard retro plumbing landscape (underground pipes, clay brick grids, green pipes, Goombas/Turtles).
* **Core Interaction:**
  * Mario runs automatically from left to right.
  * Blocks (bricks) or enemies appear in his path.
  * Each block or enemy has a **single character** floating above it.
  * Typing the correct key triggers an action:
    * **Bricks/Question Blocks:** Mario jumps up and headbutts them (producing a satisfying coin "ding" or break sound).
    * **Enemies (Goombas, Koopas):** Mario leaps forward and stomps them (producing a squish/pop sound).
  * **Timing/Pacing:** Paced by typing speed. If a key is missed or not typed, Mario stays idle fronting the block or runs into the enemy, suffering an animation halt (flashing or head-shake) and an accuracy penalty.
  * **Pedagogical Goal:** Development of single-key finger placement muscle memory. Strictly repeats keys from designated rows (e.g., home row: `f d s a j k l ;`).

### Level 2: Mario's Wet World (Target: Words / Word Completion)
* **Visual Theme:** Underwater Pipe Maze (bubbles, swimming fish, squids/Cheep Cheep variants).
* **Core Interaction:**
  * Mario swims constantly from left to right.
  * Groups of bubbles or small creatures block his swimming path.
  * Each creature or barrier has a **full word** attached to it (e.g., `fish`, `pipe`, `clog`, `water`).
  * The user must type the **entire word** letter-by-letter to clear the path.
  * Each correct letter triggers a swimming motion or bubble pop.
  * If a typo occurs:
    * Current word progress highlights red.
    * Character flinches or shakes.
    * Path remains blocked until corrected.
  * **Pedagogical Goal:** Transitioning from individual letters to cohesive word flow (muscle memory of common letter pairings and muscle rolls).

### Level 3: Mario's Tunnel of Doom (Target: Sentences)
* **Visual Theme:** Dark leaking tunnel, rolling steel-bound hazards, heavy wooden support beams, and falling debris.
* **Core Interaction:**
  * Mario runs through a subterranean pipe cavern.
  * Full sentences are shown on top of the screen (or overlaid neatly) in a continuous ribbon.
  * Obstacles (falling rocks, ceiling traps) fall right before Mario.
  * Typing groups of words in the sentence correctly triggers defensive actions (leaping over crates, sliding under steam, sliding through tight pipes).
  * Typos cause Mario to trip, stop, or get bonked on the head by a falling rock.
  * **Pedagogical Goal:** Reading ahead, spacebar coordination, capital letters, and punctuation.

---

## 2. HUD & Metrics Layout
MTT was defined by a highly active HUD that didn't distract but gave immediate, simple feedback:

1. **WPM Indicator:** Dynamic calculation based on total correct characters typed divided by minutes.
2. **Accuracy Percentage:** `(Correct Keys Typed / Total Keystrokes) * 100`.
3. **Time Remaining:** 120-second timer per lesson, encouraging quick session runs.
4. **Interactive Keyboard Overlay:** A 2D hands representation showing exactly which hand and finger should register the upcoming key.

---

## 3. The Stomp-and-Repair feedback Loop
To capture state-of-the-art gamification:
* **Success Frame:** When keys are pressed correctly with zero delay, a multiplier "streak" starts. Mario speeds up, running at high speed, stomping enemies with satisfying rhythm.
* **Failure Frame:** On an incorrect stroke, the character instantly stalls, the obstacle shakes, and a clanking metal strike (plumbing clang) plays. A heart is lost or progress on that segment resets. This models the exact high-accuracy discipline typers require.
