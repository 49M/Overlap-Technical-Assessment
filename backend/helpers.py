import logging
import ffmpeg
import os
import uuid
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the directory where this file is located
current_dir = os.path.dirname(os.path.abspath(__file__))

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# YuNet face detection model
yunet_model_path = os.path.join(current_dir, "models", "face_detection_yunet_2023mar.onnx")
yunet = cv2.FaceDetectorYN.create(
    model=yunet_model_path,
    config="",
    input_size=(640, 640),
    score_threshold=0.9,
    nms_threshold=0.3,
    top_k=5000
)

segmenter_model_path = os.path.join(current_dir, "models", "selfie_segmenter.tflite")
if not os.path.exists(segmenter_model_path):
    import urllib.request
    os.makedirs(os.path.join(current_dir, "models"), exist_ok=True)
    model_url = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite"
    urllib.request.urlretrieve(model_url, segmenter_model_path)

# segmenter options initialization
base_options = python.BaseOptions(model_asset_path=segmenter_model_path)
options = vision.ImageSegmenterOptions(
    base_options=base_options,
    output_category_mask=True
)
segmenter = vision.ImageSegmenter.create_from_options(options)

def get_temp_path():
    temp_dir = os.path.join(os.path.dirname(__file__), "temp")
    os.makedirs(temp_dir, exist_ok=True)
    random_filename = f"temp_{str(uuid.uuid4())[:8]}"
    return os.path.join(temp_dir, random_filename)


def detect_faces(image_np):
    h, w, _ = image_np.shape
    yunet.setInputSize((w, h))

    _, faces = yunet.detect(image_np)

    results = []

    if faces is None:
        return results

    for i, face in enumerate(faces):
        x, y, bw, bh = face[0:4]
        conf = face[14] if len(face) > 14 else face[4]  # Fallback to index 4 if shorter

        results.append({
            "id": f"face-{i}",
            "x": float(x / w),
            "y": float(y / h),
            "width": float(bw / w),
            "height": float(bh / h),
            "confidence": float(conf),
            "label": "face"
        })

    return results


def grayscale_background_with_faces(image_np):
    """
    Apply grayscale to background while keeping detected faces in color.

    Args:
        image_np: Original color image as numpy array (H, W, 3)

    Returns:
        processed_image: Image with grayscale background and colored faces
        detections: List of face detection results
    """
    # Detect faces first
    h, w, _ = image_np.shape
    yunet.setInputSize((w, h))
    _, faces = yunet.detect(image_np)

    # Create grayscale version of entire image
    gray_image = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    # Convert back to 3 channels so we can blend with color
    gray_image_3ch = cv2.cvtColor(gray_image, cv2.COLOR_GRAY2RGB)

    # Start with fully grayscale image
    processed_image = gray_image_3ch.copy()

    # Prepare detection results
    detections = []

    if faces is not None:
        for i, face in enumerate(faces):
            x, y, bw, bh, conf = face[:5]

            # Convert to integer pixel coordinates
            x_int = int(x)
            y_int = int(y)
            w_int = int(bw)
            h_int = int(bh)

            # Ensure coordinates are within image bounds
            x_int = max(0, x_int)
            y_int = max(0, y_int)
            x_end = min(w, x_int + w_int)
            y_end = min(h, y_int + h_int)

            # Copy the original color pixels back for the face region
            if x_end > x_int and y_end > y_int:
                processed_image[y_int:y_end, x_int:x_end] = image_np[y_int:y_end, x_int:x_end]

            # Store normalized detection results
            detections.append({
                "id": f"face-{i}",
                "x": float(x / w),
                "y": float(y / h),
                "width": float(bw / w),
                "height": float(bh / h),
                "confidence": float(conf),
                "label": "face"
            })

    return processed_image, detections


def grayscale_background_with_person(image_np):
    """
    Apply grayscale to background while keeping the entire person/body in color.
    MediaPipe Image Segmentation -> full body detection.
    YuNet -> detects faces, used for stats.

    Args:
        image_np: Original color image as numpy array (H, W, 3) in RGB format

    Returns:
        processed_image: Image with grayscale background and colored person
        detections: List containing person segmentation info and face detections
    """
    h, w, _ = image_np.shape

    # Convert numpy array to MediaPipe Image format
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_np)

    # Segment the image
    segmentation_result = segmenter.segment(mp_image)

    # Get the category mask (0 = background, 1 = person)
    category_mask = segmentation_result.category_mask.numpy_view()

    # Create binary mask (1 for person, 0 for background)
    # Squeeze to remove any extra dimensions
    binary_mask = (category_mask > 0).astype(np.uint8).squeeze()

    # Create 3-channel mask for broadcasting
    mask_3ch = np.stack([binary_mask] * 3, axis=-1)

    # Create grayscale version of entire image
    gray_image = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    gray_image_3ch = cv2.cvtColor(gray_image, cv2.COLOR_GRAY2RGB)

    # Blend: where mask=1 (person), use original color; where mask=0 (background), use grayscale
    processed_image = np.where(mask_3ch, gray_image_3ch, image_np)

    # Calculate confidence as percentage of frame containing person
    person_pixels = np.sum(binary_mask)
    total_pixels = binary_mask.size
    person_coverage = float(person_pixels / total_pixels)

    # Initialize detections list
    detections = []

    # Add person detection info
    if person_coverage > 0.01:
        detections.append({
            "id": "person-0",
            "coverage": person_coverage,
            "label": "person"
        })

    # Detect faces using YuNet
    yunet.setInputSize((w, h))
    _, faces = yunet.detect(image_np)

    # Add face detections
    if faces is not None:
        for i, face in enumerate(faces):

            x, y, bw, bh = face[0:4]
            conf = face[14] if len(face) > 14 else face[4]  # Fallback to index 4 if shorter

            detections.append({
                "id": f"face-{i}",
                "x": float(x / w),
                "y": float(y / h),
                "width": float(bw / w),
                "height": float(bh / h),
                "confidence": float(conf),
                "label": "face"
            })

    return processed_image, detections