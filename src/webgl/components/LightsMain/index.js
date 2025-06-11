import Experience from 'core/Experience.js';
import { DirectionalLight, Color } from 'three';
import addLightDebug from 'utils/addLightDebug.js';

import settingsLight1 from './lightSettings-1.js';
import settingsLight2 from './lightSettings-2.js';
import settingsLight3 from './lightSettings-3.js';

import gsap from 'gsap';

import Socket from '@/scripts/Socket.js'

const socket = new Socket()

export default class LightsMain {
    constructor() {
        socket.connect('lights')
        this._experience = new Experience();
        this._scene = this._experience.scene;
        this._debug = this._experience.debug;

        this._lightSettings = [
            settingsLight1,
            settingsLight2,
            settingsLight3,
        ];


        if (this._debug.active) this._createDebug();

        this._createLights();

        this._createEventListeners()
    }

    /**
     * Getters
     */
    get lightTop() {
        return this._lightTop;
    }

    get lightLeft() {
        return this._lightLeft;
    }

    get lightRight() {
        return this._lightRight;
    }

    /**
     * Public
     */
    turnOff({ immediate = false } = {}) {
        const timeline = gsap.timeline()

        if (immediate) {
            timeline
                .to([this._lightTop, this._lightLeft, this._lightRight], {
                    duration: 0,
                    intensity: 0,
                    ease: "none"
                })
        } else {
            timeline
                // Main light struggles and flickers before dying
                .to(this._lightTop, {
                    duration: 0.05,
                    intensity: this._lightSettings[0].intensity.value * 0.7,
                    ease: "power2.out"
                })
                .to(this._lightTop, {
                    duration: 0.03,
                    intensity: this._lightSettings[0].intensity.value * 0.9,
                    ease: "power1.in"
                })
                .to(this._lightTop, {
                    duration: 1.0,
                    intensity: 0,
                    ease: "expo.out"
                }, 0.08)
                // Left light dies more suddenly but with a slight hesitation
                .to(this._lightLeft, {
                    duration: 0.08,
                    intensity: this._lightSettings[1].intensity.value * 0.3,
                    ease: "power2.in"
                }, 0.1)
                .to(this._lightLeft, {
                    duration: 0.4,
                    intensity: 0,
                    ease: "power3.out"
                }, 0.18)
                // Right light fades out organically
                .to(this._lightRight, {
                    duration: 0.6,
                    intensity: 0,
                    ease: "sine.out"
                }, 0.12)
        }

        return timeline
    }

    turnOn({ immediate = false } = {}) {
        const timeline = gsap.timeline()

        if (immediate) {
            timeline
                .to(this._lightTop, {
                    duration: 0,
                    intensity: this._lightSettings[0].intensity.value,
                    ease: "none"
                })
                .to(this._lightLeft, {
                    duration: 0,
                    intensity: this._lightSettings[1].intensity.value,
                    ease: "none"
                }, 0)
                .to(this._lightRight, {
                    duration: 0,
                    intensity: this._lightSettings[2].intensity.value,
                    ease: "none"
                }, 0)
        } else {
            // Add organic variation and flickering startup
            const startupDelay1 = Math.random() * 0.15
            const startupDelay2 = 0.3 + Math.random() * 0.2
            const startupDelay3 = 0.5 + Math.random() * 0.25

            timeline
                // Main light struggles to start, flickers a bit
                .to(this._lightTop, {
                    duration: 0.05,
                    intensity: this._lightSettings[0].intensity.value * 0.2,
                    ease: "power2.in"
                }, startupDelay1)
                .to(this._lightTop, {
                    duration: 0.03,
                    intensity: this._lightSettings[0].intensity.value * 0.1,
                    ease: "power1.out"
                })
                .to(this._lightTop, {
                    duration: 0.08,
                    intensity: this._lightSettings[0].intensity.value * 0.6,
                    ease: "power1.in"
                })
                .to(this._lightTop, {
                    duration: 0.4,
                    intensity: this._lightSettings[0].intensity.value,
                    ease: "back.out(1.2)"
                })
                // Left light comes on more hesitantly
                .to(this._lightLeft, {
                    duration: 0.6,
                    intensity: this._lightSettings[1].intensity.value,
                    ease: "expo.out"
                }, startupDelay2)
                // Right light has a smooth but delayed startup
                .to(this._lightRight, {
                    duration: 0.05,
                    intensity: this._lightSettings[2].intensity.value * 0.3,
                    ease: "power1.in"
                }, startupDelay3)
                .to(this._lightRight, {
                    duration: 0.45,
                    intensity: this._lightSettings[2].intensity.value,
                    ease: "sine.out"
                })
        }

        return timeline
    }

