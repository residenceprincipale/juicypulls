# Flipette

Horror arcade game in the browser: a Farkle-style slot machine rendered with Three.js, while a creature roams the dark casino behind the machine.

It started as a physical installation (cabinet with a lever, 5 hold buttons, a collect button, multiplier bulbs and separate screen pages). That support has been **dropped**: everything runs in one page, inputs come from the mouse and keyboard, and the two machine screens (score and combinations) are rendered in 3D in the scene.

## Run

- `bun install` or `pnpm install` (both lockfiles are kept; update both when changing dependencies), then `bun run dev` (Vite on :3000) or `bun run build` (outputs to `dist/`).
- No tests and no linter, only Prettier + `.editorconfig`. Check changes in the browser.
- `#debug` in the URL turns on Tweakpane, stats, and a "Game Events" folder (rigged spins, shooter and lose triggers).
- `?skip-intro` skips the intro and tutorial and starts a game at once (10 jetons, quota 200). The headless checks use it.
- Controls (`components/MachineControls`, on the cabinet model's own meshes `BOUTON_1–5`, `BOUTON_COLLECT`, `MANCHE`):
  - Click or tap the lever, the hold buttons and the collect button. Keyboard: Space = lever, Enter = collect, number row = hold buttons 0–4 (matched by physical key: AZERTY `& é " ' (`, QWERTY `1–5`).
  - A hold button glows in its cabinet LED color while its wheel is held, the collect button while there are points to bank.
  - Flashlight: rest the pointer on the right edge to lean out into the casino, hold the pointer down to switch the torch on and aim it. The left edge, or any machine input, brings the player back.

## Stack

Vite 6 (root `src/pages`, single entry `index.html`; static files in `public/`), Three.js r181 with `WebGLRenderer`, GLSL through `vite-plugin-glslify`, GSAP, Howler, Tweakpane 4. Plain JS ES modules, no TypeScript (`jsconfig.json` only declares the aliases).

`three-msdf-text-utils` is a dependency but isn't imported (it's kept for future screen text). Its default build `require()`s a second copy of Three plus the WebGPU build, so check for the "Multiple instances of Three.js" warning when you import it.

## Architecture (`src/webgl/`)

- `core/Experience.js` is a singleton (Bruno Simon starter): `new Experience()` anywhere returns the same instance (also `window.experience`). It owns `sizes`, `time` (RAF → `'tick'`), `scene` (THREE.Scene), `debug`, `camera`, `interactionManager`, `sceneManager` and `renderer`.
- `core/EventBus.js`: the in-page event bus. Game logic, screens and inputs talk through it (see below).
- `core/SceneManager.js` picks a class from `scenes/config.js` (only `main` now). Its constructor **returns the scene instance**, so `experience.sceneManager` is the `Main` scene itself.
- `scenes/Main/index.js` + `sources.json`: the scene sets `experience.scene.resources = new Resources(sources)`, builds its components and managers on `'ready'`, and implements `update()` and `dispose()`.
- `components/<Name>/index.js`: visuals (model, materials, animations). `show()`, `hide()` and `animateXxx()` return GSAP timelines so managers can chain them.
  - `MachineControls`: the clickable lever and buttons (press animations, glow, keyboard).
  - `ScreenText`: a text layer just in front of a screen's glass (canvas texture, planar UVs, `MeshBasicMaterial`). Each screen has one for messages; the combinations screen has a second one for the round and multiplier in its side slots.
- `core/InteractionManager.js`: pointer picking for registered objects. Only the nearest visible hit gets `mouseover`/`mouseout`/`click` (`click` fires on pointer down, so touch works). `userData.interactive = false` ignores an object.
- `core/Camera.js`: `setFraming(box)` keeps the screens, buttons and lever knob in view for any window shape (refitted on resize, see `Main._frameMachine`); `viewOffset` + `applyView()` move the camera relative to that framing.
- `modules/*Manager.js`: game logic and orchestration.
  - `MachineManager` holds the Farkle rules.
  - The others are `ShooterManager`, `TutorialManager`, `FlashLightManager`, and `ScoreScreenManager` / `CombinationsScreenManager`, which drive the two screens.
  - `screenSymbols.js` maps symbols to screen rows and tints.
