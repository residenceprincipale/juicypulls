import Experience from 'core/Experience.js';
import fragmentShader from './fragmentShader.frag';
import vertexShader from './vertexShader.vert';
import { BackSide, BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshNormalMaterial, MeshStandardMaterial, Points, PointsMaterial, ShaderMaterial, Vector3 } from 'three';
import addObjectDebug from 'utils/addObjectDebug.js';
import Socket from '@/scripts/Socket.js';
import Delaunator from 'delaunator';


export default class CameraPlayer {
	constructor(_position = new Vector3(0, 0, 0)) {
		this.experience = new Experience();
		this.scene = this.experience.scene;
		this.debug = this.experience.debug;

		this.position = _position;

		// this.setGeometry();
		// this.setMaterial();
		this.setMesh();

		// this.setPointCloud();

		this.setKinectDebugCanvas();
		this.setDataListeners();

		this.setDebug();
	}

	setGeometry() {
		this.geometry = new BoxGeometry(1, 1, 1);
	}

	setMaterial() {
		this.material = new ShaderMaterial({
			fragmentShader,
			vertexShader,
			uniforms: {
				uOpacity: { value: 1 },
			},
		});
	}

	setMesh() {
		this.geometry = new BufferGeometry();

		// Empty arrays for dynamic updates
		this.positions = [];
		this.normals = [];
		this.indices = [];

		// Material for the mesh
		this.material = new MeshNormalMaterial({
			wireframe: false,
			side: BackSide,
		});

		// Create the mesh and add it to the scene
		this.mesh = new Mesh(this.geometry, this.material);
		this.scene.add(this.mesh);

		// Depth thresholds for filtering
		this.minDepth = 559;  // Adjust based on scene needs (in mm)
		this.maxDepth = 3800; // Ignore anything beyond this distance
		this.depthAmplifier = -3.35; // Scaling factor for depth adjustments
		// New parameters for smooth transition
		this.depthStartAmplification = 300;  // Depth at which amplification begins
		this.depthEndAmplification = 1000;   // Depth at which amplification is fully gone

		// Offset setting for alignment between color & depth sensors
		this.xColorOffset = 0; // Adjust this value to align the color properly
		this.yColorOffset = 0; // Adjust this value to align the color properly

		// Depth crop parameters (REMOVE vertices in this range)
		this.depthCropMin = 1028;  // Start removing vertices at this depth
		this.depthCropMax = 5000; // Stop removing vertices at this depth

		// Store previous depth frame for smoothing
		this.normalSmoothingFactor = 0.9;
		this.smoothingFactor = 0.85;

		this.useVertexSmoothing = false;
	}


	setDataListeners() {
		this.socket = new Socket();
		this.socket.connect('camera');

		console.log('socket', this.socket);

		this.socket.on('message', (message) => {
			this.updateCanvas(message.data, 512, 424, this.isDepthView);
		});
	}

	setKinectDebugCanvas() {
		this.isDepthView = false;

		this.kinectCanvas = document.createElement('canvas');
		this.kinectCanvas.width = 512;
		this.kinectCanvas.height = 424;
		this.kinectCanvas.style.position = 'fixed';
		this.kinectCanvas.style.top = '10px';
		this.kinectCanvas.style.left = '10px';
		this.kinectCanvas.style.border = '2px solid white';
		this.kinectCanvas.style.cursor = 'pointer';
		document.body.appendChild(this.kinectCanvas);

		this.kinectCtx = this.kinectCanvas.getContext('2d');
		this.kinectImageData = this.kinectCtx.createImageData(this.kinectCanvas.width, this.kinectCanvas.height);

		this.kinectCanvas.addEventListener('click', () => {
			this.isDepthView = !this.isDepthView;
		});
	}

