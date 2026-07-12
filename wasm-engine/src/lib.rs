use wasm_bindgen::prelude::*;

pub mod engine;
pub mod generator;
mod grid;
pub mod highlight;
pub mod hint_engine;
pub mod history;
pub mod solver;
mod types;
pub mod validator;

use crate::engine::{create_daily, create_game, reduce};
use crate::history::History;
use crate::types::Action;

thread_local! {
    static STATE: std::cell::RefCell<Option<crate::types::GameState>> = std::cell::RefCell::new(None);
    static HISTORY: std::cell::RefCell<History> = std::cell::RefCell::new(History::new());
}

#[wasm_bindgen(start)]
pub fn main() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

fn timestamp_seed() -> u64 {
    #[cfg(target_arch = "wasm32")]
    { js_sys::Date::now() as u64 }
    #[cfg(not(target_arch = "wasm32"))]
    {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
    }
}

/// Dispatch an action (JSON) against the current game state.
/// Returns the new state as JSON. Initializes with a default Easy game if no state exists.
#[wasm_bindgen]
pub fn dispatch(action_json: &str) -> String {
    let action: Action = serde_json::from_str(action_json).unwrap_or_else(|e| {
        panic!("Failed to parse action: {} — input: {}", e, action_json);
    });

    STATE.with(|state_cell| {
        HISTORY.with(|history_cell| {
            let mut state_opt = state_cell.borrow_mut();
            let mut history = history_cell.borrow_mut();

            // If this is a NewGame action or no state exists, create fresh state
            let current = match (&action, state_opt.take()) {
                (Action::NewGame { difficulty }, _) => create_game(difficulty.clone(), timestamp_seed()),
                (_, None) => create_game(crate::types::Difficulty::Easy, timestamp_seed()),
                (_, Some(s)) => s,
            };

            let next = reduce(current, action, &mut history);
            let json = serde_json::to_string(&next).unwrap();
            *state_opt = Some(next);
            json
        })
    })
}

/// Load a previously saved game state from JSON.
#[wasm_bindgen]
pub fn load_state(json: &str) {
    let state: crate::types::GameState = serde_json::from_str(json).unwrap_or_else(|e| {
        panic!("Failed to parse state JSON: {}", e);
    });
    STATE.with(|s| *s.borrow_mut() = Some(state));
}

/// Start a new daily challenge game for a given date (YYYY-MM-DD).
/// Returns the initial state as JSON.
#[wasm_bindgen]
pub fn new_daily(date_str: &str) -> String {
    let state = create_daily(date_str);
    let json = serde_json::to_string(&state).unwrap();
    STATE.with(|s| *s.borrow_mut() = Some(state.clone()));
    json
}

/// Start a new game with the given difficulty. Returns initial state JSON.
#[wasm_bindgen]
pub fn new_game(difficulty_json: &str) -> String {
    let difficulty: crate::types::Difficulty = serde_json::from_str(difficulty_json).unwrap_or_else(|e| {
        panic!("Failed to parse difficulty: {}", e);
    });
    let state = create_game(difficulty, timestamp_seed());
    let json = serde_json::to_string(&state).unwrap();
    STATE.with(|s| *s.borrow_mut() = Some(state.clone()));
    json
}

#[cfg(test)]
mod tests {
    use super::types::*;
    use ts_rs::TS;

    #[test]
    fn export_types() {
        let cwd = std::env::current_dir().unwrap();
        let out_path = cwd.parent().unwrap().join("src").join("types").join("generated");
        GameState::export_all_to(&out_path).unwrap();
        assert!(out_path.exists(), "Directory was not created at {}", out_path.display());
        assert!(
            out_path.join("GameState.ts").exists(),
            "GameState.ts not found in {}",
            out_path.display()
        );
    }
}
