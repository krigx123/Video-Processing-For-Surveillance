from flask import Flask, render_template, Response, send_file, jsonify
import cv2
import threading
import time
import os
from datetime import datetime

app = Flask(__name__)
camera = cv2.VideoCapture(0)

# Recording state
is_recording = False
video_writer = None
record_start_time = None
recording_lock = threading.Lock()
last_recorded_file = None

RECORDINGS_DIR = "recordings"
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# Delete all previous recordings when server starts
for f in os.listdir(RECORDINGS_DIR):
    os.remove(os.path.join(RECORDINGS_DIR, f))


def generate_frames():
    global is_recording, video_writer, record_start_time

    while True:
        success, frame = camera.read()
        if not success:
            break

        with recording_lock:
            if is_recording and video_writer:
                video_writer.write(frame)

        _, buffer = cv2.imencode(".jpg", frame)
        frame_bytes = buffer.tobytes()

        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")


@app.route("/")
def index():
    global last_recorded_file
    # Delete previous recording if exists
    if last_recorded_file and os.path.exists(last_recorded_file):
        os.remove(last_recorded_file)
        last_recorded_file = None
    return render_template("index.html")


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/start_recording", methods=["POST"])
def start_recording():
    global is_recording, video_writer, record_start_time, last_recorded_file
    with recording_lock:
        if not is_recording:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            last_recorded_file = os.path.join(
                RECORDINGS_DIR, f"recording_{timestamp}.avi"
            )
            fourcc = cv2.VideoWriter_fourcc(*"XVID")
            fps = 20.0
            frame_size = (int(camera.get(3)), int(camera.get(4)))
            video_writer = cv2.VideoWriter(last_recorded_file, fourcc, fps, frame_size)
            is_recording = True
            record_start_time = int(time.time())
    return jsonify(
        status="started",
        filename=os.path.basename(last_recorded_file),
        start_time=record_start_time,
    )


@app.route("/stop_recording", methods=["POST"])
def stop_recording():
    global is_recording, video_writer
    with recording_lock:
        if is_recording:
            is_recording = False
            video_writer.release()
            video_writer = None
    return jsonify(status="stopped")


@app.route("/status")
def status():
    global is_recording, record_start_time, last_recorded_file
    if is_recording:
        elapsed = int(time.time() - record_start_time)
    else:
        elapsed = 0
    return jsonify(
        recording=is_recording,
        elapsed_time=elapsed,
        file_available=os.path.exists(last_recorded_file)
        if last_recorded_file
        else False,
    )


@app.route("/download")
def download():
    global last_recorded_file
    if last_recorded_file and os.path.exists(last_recorded_file):
        return send_file(last_recorded_file, as_attachment=True)
    return "No recording available", 404


if __name__ == "__main__":
    app.run(debug=True)
