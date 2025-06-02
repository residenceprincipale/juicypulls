import Experience from 'core/Experience.js'
import { Vector3, Raycaster, Vector2, Box3 } from 'three'
import gsap from 'gsap'
import Target from '@/webgl/components/Target'
import addTransformDebug from '@/webgl/utils/addTransformDebug'
import Socket from '@/scripts/Socket.js'

const socket = new Socket()
socket.connect('shooter')

export default class ShooterManager {
    constructor(options = {}) {
        this._experience = new Experience()
        this._scene = this._experience.scene
        this._debug = this._experience.debug
        this._time = this._experience.time
        this._camera = this._experience.camera

        this._gun = options.gun
        this._machine = options.machine

        // Game settings
        this._maxTargets = 3
        this._gameDuration = 30 // seconds
        this._isGameActive = false
        this._gameTimer = 0
        this._score = 0

        // Shooting settings
        this._isShooting = false
        this._shootDebounceTime = 0.8 // seconds to wait between shots

        // 2D Crosshair settings
        this._crosshairPosition = { x: 0.5, y: 0.5 } // Normalized screen position (0-1)
        this._crosshairTargetPosition = { x: 0.5, y: 0.5 } // Target position for smooth movement
        this._crosshairSpeed = 0.024
        this._crosshairLerpSpeed = 0.15 // How fast crosshair moves to target (0-1)
        this._aimingZone = {
            left: 0.2,   // 20% from left
            right: 0.8,  // 80% from left  
            top: 0.2,    // 20% from top
            bottom: 0.8  // 80% from top
        }

        // Gun movement settings (simplified for crosshair following)
        this._gunRotationMultiplier = {
            x: 0.2, // How much gun rotates vertically based on crosshair
            y: 0.25  // How much gun rotates horizontally based on crosshair
        }

        // Target management
        this._activeTargets = []
        this._targetPool = []
        this._usedPositionIndices = new Set()

        // Spawn positions with random offsets
        this._positionsArray = [
            { start: { x: -2.7, y: -1.05, z: -11.54 }, offset: { x: 0.5, y: 0.1, z: 0 } },
            { start: { x: -3.08, y: -1.05, z: -14 }, offset: { x: 0.8, y: 0.1, z: 0 } },
            { start: { x: 1.25, y: -1.17, z: -14 }, offset: { x: 0, y: 0, z: 0 } },
            { start: { x: -1.8, y: -0.72, z: -19.64 }, offset: { x: 3, y: 0, z: 0 } },
        ]

        // Reusable objects for hit detection (avoid garbage collection)
        this._reusableBoundingBox = new Box3()
        this._reusableCorners = [
            new Vector3(), new Vector3(), new Vector3(), new Vector3()
        ]

        this._createCrosshair()
        this._createTimerUI()
        this._setupEventListeners()
        this._createTargetPool()

        if (this._debug.active) this._createDebug()
    }

    /**
     * Getters & Setters
     */
    get isGameActive() {
        return this._isGameActive
    }

    get gameTimer() {
        return this._gameTimer
    }

    get score() {
        return this._score
    }

    get activeTargets() {
        return this._activeTargets
    }

    /**
     * Public Methods
     */
    startGame() {
        if (this._isGameActive) return

        this._isGameActive = true
        this._gameTimer = this._gameDuration
        this._score = 0
        this._usedPositionIndices.clear()

        // Show crosshair
        this._crosshairElement.classList.add('active')

        // Spawn initial targets
        this._spawnInitialTargets()

        this._gun.animateGunIn()

        console.log('Shooting game started!')
    }

    endGame() {
        if (!this._isGameActive) return

        this._isGameActive = false

        // Hide crosshair
        this._crosshairElement.classList.remove('active')

        this._gun.animateGunOut()

        // Animate out all active targets
        const animateOutPromises = this._activeTargets.map(target =>
            target.animateOut(0.5, Math.random() * 0.3)
        )

        Promise.all(animateOutPromises).then(() => {
            // Reset all targets after animation
            this._activeTargets.forEach(target => {
                target.reset()
                this._returnTargetToPool(target)
            })
            this._activeTargets = []
            this._usedPositionIndices.clear()

            this._machine.animateInnerMachineIn()
        })

        console.log(`Game ended! Final score: ${this._score}`)
    }

