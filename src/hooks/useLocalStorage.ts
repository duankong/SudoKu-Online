import { useCallback } from 'react';
import type { GameState } from '../types/generated';

const SAVE_KEY = 'sudokucalm-save';
const SAVE_VERSION = 1;

interface SaveEnvelope {
  version: number;
  timestamp: number;
  state: GameState;
}

export interface SaveManager {
  save: (state: GameState) => void;
  load: () => GameState | null;
  hasSave: () => boolean;
  deleteSave: () => void;
}

export function useLocalStorage(): SaveManager {
  const save = useCallback((state: GameState) => {
    try {
      const envelope: SaveEnvelope = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        state,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
    } catch {
      // localStorage might be full — silently fail
    }
  }, []);

  const load = useCallback((): GameState | null => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const envelope = JSON.parse(raw) as SaveEnvelope;
      if (envelope.version !== SAVE_VERSION) {
        localStorage.removeItem(SAVE_KEY);
        return null;
      }
      return envelope.state;
    } catch {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
  }, []);

  const hasSave = useCallback((): boolean => {
    return localStorage.getItem(SAVE_KEY) !== null;
  }, []);

  const deleteSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
  }, []);

  return { save, load, hasSave, deleteSave };
}
