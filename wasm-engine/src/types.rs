use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Pos {
    pub row: u8,
    pub col: u8,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Cell {
    pub value: u8,
    pub notes: Vec<u8>,
    pub is_given: bool,
    pub is_error: bool,
}

impl Cell {
    pub fn new(value: u8, is_given: bool) -> Self {
        Self { value, notes: vec![], is_given, is_error: false }
    }

    pub fn empty() -> Self {
        Self { value: 0, notes: vec![], is_given: false, is_error: false }
    }
}

#[derive(Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Highlights {
    pub related_area: Vec<Pos>,
    pub same_number: Vec<Pos>,
    pub hint_cells: Vec<Pos>,
    pub error_cells: Vec<Pos>,
}

impl Highlights {
    pub fn empty() -> Self {
        Self {
            related_area: vec![],
            same_number: vec![],
            hint_cells: vec![],
            error_cells: vec![],
        }
    }
}

#[derive(Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Grid {
    pub cells: [[Cell; 9]; 9],
    pub selected: Option<Pos>,
    pub selected_number: Option<u8>,
    pub highlights: Highlights,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum GameStatus { Playing, Won, Lost }

#[derive(Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum Difficulty { Easy, Medium, Hard, Expert }

#[derive(Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct GameSettings {
    pub show_timer: bool,
    pub show_hints: bool,
    pub highlight_areas: bool,
    pub highlight_numbers: bool,
}

impl Default for GameSettings {
    fn default() -> Self {
        Self {
            show_timer: true,
            show_hints: true,
            highlight_areas: true,
            highlight_numbers: true,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum StrategyType {
    NakedSingle,
    HiddenSingle,
    NakedPair,
    HiddenPair,
    Pointing,
    BoxLineReduction,
    XWing,
    SolverFallback,
}

#[derive(Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Hint {
    pub strategy: StrategyType,
    pub target: Pos,
    pub value: u8,
    pub related_cells: Vec<Pos>,
    pub eliminated: Vec<u8>,
    pub message_cn: String,
}

#[derive(Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct GameState {
    pub grid: Grid,
    pub difficulty: Difficulty,
    pub solution: [[u8; 9]; 9],
    pub error_count: u8,
    pub max_errors: u8,
    pub game_status: GameStatus,
    pub elapsed_seconds: u32,
    pub settings: GameSettings,
    pub hint: Option<Hint>,
}

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