    /**
     * Private
     */
    _createLights() {
        this._lightSettings.forEach((settings) => {
            const light = new DirectionalLight(
                new Color(parseInt(settings.color.value)),
                settings.intensity.value
            );

            light.visible = settings.visible.value;
            light.castShadow = settings.castShadow.value;
            light.receiveShadow = settings.receiveShadow.value;

            light.position.set(
                settings.position.value.x,
                settings.position.value.y,
                settings.position.value.z
            );

            light.scale.set(
                settings.scale.value.x,
                settings.scale.value.y,
                settings.scale.value.z
            );

            light.rotation.set(
                settings.rotation.value.x,
                settings.rotation.value.y,
                settings.rotation.value.z
            );

            light.name = settings.name;
            this._scene.add(light);

            // Set target position
            light.target.position.set(
                settings.targetPosition.value.x,
                settings.targetPosition.value.y,
                settings.targetPosition.value.z
            );
            this._scene.add(light.target);

            // Save the reference dynamically (this._lightTop, this._lightLeft, etc.)
            this["_" + settings.name] = light;

            // Debug
            if (this._debug.active) {
                addLightDebug(this._debugFolder, light, settings);
            }
        });
    }

    _animateFarkle() {
        // make top light flicker to red color with a timeline
        const timeline = gsap.timeline()

        timeline.to(this._lightTop, {
            intensity: 0,
            ease: 'power1.inOut',
            duration: 0.1
        })
        timeline.call(() => {
            this._lightTop.color.set('#ff0000')
        })
        timeline.to(this._lightTop, {
            duration: 0.05,
            intensity: 2,
            ease: 'power1.inOut'
        })
        timeline.to(this._lightTop, {
            duration: 0.05,
            intensity: 0,
            ease: 'power1.inOut'
        })
        timeline.to(this._lightTop, {
            duration: 0.05,
            intensity: 2,
            ease: 'power1.inOut'
        })
        timeline.to(this._lightTop, {
            intensity: 0,
            ease: 'power1.inOut',
            duration: 0.2
        }, "+=3.5")
        timeline.call(() => {
            this._lightTop.color.set('#ffffff')
        }, null)
        timeline.to(this._lightTop, {
            intensity: this._lightSettings[0].intensity.value,
            ease: 'power1.inOut',
            duration: 0.05
        })
    }

    _animateJackpot() {
        // make top light blink to orange-yellow color with a smooth timeline
        const timeline = gsap.timeline()

        timeline.to(this._lightTop, {
            intensity: 0,
            ease: 'power2.inOut',
            duration: 0.15
        })
        timeline.call(() => {
            this._lightTop.color.set('#ffcc00') // warm yellow color
        })
        // Two fast blinks
        timeline.to(this._lightTop, {
            duration: 0.1,
            intensity: 0.8,
            ease: 'power2.inOut'
        })
        timeline.to(this._lightTop, {
            duration: 0.1,
            intensity: 0.1,
            ease: 'power2.inOut'
        })
        timeline.to(this._lightTop, {
            duration: 0.1,
            intensity: 0.8,
            ease: 'power2.inOut'
        })
        timeline.to(this._lightTop, {
            intensity: 0,
            ease: 'power2.inOut',
            duration: 0.4
        }, "+=2.0")
        timeline.call(() => {
            this._lightTop.color.set('#ffffff')
        }, null)
        timeline.to(this._lightTop, {
            intensity: this._lightSettings[0].intensity.value,
            ease: 'power2.inOut',
            duration: 0.3
        })
    }

    _createEventListeners() {
        socket.on('farkle', () => {
            this._animateFarkle()
        })

        socket.on('jackpot', () => {
            this._animateJackpot()
        })
    }

    _createDebug() {
        this._debugFolder = this._debug.ui.addFolder({
            title: 'Lights',
            expanded: false,
        });
    }

    update() {
        // You can implement update logic here if needed
    }
}