    // 2D Shooting detection
    _handleShoot() {
        if (!this._isGameActive || this._isShooting) return false

        // Set shooting state to prevent rapid firing
        this._isShooting = true

        // Check collision between crosshair and targets in screen space
        let hitTargets = []
        for (let i = 0; i < this._activeTargets.length; i++) {
            const target = this._activeTargets[i]
            if (!target.isVisible || target.isAnimating) continue

            if (this._checkTargetHit2D(target)) {
                hitTargets.push(target)
            }
        }

        let hitDetected = false
        if (hitTargets.length > 0) {
            // Find the closest target (smallest z value in world space)
            let closestTarget = hitTargets[0]
            let closestDistance = closestTarget.mesh.position.z

            for (let i = 1; i < hitTargets.length; i++) {
                const targetZ = hitTargets[i].mesh.position.z
                if (targetZ > closestDistance) { // In Three.js, higher z values are closer to camera
                    closestDistance = targetZ
                    closestTarget = hitTargets[i]
                }
            }

            this._onTargetHit(closestTarget)
            hitDetected = true
        }

        // Trigger gun shoot animation
        if (this._gun && this._gun.shoot) {
            this._gun.shoot()
        }

        // Reset shooting state after debounce time
        gsap.delayedCall(this._shootDebounceTime, () => {
            this._isShooting = false
        })

        return hitDetected
    }

    _checkTargetHit2D(target) {
        // Reuse bounding box object instead of creating new one
        this._reusableBoundingBox.setFromObject(target.mesh)

        // Convert crosshair position to screen coordinates
        const crosshairScreenX = this._crosshairPosition.x * window.innerWidth
        const crosshairScreenY = this._crosshairPosition.y * window.innerHeight

        // Set corner positions using reusable Vector3 objects
        const corners = this._reusableCorners
        const min = this._reusableBoundingBox.min
        const max = this._reusableBoundingBox.max

        // For a plane, we only need the 4 corners that define the rectangular bounds
        corners[0].set(min.x, min.y, min.z)  // Bottom-left
        corners[1].set(max.x, min.y, min.z)  // Bottom-right  
        corners[2].set(min.x, max.y, min.z)  // Top-left
        corners[3].set(max.x, max.y, min.z)  // Top-right

        // Project all corners to screen space and find screen bounds
        let minScreenX = Infinity, maxScreenX = -Infinity
        let minScreenY = Infinity, maxScreenY = -Infinity
        let allBehindCamera = true

        for (let i = 0; i < 4; i++) {
            const screenPos = this._worldToScreen(corners[i])
            if (screenPos) {
                allBehindCamera = false
                minScreenX = Math.min(minScreenX, screenPos.x)
                maxScreenX = Math.max(maxScreenX, screenPos.x)
                minScreenY = Math.min(minScreenY, screenPos.y)
                maxScreenY = Math.max(maxScreenY, screenPos.y)
            }
        }

        // If all corners are behind camera, target is not visible
        if (allBehindCamera) return false

        // Check if crosshair is within the projected bounding rectangle
        return crosshairScreenX >= minScreenX &&
            crosshairScreenX <= maxScreenX &&
            crosshairScreenY >= minScreenY &&
            crosshairScreenY <= maxScreenY
    }

    _worldToScreen(worldPosition) {
        // Convert 3D world position to 2D screen coordinates
        const vector = worldPosition.clone()
        vector.project(this._camera.instance)

        // Check if target is in front of camera
        if (vector.z > 1) return null

        // Convert to screen coordinates
        const screenX = (vector.x + 1) * window.innerWidth / 2
        const screenY = (-vector.y + 1) * window.innerHeight / 2

        return { x: screenX, y: screenY }
    }

    shoot() {
        this._handleShoot()
    }

    update({ deltaTime, elapsedTime }) {
        if (!this._isGameActive) return

        // Update game timer
        this._gameTimer -= deltaTime / 1000

        this._updateTimerUI()

        if (this._gameTimer <= 0) {
            this._gameTimer = 0
            this.endGame()
            return
        }

        // Smooth crosshair movement with lerp
        this._updateCrosshairSmooth()

        // Update all active targets
        this._activeTargets.forEach(target => target.update())
    }

    _updateCrosshairSmooth() {
        // Lerp current position toward target position
        const lerpFactor = this._crosshairLerpSpeed

        this._crosshairPosition.x += (this._crosshairTargetPosition.x - this._crosshairPosition.x) * lerpFactor
        this._crosshairPosition.y += (this._crosshairTargetPosition.y - this._crosshairPosition.y) * lerpFactor

        // Update visual position and gun rotation
        this._updateCrosshairPosition()
    }

