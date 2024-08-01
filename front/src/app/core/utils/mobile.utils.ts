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
