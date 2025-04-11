import { Skeleton, SkinnedMesh, Matrix4 } from 'three'

export default function cloneGltf(gltf) {
	const clone = {
		animations: gltf.animations,
		scene: gltf.scene.clone(true),
	}

	const skinnedMeshes = {}

	gltf.scene.traverse((node) => {
		if (node.isSkinnedMesh) {
			skinnedMeshes[node.name] = node
		}
	})

	const cloneBones = {}
	const cloneSkinnedMeshes = {}

	clone.scene.traverse((node) => {
		if (node.isBone) {
			cloneBones[node.name] = node
		}

		if (node.isSkinnedMesh) {
			cloneSkinnedMeshes[node.name] = node
		}
	})

	for (const name in skinnedMeshes) {
		const sourceMesh = skinnedMeshes[name]
		const sourceSkeleton = sourceMesh.skeleton
		const targetMesh = cloneSkinnedMeshes[name]

		const orderedCloneBones = []

		// Map the bones in the original order to cloned bones
		for (let i = 0; i < sourceSkeleton.bones.length; i++) {
			const clonedBone = cloneBones[sourceSkeleton.bones[i].name]
			orderedCloneBones.push(clonedBone)
		}

		// Preserve boneInverses
		const boneInverses = sourceSkeleton.boneInverses.map(b => b.clone())

		// Create a new skeleton and bind it
		const clonedSkeleton = new Skeleton(orderedCloneBones, boneInverses)

		// Important: bind using original bindMatrix to keep transforms intact
		targetMesh.bind(clonedSkeleton, sourceMesh.bindMatrix.clone())

		// Also preserve bindMatrixInverse (used internally)
		targetMesh.bindMatrixInverse.copy(sourceMesh.bindMatrixInverse)
	}

	return clone
}
