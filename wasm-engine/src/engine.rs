use crate::generator::{dig_holes, fill_board, seed_from_date};
use crate::highlight::compute as compute_highlights;
use crate::hint_engine::find_hint;
use crate::hint_engine::{auto_notes, clear_notes};
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
        Action::AutoNotes => handle_auto_notes(state, history),
        Action::ClearNotes => handle_clear_notes(state, history),
        Action::ApplyHint => handle_apply_hint(state, history),
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

    // NOTE: No longer auto-apply SolverFallback — all strategies only compute,
    // never modify the board. Use ApplyHint action to apply.
    if let Some(ref hint) = state.hint {
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

fn handle_auto_notes(mut state: GameState, history: &mut History) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    push_undo(history, &state.grid);
    state.grid = auto_notes(&state.grid);
    // Recompute highlights
    let highlights = compute_highlights(&state.grid, &state.settings, &[]);
    state.grid.highlights = highlights;
    state
}

fn handle_clear_notes(mut state: GameState, history: &mut History) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    push_undo(history, &state.grid);
    state.grid = clear_notes(&state.grid);
    let highlights = compute_highlights(&state.grid, &state.settings, &[]);
    state.grid.highlights = highlights;
    state
}

fn handle_apply_hint(mut state: GameState, history: &mut History) -> GameState {
    if state.game_status != GameStatus::Playing {
        return state;
    }
    let hint = match state.hint.take() {
        Some(h) => h,
        None => return state,
    };

    match hint.strategy {
        // ── Fill-type strategies: place value on target cell ──
        StrategyType::NakedSingle
        | StrategyType::HiddenSingle
        | StrategyType::SolverFallback => {
            push_undo(history, &state.grid);

            let t = &hint.target;
            let row = t.row as usize;
            let col = t.col as usize;

            // Same flow as handle_input_number (conflict check, error count, smart-erase notes)
            state.grid.cells[row][col].value = hint.value;
            state.grid.cells[row][col].notes.clear();

            // Clear previous errors
            for r in 0..9usize {
                for c in 0..9usize {
                    state.grid.cells[r][c].is_error = false;
                }
            }

            let conflicts = conflict_check(&state.grid, t.row, t.col, hint.value);
            if !conflicts.is_empty() {
                for pos in &conflicts {
                    state.grid.cells[pos.row as usize][pos.col as usize].is_error = true;
                }
                state.grid.cells[row][col].is_error = true;
                state.error_count += 1;
            }

            smart_erase_notes(&mut state.grid.cells, row, col, hint.value);

            let highlights = compute_highlights(&state.grid, &state.settings, &[]);
            state.grid.highlights = highlights;

            state.game_status = check_game_status(
                &state.grid, &state.solution, state.error_count, state.max_errors,
            );
        }

        // ── Elimination-type strategies: remove candidates from related_cells ──
        StrategyType::NakedPair
        | StrategyType::HiddenPair
        | StrategyType::Pointing
        | StrategyType::BoxLineReduction
        | StrategyType::XWing => {
            push_undo(history, &state.grid);
            let eliminated = &hint.eliminated;
            for pos in &hint.related_cells {
                let cell = &mut state.grid.cells[pos.row as usize][pos.col as usize];
                cell.notes.retain(|n| !eliminated.contains(n));
            }

            let highlights = compute_highlights(&state.grid, &state.settings, &[]);
            state.grid.highlights = highlights;
        }
    }

    // hint is already cleared via .take() above
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

    // ── End-to-end gameplay simulation tests ──────────────────────────────

    /// Simulate clicking cells and entering numbers on a real game.
    #[test]
    fn test_e2e_create_game_and_play_moves() {
        let state = create_game(Difficulty::Easy, 42);
        let mut history = History::new();

        // Game should start in Playing state with a valid puzzle
        assert_eq!(state.game_status, GameStatus::Playing);
        assert_eq!(state.error_count, 0);

        // Find first empty cell
        let first_empty = find_empty_cell(&state.grid);
        assert!(first_empty.is_some(), "Should have at least one empty cell");
        let (er, ec) = first_empty.unwrap();

        // Click the empty cell (selectCell action)
        let state = reduce(state, Action::SelectCell { row: er, col: ec }, &mut history);
        assert_eq!(state.grid.selected, Some(Pos { row: er, col: ec }));
        // Selected cell should be highlighted
        assert!(!state.grid.highlights.related_area.is_empty(),
            "Selecting a cell should highlight related area");

        // Enter the correct number
        let correct_value = state.solution[er as usize][ec as usize];
        let state = reduce(state, Action::InputNumber { value: correct_value }, &mut history);
        assert_eq!(state.grid.cells[er as usize][ec as usize].value, correct_value);
        // No errors since we entered the correct number
        assert_eq!(state.error_count, 0);
        assert!(!state.grid.cells[er as usize][ec as usize].is_error);

        // Verify undo works
        let state = reduce(state, Action::Undo, &mut history);
        assert_eq!(state.grid.cells[er as usize][ec as usize].value, 0,
            "Undo should clear the cell");

        // Verify redo restores
        let state = reduce(state, Action::Redo, &mut history);
        assert_eq!(state.grid.cells[er as usize][ec as usize].value, correct_value,
            "Redo should restore the value");
    }

    #[test]
    fn test_e2e_note_mode_flow() {
        let state = create_game(Difficulty::Easy, 123);
        let mut history = History::new();

        // Find an empty cell
        let (er, ec) = find_empty_cell(&state.grid).unwrap();

        // Select and add notes
        let state = reduce(state, Action::SelectCell { row: er, col: ec }, &mut history);
        let state = reduce(state, Action::ToggleNote { value: 1 }, &mut history);
        let state = reduce(state, Action::ToggleNote { value: 3 }, &mut history);
        let state = reduce(state, Action::ToggleNote { value: 5 }, &mut history);

        let cell = &state.grid.cells[er as usize][ec as usize];
        assert!(cell.notes.contains(&1));
        assert!(cell.notes.contains(&3));
        assert!(cell.notes.contains(&5));
        assert_eq!(cell.value, 0, "Notes should not change cell value");

        // Toggle note off
        let state = reduce(state, Action::ToggleNote { value: 3 }, &mut history);
        let cell = &state.grid.cells[er as usize][ec as usize];
        assert!(!cell.notes.contains(&3));
        assert!(cell.notes.contains(&1));

        // Verify undo restores note
        let state = reduce(state, Action::Undo, &mut history);
        let cell = &state.grid.cells[er as usize][ec as usize];
        assert!(cell.notes.contains(&3), "Undo should restore toggled note");
    }

    #[test]
    fn test_e2e_error_count_and_lost() {
        let state = create_game(Difficulty::Easy, 999);
        let mut history = History::new();

        // Find an empty cell
        let (er, ec) = find_empty_cell(&state.grid).unwrap();
        let correct = state.solution[er as usize][ec as usize];

        // Pick a wrong number that ACTUALLY conflicts (exists in same row/col/box)
        let wrong: u8 = find_conflicting_number(&state.grid, er as usize, ec as usize, correct);

        // First wrong input — should trigger conflict and increment error_count
        let state = reduce(state, Action::SelectCell { row: er, col: ec }, &mut history);
        let state = reduce(state, Action::InputNumber { value: wrong }, &mut history);
        assert_eq!(state.error_count, 1);
        assert!(state.grid.cells[er as usize][ec as usize].is_error,
            "Wrong number should mark cell as error");

        // Enter correct number to fix
        let state = reduce(state, Action::InputNumber { value: correct }, &mut history);
        assert!(!state.grid.cells[er as usize][ec as usize].is_error,
            "Correct number should clear error flag");

        // Now intentionally lose: make 3 conflicting moves on different cells
        let mut lost_state = create_game(Difficulty::Easy, 999);
        let mut lost_history = History::new();

        let empties: Vec<(u8, u8)> = find_all_empties(&lost_state.grid);
        let mut errors_made = 0;
        for i in 0..empties.len() {
            if errors_made >= 3 { break; }
            let (r, c) = empties[i];
            let correct_val = lost_state.solution[r as usize][c as usize];
            let wrong_val = find_conflicting_number(&lost_state.grid, r as usize, c as usize, correct_val);
            lost_state = reduce(lost_state, Action::SelectCell { row: r, col: c }, &mut lost_history);
            lost_state = reduce(lost_state, Action::InputNumber { value: wrong_val }, &mut lost_history);
            errors_made += 1;
        }
        assert_eq!(lost_state.error_count, 3);
        assert_eq!(lost_state.game_status, GameStatus::Lost,
            "3 errors on a max_errors=3 game should result in Lost");
    }

    #[test]
    fn test_e2e_hint_system() {
        let state = create_game(Difficulty::Easy, 777);
        let mut history = History::new();

        // Request a hint
        let state = reduce(state, Action::GetHint, &mut history);
        assert!(state.hint.is_some(), "Should return a hint");
        let hint = state.hint.clone().unwrap();
        assert!(hint.value >= 1 && hint.value <= 9, "Hint value should be 1-9");
        assert!(!hint.message_cn.is_empty(), "Hint should have Chinese explanation");

        // Verify GetHint does NOT modify the board (SolverFallback no longer auto-fills)
        let target_cell = &state.grid.cells[hint.target.row as usize][hint.target.col as usize];
        assert_eq!(target_cell.value, 0,
            "GetHint should not modify the board — cell should still be empty");

        // Apply the hint explicitly
        let state = reduce(state, Action::ApplyHint, &mut history);
        let target_cell = &state.grid.cells[hint.target.row as usize][hint.target.col as usize];
        assert_eq!(target_cell.value, hint.value,
            "ApplyHint should fill the target cell with the hint value");

        // After ApplyHint, hint should be consumed
        assert!(state.hint.is_none(), "ApplyHint should clear the hint");
    }

    #[test]
    fn test_e2e_auto_notes_fills_candidates() {
        let state = create_game(Difficulty::Easy, 42);
        let mut history = History::new();

        // Find an empty cell and verify it has no notes initially
        let (er, ec) = find_empty_cell(&state.grid).unwrap();
        assert!(state.grid.cells[er as usize][ec as usize].notes.is_empty());

        // Dispatch AutoNotes
        let state = reduce(state, Action::AutoNotes, &mut history);

        // The empty cell should now have candidates computed
        let cell = &state.grid.cells[er as usize][ec as usize];
        assert!(!cell.notes.is_empty(), "AutoNotes should fill candidates for empty cells");

        // All notes should be valid candidates (1-9, no duplicates)
        for &n in &cell.notes {
            assert!(n >= 1 && n <= 9, "Note value {} out of range", n);
        }
        let mut sorted = cell.notes.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(cell.notes.len(), sorted.len(), "Notes should not contain duplicates");

        // A given cell should not have been affected
        let mut found_given = None;
        for r in 0..9u8 {
            for c in 0..9u8 {
                if state.grid.cells[r as usize][c as usize].is_given {
                    found_given = Some((r, c));
                    break;
                }
            }
            if found_given.is_some() { break; }
        }
        if let Some((gr, gc)) = found_given {
            assert!(state.grid.cells[gr as usize][gc as usize].notes.is_empty(),
                "Given cells should not get notes");
        }
    }

    #[test]
    fn test_e2e_clear_notes_removes_all_notes() {
        let state = create_game(Difficulty::Easy, 42);
        let mut history = History::new();

        // First populate notes via AutoNotes
        let state = reduce(state, Action::AutoNotes, &mut history);

        // Verify at least some cells have notes
        let has_notes = state.grid.cells.iter().flatten().any(|c| !c.notes.is_empty());
        assert!(has_notes, "AutoNotes should produce some notes");

        // Clear notes
        let state = reduce(state, Action::ClearNotes, &mut history);

        // All cells should have empty notes
        for r in 0..9 {
            for c in 0..9 {
                assert!(state.grid.cells[r][c].notes.is_empty(),
                    "Cell ({},{}) still has notes after ClearNotes", r, c);
            }
        }

        // Existing values should be preserved
        for r in 0..9 {
            for c in 0..9 {
                if state.grid.cells[r][c].is_given {
                    assert_ne!(state.grid.cells[r][c].value, 0,
                        "Given cell values preserved");
                }
            }
        }
    }

    #[test]
    fn test_e2e_apply_hint_fill_type() {
        // Create a grid where we can get a NakedSingle hint
        let mut values = [[0u8; 9]; 9];
        // Fill row 0 with 1-8 leaving col 8 for NakedSingle = 9
        for c in 0..8 {
            values[0][c] = (c + 1) as u8;
        }
        values[1][0] = 9; // block the box

        let cells = core::array::from_fn::<_, 9, _>(|r| {
            core::array::from_fn(|c| {
                let v = values[r][c];
                if v != 0 {
                    Cell { value: v, notes: vec![], is_given: true, is_error: false }
                } else {
                    Cell { value: 0, notes: vec![], is_given: false, is_error: false }
                }
            })
        });

        let grid = Grid {
            cells,
            selected: Some(Pos { row: 0, col: 8 }),
            selected_number: None,
            highlights: Highlights::empty(),
        };

        let state = GameState {
            grid,
            difficulty: Difficulty::Easy,
            solution: [[0u8; 9]; 9],
            error_count: 0,
            max_errors: 3,
            game_status: GameStatus::Playing,
            elapsed_seconds: 0,
            settings: GameSettings::default(),
            hint: None,
        };

        let mut history = History::new();

        // Get hint — should be NakedSingle
        let state = reduce(state, Action::GetHint, &mut history);
        assert!(state.hint.is_some());
        assert_eq!(state.hint.as_ref().unwrap().strategy, StrategyType::NakedSingle);

        // Board should NOT be modified yet
        assert_eq!(state.grid.cells[0][8].value, 0);

        // Apply the hint
        let state = reduce(state, Action::ApplyHint, &mut history);
        assert_eq!(state.grid.cells[0][8].value, 9,
            "ApplyHint should fill NakedSingle target");
        assert!(state.hint.is_none(), "Hint consumed after ApplyHint");
    }

    #[test]
    fn test_e2e_apply_hint_elimination_type() {
        let state = create_game(Difficulty::Easy, 42);
        let mut history = History::new();

        // Populate notes via AutoNotes
        let state = reduce(state, Action::AutoNotes, &mut history);

        // Get a hint
        let state = reduce(state, Action::GetHint, &mut history);
        assert!(state.hint.is_some(), "Should have a hint");

        let hint = state.hint.clone().unwrap();
        let strategy = hint.strategy;

        // If this is an elimination-type hint, verify ApplyHint removes candidates
        match strategy {
            StrategyType::NakedPair | StrategyType::HiddenPair
            | StrategyType::Pointing | StrategyType::BoxLineReduction
            | StrategyType::XWing => {
                // Record eliminated candidates in related cells before applying
                let before: Vec<(usize, usize, Vec<u8>)> = hint.related_cells.iter().map(|p| {
                    let cell = &state.grid.cells[p.row as usize][p.col as usize];
                    (p.row as usize, p.col as usize, cell.notes.clone())
                }).collect();

                let state = reduce(state, Action::ApplyHint, &mut history);

                // After applying, the eliminated candidates should be removed
                for (r, c, _) in &before {
                    let cell = &state.grid.cells[*r][*c];
                    for &elim in &hint.eliminated {
                        assert!(!cell.notes.contains(&elim),
                            "Cell ({},{}) should have eliminated {} after ApplyHint",
                            r, c, elim);
                    }
                }

                assert!(state.hint.is_none(), "Hint consumed after ApplyHint");
            }
            _ => {
                // Fill-type — just verify hint is consumed
                let state = reduce(state, Action::ApplyHint, &mut history);
                assert!(state.hint.is_none(), "Hint consumed after ApplyHint");
            }
        }
    }

    #[test]
    fn test_apply_hint_without_get_hint_is_noop() {
        let state = create_game(Difficulty::Easy, 42);
        let mut history = History::new();

        assert!(state.hint.is_none(), "Fresh game should have no hint");
        let state = reduce(state, Action::ApplyHint, &mut history);
        assert!(state.hint.is_none(), "ApplyHint with no hint should be no-op");
    }

    #[test]
    fn test_e2e_smart_erase_notes() {
        let state = create_game(Difficulty::Easy, 555);
        let mut history = History::new();

        // Find empty cell, add notes, then enter correct number
        let (er, ec) = find_empty_cell(&state.grid).unwrap();
        let correct = state.solution[er as usize][ec as usize];

        // Add notes to a cell in same row (different column)
        let other_col = if ec == 0 { 1 } else { 0 };
        // Make sure the other cell is empty too
        if state.grid.cells[er as usize][other_col as usize].is_given
            || state.grid.cells[er as usize][other_col as usize].value != 0 {
            // Just add note to the selected cell itself as a smoke test
            let state = reduce(state, Action::SelectCell { row: er, col: ec }, &mut history);
            let state = reduce(state, Action::ToggleNote { value: correct }, &mut history);
            assert!(state.grid.cells[er as usize][ec as usize].notes.contains(&correct));
            // Enter the correct value - should clear its own notes
            let state = reduce(state, Action::InputNumber { value: correct }, &mut history);
            let cell = &state.grid.cells[er as usize][ec as usize];
            assert!(cell.notes.is_empty(), "Notes should be cleared when value is entered");
            assert_eq!(cell.value, correct);
        }
    }

    #[test]
    fn test_e2e_daily_challenge_deterministic() {
        let state1 = create_daily("2026-07-12");
        let state2 = create_daily("2026-07-12");

        // Same date should produce identical puzzle
        assert_eq!(state1.grid.cells, state2.grid.cells);
        assert_eq!(state1.solution, state2.solution);

        // Different date should produce different puzzle
        let state3 = create_daily("2026-07-13");
        assert_ne!(state1.grid.cells, state3.grid.cells);
    }

    #[test]
    fn test_e2e_complete_game_won() {
        // Use a seed for deterministic puzzle
        let mut state = create_game(Difficulty::Easy, 12345);
        let mut history = History::new();

        // Fill in ALL empty cells with correct answers
        for r in 0..9u8 {
            for c in 0..9u8 {
                if state.grid.cells[r as usize][c as usize].value == 0
                    && !state.grid.cells[r as usize][c as usize].is_given
                {
                    let correct = state.solution[r as usize][c as usize];
                    state = reduce(state, Action::SelectCell { row: r, col: c }, &mut history);
                    state = reduce(state, Action::InputNumber { value: correct }, &mut history);
                    // Should not have lost during correct play
                    assert_ne!(state.game_status, GameStatus::Lost,
                        "Should not lose when entering correct answers");
                }
            }
        }
        // Should have won
        assert_eq!(state.game_status, GameStatus::Won,
            "Filling all cells correctly should win the game");
        assert_eq!(state.error_count, 0);

        // Actions after winning should be no-ops
        let before = state.grid.cells[0][0].value;
        let state = reduce(state, Action::Erase, &mut history);
        assert_eq!(state.grid.cells[0][0].value, before,
            "Erase should be no-op after winning");
    }

    #[test]
    fn test_e2e_highlight_updates_on_selection() {
        let state = create_game(Difficulty::Easy, 111);
        let mut history = History::new();

        // Find a given cell first
        let mut found: Option<(u8, u8, u8)> = None;
        for r in 0..9u8 {
            for c in 0..9u8 {
                let cell = &state.grid.cells[r as usize][c as usize];
                if cell.is_given && cell.value != 0 {
                    found = Some((r, c, cell.value));
                    break;
                }
            }
            if found.is_some() { break; }
        }
        let (r, c, value) = found.expect("Grid should have at least one given cell");

        let state = reduce(state, Action::SelectCell { row: r, col: c }, &mut history);
        // selected_number should match the given value
        assert_eq!(state.grid.selected_number, Some(value));
        // related_area should be non-empty (row + col + box highlights)
        assert!(!state.grid.highlights.related_area.is_empty(),
            "Selecting a given cell should highlight related area");
    }

    #[test]
    fn test_e2e_set_final_time() {
        let state = create_game(Difficulty::Easy, 42);
        let mut history = History::new();
        assert_eq!(state.elapsed_seconds, 0);

        let state = reduce(state, Action::SetFinalTime { seconds: 125 }, &mut history);
        assert_eq!(state.elapsed_seconds, 125);

        let state = reduce(state, Action::SetFinalTime { seconds: 300 }, &mut history);
        assert_eq!(state.elapsed_seconds, 300);
    }

    /// Helper: find first empty (non-given, value=0) cell in the grid.
    fn find_empty_cell(grid: &Grid) -> Option<(u8, u8)> {
        for r in 0..9u8 {
            for c in 0..9u8 {
                let cell = &grid.cells[r as usize][c as usize];
                if !cell.is_given && cell.value == 0 {
                    return Some((r, c));
                }
            }
        }
        None
    }

    /// Helper: find a number that conflicts with an existing cell in the same row/col/box.
    /// Returns a number 1-9 that is NOT the correct answer but DOES exist in the same unit.
    fn find_conflicting_number(grid: &Grid, row: usize, col: usize, correct: u8) -> u8 {
        // Look for any number in the same row, column, or box that is not the correct answer
        for num in 1..=9u8 {
            if num == correct { continue; }
            // Check row
            for c in 0..9usize {
                if grid.cells[row][c].value == num { return num; }
            }
            // Check column
            for r in 0..9usize {
                if grid.cells[r][col].value == num { return num; }
            }
            // Check box
            let br = (row / 3) * 3;
            let bc = (col / 3) * 3;
            for r in br..br + 3 {
                for c in bc..bc + 3 {
                    if grid.cells[r][c].value == num { return num; }
                }
            }
        }
        // Fallback: pick any number not equal to correct
        if correct == 1 { 2 } else { 1 }
    }

    /// Helper: find all empty cells in the grid.
    fn find_all_empties(grid: &Grid) -> Vec<(u8, u8)> {
        let mut result = Vec::new();
        for r in 0..9u8 {
            for c in 0..9u8 {
                let cell = &grid.cells[r as usize][c as usize];
                if !cell.is_given && cell.value == 0 {
                    result.push((r, c));
                }
            }
        }
        result
    }
}
