import { useEffect, useRef } from 'react';

/** Press-and-hold repeat for touch buttons; keyboard activation fires once. */
export function useRepeat() {
  const timers = useRef<{ start?: number; tick?: number }>({});
  const stop = () => {
    window.clearTimeout(timers.current.start);
    window.clearInterval(timers.current.tick);
    timers.current = {};
  };
  useEffect(() => stop, []);
  return (fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      fn();
      stop();
      timers.current.start = window.setTimeout(() => {
        timers.current.tick = window.setInterval(fn, 90);
      }, 380);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    // A click from the keyboard has detail 0; pointer clicks were handled on pointer-down.
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) fn();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
}
