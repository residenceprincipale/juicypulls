import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
	root: 'src/pages',
	publicDir: path.resolve(__dirname, 'public'),
	assetsInclude: ['**/*.glb', '**/*.gltf'],
	build: {
		outDir: path.resolve(__dirname, 'dist'),
		commonjsOptions: { transformMixedEsModules: true },
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'src/pages/index.html'),
			},
		},
	},
	resolve: {
		alias: [
			// Everything (the game and the three/examples addons) imports the WebGPU build, so there's one Three.js instance
			{ find: /^three$/, replacement: 'three/webgpu' },
			{ find: '@', replacement: path.resolve(__dirname, 'src') },
			{ find: 'webgl', replacement: path.resolve(__dirname, 'src/webgl') },
			{ find: 'utils', replacement: path.resolve(__dirname, 'src/webgl/utils') },
			{ find: 'scenes', replacement: path.resolve(__dirname, 'src/webgl/scenes') },
			{ find: 'components', replacement: path.resolve(__dirname, 'src/webgl/components') },
			{ find: 'core', replacement: path.resolve(__dirname, 'src/webgl/core') },
		],
	},
	envDir: path.resolve(__dirname),
})