	setPointCloud() {
		const width = 512;
		const height = 424;

		// Create geometry for point cloud
		this.geometry = new BufferGeometry();

		// Positions (X, Y, Z) for each point
		this.positions = new Float32Array(width * height * 3);
		this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));

		// Colors (R, G, B) for each point
		this.colors = new Float32Array(width * height * 3);
		this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));

		// Material that uses per-vertex colors
		this.material = new PointsMaterial({ size: 0.02, vertexColors: true });

		// Create a point cloud with positions & colors
		this.pointCloud = new Points(this.geometry, this.material);
		this.scene.add(this.pointCloud);

	}

	updateCanvas(data, width, height, isDepth) {
		// DEPTH
		let binaryDepth = atob(data.depth);
		let bufferDepth = new ArrayBuffer(binaryDepth.length);
		let viewDepth = new Uint8Array(bufferDepth);

		for (let i = 0; i < binaryDepth.length; i++) {
			viewDepth[i] = binaryDepth.charCodeAt(i);
		}

		let depthArray = new Float32Array(bufferDepth);
		this.lastDepthArray = depthArray; // Store latest depth frame

		// COLOR
		let binaryColor = atob(data.color);
		let bufferColor = new ArrayBuffer(binaryColor.length);
		let viewColor = new Uint8Array(bufferColor);

		for (let i = 0; i < binaryColor.length; i++) {
			viewColor[i] = binaryColor.charCodeAt(i);
		}

		let colorBuffer = new Uint8Array(bufferColor);
		this.lastColorArray = colorBuffer; // Store latest color frame

		// If both depth & color data are available, update the point cloud
		if (this.lastDepthArray && this.lastColorArray) {
			// this.updatePointCloud(this.lastDepthArray, this.lastColorArray, width, height);
			this.updateMesh(this.lastDepthArray, width, height);
		}

		if (isDepth) {

			// Use reduce() to find min and max depth (avoids stack overflow)
			let minDepth = depthArray.reduce((min, val) => Math.min(min, val), Infinity);
			let maxDepth = depthArray.reduce((max, val) => Math.max(max, val), -Infinity);
			let range = maxDepth - minDepth || 1; // Prevent divide by zero

			for (let i = 0; i < depthArray.length; i++) {
				let value = ((depthArray[i] - minDepth) / range) * 255; // Normalize depth to grayscale

				this.kinectImageData.data[i * 4] = value;
				this.kinectImageData.data[i * 4 + 1] = value;
				this.kinectImageData.data[i * 4 + 2] = value;
				this.kinectImageData.data[i * 4 + 3] = 255; // Alpha channel
			}
		} else {
			// Decode color image as before
			for (let i = 0, j = 0; i < colorBuffer.length; i += 3, j += 4) {
				this.kinectImageData.data[j] = colorBuffer[i]; // R
				this.kinectImageData.data[j + 1] = colorBuffer[i + 1]; // G
				this.kinectImageData.data[j + 2] = colorBuffer[i + 2]; // B
				this.kinectImageData.data[j + 3] = 255; // Alpha
			}
		}

		this.kinectCtx.putImageData(this.kinectImageData, 0, 0);
	}

	updatePointCloud(depthArray, colorArray, width, height) {
		let index = 0;
		let colorIndex = 0;

		const stepSize = 2; // Reduce point density
		const colorDarknessFactor = 0.5; // Darken colors

		for (let y = 0; y < height; y += stepSize) {
			for (let x = 0; x < width; x += stepSize) {
				let depth = depthArray[y * width + x];

				// Perspective shift based on depth and GUI-controlled offsets
				let correctedX = x + depth * this.xColorOffset;
				let correctedY = y + depth * this.yColorOffset;

				// Ensure corrected X/Y stays within bounds
				let colorX = Math.min(Math.max(Math.round(correctedX), 0), width - 1);
				let colorY = Math.min(Math.max(Math.round(correctedY), 0), height - 1);
				let colorPos = (colorY * width + colorX) * 3;

				let r = (colorArray[colorPos] / 255) * colorDarknessFactor;
				let g = (colorArray[colorPos + 1] / 255) * colorDarknessFactor;
				let b = (colorArray[colorPos + 2] / 255) * colorDarknessFactor;

				// Convert depth map pixel (x, y) to 3D space
				let worldX = (x - width / 2) / 100;
				let worldY = -(y - height / 2) / 100;
				let worldZ = -depth / 1000;

				// Store position
				this.positions[index] = worldX;
				this.positions[index + 1] = worldY;
				this.positions[index + 2] = worldZ;

				// Store color
				this.colors[colorIndex] = r;
				this.colors[colorIndex + 1] = g;
				this.colors[colorIndex + 2] = b;

				index += 3;
				colorIndex += 3;
			}
		}

		// Mark attributes as needing update
		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.color.needsUpdate = true;
	}

	updateMesh(depthArray, width, height) {
		if (!this.previousDepthArray) {
			this.previousDepthArray = new Float32Array(depthArray.length);
			this.previousDepthArray.set(depthArray);
		}

		let points = [];
		const smoothingFactor = 0.85; // Higher = more stable, but slower updates

		for (let y = 0; y < height; y += 2) { // Downsample for performance
			for (let x = 0; x < width; x += 2) {
				let index = y * width + x;
				let depth = depthArray[index];

				// Skip vertices in the cropping range
				if (depth >= this.depthCropMin && depth <= this.depthCropMax) {
					continue;
				}

				if (depth >= this.minDepth && depth <= this.maxDepth) {
					let smoothedDepth = depth;

					if (this.useVertexSmoothing) {
						// Apply smoothing only if enabled
						this.previousDepthArray[index] = smoothingFactor * this.previousDepthArray[index] + (1 - smoothingFactor) * depth;
						smoothedDepth = this.previousDepthArray[index];
					}

					let worldX = (x - width / 2) / 100;
					let worldY = -(y - height / 2) / 100;

					// Apply depth amplification smoothly over range
					let amplificationFactor = 1.0;

					if (smoothedDepth <= this.depthStartAmplification) {
						amplificationFactor = this.depthAmplifier;
					} else if (smoothedDepth < this.depthEndAmplification) {
						let t = (smoothedDepth - this.depthStartAmplification) / (this.depthEndAmplification - this.depthStartAmplification);
						amplificationFactor = 1.0 + (this.depthAmplifier - 1.0) * (1.0 - t);
					}

					let worldZ = -(smoothedDepth * amplificationFactor) / 1000;

					points.push([worldX, worldY, worldZ]);
				}
			}
		}

		let delaunay = Delaunator.from(points.map(p => [p[0], p[1]]));
		let indices = delaunay.triangles;

		let positions = new Float32Array(points.flat());

		this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
		this.geometry.setIndex(new BufferAttribute(new Uint32Array(indices), 1));

		// Compute normals (without smoothing)
		this.computeNormals();

		this.geometry.attributes.position.needsUpdate = true;
	}




	computeNormals() {
		const positions = this.geometry.attributes.position.array;
		const indices = this.geometry.index.array;
		const normals = new Float32Array(positions.length);
		const normalSmoothingFactor = 0.9; // Higher = more stable, but slower updates

		if (!this.previousNormals) {
			this.previousNormals = new Float32Array(normals.length);
		}

		for (let i = 0; i < indices.length; i += 3) {
			let a = indices[i] * 3;
			let b = indices[i + 1] * 3;
			let c = indices[i + 2] * 3;

			let p1 = new Vector3(positions[a], positions[a + 1], positions[a + 2]);
			let p2 = new Vector3(positions[b], positions[b + 1], positions[b + 2]);
			let p3 = new Vector3(positions[c], positions[c + 1], positions[c + 2]);

			let normal = new Vector3().crossVectors(
				p2.clone().sub(p1),
				p3.clone().sub(p1)
			).normalize();

			normals[a] += normal.x; normals[a + 1] += normal.y; normals[a + 2] += normal.z;
			normals[b] += normal.x; normals[b + 1] += normal.y; normals[b + 2] += normal.z;
			normals[c] += normal.x; normals[c + 1] += normal.y; normals[c + 2] += normal.z;
		}

		// // Blend with previous frame's normals
		// for (let i = 0; i < normals.length; i++) {
		// 	this.previousNormals[i] = normalSmoothingFactor * this.previousNormals[i] + (1 - normalSmoothingFactor) * normals[i];
		// 	normals[i] = this.previousNormals[i];
		// }

		this.geometry.setAttribute('normal', new BufferAttribute(normals, 3));
		this.geometry.attributes.normal.needsUpdate = true;
	}



	applyDepthSmoothing(depthArray, width, height) {
		let smoothedDepth = new Float32Array(depthArray.length);
		const kernelSize = 3; // Defines the smoothing radius (higher = smoother, slower)

		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				let sum = 0;
				let count = 0;

				for (let ky = -1; ky <= 1; ky++) {
					for (let kx = -1; kx <= 1; kx++) {
						let sampleX = x + kx;
						let sampleY = y + ky;
						let index = sampleY * width + sampleX;
						sum += depthArray[index];
						count++;
					}
				}

				let smoothedValue = sum / count;
				let currentIndex = y * width + x;

				// Blend original depth and smoothed value to keep sharp features
				smoothedDepth[currentIndex] = depthArray[currentIndex] * 0.5 + smoothedValue * 0.5;
			}
		}

		return smoothedDepth;
	}

	setDebug() {
		const folder = this.debug.ui.addFolder({
			title: 'Camera Player',
			expanded: true,
		})

		folder.addBinding(this, 'xColorOffset', { label: 'X Color Offset', step: 0.001 })
		folder.addBinding(this, 'yColorOffset', { label: 'Y Color Offset', step: 0.001 })
		folder.addBinding(this, 'minDepth', { label: 'Min Depth', min: 0, max: 5000, step: 1 })
		folder.addBinding(this, 'maxDepth', { label: 'Max Depth', min: 0, max: 5000, step: 1 })
		folder.addBinding(this, 'depthAmplifier', { label: 'Depth Amplifier', min: -10, max: 10, step: 0.01 })
		folder.addBinding(this, 'depthStartAmplification', { label: 'Depth Start Amplification', min: 0, max: 5000, step: 1 })
		folder.addBinding(this, 'depthEndAmplification', { label: 'Depth End Amplification', min: 0, max: 5000, step: 1 })
		folder.addBinding(this, 'depthCropMin', { label: 'Depth Crop Min', min: 0, max: 5000, step: 1 })
		folder.addBinding(this, 'depthCropMax', { label: 'Depth Crop Max', min: 0, max: 5000, step: 1 })
		folder.addBinding(this, 'useVertexSmoothing', { label: 'Use Vertex Smoothing' })
		// folder.addBinding(this, 'normalSmoothingFactor', { label: 'Normal Smoothing Factor', min: 0, max: 1, step: 0.01 })
		folder.addBinding(this, 'smoothingFactor', { label: 'Smoothing Factor', min: 0, max: 1, step: 0.01 })
	}

}
