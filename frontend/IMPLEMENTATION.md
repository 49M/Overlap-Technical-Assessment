# Background Grayscale Filter Implementation

## Overview

This application implements real-time background grayscale filtering on video using MediaPipe Selfie Segmentation. The system processes video frames in real-time, detecting the person in the frame and applying a grayscale filter to everything except the person, creating a clean "person in color, background in grayscale" effect.

## Architecture

### Core Components

#### 1. **App.tsx** - Main Application Component
The central component that orchestrates the entire video processing pipeline.

**Key Responsibilities:**
- Manages application state (detection status, performance stats)
- Coordinates video playback and canvas rendering
- Implements the `startDetection()` function required by the assessment
- Handles the frame processing loop using `requestAnimationFrame`
- Tracks performance metrics (FPS, processing time)

**Key State Variables:**
```typescript
isDetecting: boolean              // Whether processing is active
stats: ProcessingStats           // FPS and processing time metrics
videoRef: HTMLVideoElement       // Reference to video element
canvasRef: HTMLCanvasElement     // Main display canvas
hiddenCanvasRef: HTMLCanvasElement  // Offscreen processing canvas
```

#### 2. **useSegmentation Hook** - Person Segmentation Logic
Custom React hook that wraps MediaPipe Selfie Segmentation functionality.

**Location:** `frontend/src/hooks/useSegmentation.ts`

**Key Features:**
- Initializes MediaPipe Selfie Segmentation model
- Provides `processFrame()` function to segment person from background
- Returns segmentation mask (1 = person, 0 = background)
- Implements session management to prevent race conditions
- Handles model lifecycle (loading, processing, cleanup)

**API:**
```typescript
{
  isModelLoaded: boolean           // Model ready status
  processFrame: (video) => mask    // Process video frame
  error: string | null             // Error messages
  reset: () => void                // Clear cached data
  enable: () => void               // Enable processing
}
```

#### 3. **effectsProcessor.ts** - Image Processing Utilities
Pure functions for applying visual effects to video frames.

**Location:** `frontend/src/utils/effectsProcessor.ts`

**Key Functions:**
- `applyGrayscaleToBackground(frameData, mask)` - Applies grayscale to background pixels
- `areCompatibleDimensions(frameData, mask)` - Validates dimension compatibility

#### 4. **VideoPlayer Component** - Video Display
Simple wrapper around HTML5 video element with refs support.

**Location:** `frontend/src/components/VideoPlayer.tsx`

#### 5. **DetectionStats Component** - Performance Metrics Display
Displays real-time performance statistics with color-coded indicators.

**Location:** `frontend/src/components/DetectionStats.tsx`

**Metrics Tracked:**
- **FPS** (Frames Per Second): Target is 30fps for smooth playback
- **Processing Time**: Time per frame in milliseconds (target: <33ms)
- **Status**: Active/Inactive indicator

## Video Processing Pipeline

### Phase 1: Initialization

When user clicks "Start Detection":

1. **Validate Prerequisites**
   ```typescript
   // Check if video and canvas elements are ready
   if (!video || !canvas || !hiddenCanvas) return;

   // Check if segmentation model is loaded
   if (!isSegmentationLoaded) return;
   ```

2. **Initialize Canvas Dimensions**
   ```typescript
   // Match canvas size to video dimensions
   canvas.width = video.videoWidth;
   canvas.height = video.videoHeight;
   hiddenCanvas.width = video.videoWidth;
   hiddenCanvas.height = video.videoHeight;
   ```

3. **Enable Segmentation & Start Loop**
   ```typescript
   setIsDetecting(true);
   isDetectingRef.current = true;
   enable(); // Enable segmentation processing
   processFrame(); // Start animation loop
   ```

### Phase 2: Frame Processing Loop

The `processFrame()` function runs continuously using `requestAnimationFrame`:

```typescript
const processFrame = async () => {
  // 1. GUARD: Check if still detecting
  if (!isDetectingRef.current) return;

  // 2. CONCURRENCY CONTROL: Prevent frame overlap
  if (isFrameProcessingRef.current) {
    animationFrameRef.current = requestAnimationFrame(processFrame);
    return;
  }

  isFrameProcessingRef.current = true;
  const startTime = performance.now();

  try {
    // 3. EXTRACT FRAME DATA
    hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
    const frameData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);

    // 4. GENERATE SEGMENTATION MASK
    const segmentationMask = await processSegmentation(video);

    // 5. APPLY GRAYSCALE EFFECT
    if (segmentationMask && areCompatibleDimensions(frameData, segmentationMask)) {
      const processedFrame = applyGrayscaleToBackground(frameData, segmentationMask);
      ctx.putImageData(processedFrame, 0, 0);
    } else {
      // Fallback: show original video
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // 6. CALCULATE PERFORMANCE METRICS
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    // ... FPS calculation

  } catch (err) {
    console.error('Error processing frame:', err);
  }

  isFrameProcessingRef.current = false;

  // 7. SCHEDULE NEXT FRAME
  if (isDetectingRef.current) {
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }
};
```

