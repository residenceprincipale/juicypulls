import Experience from 'core/Experience.js'
import Socket from '@/scripts/Socket.js'

const experience = new Experience(document.querySelector('canvas#webgl'))

const socket = new Socket().connect('game')

if (!window.location.hash.includes('debug')) {
    const canvas = document.querySelector('canvas#webgl')
    canvas.style.cursor = 'none'
}

