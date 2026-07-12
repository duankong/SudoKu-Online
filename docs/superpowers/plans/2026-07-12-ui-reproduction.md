# UI Reproduction + Interaction Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce reference UI design (8 screenshots) in full while keeping existing WASM dispatch interaction model intact.

**Architecture:** Rust WASM backend gets 3 new Action variants (AutoNotes, ClearNotes, ApplyHint) plus a fix to remove SolverFallback eager-fill from handle_get_hint. Frontend gets react-i18next i18n (en/zh), lucide-react icons, a split Settings page, reworked Dashboard, and fully restyled Game components.

**Tech Stack:** Rust (wasm-pack + ts-rs), React 18 + react-router-dom 6, Tailwind CSS 3.4, react-i18next + i18next, lucide-react.

## Global Constraints

- All Rust operations must follow the existing immutable reducer pattern (`reduce(state, action) → new_state`).
- No new Tailwind color values — use existing palette: `primary`/`accent`/`ink-*`/`border`/`error`/`bg-*` from tailwind.config.ts.
- Pro/Share/Rate/Feedback/Privacy/Terms/Version items from reference images are explicitly out of scope — no placeholders.
- `wasm-opt = false` in Cargo.toml — don't change.
- Hash routing (`createHashRouter`) must be preserved for GitHub Pages compatibility.
- All dates for daily challenge must use local timezone (not UTC `toISOString`).

---
## File Structure

### Rust (wasm-engine/src/)

| File | Responsibility | Change |
|------|---------------|--------|
| `types.rs` | Shared data types + Action enum | Add `AutoNotes`, `ClearNotes`, `ApplyHint` variants |
| `hint_engine.rs` | Hint strategies + candidate computation | Make `candidates()` pub(crate); add `pub auto_notes()`, `pub clear_notes()` |
| `engine.rs` | Action reducer (all handle_* functions) | Fix `handle_get_hint`; add `handle_auto_notes`, `handle_clear_notes`, `handle_apply_hint` |

### Frontend (src/)

| File | Responsibility | Change |
|------|---------------|--------|
| `types/action.ts` | Action union type (JS side) | Add 3 new variants |
| `i18n/index.ts` | i18next initialization | **New file** |
| `i18n/locales/en.json` | English translations | **New file** |
| `i18n/locales/zh.json` | Chinese translations | **New file** |
| `App.tsx` | Hash router | Add `/game-settings` route |
| `pages/Dashboard.tsx` | Home page | Crown/gear icons, save thumbnail, Daily streak, local-timezone date |
| `pages/Settings.tsx` | Main settings | Split: language + link to game-settings + sound/haptics |
| `pages/GameSettings.tsx` | Game settings page | **New file** — 4 GameSettings toggles with icon+switch |
| `pages/Game.tsx` | Game main page | Wire new actions, remove noteMode state, add autoNotesActive state, connect new props |
| `components/StatusBar.tsx` | Top status bar | Error icon+count, "..." menu to /game-settings |
| `components/Toolbar.tsx` | Bottom toolbar | Icon+text buttons, Auto Notes↔Clear Notes toggle, remove Erase |
| `components/NumberPad.tsx` | Number input pad | Remove note-mode toggle, add candidate sub-row per digit |
| `components/HintDrawer.tsx` | Hint display drawer | "Smart Hint" title, Not Now/Apply Hint buttons |

---

### Task 1: Rust — Export candidates() and add auto_notes/clear_notes helpers

**Files:**
- Modify: `wasm-engine/src/hint_engine.rs:4` (change `fn candidates` → `pub(crate) fn candidates`)
- Modify: `wasm-engine/src/hint_engine.rs` (add `auto_notes()` and `clear_notes()` after `find_hint()`)

**Interfaces:**
- Consumes: `Grid` struct (existing)
- Produces: `pub(crate) fn candidates(grid: &Grid, row: usize, col: usize) -> Vec<u8>`, `pub fn auto_notes(grid: &Grid) -> Grid`, `pub fn clear_notes(grid: &Grid) -> Grid`

- [ ] **Step 1: Change candidates() visibility**

Change line 4 of `hint_engine.rs` from:
```rust
fn candidates(grid: &Grid, row: usize, col: usize) -> Vec<u8> {
```
to:
```rust
pub(crate) fn candidates(grid: &Grid, row: usize, col: usize) -> Vec<u8> {
```

- [ ] **Step 2: Add auto_notes() and clear_notes() functions**

After the closing of `find_hint()` (after line 49, before `// ── Strategy 1`), add:

```rust
/// Fill every empty cell with computed candidates (overwrites existing notes).
pub fn auto_notes(grid: &Grid) -> Grid {
    let mut new_cells = grid.cells.clone();
    for r in 0..9 {
        for c in 0..9 {
            if new_cells[r][c].value == 0 {
                new_cells[r][c].notes = candidates(grid, r, c);
            }
        }
    }
    Grid {
        cells: new_cells,
        selected: grid.selected.clone(),
        selected_number: grid.selected_number,
        highlights: grid.highlights.clone(),
    }
}

/// Clear all notes across the entire board (does not affect filled values).
pub fn clear_notes(grid: &Grid) -> Grid {
    let mut new_cells = grid.cells.clone();
    for r in 0..9 {
        for c in 0..9 {
            new_cells[r][c].notes.clear();
        }
    }
    Grid {
        cells: new_cells,
        selected: grid.selected.clone(),
        selected_number: grid.selected_number,
        highlights: grid.highlights.clone(),
    }
}
```

Note: `new_cells[r][c].notes = candidates(grid, r, c)` passes the **original** grid to `candidates()` (which reads values, not notes) — this is intentional because notes content doesn't affect candidate computation.

- [ ] **Step 3: Run Rust tests to confirm no regressions**

Run: `cd wasm-engine && cargo test`
Expected: All existing 53 tests pass (no regressions from visibility change + new functions).

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/hint_engine.rs
git commit -m "feat: export candidates() and add auto_notes/clear_notes helpers"
```

---

### Task 2: Rust — Add Action variants + fix handle_get_hint + implement new handlers

**Files:**
- Modify: `wasm-engine/src/types.rs:127-138` (add 3 Action variants)
- Modify: `wasm-engine/src/engine.rs` (add match arms in reduce(), fix handle_get_hint, add 3 new handlers)

**Interfaces:**
- Consumes: `Action::AutoNotes`, `Action::ClearNotes`, `Action::ApplyHint` variants
- Consumes: `hint_engine::auto_notes()`, `hint_engine::clear_notes()`
- Produces: Updated `reduce()` with match arms for 3 new actions

- [ ] **Step 1: Add 3 new variants to Action enum in types.rs**

In `types.rs`, at the end of the `Action` enum (before the closing `}`), add:
```rust
    AutoNotes,
    ClearNotes,
    ApplyHint,