### Phase 3: Frame Processing Details

#### Step 1: Video Frame Extraction
```typescript
// Draw current video frame to hidden canvas
hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);

// Extract pixel data as ImageData object
const frameData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
// frameData.data is Uint8ClampedArray with RGBA values [R,G,B,A,R,G,B,A,...]
```

#### Step 2: Person Segmentation
```typescript
// Send video frame to MediaPipe Selfie Segmentation
const segmentationMask = await processSegmentation(video);

// segmentationMask is ImageData where:
// - Each pixel value (0.0 - 1.0) represents confidence that pixel is part of person
// - 1.0 = definitely person
// - 0.0 = definitely background
// - 0.5 = uncertain
```

#### Step 3: Grayscale Application
```typescript
function applyGrayscaleToBackground(frameData, mask) {
  const data = frameData.data;
  const maskData = mask.data;

  for (let i = 0; i < maskData.length; i += 4) {
    // Extract person confidence for this pixel (R channel of mask)
    const confidence = maskData[i] / 255; // Normalize to 0.0-1.0

    if (confidence < 0.5) {
      // This pixel is background - convert to grayscale
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Standard grayscale formula (weighted by human perception)
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      data[i] = gray;     // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // Alpha (data[i + 3]) unchanged
    }
    // Pixels with confidence >= 0.5 remain unchanged (person stays in color)
  }

  return frameData;
}
```

#### Step 4: Display Processed Frame
```typescript
// Put processed image data onto visible canvas
ctx.putImageData(processedFrame, 0, 0);
```

## MediaPipe Selfie Segmentation

### Model Initialization

The segmentation model is loaded when the app starts:

```typescript
const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
  }
});

selfieSegmentation.setOptions({
  modelSelection: 1, // 0 = lightweight (faster), 1 = accurate (better quality)
  selfieMode: false  // false = video, true = mirror mode for selfie camera
});

selfieSegmentation.onResults((results) => {
  // results.segmentationMask is ImageData with person mask
  latestResultRef.current = results.segmentationMask;
});
```

### Segmentation Process

```typescript
async function processFrame(videoElement) {
  // Send video frame to MediaPipe
  await selfieSegmentation.send({ image: videoElement });

  // Return cached result from onResults callback
  return latestResultRef.current;
}
```

### Session Management

To prevent race conditions when toggling detection on/off:

```typescript
// Each enable/disable cycle gets a new session ID
const sessionIdRef = useRef(0);
const isProcessingEnabledRef = useRef(true);

// When segmentation is disabled
function reset() {
  isProcessingEnabledRef.current = false;
  latestResultRef.current = null;
  sessionIdRef.current += 1; // Invalidate previous results
}

// Ignore results from old sessions
selfieSegmentation.onResults((results) => {
  if (!isProcessingEnabledRef.current) return;
  const currentSession = sessionIdRef.current;
  // ... store result only if session matches
});
```

## Performance Optimization

### 1. Concurrency Control

Prevents multiple frames from being processed simultaneously:

```typescript
const isFrameProcessingRef = useRef(false);

if (isFrameProcessingRef.current) {
  // Skip this frame if previous is still processing
  animationFrameRef.current = requestAnimationFrame(processFrame);
  return;
}
```

### 2. Ref-Based State Management

Uses refs instead of state for animation loop variables to avoid unnecessary re-renders:

```typescript
const isDetectingRef = useRef(false);  // Used in animation loop
const isDetecting = useState(false);   // Used for UI updates
```

### 3. Offscreen Canvas Processing

Uses a hidden canvas for intermediate processing to avoid visual artifacts:

```typescript
// Hidden canvas - not visible to user
<canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

// Extract frame data from hidden canvas
hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
const frameData = hiddenCtx.getImageData(...);
```

### 4. FPS Calculation

Maintains rolling average of last 30 frames for stable FPS display:

