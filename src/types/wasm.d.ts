declare module '*/wasm-pkg/sudokucalm_engine.js' {
  export function dispatch(action_json: string): string;
  export function load_state(json: string): void;
  export function new_daily(date_str: string): string;
  export function new_game(difficulty_json: string): string;
  export default function init(): Promise<void>;
}

declare module '*/public/wasm/sudokucalm_engine.js' {
  export function dispatch(action_json: string): string;
  export function load_state(json: string): void;
  export function new_daily(date_str: string): string;
  export function new_game(difficulty_json: string): string;
  export default function init(): Promise<void>;
}