- `materials/PhongMaterial`: `PhongCustomMaterial`, a `ShaderMaterial` built on three `ShaderChunk` includes (lights + fog), used by most meshes.
- `shaders/chunks/` holds the custom light chunks, and `vendor/bloom/` the selective `CustomUnrealBloomPass`.
- `utils/`: `add*Debug` Tweakpane helpers, `AnimationController` (AnimationMixer wrapper), `GltfClone`, `InputManager` (keyboard/mouse singleton).
- `src/pages/script.js` is the entry point. It also handles the DOM overlays: the subliminal messages, and the screamer video on `lose-final`.

## Conventions

- Formatting: tabs, no semicolons, single quotes, 120 columns (Prettier). Some older and vendored files don't follow it.
- Imports: use the aliases `@/` (= `src/`), `core/`, `components/`, `utils/`, `scenes/`, `webgl/` instead of relative paths.
- Class shape (newer code, follow it):
  - Fields and methods are `_`-prefixed (`this._experience`, `this._scene`, `this._debug`, `this._resources`).
  - The constructor calls `_createXxx()` builders, then `if (this._debug.active) this._createDebug()`.
  - Sections are marked `/** Getters & Setters */`, `/** Public */`, `/** Private */` and `/** Debug */`.
  - Classes expose `update({ deltaTime, elapsedTime })` (called by the scene) and `dispose()`.
  - Older starter-style classes (`Camera`, `Resources`, `Debug`, `Hands`) use public `this.experience` and `setXxx()`.
- Bus listeners: keep the unsubscribe functions, e.g. `this._unsubscribers = [bus.on('lever', () => this._onLever())]`, and call them in `dispose()`.
- Tuning files are generated. `xxxMaterialSettings.js` / `xxxSettings.js` export `{ uName: { value, debug?, params? } }`.
  - Value types: a `'#hex'` or `'0x..'` string is a color, any other string is a texture name from resources, and `{x,y}` / `{x,y,z}` become vectors.
  - In `#debug`, the "Copy settings" button (`addCustomMaterialDebug`, `addLightDebug`) produces the new file content, so keep this shape to preserve the copy-paste round trip.
  - Bloom settings live in `core/PostProcessingSettings.js`.
- Shaders: `shaders/vertex.glsl` + `fragment.glsl` per component, or `shadersXxx/` folders when a component has several. Uniforms are named `uName`, varyings `vName`. Feature defines: `USE_ROUGHNESS`, `USE_MATCAP`, `USE_AO`, `USE_POINT_LIGHTS`, `USE_SPOT_LIGHTS`, `SELECTIVE_DIR_LIGHTS`.
  - Lit shaders include the custom light chunks (`custom_lights_phong_pars_fragment` / `custom_lights_phong_fragment`), whose ambient is `uAmbientColor`. Three's stock light chunks ignore it, and with no ambient or directional light in the scene they render black (only `BackgroundEnvironment` uses them, on purpose).
- Assets: list them in `scenes/Main/sources.json`.
  - Fields: `name`, a `path` relative to `public/` such as `./textures/x.jpg`, and optional `flipY`, `repeatWrapping`, `colorSpace`, `loop`, `volume`, `autoplay`. The file extension picks the loader.
  - Read them via `this._scene.resources.items.<name>`. Names are camelCase with a type suffix (`machineModel`, `farkleAudio`, `goldMatcap`). Audio items are Howl instances.
- Bloom is selective: set `mesh.userData.renderBloom = true` on meshes that should glow.
- Timing goes through GSAP (`gsap.delayedCall`, timelines), not `setTimeout`. Kill a stored timeline before recreating it (`this._tl?.kill()`).
- Comments and some names mix French and English.

## Event bus (`core/EventBus.js`)

