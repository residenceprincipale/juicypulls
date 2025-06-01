/**
 * Test file to demonstrate the new resource error handling capabilities
 * This can be imported and used to test missing assets
 */

import Resources from '../core/Resources.js'

// Test sources with intentionally missing files
const testSources = [
    {
        name: "existingTexture",
        path: "textures/dirt/color.ktx2"  // This should exist
    },
    {
        name: "missingTexture",
        path: "textures/missing-file.jpg"  // This doesn't exist
    },
    {
        name: "missingModel",
        path: "models/nonexistent.glb"  // This doesn't exist
    },
    {
        name: "invalidFileType",
        path: "textures/test.xyz"  // Invalid file type
    }
]

/**
 * Test the error handling capabilities
 */
export function testResourceErrorHandling() {
    console.log('🧪 Testing Resource Error Handling...')

    const testResources = new Resources(testSources)

    testResources.on('ready', (results) => {
        console.group('🧪 Test Results')

        console.log('📊 Loading Summary:')
        console.log(`  ✅ Successfully loaded: ${results.loadedCount}/${results.totalCount}`)
        console.log(`  ❌ Failed to load: ${results.errors.length}/${results.totalCount}`)

        if (results.errors.length > 0) {
            console.log('\n❌ Errors encountered (as expected for testing):')
            results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.source.name}: ${error.errorMessage}`)
            })
        }

        console.log('\n🔍 Asset availability check:')
        testSources.forEach(source => {
            const exists = testResources.hasAsset(source.name)
            console.log(`  ${exists ? '✅' : '❌'} ${source.name}: ${exists ? 'Available' : 'Missing'}`)
        })

        console.log('\n🛡️ Safe asset access examples:')

        // Example 1: Check if asset exists first
        if (testResources.hasAsset('existingTexture')) {
            console.log('  ✅ existingTexture: Found and can be used safely')
        }

        // Example 2: Use fallback for missing asset
        const missingWithFallback = testResources.getAsset('missingTexture', 'fallback-value')
        console.log(`  🔄 missingTexture with fallback: ${missingWithFallback}`)

        // Example 3: Get all errors for debugging
        const allErrors = testResources.getErrors()
        console.log(`  📋 Total errors stored: ${allErrors.length}`)

        console.groupEnd()

        // Clean up test resources
        console.log('🧹 Test completed. Check console for detailed error messages above.')
    })

    return testResources
}

/**
 * Example of proper error handling in a component
 */
export class ExampleComponentWithErrorHandling {
    constructor(resources) {
        this.resources = resources
        this.initializeComponent()
    }

    initializeComponent() {
        // Wait for resources to be ready
        this.resources.on('ready', (results) => {
            this.handleResourcesReady(results)
        })
    }

    handleResourcesReady(results) {
        // Check for critical errors
        if (results.errors.length > 0) {
            console.warn(`Component: ${results.errors.length} assets failed to load`)

            // Check for critical assets
            if (!this.resources.hasAsset('criticalModel')) {
                console.error('Critical asset missing, cannot initialize component')
                return
            }
        }

        // Initialize with error handling
        this.createModel()
        this.createMaterials()
    }

    createModel() {
        // Safe model loading
        const model = this.resources.getAsset('criticalModel')
        if (!model) {
            console.error('Cannot create model: asset not available')
            return
        }

        this.model = model.scene.clone()
        console.log('✅ Model created successfully')
    }

    createMaterials() {
        // Safe texture loading with fallbacks
        const primaryTexture = this.resources.getAsset('primaryTexture', this.createFallbackTexture())
        const secondaryTexture = this.resources.getAsset('secondaryTexture', null)

        const materialConfig = { map: primaryTexture }

        // Only add secondary texture if it loaded
        if (secondaryTexture) {
            materialConfig.normalMap = secondaryTexture
        } else {
            console.warn('Secondary texture not available, using material without normal map')
        }

        console.log('✅ Materials created with available textures')
    }

    createFallbackTexture() {
        // Create a simple fallback texture
        console.log('🔄 Creating fallback texture for missing asset')
        // In a real implementation, you'd create a proper fallback texture here
        return { isFallback: true }
    }
} 