import Experience from 'core/Experience.js';

class LightsManager {
    constructor() {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.lightNameToIndex = new Map();
        this.setupLightMapping();
    }

    setupLightMapping() {
        // Get all directional lights from the scene and map their names to indices
        const directionalLights = [];
        this.scene.traverse((child) => {
            if (child.isDirectionalLight) {
                directionalLights.push(child);
            }
        });

        // Sort by creation order (should match the order they appear in the lights array)
        directionalLights.sort((a, b) => {
            // If lights have an id or userData.order, use that. Otherwise use name for consistent ordering
            const aOrder = a.userData.order || a.name || a.uuid;
            const bOrder = b.userData.order || b.name || b.uuid;
            return aOrder.localeCompare(bOrder);
        });

        // Map each light name to its index
        directionalLights.forEach((light, index) => {
            if (light.name) {
                this.lightNameToIndex.set(light.name, index);
            }
        });

        // Also create reverse mapping for debugging
        this.indexToLightName = new Map();
        for (const [name, index] of this.lightNameToIndex.entries()) {
            this.indexToLightName.set(index, name);
        }
    }

    /**
     * Convert an array of light names to indices
     * @param {string[]} lightNames - Array of light names like ['lightTop', 'lightLeft']
     * @returns {number[]} Array of light indices
     */
    getLightIndices(lightNames) {
        if (!lightNames || !Array.isArray(lightNames)) {
            return null;
        }

        const indices = [];
        for (const name of lightNames) {
            const index = this.lightNameToIndex.get(name);
            if (index !== undefined) {
                indices.push(index);
            } else {
                console.warn(`Light with name "${name}" not found. Available lights:`, Array.from(this.lightNameToIndex.keys()));
            }
        }

        return indices.length > 0 ? indices : null;
    }

    /**
     * Get the name of a light by its index
     * @param {number} index - Light index
     * @returns {string|null} Light name or null if not found
     */
    getLightName(index) {
        return this.indexToLightName.get(index) || null;
    }

    /**
     * Get all available light names
     * @returns {string[]} Array of all light names
     */
    getAvailableLightNames() {
        return Array.from(this.lightNameToIndex.keys());
    }

    /**
     * Get the total number of directional lights
     * @returns {number} Number of directional lights
     */
    getDirectionalLightCount() {
        return this.lightNameToIndex.size;
    }

    /**
     * Refresh the light mapping (useful if lights are added/removed dynamically)
     */
    refresh() {
        this.lightNameToIndex.clear();
        this.indexToLightName.clear();
        this.setupLightMapping();
    }
}

// Create singleton instance
let lightsManagerInstance = null;

export function getLightsManager() {
    if (!lightsManagerInstance) {
        lightsManagerInstance = new LightsManager();
    }
    return lightsManagerInstance;
}

export default LightsManager; 