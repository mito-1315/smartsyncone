from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
from ultralytics import YOLO
import tempfile

app = Flask(__name__)
CORS(app)

# Load the YOLO model
model = YOLO("yolo11x.pt")
model.verbose = False

def process_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Failed to open video: {video_path}")

    # Set desired FPS and calculate frame interval
    target_fps = 4
    frames = []
    max_person_count = 0
    confidence = 0.50

    # Collect frames at desired interval
    frame_count = 0
    while cap.isOpened():
        cap.set(cv2.CAP_PROP_POS_MSEC, frame_count * (1000/target_fps))
        success, frame = cap.read()
        if not success:
            break
        frames.append(frame)
        frame_count += 1

    # Process collected frames
    for frame in frames:
        results = model(frame, verbose=False)
        person_count = len([box for box in results[0].boxes if box.cls == 0 and box.conf > confidence])
        max_person_count = max(max_person_count, person_count)

    cap.release()
    return {
        "max_person_count": max_person_count
    }

@app.route('/process-video', methods=['POST'])
def process_video_route():
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400

        video_file = request.files['video']
        
        # Create a temporary file to store the uploaded video
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_file:
            video_file.save(tmp_file.name)
            results = process_video(tmp_file.name)
            
            # Clean up the temporary file
            os.unlink(tmp_file.name)
            
            return jsonify({
                'success': True,
                'results': results
            })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)