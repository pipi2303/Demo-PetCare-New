import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel'
];

// Throttle window so a mousemove storm doesn't reset setTimeout hundreds of
// times per second — activity within this window after the last reset is
// ignored, but the very next event past it still resets the idle timer.
const ACTIVITY_THROTTLE_MS = 1000;

/**
 * Panggil `onIdle` sekali setelah tidak ada aktivitas mouse/keyboard/sentuh
 * selama `timeoutMinutes`. Timer di-reset setiap ada aktivitas dan berhenti
 * total kalau `enabled` false — dipakai untuk fitur Lock Aplikasi Otomatis.
 */
export function useIdleTimer(enabled: boolean, timeoutMinutes: number, onIdle: () => void) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let lastReset = 0;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => onIdleRef.current(), timeoutMinutes * 60 * 1000);
    };

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset < ACTIVITY_THROTTLE_MS) return;
      lastReset = now;
      resetTimer();
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [enabled, timeoutMinutes]);
}