    _updateCrosshairPosition() {
        if (!this._crosshairElement) return

        // Convert normalized position to screen pixels
        const screenX = this._crosshairPosition.x * window.innerWidth
        const screenY = this._crosshairPosition.y * window.innerHeight

        this._crosshairElement.style.left = `${screenX}px`
        this._crosshairElement.style.top = `${screenY}px`

        // Update gun rotation to follow crosshair
        this._updateGunRotation()
    }

    _updateGunRotation() {
        if (!this._gun || !this._gun.parentObject) return

        // Convert crosshair position to gun rotation
        // Center crosshair (0.5, 0.5) = no rotation
        // X: 0 = rotate left, 1 = rotate right
        // Y: 0 = rotate up, 1 = rotate down

        const centerX = 0.5
        const centerY = 0.5

        const deltaX = (this._crosshairPosition.x - centerX) * 2 // -1 to 1
        const deltaY = (this._crosshairPosition.y - centerY) * 2 // -1 to 1

        const targetRotationY = deltaX * this._gunRotationMultiplier.y
        const targetRotationX = -deltaY * this._gunRotationMultiplier.x // Inverted for intuitive movement

        // Smooth gun movement - animate the parent object, not the model
        gsap.to(this._gun.parentObject.rotation, {
            x: 3.142 + targetRotationX, // Base rotation + crosshair offset
            y: -0.385 + targetRotationY, // Base rotation + crosshair offset
            duration: 0.15,
            ease: "power2.out"
        })
    }

    // Crosshair movement methods
    moveCrosshairLeft() {
        this._crosshairTargetPosition.x = Math.max(
            this._crosshairTargetPosition.x - this._crosshairSpeed,
            this._aimingZone.left
        )
    }

    moveCrosshairRight() {
        this._crosshairTargetPosition.x = Math.min(
            this._crosshairTargetPosition.x + this._crosshairSpeed,
            this._aimingZone.right
        )
    }

    moveCrosshairUp() {
        this._crosshairTargetPosition.y = Math.max(
            this._crosshairTargetPosition.y - this._crosshairSpeed,
            this._aimingZone.top
        )
    }

    moveCrosshairDown() {
        this._crosshairTargetPosition.y = Math.min(
            this._crosshairTargetPosition.y + this._crosshairSpeed,
            this._aimingZone.bottom
        )
    }

    dispose() {
        this.endGame()

        // Kill any pending shooting debounce
        gsap.killTweensOf(this)

        // Remove crosshair element
        if (this._crosshairElement) {
            this._crosshairElement.remove()
        }

        // Dispose all targets in pool and active targets
        const allTargets = this._activeTargets.concat(this._targetPool)
        allTargets.forEach(target => {
            target.dispose()
        })

        this._activeTargets = []
        this._targetPool = []
    }

    /**
     * Private Methods
     */
    _createCrosshair() {
        // Create crosshair HTML element
        this._crosshairElement = document.createElement('div')
        this._crosshairElement.className = 'shooting-crosshair'
        this._crosshairElement.innerHTML = `
            <div class="crosshair-horizontal"></div>
            <div class="crosshair-vertical"></div>
        `

        // Add CSS styles
        const style = document.createElement('style')
        style.textContent = `
            .shooting-crosshair {
                position: fixed;
                top: 50%;
                left: 50%;
                width: 40px;
                height: 40px;
                pointer-events: none;
                z-index: 1000;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .shooting-crosshair.active {
                opacity: 1;
            }
            
            .crosshair-horizontal,
            .crosshair-vertical {
                position: absolute;
                background: rgba(255, 255, 255, 0.9);
                border: 1px solid rgba(0, 0, 0, 0.5);
            }
            
            .crosshair-horizontal {
                width: 20px;
                height: 2px;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            
            .crosshair-vertical {
                width: 2px;
                height: 20px;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
        `

        document.head.appendChild(style)
        document.body.appendChild(this._crosshairElement)

        this._updateCrosshairPosition()
    }

