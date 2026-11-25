# Flipette 👻 | Built with Three.js + Vite Starter

A powerful starter template for Three.js projects using Vite, inspired by Bruno Simon's structure.

---

## ✨ Usage

```bash
pnpm install
pnpm run dev
```

---

## 📚 Stack

- [Three.js](https://threejs.org/)
- [Vite](https://vitejs.dev/)
- [Tweakpane](https://cocopon.github.io/tweakpane/)
- WebGPU (`WebGPURenderer`, WebGL2 fallback) and [TSL](https://threejs.org/docs/#api/en/nodes/TSL) node materials

---

## 🔧 Features

### Scene Management

- Easily add multiple scenes.
- Switch scenes via URL: `?scene=scene-name`.

### Debug Mode

- Enable debug tools by adding `#debug` to the URL.

### Model Cloning

- `GltfClone` utility for cloning GLTF models with bones support.

### Audio Management

- Add and manage 3D positional audios.
- Full debug panel for audio controls.

### Input Management

- Minimal, extensible input management for keyboards, buttons, etc.

### Debug Utilities

- `addObjectDebug` / `addMaterialDebug`: Automatically debug Mesh or Material parameters.
- `addCustomMaterialDebug`: Debug custom material uniforms with live exportable settings.
- `addLightDebug`: Debug lights with live exportable settings. Compatible with dynamic light creation directly from settings file, see (`LightsMain/index.js`).

### Custom Materials

#### PhongCustomMaterial

- Custom Phong shading in TSL, with external uniform settings (`materialSettings.js`). Components add their own shading through `nodes` (see `components/*/nodes/`).

Uniform Types in (`materialSettings.js`) file:
| Type | Example |
|----------|---------|
| Float | `uMatcapIntensity: { value: 0.2 }` |
| Vector2 | `uMatcapOffset: { value: { x: 0, y: 0 } }` |
| Vector3 | `uMatcapScale: { value: { x: 0, y: 0, z: 0 } }` |
| Color | `uAmbientColor: { value: "#ffffff" }` or `uAmbientColor: { value: "0x00ff00" }` |
| Texture | `uMatcapTexture: { value: "theResourceItemName" }` |

---

## 📊 Events

Game logic, machine screens and inputs talk through the in-page event bus (`src/webgl/core/EventBus.js`). Main events:

| Event                     | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `lever`                   | Lever pulled (click it, or Space).                              |
| `button`                  | Hold button pressed, with `{ index }` (click, or number row).   |
| `button-collect`          | Collect button pressed (click, or Enter).                       |
| `look-aside`              | Player leans out to the casino (`{ value: true }`) or back.     |
| `update-rolling-points`   | Updates current rolling points.                                 |
| `update-collected-points` | Updates total collected points (bank).                          |
| `update-quota`            | Updates quota info.                                             |
| `update-spin-tokens`      | Updates spin count (jetons).                                    |
| `update-multiplier`       | Updates the points multiplier.                                  |
| `update-round`            | Updates the round number.                                       |
| `show-message`            | Text on the screens, `{ screen?, message, size, modifier }`.    |
| `hide-message`            | Hides the text, `{ screen? }` (no `screen` means both).         |
| `update-combi`            | Highlights a combination on the combinations screen.            |
| `farkle` / `jackpot`      | Triggers the farkle / jackpot effects on screens and lights.    |

---

## 🔀 Planned Improvements

- Debounce 3D object interaction clicks.
- Improve error feedback for missing texture paths.
- Improve debug folder creation clarity (`debug.ui` vs `debug.panel`).
- Improve camera system, should be more of a "per scene" setting setup

---

## 🎉 Special Thanks

Based on the excellent Three.js starter by Bruno Simon. Feel free to extend, modify, and make it your own!

---

## 🌐 License

MIT

---

> Happy Coding! 🚀
