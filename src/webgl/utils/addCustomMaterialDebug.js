export default function addCustomMaterialDebug(folder, settings, resources, material) {
    const nestedFolder = folder.addFolder({ title: material.name, expanded: false });
    for (const key in settings) {
        const element = settings[key];
        if (!element) continue;
        if (element.value === undefined) continue;
        if (element.debug === false) continue;
        if (typeof element.value === 'string') {
            if (element.value.startsWith('#') || element.value.startsWith('0x')) { // color
                nestedFolder.addBinding(element, 'value', { label: key, view: 'color' }).on('change', () => updateMaterial({ material, element, key, settingsName: settings }));
            } else { // texture
                nestedFolder.addBinding(resources.items[element.value], 'image', { label: key, view: 'image', height: 40, showMonitor: true }).on('change', ({ value }) => updateImages({ material, key, value }));
            }
        } else if (element.value !== undefined) {
            nestedFolder.addBinding(element, 'value', { label: key, step: 0.01, ...element.params }).on('change', () => updateMaterial({ material, element, key, settings }));
        }
    }

    // add a button to copy to clip board the settings as js code with "export default {"  and "}" 
    nestedFolder.addButton({ title: 'Copy settings' }).on('click', () => {
        const settingsString = JSON.stringify(settings, null, 2);
        const formattedString = `export default ${settingsString}`;
        navigator.clipboard.writeText(formattedString).then(() => {
            console.log('Settings copied to clipboard');
        }).catch(err => {
            console.error('Could not copy settings: ', err);
        });
    });
}

function updateMaterial({ material, element, key, settings }) {
    if (typeof element.value === 'string' && element.value.includes('#')) {
        material.uniforms[key].value.set(element.value);
    } else if (element.value.z !== undefined) {
        material.uniforms[key].value.set(element.value.x, element.value.y, element.value.z);
    } else if (element.value.y !== undefined) {
        material.uniforms[key].value.set(element.value.x, element.value.y);
    } else {
        material.uniforms[key].value = element.value;
    }
    material.needsUpdate = true;
}

function updateImages({ material, key, value, isAdditionalUniforms }) {
    if (isAdditionalUniforms) {
        material.uniforms[key].value = value;
    } else {
        material.uniforms[key].value.map = value;
    }
    material.needsUpdate = true;
}