// Name
#define SHADER_NAME BloomOverrideMaterial

// Attributes
attribute vec3 position;
#ifdef USE_INSTANCING
    attribute mat4 instanceMatrix;
#endif

// Uniforms
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
    // Output
    #if defined(USE_INSTANCING)
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    #else
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #endif
}
