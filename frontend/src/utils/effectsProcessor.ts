/**
 * Effects processor for applying visual effects to video backgrounds
 * while preserving the person in original colors
 */

export interface ProcessingOptions {
  threshold?: number; // Segmentation confidence threshold (0-255)
  useWeightedGrayscale?: boolean; // Use perceptually accurate grayscale calculation
}

const DEFAULT_THRESHOLD = 255;

/**
 * Applies grayscale effect to background pixels based on segmentation mask
 * @param originalFrame - The original video frame as ImageData
 * @param segmentationMask - The segmentation mask from MediaPipe (person = high values, background = low values)
 * @param options - Processing options
 * @returns Modified ImageData with person in color, background in grayscale
 */
export const applyGrayscaleToBackground = (
  originalFrame: ImageData,
  segmentationMask: ImageData,
  options: ProcessingOptions = {}
): ImageData => {
  const {
    threshold = DEFAULT_THRESHOLD,
    useWeightedGrayscale = false
  } = options;

  // Clone the original frame to avoid mutating it
  const processedFrame = new ImageData(
    new Uint8ClampedArray(originalFrame.data),
    originalFrame.width,
    originalFrame.height
  );

  const frameData = processedFrame.data;
  const maskData = segmentationMask.data;

  // Process each pixel
  for (let i = 0; i < frameData.length; i += 4) {
    // Get segmentation confidence from mask (stored in RGBA channels)
    // MediaPipe stores segmentation in all channels, so we can use any channel
    const maskValue = maskData[i];

    // If mask value is below threshold, this is a background pixel
    if (maskValue < threshold) {
      const r = frameData[i];
      const g = frameData[i + 1];
      const b = frameData[i + 2];

      // Calculate grayscale value
      let gray: number;
      if (useWeightedGrayscale) {
        // Weighted method - more accurate to human perception
        // These weights reflect how humans perceive brightness in different colors
        gray = 0.299 * r + 0.587 * g + 0.114 * b;
      } else {
        // Simple averaging - faster computation
        gray = (r + g + b) / 3;
      }

      // Apply grayscale to RGB channels
      frameData[i] = gray;     // R
      frameData[i + 1] = gray; // G
      frameData[i + 2] = gray; // B
      // Alpha channel (i + 3) remains unchanged
    }
    // Else: person pixel - keep original colors (no modification needed)
  }

  return processedFrame;
};

/**
 * Helper function to check if two ImageData objects have compatible dimensions
 */
export const areCompatibleDimensions = (
  imageData1: ImageData,
  imageData2: ImageData
): boolean => {
  return (
    imageData1.width === imageData2.width &&
    imageData1.height === imageData2.height
  );
};

/**
 * Creates a new ImageData object with specified dimensions
 * Useful for creating canvases that match video dimensions
 */
export const createEmptyImageData = (
  width: number,
  height: number
): ImageData => {
  return new ImageData(width, height);
};
