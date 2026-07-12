import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Difficulty } from '../types/generated';
import type { Action } from '../types/action';

// WASM module type
interface WasmModule {
  dispatch(action_json: string): string;
  load_state(json: string): void;
  new_daily(date_str: string): string;
  new_game(difficulty_json: string): string;
}

let wasmModule: WasmModule | null = null;
let wasmInitPromise: Promise<WasmModule> | null = null;

async function getWasm(): Promise<WasmModule> {
  if (wasmModule) return wasmModule;
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      const mod = await import('../wasm-pkg/sudokucalm_engine.js');
      await mod.default();
      wasmModule = mod as unknown as WasmModule;
      return wasmModule;
    })();
  }
  return wasmInitPromise;
}

export interface GameEngine {
  state: GameState | null;
  loading: boolean;
  error: string | null;
  dispatch: (action: Action) => Promise<void>;
  loadState: (saved: GameState) => Promise<void>;
  newGame: (difficulty: Difficulty) => Promise<void>;
  newDaily: (dateStr: string) => Promise<void>;
}

export function useGameEngine(): GameEngine {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<GameState | null>(null);

  // Initialize WASM on mount
  useEffect(() => {
    let cancelled = false;
    getWasm()
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(`Failed to load WASM: ${e}`);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateState = useCallback((json: string) => {
    const next = JSON.parse(json) as GameState;
    stateRef.current = next;
    setState(next);
  }, []);

  const dispatch = useCallback(
    async (action: Action) => {
      const wasm = await getWasm();
      const json = wasm.dispatch(JSON.stringify(action));
      updateState(json);
    },
    [updateState],
  );

  const loadState = useCallback(
    async (saved: GameState) => {
      const wasm = await getWasm();
      wasm.load_state(JSON.stringify(saved));
      stateRef.current = saved;
      setState(saved);
    },
    [],
  );

  const newGame = useCallback(
    async (difficulty: Difficulty) => {
      const wasm = await getWasm();
      const json = wasm.new_game(JSON.stringify(difficulty));
      updateState(json);
    },
    [updateState],
  );

  const newDaily = useCallback(
    async (dateStr: string) => {
      const wasm = await getWasm();
      const json = wasm.new_daily(dateStr);
      updateState(json);
    },
    [updateState],
  );

  return { state, loading, error, dispatch, loadState, newGame, newDaily };
}