- `bus.emit(event, data)` calls listeners synchronously. `bus.on(event, callback)` returns an unsubscribe function. A listener that throws is logged and doesn't block the others.
- Events:
  - Inputs: `lever`, `button {index}`, `button-collect`, `look-aside {value}` (the player leans out to the casino or back).
  - Game state: `update-rolling-points`, `update-collected-points`, `update-spin-tokens`, `update-quota`, `update-multiplier`, `update-round` (all `{value}`).
  - Screens: `reset`, `reset-combi`, `update-combi {symbol, value: 'x1'…'x5'}`, `show`, `hide`, `show-message {screen?: 'score'|'combi', message, size: 'fullscreen'|'inner', modifier}`, `hide-message {screen?}` (no `screen` means both).
  - Game: `farkle`, `jackpot {symbol, count}`, `show-subliminal {message}`, `lose-final`.
- Messages: lines split on `\n` or `<br>`, `modifier` colors keywords. `inner` covers the score/quota (score screen) or the table (combinations screen); `fullscreen` covers the whole glass.

## Game rules (code is the source of truth: `MAIN_ROULETTE_CONFIG` in `modules/MachineManager.js`)

- 5 wheels × 6 symbols. In code the symbols are emoji placeholders for the creepy art on the wheel texture, and the order of `symbolNames` is the segment order: `7` (special, the "eye"), `💀` (malus), `🍒`, `🍊`, `🍇`, `🍋`. The screens use another row order (`SCREEN_SYMBOLS`: 🍋 🍒 🍊 🍇 7 💀).
- **Jetons and spins:** a new turn, or a re-spin with nothing held, costs 1 jeton. At 0 jetons the game calls `Main.lose()`.
- **Holding:** after the first spin, the hold buttons lock wheels, and only unlocked wheels spin again. A wheel held through a re-spin can't be released.
- **Re-spins and Farkle:** re-spins are unlimited, but a spin that adds no points over the held wheels (including a scoreless first spin) is a Farkle, and the turn's points are lost. Pulling the lever with every wheel held collects automatically.
- **Scoring:** only held wheels count toward rolling points, so the player must hold new scoring wheels before collecting.
  - A fixed combo from `combinationPoints` applies first (e.g. 3🍒 = 150, 5🍋 = 2000).
  - Otherwise, 3/4/5 of a kind score 100/200/500, plus per-symbol values (🍇 100, 🍊 50).
  - Everything is multiplied by the current multiplier.
- **Skulls:** every spin with skulls takes 25 × the skull count off the bank. 3 or more skulls is a Farkle.
- **Second roulette:** 3+ `7` at any time triggers it. This ends the turn, and unbanked points are lost. Its 2 wheels, `[multiplier | -100 | token | +100]` × `[x1 | x3 | x4 | x2]`, give one of: a new multiplier, +N jetons, or ±100×N added to the bank.
- **Rounds:** collect banks the rolling points. Once the bank reaches the quota, `completeRound` resets the bank, puts the multiplier back to x1 and starts the shooter mini-game (30 s, 15 s in debug). In the shooter, hold buttons move the crosshair, collect shoots, and each hit gives +1 jeton. `endShooter` then raises the quota by 400.
- Start: the tutorial ends with 10 jetons, quota 1000, round 1 (values set in `TutorialManager`). `?skip-intro` (`Main.startSkipIntro`) starts with 10 jetons, quota 200.
- Game over is `loseFinal()`: the LEDs turn red, the machine slides out, and `lose-final` plays the screamer video. The next lever pull reloads the page.

## User flow (design target) and current status

1. The player arrives, the middle hold button blinks, and pressing it (or any control) powers the machine on (logo → lights → LEDs): `Main.start()` → `startTutorial()`. That first input also unlocks the browser audio (Howler unlocks on the first click or key, and the autoplay sounds start then).
2. Tutorial (`TutorialManager`): pulling the lever gives a forced spin `[5,2,2,2,3]` (🍋🍒🍒🍒🍊), then short messages: hold wheels (their wheels and buttons blink) → bank to reach the quota → spin at will. The next lever pull starts the game.
3. **Screens:**
   - The right one (`CombinationsScreen`) highlights the held combination and plays the jackpot marquee.
   - The left one (`ScoreScreen`) shows score, jetons, quota and bank, and plays the farkle and jackpot videos.
   - Messages (`show-message`) show on both, the round and the multiplier in the combinations screen's side slots (hidden while the jackpot marquee plays there).
   - The screens are self-lit through their settings (`uAmbientColor` white, `uAmbientIntensity` 3.14 ≈ π, so the content shows at its texture colors), because the scene has no directional lights.
