# Swappable Character Sprite Schemas: Plumbers, Hedgehogs, & Pro Icons

This file outlines the engine specifications for rendering swappable retro/modern character skins. To remain a lightweight, single-file HTML, we avoid large heavy image grids (`.png` files) and instead use **SVG matrix definitions** or **declarative pixel-art generators** defined inside our core bundle. This lets us swap characters in real-time, maintain perfect crispness on high DPI/Retina displays, and supports custom skins easily.

---

## 1. Character State Sprite Sheet Mapping

Each skin declares standard grid shapes for different actions. The canvas renderer polls the current player state to select the correct visual model:

| Action | State / Frame | Description |
|---|---|---|
| **Idle** | `idle_1` | Character stands holds wrench or tool, looking right with custom status eyes. |
| **Walk / Run** | `run_1`, `run_2`, `run_3` | Cycling sequence of limbs crossing, overalls bouncing, or blue spines rotating. |
| **Jump / Headbutt** | `jump_up` | Character facing skyward, fist raised, smashing overhead blocks. |
| **Slide / Swim** | `swim_1`, `swim_2` | Streamlined horizontal stroke representing diving in water or sliding under a pipe joint. |
| **Hurt / Trip** | `trip_1` | Character spinning out of balance, eyes crossed, overalls or spines disoriented. |

---

## 2. Declarative Skin Definitions

We configure skins using responsive inline SVGs or structured canvas coordinate paths.

### Skin A: Marcio / Lucio (The Plumbing Brothers)
* **Visual Identifiers:** Red/Green high-brim caps, pixelated dark brown mustaches, bright blue overalls over yellow undershirts, metal slip-joint pliers, and brown workboots.
* **Animation Frames:**
  * `idle_1`: Mustache twitching smoothly, blinking eyes.
  * `run_x`: Standard NES-style legs cycling with alternating blue-strap overall expansion.
  * `jump_up`: Hand raised high with a copper pipe segment in hand.

### Skin B: Ugly Sanic (The Speed Demon)
* **Visual Identifiers:** Hilariously distorted blue spikes, bloodshot eyes, MS-Paint style hand-drawn proportions, mismatched red shoes, and hyper-extended legs.
* **Animation Frames:**
  * `idle_1`: Tapping foot at absurd speeds.
  * `run_x`: Legs warp into a blurry wheel or spiral line, spinning at 200rpm.
  * `jump_up`: Flinging head-first in a messy spike ball with zero grace.

### Skin C: Elite Professional (Sleek Glassmorphic Core)
* **Visual Identifiers:** Abstract glowing cybernetic drone, soft glass blur aura (`backdrop-filter`), neon-cyan data pipelines, and a futuristic floating wrench.
* **Animation Frames:**
  * `idle_1`: Hovering up/down slightly, breathing cyan particle trails.
  * `run_x`: Expanding telemetry vectors, projecting grid-points onto the floor.
  * `jump_up`: Condensing into a high-pressure plasma beam shooting upward.

---

## 3. How the Single-File Engine Implements Swappability (The Blueprint)

We define a JavaScript map where keys are skins and values are rendering functions:

```javascript
const CHARACTER_SKINS = {
  marcio: {
    name: "Marcio",
    draw: (ctx, x, y, state, frameCount) => {
      // Draw 16x16 pixel blocks for retro plumber
    }
  },
  lucio: {
    name: "Lucio",
    draw: (ctx, x, y, state, frameCount) => {
      // Draw green plumber variant
    }
  },
  sanic: {
    name: "Ugly Sanic",
    draw: (ctx, x, y, state, frameCount) => {
      // Draw hilarious custom spikes
    }
  },
  professional: {
    name: "Elite Pro",
    draw: (ctx, x, y, state, frameCount) => {
      // Draw sleek glassmorphic cyber-drone
    }
  }
};
```
This is fully self-contained, light, and robust.
