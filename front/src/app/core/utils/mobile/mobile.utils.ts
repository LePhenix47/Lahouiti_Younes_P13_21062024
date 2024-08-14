/**
 * Checks if the device is a touch device.
 *
 * @param {number} [breakpointInPixels] - Optional breakpoint in pixels. If provided,
 * the function will also check if the window width is less than or equal to the
 * breakpoint.
 * @return {boolean} `true` if the device is a touch device, `false` otherwise.
 */
export function isTouchDevice(breakpointInPixels?: number): boolean {
  const isTouch: boolean =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (breakpointInPixels) {
    // Check if the window width is less than or equal to the breakpointInPixels
    return isTouch && window.innerWidth <= breakpointInPixels;
  }

  return isTouch;
}

/**
 * Checks if the device has front and back cameras.
 *
 * @return {{hasFrontCamera: boolean, hasBackCamera: boolean}} An object containing boolean values indicating the presence of front and back cameras.
 */
export async function hasFrontAndRearCameras(): Promise<{
  hasFrontCamera: boolean;
  hasBackCamera: boolean;
}> {
  let hasFrontCamera: boolean = false;
  let hasBackCamera: boolean = false;

  try {
    // Request permission to access media devices
    await navigator.mediaDevices.getUserMedia({ video: true });

    // Get the list of media devices
    const devices: MediaDeviceInfo[] =
      await navigator.mediaDevices.enumerateDevices();

    // Filter for video input devices
    const videoInputDevices: MediaDeviceInfo[] = devices.filter(
      (device: MediaDeviceInfo) => device.kind === 'videoinput'
    );

    // Check for front and back cameras using a for...of loop
    for (const device of videoInputDevices) {
      const label: string = device.label.toLowerCase();

      if (label.includes('front')) {
        hasFrontCamera = true;
      } else if (label.includes('back') || label.includes('rear')) {
        hasBackCamera = true;
      }
    }
  } catch (error) {
    console.error('Error accessing media devices:', error);
  }

  return { hasFrontCamera, hasBackCamera }; // Return the results
}
