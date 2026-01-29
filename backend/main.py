from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import logging
from helpers import *
from PIL import Image

app = Flask(__name__)
cors = CORS(app)

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route("/hello-world", methods=["GET"])
def hello_world():
    try:
        return jsonify({"Hello": "World"}), 200
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/detect-faces", methods=["POST"])
def detect_faces_api():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = Image.open(request.files["image"]).convert("RGB")
    image_np = np.array(image)

    detections = detect_faces(image_np)
    return jsonify(detections)


@app.route("/process-frame", methods=["POST"])
def process_frame_api():
    """
    Process video frame: segment person and grayscale the background.
    Uses MediaPipe Selfie Segmentation to keep entire body in color.

    Returns:
        JSON with:
        - detections: Array of face detection results
        - processed_image: Base64 encoded image with grayscale background
    """
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image provided"}), 400

        # Get mode from form data (not files)
        mode = request.form.get("mode", "grayscale")

        # Read the uploaded image
        image = Image.open(request.files["image"]).convert("RGB")
        image_np = np.array(image)

        # Process: grayscale or blur background, keep entire person/body in color
        processed_image, detections = grayscale_background_with_person(image_np, mode)

        # Convert processed image back to PIL Image
        processed_pil = Image.fromarray(processed_image)

        # Encode as JPEG and convert to base64 for sending to frontend
        import io
        import base64

        buffer = io.BytesIO()
        processed_pil.save(buffer, format="JPEG", quality=75, optimize=False)
        buffer.seek(0)

        processed_base64 = base64.b64encode(buffer.read()).decode('utf-8')

        return jsonify({
            "detections": detections,
            "processed_image": f"data:image/jpeg;base64,{processed_base64}"
        })

    except Exception as e:
        logger.error(f"Error processing frame: {e}")
        return jsonify({"error": str(e)}), 500



if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug=True, use_reloader=False)