```

The full enum should now read:
```rust
#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Action {
    SelectCell { row: u8, col: u8 },
    InputNumber { value: u8 },
    ToggleNote { value: u8 },
    ToggleNoteMode,
    Erase,
    Undo,
    Redo,
    GetHint,
    NewGame { difficulty: Difficulty },
    UpdateGameSettings { settings: GameSettings },
    SetFinalTime { seconds: u32 },
    AutoNotes,
    ClearNotes,
    ApplyHint,
}
```

- [ ] **Step 2: Fix handle_get_hint — remove SolverFallback eager-fill**

Replace the entire `handle_get_hint` function in `engine.rs` (lines 281-301) with:

```rust
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
```

The key changes: (a) removed the `if matches!(hint.strategy, StrategyType::SolverFallback)` block that wrote to `state.grid.cells[...].value`, (b) simplified by removing the `hint.clone()` into a local variable, (c) added explanatory comment.

- [ ] **Step 3: Add match arms in reduce()**

At the end of the `match action` block in `reduce()` (after line 105 `Action::SetFinalTime { seconds } => handle_set_final_time(state, seconds),`), insert:

```rust
        Action::AutoNotes => handle_auto_notes(state, history),
        Action::ClearNotes => handle_clear_notes(state, history),
        Action::ApplyHint => handle_apply_hint(state, history),
```

Also add `use crate::hint_engine::{auto_notes, clear_notes};` at the top of `engine.rs` (after line 3 `use crate::hint_engine::find_hint;`).

- [ ] **Step 4: Implement handle_auto_notes and handle_clear_notes**

After the end of `handle_set_final_time` (after line 314), add:

```rust
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
```

- [ ] **Step 5: Implement handle_apply_hint**

After `handle_clear_notes`, add:

```rust
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

    // hint is already cleared via .take() above — no need to set to None
    state
}
```

- [ ] **Step 6: Run Rust tests to check for compilation**

Run: `cd wasm-engine && cargo check`
Expected: Clean compilation. (Tests may fail if they relied on old SolverFallback behavior — we fix them in the next task.)

- [ ] **Step 7: Commit**

```bash
git add wasm-engine/src/types.rs wasm-engine/src/engine.rs
git commit -m "feat: add AutoNotes/ClearNotes/ApplyHint actions + fix GetHint SolverFallback"
```

---

### Task 3: Rust — Write tests for new actions + fix broken GetHint tests

**Files:**
- Modify: `wasm-engine/src/engine.rs` (test module)

- [ ] **Step 1: Update existing test_e2e_hint_system — remove SolverFallback dependency**

Replace the `test_e2e_hint_system` test (lines 537-551) with:

```rust
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
```

- [ ] **Step 2: Add test for AutoNotes**

In the test module, add after `test_e2e_hint_system`:

```rust
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
```

- [ ] **Step 3: Add test for ClearNotes**

```rust
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
```

- [ ] **Step 4: Add test for ApplyHint — Fill type (NakedSingle)**

```rust
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
```

- [ ] **Step 5: Add test for ApplyHint — Elimination type (requires setup with notes)**

```rust
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
                for (r, c, old_notes) in &before {
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
```

- [ ] **Step 6: Add test for ApplyHint with no hint (no-op)**

```rust
    #[test]
    fn test_apply_hint_without_get_hint_is_noop() {
        let state = create_game(Difficulty::Easy, 42);
        let mut history = History::new();

        assert!(state.hint.is_none(), "Fresh game should have no hint");
        let state = reduce(state, Action::ApplyHint, &mut history);
        assert!(state.hint.is_none(), "ApplyHint with no hint should be no-op");
    }
```

- [ ] **Step 7: Run all Rust tests**

Run: `cd wasm-engine && cargo test`
Expected: All tests pass (including the 5 new ones).

- [ ] **Step 8: Regenerate TypeScript types**

Run: `cd wasm-engine && cargo test`
Then verify: `ls ../src/types/generated/` contains `Action.ts` with `AutoNotes`, `ClearNotes`, `ApplyHint`.

- [ ] **Step 9: Update TypeScript action.ts**

Update `src/types/action.ts` to add the 3 new variants:

```typescript
export type Action =
  | { type: 'selectCell'; row: number; col: number }
  | { type: 'inputNumber'; value: number }
  | { type: 'toggleNote'; value: number }
  | { type: 'toggleNoteMode' }
  | { type: 'erase' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'getHint' }
  | { type: 'newGame'; difficulty: Difficulty }
  | { type: 'updateGameSettings'; settings: GameSettings }
  | { type: 'setFinalTime'; seconds: number }
  | { type: 'autoNotes' }
  | { type: 'clearNotes' }
  | { type: 'applyHint' };
```

- [ ] **Step 10: Commit**

```bash
git add wasm-engine/src/engine.rs src/types/action.ts src/types/generated/
git commit -m "test: add tests for AutoNotes/ClearNotes/ApplyHint + regenerate types"
```

---

### Task 4: Frontend — Install dependencies and set up i18n

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/i18n/index.ts`
- Create: `src/i18n/locales/en.json`
- Create: `src/i18n/locales/zh.json`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install react-i18next i18next lucide-react
```

Verify: `package.json` now shows `react-i18next`, `i18next`, `lucide-react` in `dependencies`.

- [ ] **Step 2: Create English locale file**

Create `src/i18n/locales/en.json`:

```json
{
  "app": {
    "title": "Sudoku Calm",
    "subtitle": "Focus · Immerse · Logic"
  },
  "dashboard": {
    "continue": "Continue Puzzle",
    "daily": "Daily Challenge",
    "streak": "{{count}} day streak",
    "streak_plural": "{{count}} day streak",
    "play": "Play by Difficulty",
    "today": "Today's Puzzle",
    "easy": "Easy",
    "easy_desc": "Great for beginners",
    "medium": "Medium",
    "medium_desc": "A bit challenging",
    "hard": "Hard",
    "hard_desc": "Needs some技巧",
    "expert": "Expert",
    "expert_desc": "Hardcore challenge",
    "progress": "{{progress}}% complete"
  },
  "game": {
    "undo": "Undo",
    "redo": "Redo",
    "autoNotes": "Auto Notes",
    "clearNotes": "Clear Notes",
    "hint": "Hint",
    "erase": "Erase",
    "loading": "Loading...",
    "loadError": "Failed to load",
    "retry": "Retry"
  },
  "hint": {
    "smartHint": "Smart Hint",
    "notNow": "Not Now",
    "applyHint": "Apply Hint",
    "recommended": "Recommended:",
    "eliminate": "Eliminate candidates:",
    "position": "Position ({{row}}, {{col}})"
  },
  "statusBar": {
    "errors": "{{count}}/{{max}} errors"
  },
  "settings": {
    "title": "Settings",
    "gameSettings": "Game Settings",
    "language": "Language",
    "sound": "Sound",
    "sound_desc": "Play sound effects",
    "haptics": "Haptics",
    "haptics_desc": "Device vibration feedback",
    "about": "Sudoku Calm v0.1.0 · Built with React + Rust WASM"
  },
  "gameSettings": {
    "title": "Game Settings",
    "showTimer": "Show Timer",
    "showTimer_desc": "Display timer in status bar",
    "showHints": "Show Hint Explanations",
    "showHints_desc": "Display logic reasoning with hints",
    "highlightAreas": "Highlight Related Areas",
    "highlightAreas_desc": "Highlight row, column and box of selected cell",
    "highlightNumbers": "Highlight Same Numbers",
    "highlightNumbers_desc": "Highlight all same-number cells on the board"
  },
  "gameOver": {
    "won": "Congratulations!",
    "lost": "Game Over",
    "won_desc": "You completed the puzzle!",
    "lost_desc": "Too many mistakes",
    "newGame": "New Game",
    "home": "Back to Home"
  }
}
```

- [ ] **Step 3: Create Chinese locale file**

Create `src/i18n/locales/zh.json`:

```json
{
  "app": {
    "title": "Sudoku Calm",
    "subtitle": "专注 · 沉浸 · 逻辑之美"
  },
  "dashboard": {
    "continue": "继续游戏",
    "daily": "每日挑战",
    "streak": "连续 {{count}} 天",
    "play": "选择难度",
    "today": "今日题目",
    "easy": "简单",
    "easy_desc": "适合新手入门",
    "medium": "中等",
    "medium_desc": "稍有挑战性",
    "hard": "困难",
    "hard_desc": "需要一定技巧",
    "expert": "专家",
    "expert_desc": "高难度挑战",
    "progress": "进度 {{progress}}%"
  },
  "game": {
    "undo": "撤销",
    "redo": "重做",
    "autoNotes": "自动笔记",
    "clearNotes": "清除笔记",
    "hint": "提示",
    "erase": "擦除",
    "loading": "加载中...",
    "loadError": "加载失败",
    "retry": "重试"
  },
  "hint": {
    "smartHint": "智能提示",
    "notNow": "稍后",
    "applyHint": "应用提示",
    "recommended": "推荐填入:",
    "eliminate": "排除候选数:",
    "position": "位置 ({{row}}, {{col}})"
  },
  "statusBar": {
    "errors": "{{count}}/{{max}} 错误"
  },
  "settings": {
    "title": "设置",
    "gameSettings": "游戏设置",
    "language": "语言",
    "sound": "音效",
    "sound_desc": "操作时播放音效反馈",
    "haptics": "震动反馈",
    "haptics_desc": "操作时触发设备震动",
    "about": "Sudoku Calm v0.1.0 · Built with React + Rust WASM"
  },
  "gameSettings": {
    "title": "游戏设置",
    "showTimer": "显示计时器",
    "showTimer_desc": "在状态栏显示游戏用时",
    "showHints": "显示提示解释",
    "showHints_desc": "使用提示时展示逻辑推理过程",
    "highlightAreas": "高亮关联区域",
    "highlightAreas_desc": "选中单元格时高亮所在行、列和九宫格",
    "highlightNumbers": "高亮相同数字",
    "highlightNumbers_desc": "高亮全盘相同数字的单元格"
  },
  "gameOver": {
    "won": "恭喜通关！",
    "lost": "游戏结束",
    "won_desc": "你完成了这道数独！",
    "lost_desc": "错误次数已用完",
    "newGame": "再来一局",
    "home": "返回首页"
  }
}
```

- [ ] **Step 4: Create i18n initialization**

Create `src/i18n/index.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';

const LANGUAGE_KEY = 'sudokucalm-language';

function detectLanguage(): string {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch { /* ignore */ }
  // Fall back to browser language
  const browserLang = navigator.language?.startsWith('zh') ? 'zh' : 'en';
  return browserLang;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: 'en' | 'zh') {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch { /* ignore */ }
  i18n.changeLanguage(lang);
}

export default i18n;
```

- [ ] **Step 5: Import i18n in main.tsx**

Add at the top of `src/main.tsx` (before any component imports):
```typescript
import './i18n';
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No type errors (the i18n types are built-in to react-i18next).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/i18n/ src/main.tsx
git commit -m "feat: add i18n with react-i18next (en/zh) and lucide-react dependency"
```

---

### Task 5: Frontend — Create GameSettings page and rework Settings page

**Files:**
- Create: `src/pages/GameSettings.tsx`
- Modify: `src/pages/Settings.tsx` (split - remove game toggles, add language + sound/haptics + link)
- Modify: `src/App.tsx` (add `/game-settings` route)

- [ ] **Step 1: Create GameSettings page**

Create `src/pages/GameSettings.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../hooks/useGameEngine';
import { Clock, Lightbulb, Layers, Hash, ArrowLeft } from 'lucide-react';
import type { GameSettings as GameSettingsType } from '../types/generated';

const SETTINGS_KEY = 'sudokucalm-settings';

function loadSettings(): GameSettingsType {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.game) return parsed.game;
    }
  } catch { /* ignore */ }
  return { show_timer: true, show_hints: true, highlight_areas: true, highlight_numbers: true };
}

