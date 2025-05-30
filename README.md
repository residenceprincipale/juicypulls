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
- [Glslify](https://github.com/KusStar/vite-plugin-glslify)

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

- Optimized custom Phong shading with external uniform settings (`materialSettings.js`).

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

| Event                     | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `lever`                   | Triggered when roulette lever sends an input (physical or debug-dev). |
| `button`                  | Triggered when roulette button is hit, with button index in data.     |
| `button-light`            | Triggered when button light state changes.                            |
| `reset-buttons-light`     | Triggered to reset all buttons light.                                 |
| `button-collect`          | Triggered when "collect" button is hit.                               |
| `remote`                  | Triggered when a remote button is hit (info in data).                 |
| `update-rolling-points`   | Updates current rolling points.                                       |
| `update-collected-points` | Updates total collected points.                                       |
| `update-quota`            | Updates quota info.                                                   |
| `update-round`            | Updates the current round.                                            |
| `update-spins`            | Updates spin count.                                                   |
| `update-spin-tokens`      | Updates spin count.                                                   |

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