4. The casino lights come on with a loud bang, an echo and a glitch on the main screen. `LightsMain.turnOn()` / `turnOff()` only drive the directional lights, which are currently disabled, and nothing in the game flow calls them.
5. **Flashlight (replaces the CCTV and remote from the original flow):** the player leans out to look into the casino and switches on a torch to check whether the creature is approaching. Later the light will slow the creature down. `FlashLightManager` handles it once the game runs: pointer on the right edge for 0.3 s → the camera slides to the side view (`SIDE_VIEW_POSITION`), holding the pointer down lights `LightsMain.spotLightTorch` and aims it with a breathing sway, the left edge or any machine input comes back. The torch tweens its intensity, not `visible`, so lit materials don't recompile. In `#debug`, Game Events → "Toggle Flashlight View" does the same. **Not built:** the creature interaction.
6. The second roulette triggers on 3+ `7`, with no unlock step. Done.
7. Round complete → shooter (the machine slides out) → back to the roulette with a higher quota. A hit gives +1 jeton (done). **A miss should cost points but doesn't yet.** This rule may change.
8. Progression: winning raises the multiplier, losing brings the creature closer, and each round gets harder and creepier. **Not implemented:**
   - The multiplier only comes from the second roulette and resets every round.
   - There's no creature system yet; only a temporary monster exists in `BackgroundEnvironment`.
   - Difficulty only grows through the +400 quota.
9. On losing, the machine slides out and the creature's hands offer a shifumi of death (buttons 0–2; winning respawns the player, anything else is death). **Disabled and broken:** `_isSecondChanceEnabled = false`, `Hands._sceneInstance` is never set, and `Machine._isHandFighting` is never true. Losing goes straight to `loseFinal()`.

## Known issues and leftovers

- `public/` has ~80 files (~27 MB) that nothing references: old model and texture iterations, the starter's Fox and mob models, and the `.mp4` videos of the removed DOM screens. They haven't been deleted yet.
- The second roulette's ±100 goes straight to the bank without checking the quota, so the round only completes on the next collect.
- Values printed on `textures/combi/combinations.jpg` differ from the code for 🍊×4, 🍇×3/×4/×5 and 💀×1.
- The directional/selective lights are disabled (`LightsMain._lightSettings = []`, "add dark mode" commit).
- On a portrait phone the framing keeps the whole machine, so it looks small. The gun and the second roulette are hidden while parked, so wider or taller windows never show them.
- The Dockerfile uses Node 20 while `.nvmrc` says 24.
- `MEMORY_LEAK_FIXES.md` is a historical record, and its socket snippets are outdated. The HMR dispose chain is `pages/script.js` → `Experience.dispose()` → `scene.dispose()` → components.

## Roadmap

1. Cleanup + single-page web version. **Done.**
2. WebGPU port at visual parity (see below). **Not started.**
3. Web features: 3D buttons, screen text, camera framing for any window shape, flashlight look-to-the-side, tutorial back on, audio unlock on first input. **Done, on the WebGL stack** (before step 2, so not in TSL). The new pieces use `MeshBasicMaterial` and canvas textures, so they add no GLSL to port.

## WebGPU migration: what is tied to WebGL

- `core/Renderer.js` uses `WebGLRenderer`, plus three `EffectComposer` + `CustomUnrealBloomPass` for the selective bloom.
- Every custom material is a GLSL `ShaderMaterial`, mostly built on three `ShaderChunk` `#include`s: `PhongCustomMaterial`, 12 component shader pairs, and the custom light chunks in `shaders/chunks/`. `WebGPURenderer` can't run them, so they need porting to node materials / TSL (`three/webgpu`, `three/tsl`). The settings-file and debug-panel workflow should keep working after the port.
- Also tied to WebGL:
  - `Resources` creates a throwaway `new WebGLRenderer()` for `ktx2Loader.detectSupport`.
  - `Debug` stats read `renderer.info.programs`.
- `vite-plugin-glslify` can be removed once the GLSL is gone.
