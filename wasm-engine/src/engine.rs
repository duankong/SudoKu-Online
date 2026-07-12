use crate::generator::{dig_holes, fill_board, seed_from_date};
use crate::highlight::compute as compute_highlights;
use crate::hint_engine::find_hint;
use crate::history::History;
use crate::types::*;
use crate::validator::{check_game_status, conflict_check};
use rand::SeedableRng;

/// Push current grid to undo history before a state-changing operation.
fn push_undo(history: &mut History, grid: &Grid) {
    history.push(grid.clone());
}

/// Create a fresh GameState for a given difficulty with a random puzzle.
pub fn create_game(difficulty: Difficulty, seed: u64) -> GameState {
    let mut rng = rand::rngs::StdRng::seed_from_u64(seed);
    let solution = fill_board(&mut rng);
    let (puzzle, solution) = dig_holes(&solution, difficulty.clone(), &mut rng);

    // Build grid from puzzle
    let cells = core::array::from_fn::<_, 9, _>(|r| {
        core::array::from_fn(|c| {
            let v = puzzle[r][c];
            if v != 0 {
                Cell::new(v, true)
            } else {
                Cell::empty()
            }
        })
    });

    let grid = Grid {
        cells,
        selected: None,
        selected_number: None,
        highlights: Highlights::empty(),
    };

    GameState {
        grid,
        difficulty,
        solution,
        error_count: 0,
        max_errors: 3,
        game_status: GameStatus::Playing,
        elapsed_seconds: 0,
        settings: GameSettings::default(),
        hint: None,
    }
}

/// Create a daily challenge game from a date string (YYYY-MM-DD).
pub fn create_daily(date_str: &str) -> GameState {
    let mut rng = seed_from_date(date_str);
    let solution = fill_board(&mut rng);
    // Daily is always medium difficulty
    let (puzzle, solution) = dig_holes(&solution, Difficulty::Medium, &mut rng);

    let cells = core::array::from_fn::<_, 9, _>(|r| {
        core::array::from_fn(|c| {
            let v = puzzle[r][c];
            if v != 0 {
                Cell::new(v, true)
            } else {
                Cell::empty()
            }
        })
    });

    let grid = Grid {
        cells,
        selected: None,
        selected_number: None,
        highlights: Highlights::empty(),
    };

    GameState {
        grid,
        difficulty: Difficulty::Medium,
        solution,
        error_count: 0,
        max_errors: 3,
        game_status: GameStatus::Playing,
        elapsed_seconds: 0,
        settings: GameSettings::default(),
        hint: None,
    }
}

/// Main reducer: apply an Action to the current state, returning a new state.
/// Also updates the history thread-local.
pub fn reduce(state: GameState, action: Action, history: &mut History) -> GameState {
    match action {
        Action::SelectCell { row, col } => handle_select_cell(state, row, col),
        Action::InputNumber { value } => handle_input_number(state, value, history),
        Action::ToggleNote { value } => handle_toggle_note(state, value, history),
        Action::ToggleNoteMode => state, // purely UI, no state change
        Action::Erase => handle_erase(state, history),
        Action::Undo => handle_undo(state, history),
        Action::Redo => handle_redo(state, history),
        Action::GetHint => handle_get_hint(state),
        // NewGame is handled in lib.rs dispatch() — should never reach here
        Action::NewGame { .. } => state,
        Action::UpdateGameSettings { settings } => handle_update_settings(state, settings),
        Action::SetFinalTime { seconds } => handle_set_final_time(state, seconds),
    }
}

// ── Action Handlers ──────────────────────────────────────────────────────

fn handle_select_cell(mut state: GameState, row: u8, col: u8) -> GameState {
    let cell = &state.grid.cells[row as usize][col as usize];

    // Determine selected_number for highlighting
    let selected_number = if cell.value != 0 && cell.is_given {
        Some(cell.value)
    } else if cell.value != 0 && !cell.is_given {
        Some(cell.value)
    } else {
        None
    };

    state.grid.selected = Some(Pos { row, col });
    state.grid.selected_number = selected_number;

    // Clear previous hint highlights
    state.hint = None;

    // Recompute highlights
    let highlights = compute_highlights(&state.grid, &state.settings, &[]);
    state.grid.highlights = highlights;

    state
}

