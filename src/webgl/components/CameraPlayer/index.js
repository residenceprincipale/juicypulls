import Experience from 'core/Experience.js';
import fragmentShader from './fragmentShader.frag';
import vertexShader from './vertexShader.vert';
import { BoxGeometry, BufferAttribute, BufferGeometry, Mesh, Points, PointsMaterial, ShaderMaterial, Vector3 } from 'three';
import addObjectDebug from 'utils/addObjectDebug.js';
import Socket from '@/scripts/Socket.js';

export default class CameraPlayer {
	constructor(_position = new Vector3(0, 0, 0)) {
		this.experience = new Experience();
		this.scene = this.experience.scene;
		this.debug = this.experience.debug;

		this.position = _position;

		// this.setGeometry();
		// this.setMaterial();
		// this.setMesh();

		this.setPointCloud();

		this.setKinectDebugCanvas();
		this.setDataListeners();
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
		this.mesh = new Mesh(this.geometry, this.material);
		this.mesh.position.copy(this.position);
		this.mesh.name = 'cube';
		this.scene.add(this.mesh);

		if (this.debug.active) addObjectDebug(this.experience.debug.ui, this.mesh);
	}

	setDataListeners() {
		this.socket = new Socket();
		this.socket.connect('camera');

		console.log('socket', this.socket);

		this.socket.on('message', (message) => {
			if (this.isDepthView) {
				this.updateCanvas(message.data.depth, 512, 424, true);
			} else {
				this.updateCanvas(message.data.color, 512, 424, false); // Adjusted for full Kinect color resolution
			}
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

		// Create geometry to hold points
		this.geometry = new BufferGeometry();

		// Create an empty Float32Array for point positions (X, Y, Z for each point)
		this.positions = new Float32Array(width * height * 3); // 3 values per point

		// Assign position buffer to geometry
		this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));

		// Create a simple PointsMaterial for rendering the point cloud
		this.material = new PointsMaterial({ size: 0.02, color: 0xffffff });

		// Create a Three.js Points object and add it to the scene
		this.pointCloud = new Points(this.geometry, this.material);
		this.scene.add(this.pointCloud);
	}


	updateCanvas(data, width, height, isDepth) {
		let binary = atob(data); // Decode Base64
		let buffer = new ArrayBuffer(binary.length);
		let view = new Uint8Array(buffer);

		// Convert binary string to buffer
		for (let i = 0; i < binary.length; i++) {
			view[i] = binary.charCodeAt(i);
		}

		if (isDepth) {
			// Convert Uint8Array to Float32Array (since depth is float32)
			let depthArray = new Float32Array(buffer);

			this.updatePointCloud(depthArray, width, height);

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
			let colorBuffer = new Uint8Array(buffer);
			for (let i = 0, j = 0; i < colorBuffer.length; i += 3, j += 4) {
				this.kinectImageData.data[j] = colorBuffer[i]; // R
				this.kinectImageData.data[j + 1] = colorBuffer[i + 1]; // G
				this.kinectImageData.data[j + 2] = colorBuffer[i + 2]; // B
				this.kinectImageData.data[j + 3] = 255; // Alpha
			}
		}

		this.kinectCtx.putImageData(this.kinectImageData, 0, 0);
	}

	updatePointCloud(depthArray, width, height) {
		let index = 0;

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let depth = depthArray[y * width + x];

				// Convert depth map pixel (x, y) to 3D space
				let worldX = (x - width / 2) / 100;  // X position (scaled)
				let worldY = -(y - height / 2) / 100; // Y position (flipped)
				let worldZ = -depth / 1000;           // Z position (depth)

				// Store in the Float32Array buffer
				this.positions[index++] = worldX;
				this.positions[index++] = worldY;
				this.positions[index++] = worldZ;
			}
		}

		// Mark the position attribute as needing an update
		this.geometry.attributes.position.needsUpdate = true;
	}

}