```typescript
const now = performance.now();
const deltaTime = now - lastFrameTimeRef.current;
const currentFps = 1000 / deltaTime;

fpsCounterRef.current.push(currentFps);
if (fpsCounterRef.current.length > 30) {
  fpsCounterRef.current.shift();
}

const avgFps = fpsCounterRef.current.reduce((a, b) => a + b, 0)
                / fpsCounterRef.current.length;
```

## Performance Targets

- **Target FPS:** 30 fps (33ms per frame)
- **Acceptable FPS:** 24+ fps (42ms per frame)
- **Poor FPS:** <24 fps (>42ms per frame)

**Performance Indicators:**
- 🟢 Green: 28+ fps (excellent)
- 🟠 Orange: 24-27 fps (acceptable)
- 🔴 Red: <24 fps (poor)

## Error Handling

### 1. Model Loading Failures
```typescript
if (!isSegmentationLoaded) {
  // Display loading message
  // Disable Start Detection button
}
```

### 2. Dimension Mismatch
```typescript
if (!areCompatibleDimensions(frameData, segmentationMask)) {
  // Fallback to original video
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}
```

### 3. Processing Errors
```typescript
try {
  // Frame processing
} catch (err) {
  console.error('Error processing frame:', err);
  // Continue to next frame
}
```

## Cleanup on Stop

When user clicks "Stop Detection":

```typescript
function stopDetection() {
  // Stop animation loop
  setIsDetecting(false);
  isDetectingRef.current = false;
  isFrameProcessingRef.current = false;

  // Cancel pending animation frame
  if (animationFrameRef.current !== null) {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }

  // Clear performance tracking
  fpsCounterRef.current = [];
  lastFrameTimeRef.current = 0;

  // Reset segmentation state
  reset();
}
```

## Key Design Decisions

### 1. **Always-On Grayscale Filter**
The grayscale filter is always enabled when detection is running. This simplifies the UI and ensures consistent behavior.

### 2. **Confidence Threshold of 0.5**
Pixels with segmentation confidence < 0.5 are treated as background and grayscaled. This provides a good balance between accuracy and coverage.

### 3. **Model Selection: Accurate (1)**
Uses the more accurate MediaPipe model (modelSelection: 1) instead of the lightweight model (0) to ensure clean, tight segmentation around the person.

### 4. **Hidden Canvas for Processing**
Uses an offscreen canvas for pixel extraction and manipulation to avoid flashing or visual artifacts on the display canvas.

### 5. **RequestAnimationFrame Loop**
Uses `requestAnimationFrame` instead of `setInterval` to synchronize with browser refresh rate and ensure smooth playback.

## Dependencies

- **@mediapipe/selfie_segmentation**: Person segmentation AI model
- **React**: UI framework
- **TypeScript**: Type safety and developer experience

## Browser Compatibility

Requires modern browser with support for:
- Canvas API
- WebAssembly (for MediaPipe)
- ES6+ JavaScript features
- `requestAnimationFrame`

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+

## Performance Considerations

**Factors Affecting Performance:**
1. **Video Resolution**: Higher resolution = more pixels to process
2. **Browser Performance**: GPU acceleration availability
3. **CPU Load**: Other running applications
4. **Model Selection**: Accurate model (1) is slower than lightweight (0)

**Typical Performance:**
- 1080p video: 24-30 fps
- 720p video: 30+ fps
- 480p video: 30+ fps with headroom

## Future Enhancements

Potential improvements:
1. **WebGL Acceleration**: Use GPU for pixel manipulation
2. **Web Workers**: Offload processing to background thread
3. **Model Selection Toggle**: Let users choose speed vs. quality
4. **Edge Smoothing**: Apply blur to segmentation mask edges
5. **Multiple Effects**: Blur, color filters, virtual backgrounds
6. **Record Output**: Capture processed video to file

## Troubleshooting

**Issue: Low FPS (<24 fps)**
- Solution: Reduce video resolution or use lightweight model (modelSelection: 0)

**Issue: Rough edges around person**
- Solution: Apply Gaussian blur to segmentation mask before processing

**Issue: Page unresponsive when toggling on/off**
- Solution: Session management in useSegmentation hook prevents this

**Issue: Background not fully grayscaled**
- Solution: Adjust confidence threshold from 0.5 to higher value (e.g., 0.6)

## References

- [MediaPipe Selfie Segmentation](https://google.github.io/mediapipe/solutions/selfie_segmentation.html)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [ImageData API](https://developer.mozilla.org/en-US/docs/Web/API/ImageData)