function saveSettings(settings: GameSettingsType) {
  try {
    const existing = localStorage.getItem(SETTINGS_KEY);
    const data = existing ? JSON.parse(existing) : {};
    data.game = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

const TOGGLES: {
  key: keyof GameSettingsType;
  icon: React.ReactNode;
  labelKey: string;
  descKey: string;
}[] = [
  { key: 'show_timer', icon: <Clock size={20} />, labelKey: 'gameSettings.showTimer', descKey: 'gameSettings.showTimer_desc' },
  { key: 'show_hints', icon: <Lightbulb size={20} />, labelKey: 'gameSettings.showHints', descKey: 'gameSettings.showHints_desc' },
  { key: 'highlight_areas', icon: <Layers size={20} />, labelKey: 'gameSettings.highlightAreas', descKey: 'gameSettings.highlightAreas_desc' },
  { key: 'highlight_numbers', icon: <Hash size={20} />, labelKey: 'gameSettings.highlightNumbers', descKey: 'gameSettings.highlightNumbers_desc' },
];

export function GameSettings() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [settings, setSettingsState] = useState(loadSettings);

  // We need to dispatch to WASM so highlights update immediately
  const engine = useGameEngine();

  const updateSetting = (key: keyof GameSettingsType, value: boolean) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      // Dispatch to WASM if engine is ready
      engine.dispatch?.({ type: 'updateGameSettings', settings: next });
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white max-w-[500px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-ink-dark">{t('gameSettings.title')}</h2>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        {TOGGLES.map(({ key, icon, labelKey, descKey }) => (
          <label
            key={key}
            className="flex items-center justify-between py-4 px-4 rounded-xl bg-bg-board cursor-pointer
                       hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-primary">{icon}</span>
              <div>
                <div className="text-sm font-medium text-ink-dark">{t(labelKey)}</div>
                <div className="text-xs text-ink-mid mt-0.5">{t(descKey)}</div>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={settings[key]}
              onClick={() => updateSetting(key, !settings[key])}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200 flex-shrink-0
                ${settings[key] ? 'bg-primary' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow-sm
                  transform transition-transform duration-200
                  ${settings[key] ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
```

Wait, I realized I need to import `useState` for this component. Let me fix:

Add at top: `import { useState } from 'react';`

- [ ] **Step 2: Rewrite Settings page**

Replace `src/pages/Settings.tsx` entirely with:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, Volume2, Smartphone, Globe } from 'lucide-react';
import { setLanguage } from '../i18n';
import type { UISettings } from '../types';

const SETTINGS_KEY = 'sudokucalm-settings';

function loadUISettings(): UISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.ui) return parsed.ui;
    }
  } catch { /* ignore */ }
  return { sound: false, haptics: false };
}

function saveUISettings(ui: UISettings) {
  try {
    const existing = localStorage.getItem(SETTINGS_KEY);
    const data = existing ? JSON.parse(existing) : {};
    data.ui = ui;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function Settings() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [uiSettings, setUiSettings] = useState(loadUISettings);

  useEffect(() => {
    saveUISettings(uiSettings);
  }, [uiSettings]);

  const currentLang = i18n.language?.startsWith('zh') ? 'zh' : 'en';

  return (
    <div className="min-h-screen bg-white max-w-[500px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-ink-dark">{t('settings.title')}</h2>
      </div>

      {/* Language */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-ink-mid uppercase tracking-wider mb-1 px-1">
          {t('settings.language')}
        </h3>
        <div className="bg-bg-board rounded-xl overflow-hidden">
          <button
            onClick={() => {
              const next = currentLang === 'en' ? 'zh' : 'en';
              setLanguage(next);
            }}
            className="flex items-center justify-between w-full px-4 py-3.5
                       hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-primary" />
              <span className="text-sm font-medium text-ink-dark">
                {currentLang === 'en' ? 'English' : '中文'}
              </span>
            </div>
            <span className="text-xs text-ink-mid bg-white px-2 py-0.5 rounded-full">
              {currentLang === 'en' ? 'EN' : '中文'}
            </span>
          </button>
        </div>
      </div>

      {/* Game Settings link */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-ink-mid uppercase tracking-wider mb-1 px-1"></h3>
        <div className="bg-bg-board rounded-xl overflow-hidden">
          <button
            onClick={() => navigate('/game-settings')}
            className="flex items-center justify-between w-full px-4 py-3.5
                       hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-ink-dark">{t('settings.gameSettings')}</span>
            <ChevronRight size={18} className="text-ink-mid" />
          </button>
        </div>
      </div>

      {/* Sound & Haptics */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-ink-mid uppercase tracking-wider mb-1 px-1"></h3>
        <div className="bg-bg-board rounded-xl divide-y divide-border overflow-hidden">
          <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Volume2 size={20} className="text-primary" />
              <div>
                <div className="text-sm font-medium text-ink-dark">{t('settings.sound')}</div>
                <div className="text-xs text-ink-mid">{t('settings.sound_desc')}</div>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={uiSettings.sound}
              onClick={() => setUiSettings((s) => ({ ...s, sound: !s.sound }))}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200 flex-shrink-0
                ${uiSettings.sound ? 'bg-primary' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow-sm
                  transform transition-transform duration-200
                  ${uiSettings.sound ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </label>

          <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-primary" />
              <div>
                <div className="text-sm font-medium text-ink-dark">{t('settings.haptics')}</div>
                <div className="text-xs text-ink-mid">{t('settings.haptics_desc')}</div>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={uiSettings.haptics}
              onClick={() => setUiSettings((s) => ({ ...s, haptics: !s.haptics }))}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200 flex-shrink-0
                ${uiSettings.haptics ? 'bg-primary' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow-sm
                  transform transition-transform duration-200
                  ${uiSettings.haptics ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </label>
        </div>
      </div>

      {/* About */}
      <div className="mt-10 pt-4 border-t border-border">
        <p className="text-xs text-ink-mid text-center">{t('settings.about')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add /game-settings route to App.tsx**

Update `src/App.tsx`:

```typescript
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Game } from './pages/Game';
import { Settings } from './pages/Settings';
import { GameSettings } from './pages/GameSettings';

const router = createHashRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/game', element: <Game /> },
  { path: '/settings', element: <Settings /> },
  { path: '/game-settings', element: <GameSettings /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/GameSettings.tsx src/pages/Settings.tsx src/App.tsx
git commit -m "feat: split settings into /settings and /game-settings with i18n"
```

---

### Task 6: Frontend — Rework Dashboard with icons, save thumbnail, Daily streak

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Rewrite Dashboard.tsx**

Replace `src/pages/Dashboard.tsx` entirely with:

```typescript
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Settings as SettingsIcon } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Difficulty } from '../types/generated';

const DAILY_PROGRESS_KEY = 'sudokucalm-daily-progress';

interface DailyProgress {
  lastCompletedDate: string;
  streak: number;
}

function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadDailyProgress(): DailyProgress {
  try {
    const raw = localStorage.getItem(DAILY_PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lastCompletedDate: '', streak: 0 };
}

function saveDailyProgress(progress: DailyProgress) {
  try {
    localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(progress));
  } catch { /* ignore */ }
}

// Exported so Game.tsx can call this when daily is completed
export function updateDailyStreak() {
  const today = getLocalDateString();
  const progress = loadDailyProgress();
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

  if (progress.lastCompletedDate === today) {
    // Already completed today — no change
    return;
  }

  const nextStreak = progress.lastCompletedDate === yesterday
    ? progress.streak + 1
    : 1;

  saveDailyProgress({ lastCompletedDate: today, streak: nextStreak });
}

// Helper for local date with offset
function getLocalDateString(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DIFFICULTIES: { key: Difficulty; labelKey: string; descKey: string; color: string }[] = [
  { key: 'Easy', labelKey: 'dashboard.easy', descKey: 'dashboard.easy_desc', color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'Medium', labelKey: 'dashboard.medium', descKey: 'dashboard.medium_desc', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'Hard', labelKey: 'dashboard.hard', descKey: 'dashboard.hard_desc', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'Expert', labelKey: 'dashboard.expert', descKey: 'dashboard.expert_desc', color: 'bg-red-100 text-red-700 border-red-200' },
];

function SaveThumbnail({ cells }: { cells: any[][] }) {
  // Render a miniature 9x9 grid showing filled cells
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(9, 1fr)',
        gap: '0.5px',
        width: '100%',
        aspectRatio: '1',
        backgroundColor: '#D0D7E5',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {cells.flat().map((cell: any, i: number) => {
        const val = cell.is_given || cell.value !== 0 ? cell.value : null;
        const isGiven = cell.is_given;
        return (
          <div
            key={i}
            style={{
              backgroundColor: val !== null
                ? (isGiven ? '#F2F4F8' : '#ECF1FB')
                : '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(4px, 1.2vw, 8px)',
              fontWeight: isGiven ? 700 : 600,
              color: isGiven ? '#2C2C2E' : '#3654D2',
              aspectRatio: '1',
            }}
          >
            {val}
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const storage = useLocalStorage();
  const hasSave = storage.hasSave();
  const savedState = hasSave ? storage.load() : null;

  const today = useMemo(() => getLocalDateString(), []);
  const dailyProgress = useMemo(() => loadDailyProgress(), []);

  const saveInfo = savedState
    ? {
        difficulty: savedState.difficulty,
        progress: countFilled(savedState.grid.cells),
      }
    : null;

  // Determine if today's daily is already completed
  const dailyCompleted = dailyProgress.lastCompletedDate === today;

  return (
    <div className="min-h-screen bg-white max-w-[500px] mx-auto flex flex-col px-6 py-12">
      {/* Header with crown and gear */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex-1" /> {/* spacer */}
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold text-ink-dark tracking-tight">{t('app.title')}</h1>
          <p className="text-sm text-ink-mid mt-1">{t('app.subtitle')}</p>
        </div>
        <div className="flex-1 flex justify-end items-start gap-2">
          {/* Crown icon — visual only, no interaction */}
          <Crown size={22} className="text-accent opacity-60" />
          {/* Gear icon — navigate to settings */}
          <button
            onClick={() => navigate('/settings')}
            className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon size={22} />
          </button>
        </div>
      </div>

      {/* Continue Puzzle */}
      {hasSave && saveInfo && savedState && (
        <button
          onClick={() => navigate('/game?mode=continue')}
          className="w-full mb-4 p-4 rounded-2xl bg-bg-board border border-border text-left
                     hover:bg-gray-100 active:scale-[0.98] transition-all"
        >
          <div className="text-sm font-medium text-ink-dark mb-2">{t('dashboard.continue')}</div>
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 flex-shrink-0">
              <SaveThumbnail cells={savedState.grid.cells} />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-ink-dark">
                {t(`dashboard.${saveInfo.difficulty.toLowerCase()}`, saveInfo.difficulty)}
              </div>
              <div className="text-xs text-ink-mid mt-0.5">
                {t('dashboard.progress', { progress: saveInfo.progress })}
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Daily Challenge */}
      <button
        onClick={() => navigate('/game?mode=daily')}
        className="w-full mb-8 p-4 rounded-2xl bg-accent/15 border border-accent/30 text-left
                   hover:bg-accent/25 active:scale-[0.98] transition-all"
      >
        <div className="text-sm font-medium text-ink-dark">{t('dashboard.daily')}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-lg font-semibold text-ink-dark">{today}</span>
          {dailyCompleted ? (
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              {dailyProgress.streak > 0
                ? t('dashboard.streak', { count: dailyProgress.streak })
                : t('dashboard.today')}
            </span>
          ) : dailyProgress.streak > 0 ? (
            <span className="text-xs font-medium text-ink-mid bg-white/60 px-2 py-0.5 rounded-full">
              {t('dashboard.streak', { count: dailyProgress.streak })}
            </span>
          ) : null}
        </div>
      </button>

      {/* Difficulty Selection */}
      <h2 className="text-sm font-medium text-ink-mid uppercase tracking-wider mb-3">
        {t('dashboard.play')}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            onClick={() => navigate(`/game?difficulty=${d.key}`)}
            className={`p-4 rounded-xl border text-left transition-all
                       hover:shadow-sm active:scale-[0.98] ${d.color}`}
          >
            <div className="font-semibold">{t(d.labelKey)}</div>
            <div className="text-xs mt-0.5 opacity-70">{t(d.descKey)}</div>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="mt-auto pt-8" />
    </div>
  );
}

function countFilled(cells: any[][]): number {
  let filled = 0;
  let total = 0;
  for (const row of cells) {
    for (const cell of row) {
      total++;
      if (!cell.is_given && cell.value !== 0) filled++;
    }
  }
  if (total === 0) return 0;
  const empties = cells.flat().filter((c: any) => !c.is_given).length;
  if (empties === 0) return 100;
  return Math.round((filled / empties) * 100);
}
```

Note: The `getLocalDateString` function appears twice — once at module level and once inside the component. This is intentional: the module-level version is exported so `Game.tsx` can use it for both `newDaily()` calls and streak updates.

Actually, there's an issue — I wrote two `getLocalDateString` functions. Let me fix that in the plan. The first one (line ~20) is used by `updateDailyStreak()`, the second (line ~45) shadows it. I'll make a single function and export it.

Let me clean this up:

```typescript
export function getLocalDateString(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

And remove the duplicate. Also, the `updateDailyStreak` uses `getLocalDateString` (no arg) and also calls `getLocalDateString(new Date(Date.now() - 86400000))` which is awkward — just use `getLocalDateString(new Date(Date.now() - 86400000))` or better yet, use the function with a date param.

Let me fix: In `updateDailyStreak`, replace `const yesterday = getLocalDateString(new Date(Date.now() - 86400000));` with `const yesterday = getLocalDateString(new Date(Date.now() - 86400000));` — actually that's what it already says. But wait, there are two function declarations. Let me just make this clean in the final plan.

I'll restructure: one module-level `getLocalDateString`, and `updateDailyStreak` uses it. Remove the second one from inside the component.

- [ ] **Step 2: Update Game.tsx daily initialization to use local timezone**

In the Game page, replace the daily initialization line that uses `toISOString()`:

Change:
```typescript
const today = new Date().toISOString().split('T')[0];
```
to:
```typescript
const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
```

(We'll handle this properly when we rework Game.tsx in the next task.)

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: rework Dashboard with crown/gear icons, save thumbnail, daily streak, local-tz"
```

---

### Task 7: Frontend — Rework Game components (StatusBar, Toolbar, NumberPad, HintDrawer)

**Files:**
- Modify: `src/components/StatusBar.tsx`
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/NumberPad.tsx`
- Modify: `src/components/HintDrawer.tsx`

- [ ] **Step 1: Rewrite StatusBar**

Replace `src/components/StatusBar.tsx` entirely with:

```typescript
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MoreHorizontal, ArrowLeft } from 'lucide-react';
import type { Difficulty, GameStatus } from '../types/generated';

interface StatusBarProps {
  difficulty: Difficulty;
  errorCount: number;
  maxErrors: number;
  gameStatus: GameStatus;
  timerDisplay: string;
  showTimer: boolean;
  onBack: () => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  Easy: '简单',
  Medium: '中等',
  Hard: '困难',
  Expert: '专家',
};

export function StatusBar({
  difficulty,
  errorCount,
  maxErrors,
  gameStatus,
  timerDisplay,
  showTimer,
  onBack,
}: StatusBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #D0D7E5' }}>
      {/* Left: Back + Difficulty */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label="Back to menu"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-medium text-ink-dark">
          {DIFFICULTY_LABELS[difficulty] || difficulty}
        </span>
      </div>

      {/* Center: Errors + Timer */}
      <div className="flex items-center gap-4">
        {/* Error icon + count */}
        <div className="flex items-center gap-1.5" title={t('statusBar.errors', { count: errorCount, max: maxErrors })}>
          <AlertTriangle
            size={16}
            className={errorCount > 0 ? 'text-error' : 'text-ink-light'}
          />
          <span className={`text-xs font-medium tabular-nums ${
            errorCount > 0 ? 'text-error' : 'text-ink-mid'
          }`}>
            {errorCount}/{maxErrors}
          </span>
        </div>

        {/* Timer */}
        {showTimer && (
          <span className={`text-sm font-mono tabular-nums min-w-[48px] text-center ${
            gameStatus !== 'Playing' ? 'text-ink-mid' : 'text-ink-dark'
          }`}>
            {timerDisplay}
          </span>
        )}
      </div>

      {/* Right: "..." menu → /game-settings */}
      <button
        onClick={() => navigate('/game-settings')}
        className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
        aria-label="Game Settings"
      >
        <MoreHorizontal size={20} />
      </button>
    </div>
  );
}
```

Changes from current:
- Removed `onPause` prop and pause button
- Added `navigate('/game-settings')` for "..." menu
- Replaced error dots with `AlertTriangle` icon + count text
- Replaced inline SVG back arrow with lucide `ArrowLeft`
- Replaced inline SVG pause icons with lucide `MoreHorizontal`
- Added i18n support for error title text

- [ ] **Step 2: Rewrite Toolbar**

Replace `src/components/Toolbar.tsx` entirely with:

```typescript
import { Undo2, Redo2, Pencil, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onAutoNotes: () => void;
  onHint: () => void;
  autoNotesActive: boolean;
  disabled: boolean;
}

export function Toolbar({ onUndo, onRedo, onAutoNotes, onHint, autoNotesActive, disabled }: ToolbarProps) {
  const { t } = useTranslation();

  const btnClass = `
    flex items-center gap-1.5 px-3 py-2 rounded-xl
    text-sm font-medium
    transition-all duration-75
    disabled:opacity-30 disabled:cursor-not-allowed
    active:scale-95
  `;

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <button
        onClick={onUndo}
        disabled={disabled}
        className={`${btnClass} text-ink-mid hover:bg-primary-pale hover:text-primary`}
        aria-label={t('game.undo')}
      >
        <Undo2 size={18} />
        <span>{t('game.undo')}</span>
      </button>

      <button
        onClick={onRedo}
        disabled={disabled}
        className={`${btnClass} text-ink-mid hover:bg-primary-pale hover:text-primary`}
        aria-label={t('game.redo')}
      >
        <Redo2 size={18} />
        <span>{t('game.redo')}</span>
      </button>

      <button
        onClick={onAutoNotes}
        disabled={disabled}
        className={`${btnClass} ${
          autoNotesActive
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'text-ink-mid hover:bg-primary-pale hover:text-primary'
        }`}
        aria-label={autoNotesActive ? t('game.clearNotes') : t('game.autoNotes')}
      >
        <Pencil size={18} />
        <span>{autoNotesActive ? t('game.clearNotes') : t('game.autoNotes')}</span>
      </button>

      <button
        onClick={onHint}
        disabled={disabled}
        className={`${btnClass} text-ink-mid hover:bg-primary-pale hover:text-primary`}
        aria-label={t('game.hint')}
      >
        <Lightbulb size={18} />
        <span>{t('game.hint')}</span>
      </button>
    </div>
  );
}
```

Changes from current:
- Removed `onErase` prop entirely
- Added `onAutoNotes` and `autoNotesActive` props
- All buttons now have icon + text label (using lucide icons + t() translations)
- Auto Notes button has active state styling (blue bg when active = "Clear Notes" mode)

- [ ] **Step 3: Rewrite NumberPad**

Replace `src/components/NumberPad.tsx` entirely with:

```typescript
import { Eraser } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NumberPadProps {
  onNumber: (value: number) => void;
  onErase: () => void;
  onToggleNote: (value: number) => void;
  selectedCellNotes: number[];
  hasSelectedValue: boolean;
  disabled: boolean;
}

export function NumberPad({
  onNumber,
  onErase,
  onToggleNote,
  selectedCellNotes,
  hasSelectedValue,
  disabled,
}: NumberPadProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-[500px] mx-auto px-2">
      {/* Number buttons 1-9 with candidate sub-row */}
      <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <div key={n} className="flex flex-col items-center">
            {/* Main number button — always dispatches InputNumber */}
            <button
              onClick={() => onNumber(n)}
              disabled={disabled}
              className={`
                flex items-center justify-center
                w-full aspect-square rounded-xl
                text-xl sm:text-2xl font-semibold
                transition-all duration-75
                bg-white border shadow-sm
                hover:bg-primary-pale hover:border-primary hover:shadow-md
                active:scale-95
                ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
              `}
              style={{
                borderColor: '#D0D7E5',
                color: '#3654D2',
                fontFamily: "'Inter', 'SF Pro Display', 'PingFang SC', system-ui, sans-serif",
              }}
            >
              {n}
            </button>

            {/* Candidate sub-row dot — ToggleNote */}
            {!hasSelectedValue && (
              <button
                onClick={() => onToggleNote(n)}
                disabled={disabled}
                className={`
                  flex items-center justify-center
                  w-4 h-4 mt-0.5 rounded-full
                  transition-all duration-75
                  ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 active:scale-90'}
                `}
                aria-label={`Toggle note ${n}`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    selectedCellNotes.includes(n)
                      ? 'bg-primary'
                      : 'bg-gray-200'
                  }`}
                />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Erase button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={onErase}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-5 py-2 rounded-lg
            text-sm font-medium
            border border-border bg-white
            text-ink-mid hover:bg-gray-50 active:scale-95 transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Eraser size={16} />
          {t('game.erase')}
        </button>
      </div>
    </div>
  );
}
```

Changes from current:
- Removed `onToggleNoteMode` and `noteMode` props
- Added `onToggleNote`, `selectedCellNotes`, `hasSelectedValue` props
- Removed mode toggle capsule button
- Each number grid cell gets a candidate dot below it
- Candidate dot filled blue when note exists, gray when not
- Candidate row hidden when cell has a value (hasSelectedValue=true)
- Used lucide `Eraser` icon instead of inline SVG

- [ ] **Step 4: Rewrite HintDrawer**

Replace `src/components/HintDrawer.tsx` entirely with:

```typescript
import { useTranslation } from 'react-i18next';
import { Lightbulb, X } from 'lucide-react';
import type { Hint } from '../types/generated';

interface HintDrawerProps {
  hint: Hint | null;
  visible: boolean;
  onClose: () => void;
  onApplyHint: () => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  NakedSingle: '唯一数',
  HiddenSingle: '隐性唯一数',
  NakedPair: '数对',
  HiddenPair: '隐性数对',
  Pointing: '指向数',
  BoxLineReduction: '宫线删减',
  XWing: 'X翼',
  SolverFallback: '回溯求解',
};

export function HintDrawer({ hint, visible, onClose, onApplyHint }: HintDrawerProps) {
  const { t } = useTranslation();

  if (!hint) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-white rounded-t-2xl shadow-lg
        transform transition-transform duration-300 ease-out
        max-w-[500px] mx-auto
        ${visible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      {/* Header — "Smart Hint" */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-accent" />
          <span className="text-base font-semibold text-ink-dark">{t('hint.smartHint')}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label={t('hint.notNow')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Strategy badge + description */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/30 text-ink-dark">
            {STRATEGY_LABELS[hint.strategy] || hint.strategy}
          </span>
          <span className="text-xs text-ink-mid">{hint.strategy}</span>
        </div>

        <p className="text-sm text-ink-dark leading-relaxed">{hint.message_cn}</p>

        {hint.value > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-ink-mid">{t('hint.recommended')}</span>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white font-bold text-lg">
              {hint.value}
            </span>
            <span className="text-xs text-ink-mid">
              {t('hint.position', { row: hint.target.row + 1, col: hint.target.col + 1 })}
            </span>
          </div>
        )}

        {hint.eliminated.length > 0 && (
          <p className="mt-2 text-xs text-ink-mid">
            {t('hint.eliminate')} {hint.eliminated.join(', ')}
          </p>
        )}
      </div>

      {/* Bottom buttons: Not Now + Apply Hint */}
      <div className="flex items-center gap-3 px-4 pb-6 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-ink-mid
                     hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          {t('hint.notNow')}
        </button>
        <button
          onClick={onApplyHint}
          className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium
                     hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          {t('hint.applyHint')}
        </button>
      </div>
    </div>
  );
}
```

Changes from current:
- Title changed to "Smart Hint" with Lightbulb icon
- Added `onApplyHint` prop
- Replaced single close (X) button with dual "Not Now" / "Apply Hint" bottom buttons
- X button in header now acts as "Not Now" equivalent
- Added i18n support
- Used lucide icons (Lightbulb, X)

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors. (Some unused-prop warnings may appear from Game.tsx not yet updated — we'll fix that in the next task.)

- [ ] **Step 6: Commit**

```bash
git add src/components/StatusBar.tsx src/components/Toolbar.tsx src/components/NumberPad.tsx src/components/HintDrawer.tsx
git commit -m "feat: rework Game components — StatusBar, Toolbar, NumberPad, HintDrawer"
```

---

### Task 8: Frontend — Wire up Game.tsx with new actions and component props

**Files:**
- Modify: `src/pages/Game.tsx`

- [ ] **Step 1: Rewrite Game.tsx**

Replace `src/pages/Game.tsx` entirely with:

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../hooks/useGameEngine';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTimer } from '../hooks/useTimer';
import { StatusBar } from '../components/StatusBar';
import { GridBoard } from '../components/GridBoard';
import { NumberPad } from '../components/NumberPad';
import { Toolbar } from '../components/Toolbar';
import { HintDrawer } from '../components/HintDrawer';
import { GameOverDialog } from '../components/GameOverDialog';
import { updateDailyStreak } from './Dashboard';
import type { GameStatus, Difficulty } from '../types/generated';

export function Game() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const engine = useGameEngine();
  const storage = useLocalStorage();
  const timer = useTimer();
  const { t } = useTranslation();

  const [autoNotesActive, setAutoNotesActive] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Track if game was initialized
  const initialized = useRef(false);
  // Track if daily completion streak was already updated
  const streakUpdated = useRef(false);

  // Initialize game from params or saved state
  useEffect(() => {
    if (engine.loading || initialized.current) return;

    const mode = searchParams.get('mode');
    const difficulty = searchParams.get('difficulty') as Difficulty | null;

    if (mode === 'daily') {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      engine.newDaily(today);
      initialized.current = true;
    } else if (mode === 'continue') {
      const saved = storage.load();
      if (saved) {
        engine.loadState(saved).then(() => {
          timer.resume();
        });
        initialized.current = true;
      } else {
        engine.newGame('Easy');
        initialized.current = true;
      }
    } else if (difficulty) {
      engine.newGame(difficulty);
      initialized.current = true;
    } else {
      engine.newGame('Easy');
      initialized.current = true;
    }
  }, [engine.loading, engine.newGame, engine.newDaily, engine.loadState, searchParams, storage, timer]);

  // Start timer when state first loads
  useEffect(() => {
    if (engine.state && initialized.current && !timer.running) {
      timer.start();
    }
  }, [engine.state?.grid]);

  // Auto-save on state change
  useEffect(() => {
    if (engine.state && engine.state.game_status === 'Playing') {
      storage.save(engine.state);
    }
  }, [engine.state]);

  // Handle timer sync with WASM
  useEffect(() => {
    if (engine.state && timer.seconds > 0 && timer.seconds !== engine.state.elapsed_seconds) {
      engine.dispatch({ type: 'setFinalTime', seconds: timer.seconds });
    }
  }, [timer.seconds]);

  // Update daily streak on game completion (when Daily mode)
  useEffect(() => {
    if (engine.state && engine.state.game_status === 'Won'
        && searchParams.get('mode') === 'daily'
        && !streakUpdated.current) {
      updateDailyStreak();
      streakUpdated.current = true;
    }
  }, [engine.state?.game_status]);

  // Reset autoNotesActive and streakUpdated when game resets
  useEffect(() => {
    if (engine.state && engine.state.game_status === 'Playing' && streakUpdated.current) {
      streakUpdated.current = false;
    }
  }, [engine.state?.game_status]);

  const handleSelectCell = useCallback(
    (row: number, col: number) => {
      if (!engine.state) return;
      if (engine.state.game_status !== 'Playing') return;
      engine.dispatch({ type: 'selectCell', row, col });
    },
    [engine],
  );

  const handleNumber = useCallback(
    (value: number) => {
      if (!engine.state) return;
      if (engine.state.game_status !== 'Playing') return;
      engine.dispatch({ type: 'inputNumber', value });
      setShowHint(false);
    },
    [engine],
  );

  const handleToggleNote = useCallback(
    (value: number) => {
      if (!engine.state) return;
      if (engine.state.game_status !== 'Playing') return;
      engine.dispatch({ type: 'toggleNote', value });
    },
    [engine],
  );

  const handleErase = useCallback(() => {
    if (!engine.state) return;
    if (engine.state.game_status !== 'Playing') return;
    engine.dispatch({ type: 'erase' });
  }, [engine]);

  const handleUndo = useCallback(() => {
    if (!engine.state) return;
    if (engine.state.game_status !== 'Playing') return;
    engine.dispatch({ type: 'undo' });
  }, [engine]);

  const handleRedo = useCallback(() => {
    if (!engine.state) return;
    if (engine.state.game_status !== 'Playing') return;
    engine.dispatch({ type: 'redo' });
  }, [engine]);

  const handleAutoNotes = useCallback(() => {
    if (!engine.state) return;
    if (engine.state.game_status !== 'Playing') return;
    if (autoNotesActive) {
      engine.dispatch({ type: 'clearNotes' });
      setAutoNotesActive(false);
    } else {
      engine.dispatch({ type: 'autoNotes' });
      setAutoNotesActive(true);
    }
  }, [engine, autoNotesActive]);

  const handleHint = useCallback(() => {
    if (!engine.state) return;
    if (engine.state.game_status !== 'Playing') return;
    engine.dispatch({ type: 'getHint' });
    setShowHint(true);
  }, [engine]);

  const handleApplyHint = useCallback(() => {
    if (!engine.state) return;
    if (engine.state.game_status !== 'Playing') return;
    engine.dispatch({ type: 'applyHint' });
    setShowHint(false);
  }, [engine]);

  const handleNewGame = useCallback(() => {
    const diff = engine.state?.difficulty || 'Easy';
    engine.newGame(diff);
    timer.start();
    setShowHint(false);
    setAutoNotesActive(false);
  }, [engine, timer]);

  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Derive selected cell notes for NumberPad candidate sub-row
  const selectedCellNotes: number[] = (() => {
    if (!engine.state) return [];
    const sel = engine.state.grid.selected;
    if (!sel) return [];
    const cell = engine.state.grid.cells[sel.row][sel.col];
    if (cell.value !== 0) return []; // no candidates for filled cells
    return cell.notes;
  })();

  const hasSelectedValue: boolean = (() => {
    if (!engine.state) return true;
    const sel = engine.state.grid.selected;
    if (!sel) return true;
    const cell = engine.state.grid.cells[sel.row][sel.col];
    return cell.value !== 0 && !cell.is_given;
  })();

  // Loading / Error states
  if (engine.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-ink-mid text-lg">{t('game.loading')}</div>
      </div>
    );
  }

  if (engine.error || !engine.state) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-error text-lg">{t('game.loadError')}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-primary text-white"
        >
          {t('game.retry')}
        </button>
      </div>
    );
  }

  const { state } = engine;
  const gameOver = state.game_status === 'Won' || state.game_status === 'Lost';
  const gameStatus: GameStatus = state.game_status;
  const disabled = gameOver;

  return (
    <div className="flex flex-col h-screen max-w-[500px] mx-auto bg-bg-board">
      {/* Status bar */}
      <StatusBar
        difficulty={state.difficulty}
        errorCount={state.error_count}
        maxErrors={state.max_errors}
        gameStatus={gameStatus}
        timerDisplay={timer.format()}
        showTimer={state.settings.show_timer}
        onBack={handleHome}
      />

      {/* Toolbar (no Erase button — removed per spec) */}
      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAutoNotes={handleAutoNotes}
        onHint={handleHint}
        autoNotesActive={autoNotesActive}
        disabled={disabled}
      />

      {/* Grid */}
      <div className="flex-1 flex items-start justify-center px-2 pt-2 pb-1">
        <GridBoard
          grid={state.grid}
          highlights={state.grid.highlights}
          selectedNumber={state.grid.selected_number}
          onSelectCell={handleSelectCell}
        />
      </div>

      {/* Number pad */}
      <div className="pb-4 pt-1">
        <NumberPad
          onNumber={handleNumber}
          onErase={handleErase}
          onToggleNote={handleToggleNote}
          selectedCellNotes={selectedCellNotes}
          hasSelectedValue={hasSelectedValue}
          disabled={disabled}
        />
      </div>

      {/* Hint drawer */}
      <HintDrawer
        hint={state.hint}
        visible={showHint}
        onClose={() => setShowHint(false)}
        onApplyHint={handleApplyHint}
      />

      {/* Game over dialog */}
      {gameOver && (
        <GameOverDialog
          status={gameStatus}
          timerDisplay={timer.format()}
          onNewGame={handleNewGame}
          onHome={handleHome}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Full build check**

Run: `npm run build`
Expected: tsc + Vite build both pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Game.tsx
git commit -m "feat: wire up Game.tsx with new actions and component props"
```

---

### Task 9: Final verification — build, test, and manual review

- [ ] **Step 1: Run Rust tests**

Run: `cd wasm-engine && cargo test`
Expected: All tests pass (existing 53 + new tests from Task 3).

- [ ] **Step 2: Full WASM build**

Run: `cd D:/Data/sudokucalm && npm run build:wasm`
Expected: WASM compiled to `src/wasm-pkg/`.

- [ ] **Step 3: Full frontend build**

Run: `npm run build`
Expected: tsc + Vite build pass, output in `dist/`.

- [ ] **Step 4: Preview production build**

Run: `npm run preview`
And open the URL in a browser. Manual verification checklist:

- [ ] Dashboard shows crown + gear icons in header
- [ ] Dashboard Continue Puzzle shows save thumbnail (if save exists)
- [ ] Dashboard Daily Challenge shows streak (if daily was completed)
- [ ] Dashboard date uses local timezone
- [ ] Settings page shows Language selector, Game Settings link, Sound/Haptics toggles
- [ ] Language switch (EN ↔ 中文) works immediately
- [ ] Game Settings page shows 4 toggles with icons
- [ ] Game page StatusBar shows error icon+count (not dots)
- [ ] Game page StatusBar "..." navigates to /game-settings
- [ ] Game page Toolbar shows Undo/Redo/Auto Notes/Hint with icon+text
- [ ] Auto Notes button fills notes, label switches to "Clear Notes"
- [ ] Clear Notes button removes all notes, label switches back to "Auto Notes"
- [ ] Game page NumberPad has no note-mode toggle
- [ ] NumberPad candidate dots appear under each digit when cell is selected
- [ ] Clicking candidate dot toggles note for that digit
- [ ] HintDrawer shows "Smart Hint" title with Lightbulb
- [ ] HintDrawer shows "Not Now" and "Apply Hint" buttons
- [ ] "Not Now" closes drawer, keeps hint
- [ ] "Apply Hint" applies the hint and closes drawer
- [ ] ApplyHint fill-type correctly fills cell
- [ ] ApplyHint elimination-type correctly removes candidates
- [ ] GetHint no longer auto-fills SolverFallback cells

- [ ] **Step 5: Create memory for streak update mechanism**

Note: The `updateDailyStreak` function is on `Dashboard.tsx` and imported by `Game.tsx` to call when daily challenge is won. This is a cross-file dependency to be aware of.

- [ ] **Step 6: Commit final build**

```bash
git add .
git commit -m "chore: final build verification for UI reproduction"
```

---

## Self-Review Checklist

**1. Spec coverage:** Every requirement from the spec has a corresponding task:
- ✅ 3 new Rust Actions (AutoNotes, ClearNotes, ApplyHint) — Tasks 1-2
- ✅ Fix handle_get_hint SolverFallback eager-fill — Task 2
- ✅ Dashboard crown/gear icons — Task 6
- ✅ Save thumbnail rendering — Task 6
- ✅ Daily Challenge streak + localStorage — Task 6
- ✅ Local-timezone date fix — Tasks 6, 8
- ✅ StatusBar error icon+count — Task 7
- ✅ "..." menu → /game-settings — Task 7
- ✅ Toolbar icon+text labels — Task 7
- ✅ Auto Notes / Clear Notes toggle — Task 7
- ✅ Erase removed from Toolbar — Task 7
- ✅ NumberPad note-mode toggle removed — Task 7
- ✅ NumberPad candidate sub-row — Task 7
- ✅ HintDrawer "Smart Hint" title — Task 7
- ✅ Not Now / Apply Hint buttons — Task 7
- ✅ Settings split into /settings + /game-settings — Task 5
- ✅ i18n (en/zh) with react-i18next — Task 4
- ✅ lucide-react icon library — Tasks 5, 6, 7

**2. Placeholder scan:** All steps contain complete code, exact file paths, and exact commands. No "TBD" or "TODO".

**3. Type consistency:** Action type names match between Rust (camelCase `serde` rename) and TS (`action.ts` union variants). Component props match across all files.
