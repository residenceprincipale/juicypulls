# Resource Error Handling Guide

This guide explains the new error handling features added to the resource loading system and provides examples of how to use them safely.

## New Features

### 1. Comprehensive Error Logging
All asset loaders now include error callbacks that provide detailed information when assets fail to load:

- **Detailed error messages** with source information
- **Expected file location** hints
- **Troubleshooting suggestions**
- **Loading duration** tracking
- **Error timestamp** logging

### 2. Progress Tracking
Loaders that support it now show loading progress:
- Real-time percentage updates
- Byte count information
- Per-asset progress tracking

### 3. Loading Summary
After all resources are processed, you get a complete summary:
- Success/failure counts
- List of failed assets
- Total loading time

### 4. Error Storage and Retrieval
The Resources class now stores all errors for later inspection:

```javascript
// Get all loading errors
const errors = resources.getErrors()

// Check if a specific asset loaded successfully
const hasModel = resources.hasAsset('foxModel')

// Get asset with fallback
const model = resources.getAsset('foxModel', null)
```

## Usage Examples

### 1. Basic Error Checking
Instead of directly accessing `resources.items.assetName`, use the safer methods:

```javascript
// ❌ Unsafe - will crash if asset failed to load
const model = this.resources.items.foxModel

// ✅ Safe - check if asset exists first
if (this.resources.hasAsset('foxModel')) {
    const model = this.resources.items.foxModel
    // Use model safely
} else {
    console.warn('Fox model not available, using fallback')
    // Handle missing asset
}

// ✅ Even safer - use with fallback
const model = this.resources.getAsset('foxModel', this.defaultModel)
```

### 2. Component Initialization with Error Handling
```javascript
export default class Fox {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.scene.resources

        // Wait for resources to be ready
        this.resources.on('ready', (loadingResults) => {
            this.handleResourcesReady(loadingResults)
        })
    }

    handleResourcesReady(loadingResults) {
        // Check if we have errors
        if (loadingResults.errors.length > 0) {
            console.warn(`${loadingResults.errors.length} assets failed to load`)
            
            // Handle missing fox model
            if (!this.resources.hasAsset('foxModel')) {
                console.error('Fox model failed to load, cannot initialize Fox component')
                return
            }
        }

        // Initialize with available resources
        this.createModel()
    }

    createModel() {
        // Safe asset access
        const foxModel = this.resources.getAsset('foxModel')
        if (!foxModel) {
            console.error('Fox model not available')
            return
        }

        this.model = foxModel.scene.clone()
        this.scene.add(this.model)
    }
}
```

### 3. Handling Missing Textures with Fallbacks
```javascript
import { MeshStandardMaterial, CanvasTexture } from 'three'

export default class Material {
    constructor() {
        this.resources = this.experience.scene.resources
        this.createMaterial()
    }

    createMaterial() {
        // Get textures with fallbacks
        const colorTexture = this.resources.getAsset('materialColor', this.createFallbackTexture())
        const normalTexture = this.resources.getAsset('materialNormal', null)
        
        const materialConfig = {
            map: colorTexture
        }

        // Only add normal map if it loaded successfully
        if (normalTexture) {
            materialConfig.normalMap = normalTexture
        } else {
            console.warn('Normal texture not available, creating material without normal map')
        }

        this.material = new MeshStandardMaterial(materialConfig)
    }

    createFallbackTexture() {
        // Create a simple colored texture as fallback
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ff00ff' // Magenta to indicate missing texture
        ctx.fillRect(0, 0, 1, 1)
        return new CanvasTexture(canvas)
    }
}
```

### 4. Debugging Asset Loading Issues
```javascript
// Get detailed error information
const errors = this.resources.getErrors()

errors.forEach(error => {
    console.group(`Asset Error: ${error.source.name}`)
    console.log('Path:', error.path)
    console.log('Error message:', error.errorMessage)
    console.log('Load attempt duration:', error.loadTime + 'ms')
    console.log('Timestamp:', error.timestamp)
    console.groupEnd()
})

// Check specific assets
const missingAssets = [
    'foxModel',
    'grassTexture',
    'environmentModel'
].filter(assetName => !this.resources.hasAsset(assetName))

if (missingAssets.length > 0) {
    console.warn('Missing assets:', missingAssets)
}
```

## Console Output Examples

### Successful Loading
```
🖼️ Resources
⏳ Loading resources...
📊 foxModel: 45% loaded (1024/2048 bytes)
📊 foxModel: 78% loaded (1600/2048 bytes)
🖼️ foxModel loaded in 234ms. (1/5)
🖼️ grassTexture loaded in 123ms. (2/5)
✅ Resources processed in 1247ms!
📊 Loading Summary: 5/5 assets loaded successfully
```

### Failed Loading
```
❌ Asset Loading Error
  Failed to load asset: missingTexture
  Path: textures/missing.jpg
  Type: jpg
  Attempt duration: 5000ms
  Error details: [HTTP Error 404]
  Expected file location: public/textures/missing.jpg
  
  💡 Troubleshooting suggestions:
    1. Check if the file exists in the public folder
    2. Verify the file path and filename (case-sensitive)
    3. Check file permissions
    4. Ensure the file format is supported
    5. Check browser network tab for HTTP errors

✅ Resources processed in 5123ms!
📊 Loading Summary: 4/5 assets loaded successfully
⚠️  1 assets failed to load:
   - missingTexture (textures/missing.jpg)
```

## Best Practices

1. **Always check if assets exist** before using them
2. **Use fallback resources** for non-critical assets
3. **Handle the ready event** to know when loading is complete
4. **Check loading errors** during development
5. **Test with missing assets** to ensure graceful degradation
6. **Use the new utility methods** for safer asset access

## Migration Guide

Replace direct resource access:
```javascript
// Old way
const model = this.resources.items.modelName

// New way
const model = this.resources.getAsset('modelName', fallbackModel)
```

Add error handling to component initialization:
```javascript
// In your component constructor
this.resources.on('ready', (results) => {
    if (results.errors.length > 0) {
        // Handle errors
    }
    this.init()
})
```

## Testing the Error Handling

You can test the new error handling system by using the test utility:

```javascript
import { testResourceErrorHandling } from './utils/testErrorHandling.js'

// Run the test (this will intentionally try to load missing assets)
testResourceErrorHandling()
```

This will demonstrate:
- Error logging for missing files
- Progress tracking for existing files  
- Error storage and retrieval
- Safe asset access patterns 