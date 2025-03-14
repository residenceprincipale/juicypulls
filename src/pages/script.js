import Experience from 'core/Experience.js'
import Socket from '@/scripts/Socket.js'

const experience = new Experience(document.querySelector('canvas#webgl'))

new Socket().connect('game')
