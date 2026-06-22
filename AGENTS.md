# AI Developer Directives for "I Fix the Pipes" & "Subsystem"

These are strict, binding directives for all AI models, agents, and pairs working on this sandbox. These constraints must be loaded and adhered to with standard fail-closed precision.

---

## 1. Grounding and Parsimony Over Creativity

* **Zero Speculative "Creativity":** Never invent or speculate new unrequested features, design systems, visual presets, or API endpoints. Treat the prompt scope as an absolute celling.
* **Respect Existing Recipes:** If there is a recipe, JSON model, blueprint, or online specification document already in the repository (e.g. inside `reference/` or `subsystem/`), **use it verbatim.** Do not modify schemas, parameters, or behaviors because of a general preference.
* **Honest Nomenclature:** Avoid bloated system labels, network coordinate overlays, or telemetry logs in the user interface (e.g. no *"CORE_NODE_ONLINE"*, *"CPU: STABLE"* indicators). Use humble, literal, human labels.

## 2. Technical Quality & Framework Guardrails

* **Direct Web Audio Synthesis:** For chiptunes and audio effects, utilize the standard Web Audio API built-in synthesizer (`/src/audio.ts`) instead of loading external binary assets or mock players.
* **Modular Code Structure:** Keep components separated by concerns (e.g., individual game modes and helper overlays). Do not consolidate logical units into a single file to respect token thresholds.
* **Strict React & TypeScript Conventions:** Avoid all type-assertion casting (`any`), stabilize side effects to prevent infinite re-renders, and use pure Tailwind utility styling.
