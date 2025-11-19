import { useEffect, useRef } from 'react';

const AUTO_LOCK_TIMEOUT = 15 * 60 * 1000;

interface UseAutoLockOptions {
  onLock: () => void;
  enabled: boolean;
}

export function useAutoLock({ onLock, enabled }: UseAutoLockOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        onLock();
      }, AUTO_LOCK_TIMEOUT);
    }
  };

  useEffect(() => {
    if (!enabled) {
      // Clear timer if auto-lock is disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Start initial timer
    resetTimer();

    // Activity events that should reset the timer
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [enabled, onLock]);

  return { resetTimer };
}
