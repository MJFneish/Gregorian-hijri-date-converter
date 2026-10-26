import { createContext, useCallback, useContext, useLayoutEffect, useRef } from 'react';

/** Counts the pieces of a card being captured that haven't finished drawing yet. */
export interface CaptureTracker {
  /** Registers one unfinished piece; call the returned function once it has drawn. */
  hold: () => () => void;
}

/** Provided by ShareHost around the card it is about to capture; null everywhere else. */
export const CaptureReadyContext = createContext<CaptureTracker | null>(null);

/**
 * For components that draw asynchronously (an image that loads, an SVG sized after onLayout):
 * inside a ShareHost capture, holds the capture until the returned `release` is called (or the
 * component unmounts). Outside a capture it does nothing, so components use it unconditionally.
 */
export function useCaptureHold(): () => void {
  const tracker = useContext(CaptureReadyContext);
  const releaseRef = useRef<(() => void) | null>(null);

  // Layout effect: registered before any native load/measure callback can fire.
  useLayoutEffect(() => {
    if (!tracker) return;
    const release = tracker.hold();
    releaseRef.current = release;
    return () => {
      release();
      releaseRef.current = null;
    };
  }, [tracker]);

  return useCallback(() => {
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);
}
