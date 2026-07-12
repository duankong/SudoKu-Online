import { useState, useRef, useCallback, useEffect } from 'react';

export interface Timer {
  seconds: number;
  running: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  sync: (seconds: number) => void;
  format: () => string;
}

export function useTimer(initialSeconds: number = 0): Timer {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimer();
    setSeconds(0);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }, [clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
  }, [running]);

  const reset = useCallback(() => {
    clearTimer();
    setSeconds(0);
    setRunning(false);
  }, [clearTimer]);

  const sync = useCallback((s: number) => {
    setSeconds(s);
  }, []);

  const format = useCallback((): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [seconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { seconds, running, start, pause, resume, reset, sync, format };
}
