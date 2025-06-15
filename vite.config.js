import { defineConfig } from 'vite'
import glslify from 'vite-plugin-glslify'
import path from 'path'

export default defineConfig({
	root: 'src/pages',
	publicDir: path.resolve(__dirname, 'public'),
	base: './', // Utiliser des chemins relatifs au lieu de chemins absolus
	build: {
		outDir: path.resolve(__dirname, 'dist'),
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'src/pages/index.html'),
				score: path.resolve(__dirname, 'src/pages/score/index.html'),
				combi: path.resolve(__dirname, 'src/pages/combi/index.html'),
			},
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			webgl: path.resolve(__dirname, 'src/webgl'),
			utils: path.resolve(__dirname, 'src/webgl/utils'),
			scenes: path.resolve(__dirname, 'src/webgl/scenes'),
			components: path.resolve(__dirname, 'src/webgl/components'),
			core: path.resolve(__dirname, 'src/webgl/core'),
		},
	},
	plugins: [glslify()],
	envDir: path.resolve(__dirname),
})
