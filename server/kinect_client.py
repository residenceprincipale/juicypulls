import cv2
import numpy as np
import asyncio
import websockets
import json
import time
import base64
from pylibfreenect2 import Freenect2, SyncMultiFrameListener, FrameType

# Initialize Kinect
fn = Freenect2()
if fn.enumerateDevices() == 0:
    print("No Kinect v2 devices found!")
    exit()

device = fn.openDevice(0)
listener = SyncMultiFrameListener(FrameType.Color | FrameType.Depth)

device.setColorFrameListener(listener)
device.setIrAndDepthFrameListener(listener)
device.start()

SERVER_URL = "ws://localhost:3001?name=kinect_client"

# Target aspect ratio (same as output resolution 512x424)
TARGET_ASPECT_RATIO = 512 / 424  # 1.2075
BASE_COLOR_WIDTH, BASE_COLOR_HEIGHT = 1920, 1080  # Kinect's full resolution
SCALE_FACTOR = 1.0  # Adjust between 0.1 (lowest quality) to 1.0 (full size)
COLOR_BIT_DEPTH = 6  # Reduce color bit depth for lower weight (1-8)
DEBOUNCE_INTERVAL = 0.02  # 20ms debounce interval (fast streaming)

async def send_data():
    last_sent_time = 0
    print(f"Connecting to WebSocket server at {SERVER_URL}...")

    while True:
        try:
            async with websockets.connect(SERVER_URL) as websocket:
                print("Connected to WebSocket server.")

                while True:
                    frames = listener.waitForNewFrame()

                    # Get depth data (floating point for accurate 3D mapping)
                    depth_frame = frames["depth"].asarray().astype(np.float32)  # Preserve real-world depth
                    depth_bytes = base64.b64encode(depth_frame.tobytes()).decode("utf-8")  # Base64 encoding

                    # Get color data
                    color_frame = frames["color"].asarray()
                    color_image = cv2.cvtColor(color_frame, cv2.COLOR_RGB2BGR)

                    # Calculate new width to match target aspect ratio (height stays 1080)
                    new_width = int(BASE_COLOR_HEIGHT * TARGET_ASPECT_RATIO)
                    start_x = (BASE_COLOR_WIDTH - new_width) // 2  # Center crop
                    cropped_color_image = color_image[:, start_x:start_x + new_width]

                    # Resize based on SCALE_FACTOR
                    final_width = max(1, int(512 * SCALE_FACTOR))
                    final_height = max(1, int(424 * SCALE_FACTOR))
                    resized_color_image = cv2.resize(cropped_color_image, (final_width, final_height), interpolation=cv2.INTER_AREA)

                    # Reduce color bit depth (for smaller size)
                    bit_shift = 8 - COLOR_BIT_DEPTH
                    reduced_color_image = (resized_color_image >> bit_shift) << bit_shift

                    # Encode as Base64
                    color_bytes = base64.b64encode(reduced_color_image).decode("utf-8")

                    # Send data to WebSocket server
                    message = json.dumps({
                        "event": "kinect_update",
                        "data": {
                            "depth": depth_bytes,  # Depth is base64-encoded float32
                            "color": color_bytes   # Color is base64-encoded RGB
                        },
                        "receiver": "camera"
                    })

                    current_time = time.time()
                    if current_time - last_sent_time >= DEBOUNCE_INTERVAL:
                        await websocket.send(message)
                        last_sent_time = current_time

                    listener.release(frames)

        except (websockets.exceptions.ConnectionClosed, ConnectionRefusedError) as e:
            print(f"Disconnected from WebSocket server. Retrying in 5 seconds... ({e})")
            await asyncio.sleep(5)

# Run WebSocket Client
asyncio.run(send_data())

device.stop()
device.close()