fn handle_input_number(mut state: GameState, value: u8, history: &mut History) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    let sel = match state.grid.selected {
        Some(ref s) => s.clone(),
        None => return state,
    };
    if state.grid.cells[sel.row as usize][sel.col as usize].is_given {
        return state;
    }

    // Push undo
    push_undo(history, &state.grid);

    // Set the value
    state.grid.cells[sel.row as usize][sel.col as usize].value = value;
    state.grid.cells[sel.row as usize][sel.col as usize].notes.clear();

    // Check for conflicts (clear previous errors first)
    for r in 0..9usize {
        for c in 0..9usize {
            state.grid.cells[r][c].is_error = false;
        }
    }
    let conflicts = conflict_check(&state.grid, sel.row, sel.col, value);
    if !conflicts.is_empty() {
        for pos in &conflicts {
            state.grid.cells[pos.row as usize][pos.col as usize].is_error = true;
        }
        state.grid.cells[sel.row as usize][sel.col as usize].is_error = true;
        state.error_count += 1;
    }

    // Smart erase notes
    smart_erase_notes(&mut state.grid.cells, sel.row as usize, sel.col as usize, value);

    // Recompute highlights with error cells
    let highlights = compute_highlights(&state.grid, &state.settings, &[]);
    state.grid.highlights = highlights;

    // Check game status
    state.game_status = check_game_status(&state.grid, &state.solution, state.error_count, state.max_errors);

    state
}

fn handle_toggle_note(mut state: GameState, value: u8, history: &mut History) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    let sel = match state.grid.selected {
        Some(ref s) => s.clone(),
        None => return state,
    };

    // Check if operation is valid BEFORE borrowing
    let blocked = {
        let cell_ref = &state.grid.cells[sel.row as usize][sel.col as usize];
        cell_ref.is_given || cell_ref.value != 0
    };
    if blocked {
        return state;
    }

    push_undo(history, &state.grid);

    let cell = &mut state.grid.cells[sel.row as usize][sel.col as usize];
    // toggle_note follows
    if let Some(pos) = cell.notes.iter().position(|&n| n == value) {
        cell.notes.remove(pos);
    } else {
        cell.notes.push(value);
        cell.notes.sort_unstable();
    }

    state
}

fn handle_erase(mut state: GameState, history: &mut History) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    let sel = match state.grid.selected {
        Some(ref s) => s.clone(),
        None => return state,
    };

    // Check if operation is valid BEFORE borrowing
    let (blocked, notes_empty) = {
        let cell_ref = &state.grid.cells[sel.row as usize][sel.col as usize];
        (cell_ref.is_given, cell_ref.notes.is_empty())
    };
    if blocked {
        return state;
    }

    push_undo(history, &state.grid);

    let cell = &mut state.grid.cells[sel.row as usize][sel.col as usize];
    if !notes_empty {
        cell.notes.clear();
    } else if cell.value != 0 {
        cell.value = 0;
        cell.is_error = false;
    }

    // Recompute highlights
    let highlights = compute_highlights(&state.grid, &state.settings, &[]);
    state.grid.highlights = highlights;

    state
}

fn handle_undo(mut state: GameState, history: &mut History) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    if let Some(prev_grid) = history.undo(&state.grid) {
        state.grid = prev_grid;
        // Recompute highlights
        let highlights = compute_highlights(&state.grid, &state.settings, &[]);
        state.grid.highlights = highlights;
        state.game_status = check_game_status(
            &state.grid, &state.solution, state.error_count, state.max_errors,
        );
    }
    state
}

fn handle_redo(mut state: GameState, history: &mut History) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    if let Some(next_grid) = history.redo() {
        state.grid = next_grid;
        let highlights = compute_highlights(&state.grid, &state.settings, &[]);
        state.grid.highlights = highlights;
        state.game_status = check_game_status(
            &state.grid, &state.solution, state.error_count, state.max_errors,
        );
    }
    state
}

