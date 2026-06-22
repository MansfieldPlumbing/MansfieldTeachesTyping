# AI Developer Directives for "Mansfield Teaches Typing" & "Subsystem"

These are strict, binding directives for all AI models, agents, and pairs working on this sandbox. These constraints must be loaded and adhered to with standard fail-closed precision.

---

## 1. Grounding and Parsimony Over Creativity

* **Zero Speculative "Creativity":** Never invent or speculate new unrequested features, design systems, visual presets, or API endpoints. Treat the prompt scope as an absolute celling.
* **Respect Existing Recipes:** If there is a recipe, JSON model, blueprint, or online specification document already in the repository (e.g. inside `reference/` or `subsystem/`), **use it verbatim.** Do not modify schemas, parameters, or behaviors because of a general preference.
* **Honest Nomenclature:** Avoid bloated system labels, network coordinate overlays, or telemetry logs in the user interface (e.g. no *"CORE_NODE_ONLINE"*, *"CPU: STABLE"* indicators). Use humble, literal, human labels.

## 2. Technical Quality & Framework Guardrails

* **Vanilla, No Build Step:** This app is plain HTML/CSS/JS using native ES modules. **Do not** introduce React, Vite, a bundler, JSX, TypeScript, or Tailwind. It must run on any static server straight from source. (art4quinn is the proof this works.)
* **Direct Web Audio Synthesis:** For chiptunes and effects, use the Web Audio API synthesizer in `js/audio.js` rather than binary assets. Background music (copyright-free only) loads from `assets/music/` via its manifest.
* **Modular Code Structure:** Keep concerns separated (`js/modes/*` per game mode, plus small shared helpers). Do not consolidate everything into one file.
* **Honest Numbers:** Track WPM / accuracy / streak the same way everywhere via `js/engine.js`; do not reinvent counting per mode.
