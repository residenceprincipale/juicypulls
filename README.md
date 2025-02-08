# Threejs vite starter

This is a starter template for threejs with vite based on Bruno Simon's starter.

## Usage

```bash
pnpm install
pnpm run dev
```

## Stack

- [`Threejs`](https://threejs.org/)
- [`Vite`](https://vitejs.dev/)
- [`Tweakpane`](https://cocopon.github.io/tweakpane/)
- [`Glslify`](https://github.com/KusStar/vite-plugin-glslify)

## Features

- `Scene management`: Add multiple scenes and switch between them by adding `?scene=scene-name` to the url
- `Debug mode`: Enable debug mode by adding `#debug` to the url
- `GltfClone`: Clone a gltf model with bones
- `Audio management`: Add audios and positional audios with a complete debug panel
- `Input management`: Minimal input management
- `addObjectDebug or addMaterialDebug`: Auto debug parameters of a mesh or a material


## Features to come I hope

- Debounce the 3d objects interaction click
- Afficher quelque chose quand ya une erreur de path de chargement de texture ? sinon c'est penible de deviner
- Flip Y activé de base pour les textures, ou au moins une option dans le source.json
- Ecrire un doc je t'en supplie
- "debug.ui" je capte pas trop debug tout court ou debug.panel plutot pour ajouter les folders ça me parrait plus clair
- La fonction addDebugMaterial() pourrais avoir la possibilité de passer juste un string qui créer le folder avec le nom en question ou passer le folder directement comme c'est deja le cas