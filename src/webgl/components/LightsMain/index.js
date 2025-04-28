import Experience from 'core/Experience.js';
import { DirectionalLight, Color } from 'three';
import addLightDebug from 'utils/addLightDebug.js';

import settingsLight1 from './lightSettings-1.js';
import settingsLight2 from './lightSettings-2.js';
import settingsLight3 from './lightSettings-3.js';

export default class LightsMain {
    constructor() {
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
     * Private
     */
    _createLights() {
        this._lightSettings.forEach((settings) => {
            const light = new DirectionalLight(
                new Color(settings.color.value),
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

    _createDebug() {
        this._debugFolder = this._debug.ui.addFolder({
            title: 'Lights',
            expanded: true,
        });
    }

    update() {
        // You can implement update logic here if needed
    }
}