fn handle_get_hint(mut state: GameState) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    state.hint = find_hint(&state.grid);

    // If solver fallback filled a cell, apply it
    if let Some(ref hint) = state.hint {
        if matches!(hint.strategy, StrategyType::SolverFallback) {
            // Apply the hint value
            let t = hint.target.clone();
            state.grid.cells[t.row as usize][t.col as usize].value = hint.value;
        }
        // Highlight related cells
        let hint_cells: Vec<Pos> = hint.related_cells.clone();
        let highlights = compute_highlights(&state.grid, &state.settings, &hint_cells);
        state.grid.highlights = highlights;
    }

    state
}

fn handle_update_settings(mut state: GameState, settings: GameSettings) -> GameState {
    state.settings = settings;
    // Recompute highlights with new settings
    let highlights = compute_highlights(&state.grid, &state.settings, &[]);
    state.grid.highlights = highlights;
    state
}

fn handle_set_final_time(mut state: GameState, seconds: u32) -> GameState {
    state.elapsed_seconds = seconds;
    state
}

// ── Helper ────────────────────────────────────────────────────────────────

fn smart_erase_notes(cells: &mut [[Cell; 9]; 9], row: usize, col: usize, value: u8) {
    for i in 0..9 {
        cells[row][i].notes.retain(|&n| n != value);
        cells[i][col].notes.retain(|&n| n != value);
    }
    let br = (row / 3) * 3;
    let bc = (col / 3) * 3;
    for r in br..br + 3 {
        for c in bc..bc + 3 {
            cells[r][c].notes.retain(|&n| n != value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_empty_state() -> GameState {
        let solution = [[0u8; 9]; 9];
        GameState {
            grid: Grid {
                cells: core::array::from_fn::<_, 9, _>(|_| core::array::from_fn(|_| Cell::empty())),
                selected: None,
                selected_number: None,
                highlights: Highlights::empty(),
            },
            difficulty: Difficulty::Easy,
            solution,
            error_count: 0,
            max_errors: 3,
            game_status: GameStatus::Playing,
            elapsed_seconds: 0,
            settings: GameSettings::default(),
            hint: None,
        }
    }

    #[test]
    fn test_select_cell_sets_selected() {
        let state = make_empty_state();
        let mut history = History::new();
        let state = reduce(state, Action::SelectCell { row: 3, col: 5 }, &mut history);
        assert_eq!(state.grid.selected, Some(Pos { row: 3, col: 5 }));
    }

    #[test]
    fn test_input_number_on_given_cell_is_noop() {
        let mut state = make_empty_state();
        state.grid.cells[0][0].is_given = true;
        state.grid.cells[0][0].value = 5;
        // Select the given cell
        state = reduce(state, Action::SelectCell { row: 0, col: 0 }, &mut History::new());
        let mut history = History::new();
        let state2 = reduce(state, Action::InputNumber { value: 3 }, &mut history);
        assert_eq!(state2.grid.cells[0][0].value, 5);
    }

    #[test]
    fn test_erase_clears_cell() {
        let mut state = make_empty_state();
        state.grid.cells[2][2].value = 7;
        state = reduce(state, Action::SelectCell { row: 2, col: 2 }, &mut History::new());
        let mut history = History::new();
        let state = reduce(state, Action::Erase, &mut history);
        assert_eq!(state.grid.cells[2][2].value, 0);
    }

    #[test]
    fn test_erase_clears_notes_first() {
        let mut state = make_empty_state();
        state.grid.cells[3][3].notes = vec![1, 3, 5];
        state = reduce(state, Action::SelectCell { row: 3, col: 3 }, &mut History::new());
        let mut history = History::new();
        let state = reduce(state, Action::Erase, &mut history);
        assert!(state.grid.cells[3][3].notes.is_empty());
        assert_eq!(state.grid.cells[3][3].value, 0); // value was already 0
    }

    #[test]
    fn test_update_settings_preserves_grid() {
        let state = make_empty_state();
        let mut history = History::new();
        let new_settings = GameSettings {
            show_timer: false,
            show_hints: false,
            highlight_areas: false,
            highlight_numbers: true,
        };
        let state = reduce(
            state,
            Action::UpdateGameSettings {
                settings: new_settings.clone(),
            },
            &mut history,
        );
        assert!(!state.settings.show_timer);
        assert!(state.settings.highlight_numbers);
    }
}