    _createTimerUI() {
        this._timerElement = document.createElement('div')
        this._timerElement.className = 'timer'
        this._timerElement.innerHTML = `
            <p>TIME</p>
        `

        // top right corner
        this._timerElement.style.top = '10px'
        this._timerElement.style.right = '10px'
        this._timerElement.style.position = 'fixed'
        this._timerElement.style.zIndex = '1000'
        this._timerElement.style.color = 'white'
        this._timerElement.style.fontSize = '24px'
        this._timerElement.style.fontWeight = 'bold'

        document.body.appendChild(this._timerElement)

        this._updateTimerUI()
    }

    _updateTimerUI() {
        this._timerElement.textContent = this._gameTimer.toFixed(2)
    }

    _createTargetPool() {
        // Create a pool of targets to avoid constant instantiation
        const poolSize = 8
        for (let i = 0; i < poolSize; i++) {
            const target = new Target(new Vector3(0, 0, 0))
            target.reset() // Make sure it starts hidden
            this._targetPool.push(target)
        }
    }

    _spawnInitialTargets() {
        for (let i = 0; i < this._maxTargets; i++) {
            this._spawnTarget(i * 0.2) // Slight delay between spawns
        }
    }

    _spawnTarget(delay = 0) {
        if (this._targetPool.length === 0) {
            console.warn('No targets available in pool')
            return
        }

        const target = this._targetPool.pop()
        const position = this._getRandomPosition()

        target.setPosition(position.x, position.y, position.z)
        this._activeTargets.push(target)

        // Animate in with delay
        target.animateIn(0.8, delay)
    }

    _getRandomPosition() {
        // Get available position indices (not currently used)
        const availableIndices = []
        for (let i = 0; i < this._positionsArray.length; i++) {
            if (!this._usedPositionIndices.has(i)) {
                availableIndices.push(i)
            }
        }

        // If all positions are used, reset and use any position
        if (availableIndices.length === 0) {
            this._usedPositionIndices.clear()
            for (let i = 0; i < this._positionsArray.length; i++) {
                availableIndices.push(i)
            }
        }

        // Pick random available position
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
        this._usedPositionIndices.add(randomIndex)

        const posData = this._positionsArray[randomIndex]

        // Calculate final position with random offset
        const finalPosition = {
            x: posData.start.x + (Math.random() - 0.5) * 2 * posData.offset.x,
            y: posData.start.y + (Math.random() - 0.5) * 2 * posData.offset.y,
            z: posData.start.z + (Math.random() - 0.5) * 2 * posData.offset.z
        }

        return finalPosition
    }

    _onTargetHit(target) {
        // Play hit animation
        target.animateHit()

        // Update score
        this._score++

        socket.send({
            event: 'update-spin-tokens',
            data: {
                value: '+1',
            },
        })

        // Remove from active targets
        const targetIndex = this._activeTargets.indexOf(target)
        if (targetIndex > -1) {
            this._activeTargets.splice(targetIndex, 1)
        }

        // Animate out and return to pool after delay
        setTimeout(() => {
            target.animateOut(0.5).then(() => {
                target.reset()
                this._returnTargetToPool(target)

                // Spawn new target to maintain count
                if (this._isGameActive && this._activeTargets.length < this._maxTargets) {
                    this._spawnTarget(0.5) // Small delay before new spawn
                }
            })
        }, 800) // Wait a bit before animating out

        console.log(`Target hit! Score: ${this._score}`)
    }

    _returnTargetToPool(target) {
        if (!this._targetPool.includes(target)) {
            this._targetPool.push(target)
        }
    }

    _setupEventListeners() {
        // Socket event listeners for physical button controls
        socket.on('button', (e) => {
            this._handleButtonPress(e.index)
        })
    }

    _handleButtonPress(index) {
        if (!this._isGameActive) return

        switch (index) {
            case 0: // Left
                this.moveCrosshairLeft()
                break
            case 1: // Bottom (Down)
                this.moveCrosshairDown()
                break
            case 2: // Top (Up)
                this.moveCrosshairUp()
                break
            case 3: // Right
                this.moveCrosshairRight()
                break
            case 4: // Shoot
                this.shoot()
                break
            default:
                console.warn(`Unknown button index: ${index}`)
                break
        }
    }

