export function isTouchDevice(breakpointInPixels: number): boolean {
  const isTouch: boolean =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (breakpointInPixels) {
    // Check if the window width is less than or equal to the breakpointInPixels
    return isTouch && window.innerWidth <= breakpointInPixels;
  }

  return isTouch;
}
