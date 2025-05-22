import cv2
import numpy as np
import os
from ultralytics import YOLO
import sys
import json

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
    total_person_count = 0
    frame_count = 0
    confidence = 0.50

    # Collect frames at desired interval
    while cap.isOpened():
        cap.set(cv2.CAP_PROP_POS_MSEC, frame_count * (1000/target_fps))
        success, frame = cap.read()
        if not success:
            break
        frames.append(frame)
        frame_count += 1

    # Process collected frames
    processed_frames = 0
    for frame in frames:
        results = model(frame, verbose=False)
        person_count = len([box for box in results[0].boxes if box.cls == 0 and box.conf > confidence])
        max_person_count = max(max_person_count, person_count)
        total_person_count += person_count
        processed_frames += 1

    cap.release()

    avg_person_count = round(total_person_count / processed_frames, 2) if processed_frames > 0 else 0
    
    return {
        "max_person_count": max_person_count,
        "avg_person_count": avg_person_count
    }

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Video path not provided"}))
        sys.exit(1)

    try:
        video_path = sys.argv[1]
        results = process_video(video_path)
        print(json.dumps({"success": True, "results": results}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)