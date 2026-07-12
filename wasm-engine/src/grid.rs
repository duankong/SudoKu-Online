use crate::types::{Cell, Grid, Highlights};

impl Grid {
    pub fn new(givens: [[u8; 9]; 9]) -> Self {
        let mut cells = core::array::from_fn(|_| core::array::from_fn(|_| Cell::empty()));
        for r in 0..9 {
            for c in 0..9 {
                let v = givens[r][c];
                if v != 0 {
                    cells[r][c] = Cell::new(v, true);
                }
            }
        }
        Self {
            cells,
            selected: None,
            selected_number: None,
            highlights: Highlights::empty(),
        }
    }

    pub fn set_value(&mut self, row: u8, col: u8, value: u8, is_error: bool) {
        let cell = &mut self.cells[row as usize][col as usize];
        if cell.is_given { return; }
        cell.value = value;
        cell.notes.clear();
        cell.is_error = is_error;
    }

    pub fn erase_cell(&mut self, row: u8, col: u8) {
        let cell = &mut self.cells[row as usize][col as usize];
        if cell.is_given { return; }
        cell.value = 0;
        cell.notes.clear();
        cell.is_error = false;
    }

    pub fn toggle_note(&mut self, row: u8, col: u8, value: u8) {
        let cell = &mut self.cells[row as usize][col as usize];
        if cell.is_given || cell.value != 0 { return; }
        if let Some(pos) = cell.notes.iter().position(|&v| v == value) {
            cell.notes.remove(pos);
        } else {
            cell.notes.push(value);
            cell.notes.sort();
        }
    }

    pub fn smart_erase_notes(&mut self, row: u8, col: u8, value: u8) {
        let box_r = (row / 3) * 3;
        let box_c = (col / 3) * 3;
        for i in 0..9 {
            self.remove_note(row, i, value);
            self.remove_note(i, col, value);
            let br = box_r + i / 3;
            let bc = box_c + i % 3;
            self.remove_note(br, bc, value);
        }
    }

    fn remove_note(&mut self, row: u8, col: u8, value: u8) {
        let cell = &mut self.cells[row as usize][col as usize];
        cell.notes.retain(|&v| v != value);
    }

    pub fn get_cell(&self, row: u8, col: u8) -> &Cell {
        &self.cells[row as usize][col as usize]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_grid_with_givens() {
        let mut givens = [[0u8; 9]; 9];
        givens[0][0] = 5;
        givens[4][4] = 3;
        let grid = Grid::new(givens);

        assert_eq!(grid.cells[0][0].value, 5);
        assert!(grid.cells[0][0].is_given);
        assert_eq!(grid.cells[4][4].value, 3);
        assert!(grid.cells[4][4].is_given);
        assert_eq!(grid.cells[1][1].value, 0);
        assert!(!grid.cells[1][1].is_given);
        assert!(grid.selected.is_none());
        assert!(grid.selected_number.is_none());
    }

    #[test]
    fn test_set_value_on_empty_cell() {
        let mut grid = Grid::new([[0u8; 9]; 9]);
        grid.set_value(2, 3, 7, false);
        let cell = grid.get_cell(2, 3);
        assert_eq!(cell.value, 7);
        assert!(!cell.is_error);
        assert!(cell.notes.is_empty());
    }

    #[test]
    fn test_set_value_on_given_cell_is_noop() {
        let mut givens = [[0u8; 9]; 9];
        givens[0][0] = 5;
        let mut grid = Grid::new(givens);
        grid.set_value(0, 0, 9, true);
        let cell = grid.get_cell(0, 0);
        assert_eq!(cell.value, 5);
        assert!(!cell.is_error);
    }

    #[test]
    fn test_erase_cell() {
        let mut grid = Grid::new([[0u8; 9]; 9]);
        grid.set_value(5, 5, 4, true);
        grid.erase_cell(5, 5);
        let cell = grid.get_cell(5, 5);
        assert_eq!(cell.value, 0);
        assert!(!cell.is_error);
        assert!(cell.notes.is_empty());
    }

    #[test]
    fn test_erase_given_cell_is_noop() {
        let mut givens = [[0u8; 9]; 9];
        givens[1][2] = 8;
        let mut grid = Grid::new(givens);
        grid.erase_cell(1, 2);
        let cell = grid.get_cell(1, 2);
        assert_eq!(cell.value, 8);
    }

    #[test]
    fn test_toggle_note_adds_and_removes() {
        let mut grid = Grid::new([[0u8; 9]; 9]);
        grid.toggle_note(0, 0, 3);
        assert_eq!(grid.cells[0][0].notes, vec![3]);

        grid.toggle_note(0, 0, 3);
        assert!(grid.cells[0][0].notes.is_empty());
    }

    #[test]
    fn test_toggle_note_maintains_sorted_order() {
        let mut grid = Grid::new([[0u8; 9]; 9]);
        grid.toggle_note(0, 0, 9);
        grid.toggle_note(0, 0, 1);
        grid.toggle_note(0, 0, 5);
        assert_eq!(grid.cells[0][0].notes, vec![1, 5, 9]);
    }

    #[test]
    fn test_toggle_note_noop_when_cell_has_value() {
        let mut grid = Grid::new([[0u8; 9]; 9]);
        grid.set_value(1, 1, 6, false);
        grid.toggle_note(1, 1, 3);
        assert!(grid.cells[1][1].notes.is_empty());
    }

    #[test]
    fn test_toggle_note_noop_on_given_cell() {
        let mut givens = [[0u8; 9]; 9];
        givens[3][3] = 2;
        let mut grid = Grid::new(givens);
        grid.toggle_note(3, 3, 5);
        assert!(grid.cells[3][3].notes.is_empty());
    }

    #[test]
    fn test_smart_erase_notes_removes_from_row_col_box() {
        let mut grid = Grid::new([[0u8; 9]; 9]);
        // Place some notes that should be removed
        for c in 0..9 {
            grid.toggle_note(4, c, 7);
        }
        for r in 0..9 {
            if r != 4 {
                grid.toggle_note(r, 3, 7);
            }
        }
        // Also add notes in the same box (rows 3-5, cols 3-5)
        grid.toggle_note(3, 4, 7);
        grid.toggle_note(5, 5, 7);

        // Smart-erase 7 from the perspective of row 4, col 3
        grid.smart_erase_notes(4, 3, 7);

        // All cells in row 4 should have no 7
        for c in 0..9 {
            assert!(!grid.cells[4][c].notes.contains(&7), "row 4 col {} still has note 7", c);
        }
        // All cells in col 3 should have no 7
        for r in 0..9 {
            assert!(!grid.cells[r][3].notes.contains(&7), "row {} col 3 still has note 7", r);
        }
        // All cells in the box (rows 3-5, cols 3-5) should have no 7
        for r in 3..6 {
            for c in 3..6 {
                assert!(!grid.cells[r][c].notes.contains(&7), "box cell ({},{}) still has note 7", r, c);
            }
        }
    }

    #[test]
    fn test_get_cell_returns_correct_reference() {
        let mut grid = Grid::new([[0u8; 9]; 9]);
        grid.set_value(8, 8, 1, false);
        let cell = grid.get_cell(8, 8);
        assert_eq!(cell.value, 1);
    }
}
