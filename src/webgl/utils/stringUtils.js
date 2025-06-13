/**
 * String utility functions
 */

/**
 * Transforms a kebab-case string to camelCase
 * @param {string} kebabString - The kebab-case string to transform (e.g., "chaise-mesh-test")
 * @returns {string} The camelCase version (e.g., "chaineMeshTest")
 * 
 * @example
 * kebabToCamelCase("chaise-mesh-test") // returns "chaineMeshTest"
 * kebabToCamelCase("simple-name") // returns "simpleName"
 * kebabToCamelCase("single") // returns "single"
 */
export function kebabToCamelCase(kebabString) {
    if (typeof kebabString !== 'string') {
        throw new Error('Input must be a string')
    }

    return kebabString
        .split('-')
        .map((word, index) => {
            if (index === 0) {
                // Keep first word lowercase
                return word.toLowerCase()
            }
            // Capitalize first letter of subsequent words
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        })
        .join('')
}

/**
 * Transforms a camelCase string to kebab-case
 * @param {string} camelString - The camelCase string to transform (e.g., "chaineMeshTest")
 * @returns {string} The kebab-case version (e.g., "chaine-mesh-test")
 * 
 * @example
 * camelToKebabCase("chaineMeshTest") // returns "chaine-mesh-test"
 * camelToKebabCase("simpleName") // returns "simple-name"
 * camelToKebabCase("single") // returns "single"
 */
export function camelToKebabCase(camelString) {
    if (typeof camelString !== 'string') {
        throw new Error('Input must be a string')
    }

    return camelString
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase()
}

export default {
    kebabToCamelCase,
    camelToKebabCase
} 