    _createDebug() {
        if (!this._debug.active) return

        const debugFolder = this._debug.ui.addFolder({
            title: 'Shooter Manager',
            expanded: true,
        })

        // Game controls
        debugFolder.addButton({
            title: 'Start Game'
        }).on('click', () => {
            this.startGame()
        })

        debugFolder.addButton({
            title: 'End Game'
        }).on('click', () => {
            this.endGame()
        })

        debugFolder.addButton({
            title: 'Spawn Target'
        }).on('click', () => {
            if (this._activeTargets.length < this._maxTargets) {
                this._spawnTarget()
            }
        })

        // Crosshair controls
        const crosshairFolder = debugFolder.addFolder({
            title: 'Crosshair Controls',
            expanded: true
        })

        crosshairFolder.addButton({
            title: 'Move Left'
        }).on('click', () => {
            this.moveCrosshairLeft()
        })

        crosshairFolder.addButton({
            title: 'Move Right'
        }).on('click', () => {
            this.moveCrosshairRight()
        })

        crosshairFolder.addButton({
            title: 'Move Up'
        }).on('click', () => {
            this.moveCrosshairUp()
        })

        crosshairFolder.addButton({
            title: 'Move Down'
        }).on('click', () => {
            this.moveCrosshairDown()
        })

        crosshairFolder.addButton({
            title: 'Shoot'
        }).on('click', () => {
            this.shoot()
        })

        // Shooting settings
        crosshairFolder.addBinding(this, '_shootDebounceTime', {
            label: 'Shoot Debounce (s)',
            min: 0.1,
            max: 2,
            step: 0.1
        })

        crosshairFolder.addBinding(this, '_isShooting', {
            label: 'Is Shooting',
            readonly: true,
            interval: 100
        })

        // Crosshair settings
        crosshairFolder.addBinding(this, '_crosshairSpeed', {
            label: 'Crosshair Speed',
            min: 0.01,
            max: 10,
            step: 0.01
        })

        crosshairFolder.addBinding(this, '_crosshairLerpSpeed', {
            label: 'Crosshair Smoothness',
            min: 0.05,
            max: 1,
            step: 0.05
        })

        // Aiming zone settings
        const aimingZoneFolder = crosshairFolder.addFolder({
            title: 'Aiming Zone',
            expanded: false
        })

        aimingZoneFolder.addBinding(this._aimingZone, 'left', {
            label: 'Left Limit',
            min: 0,
            max: 0.5,
            step: 0.05
        })

        aimingZoneFolder.addBinding(this._aimingZone, 'right', {
            label: 'Right Limit',
            min: 0.5,
            max: 1,
            step: 0.05
        })

        aimingZoneFolder.addBinding(this._aimingZone, 'top', {
            label: 'Top Limit',
            min: 0,
            max: 0.5,
            step: 0.05
        })

        aimingZoneFolder.addBinding(this._aimingZone, 'bottom', {
            label: 'Bottom Limit',
            min: 0.5,
            max: 1,
            step: 0.05
        })

        // Gun rotation settings
        const gunFolder = debugFolder.addFolder({
            title: 'Gun Follow Settings',
            expanded: false
        })

        gunFolder.addBinding(this._gunRotationMultiplier, 'x', {
            label: 'Vertical Multiplier',
            min: 0,
            max: 2,
            step: 0.1
        })

        gunFolder.addBinding(this._gunRotationMultiplier, 'y', {
            label: 'Horizontal Multiplier',
            min: 0,
            max: 2,
            step: 0.1
        })

        // Game settings
        debugFolder.addBinding(this, '_gameDuration', {
            label: 'Game Duration (s)',
            min: 10,
            max: 300,
            step: 5
        })

        debugFolder.addBinding(this, '_maxTargets', {
            label: 'Max Targets',
            min: 1,
            max: 6,
            step: 1
        })

        // Game state display
        debugFolder.addBinding(this, '_score', {
            label: 'Score',
            readonly: true,
            interval: 100
        })

        debugFolder.addBinding(this, '_gameTimer', {
            label: 'Time Left',
            readonly: true,
            interval: 100
        })

        debugFolder.addBinding(this, '_isGameActive', {
            label: 'Game Active',
            readonly: true,
            interval: 500
        })

        // Button test controls
        const buttonTestFolder = debugFolder.addFolder({
            title: 'Button Tests',
            expanded: false
        })

        for (let i = 0; i < 5; i++) {
            const buttonNames = ['Left', 'Down', 'Up', 'Right', 'Shoot']
            buttonTestFolder.addButton({
                title: `Button ${i} (${buttonNames[i]})`
            }).on('click', () => {
                this._handleButtonPress(i)
            })
        }
    }
} 