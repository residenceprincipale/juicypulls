import { Vector3, Vector2, Matrix4, Matrix3, Euler, Quaternion, Spherical } from 'three'

function tmpFactory(factory) {
	const instances = [new factory()]
	return (seed = 0) => instances[seed] || (instances[seed] = new factory() || instances[seed])
}

export const tmpVec3 = tmpFactory(Vector3)
export const tmpVec2 = tmpFactory(Vector2)
export const tmpMat4 = tmpFactory(Matrix4)
export const tmpMat3 = tmpFactory(Matrix3)
export const tmpEuler = tmpFactory(Euler)
export const tmpQuat = tmpFactory(Quaternion)
export const tmpSpherical = tmpFactory(Spherical)
