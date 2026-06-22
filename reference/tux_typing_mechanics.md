# Tux Typing Mechanics Recipes: Redesigned for Plumbers

Tux Typing offered a different kind of intensity from Mario's side-scroller: high-pacing target practice where items fall vertically from the sky, requiring reactive spelling.

We adapt these mechanics into two plumbing-themed mini-game variants for **"i fix the pipes"**:

---

## Game Mode 1: Leaking Drops Cascade (Inspirations: "Fish Cascade")

### 1. Visual Presentation
Our plumber stands at the subfloor level below a heavy, multi-jointed grid of industrial copper pipes. Green/rusty pipe outlets line the ceiling. Small water drops, acidic liquid blobs, or rust chunks tumble down vertically from different valves.

### 2. Gameplay Mechanics
* Each falling drop has a **single character** inside it.
* At the bottom, our plumber slides left-right dynamically.
* The moment the user types the exact letter inside a falling drop:
  * The plumber runs under it.
  * Extends a wrench or bucket to catch/neutralize it (plays a satisfying metallic splash `pling`).
* **The Penalty / Failure Mode:**
  * If a droplet hits the floor, it bursts and creates a temporary puddle.
  * If puddles fill the basement (more than 5 misses), the level floods, shorting out the water pump! Game over or level reset.
  * Typing a wrong key prompts an error sound (a loud hollow whistle) and slows down the plumber's sliding movement.

---

## Game Mode 2: Pipe Explosion Deflector (Inspirations: "Comet Buster")

### 1. Visual Presentation
The center screen is dominated by a giant, high-pressure boiler system with dials spinning into the red zone. High-temperature steam bolts, scaling debris, or rusted bolts shoot outward from the core in random orbital directions.

### 2. Gameplay Mechanics
* Each fast-flying chunk or steam bolt contains an **entire word**.
* The user plays as the engineer controlling a solder gun / welding beam in the center.
* Typing the word correctly fires an immediate crackling solder beam to patch and melt the debris into silver solder coins (`pshhhhwt` or sizzle sound).
* **The Penalty / Climax:**
  * If debris escapes the margins, it strikes the boiler gauge. This raises the "PSI pressure meter" at the top of the HUD.
  * If PSI reaches 100, the system blows, creating a beautiful shower of funny cartoon steam and launching the plumber into orbit.
* **Typing Speed Calibration:**
  * Speed of flying chunks adjusts dynamically based on the current WPM. If you type 85 WPM, debris shoots like machine gunfire, keeping highly proficient typers inside a flow state.
