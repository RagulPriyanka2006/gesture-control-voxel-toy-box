# Gesture Control System Documentation

This document outlines the gesture-to-action mappings for the Voxel Toy Box application. The system uses real-time hand tracking via the webcam to allow users to interact with the 3D environment.

## Overview

The gesture control system is designed to be intuitive and responsive. It tracks hand landmarks to detect specific poses and movements, translating them into game actions.

## Gesture Mappings

| Gesture Name | Hand Position / Movement | Action | Description |
| :--- | :--- | :--- | :--- |
| **Smash** | **Closed Fist** | `Explode` | Clench your hand into a fist to smash the current voxel model, causing it to explode outward. This works when the model is stable. |
| **Swipe** | **Open Hand + Fast Movement** | `Swipe / Push` | Move your open hand quickly in any direction (Left, Right, Up, Down). <br> - **Stable Model:** Knocks the model over in that direction. <br> - **Dismantled:** Pushes the floating voxel particles in that direction. |
| **Rebuild** | **Raise Both Hands** | `Rebuild` | Raise both open hands to the top of the screen (above shoulder level) to trigger the rebuilding process, restoring the model to its original state. |

## Technical Details

-   **Library:** MediaPipe Hands
-   **Detection Frequency:** Per animation frame
-   **Latency:** Optimized for < 50ms response time
-   **Conflict Prevention:**
    -   "Rebuild" (Two hands up) takes priority over all other gestures.
    -   "Smash" (Fist) takes priority over "Swipe".
    -   "Swipe" requires a velocity threshold (`0.15` normalized units/frame) to prevent accidental triggers from jitter.
    -   Cooldowns are applied after actions to prevent spamming (e.g., 2s for Rebuild, 1s for Smash).

## Troubleshooting

-   **Lighting:** Ensure your face and hands are well-lit. Backlighting can reduce detection accuracy.
-   **Camera:** The system requires a webcam. Ensure browser permissions are granted.
-   **Visibility:** Keep your hands within the camera frame.
