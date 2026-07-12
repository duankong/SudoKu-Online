use crate::types::{GameSettings, Grid, Highlights, Pos};

pub fn compute(grid: &Grid, settings: &GameSettings, hint_cells: &[Pos]) -> Highlights {
    let mut related_area = Vec::new();
    let mut same_number = Vec::new();
    let mut error_cells = Vec::new();

    if let Some(ref sel) = grid.selected {
        if settings.highlight_areas {
            for i in 0..9 {
                if i != sel.col { related_area.push(Pos { row: sel.row, col: i }); }
                if i != sel.row { related_area.push(Pos { row: i, col: sel.col }); }
            }
            let br = (sel.row / 3) * 3;
            let bc = (sel.col / 3) * 3;
            for r in br..br + 3 {
                for c in bc..bc + 3 {
                    if r != sel.row || c != sel.col {
                        related_area.push(Pos { row: r, col: c });
                    }
                }
            }
        }

        let sel_cell = &grid.cells[sel.row as usize][sel.col as usize];
        let target_value = if sel_cell.value != 0 {
            Some(sel_cell.value)
        } else {
            grid.selected_number
        };

        if let Some(v) = target_value {
            if settings.highlight_numbers && v != 0 {
                for r in 0..9usize {
                    for c in 0..9usize {
                        if (r as u8 != sel.row || c as u8 != sel.col) && grid.cells[r][c].value == v {
                            same_number.push(Pos { row: r as u8, col: c as u8 });
                        }
                    }
                }
            }
        }
    }

    for r in 0..9usize {
        for c in 0..9usize {
            if grid.cells[r][c].is_error {
                error_cells.push(Pos { row: r as u8, col: c as u8 });
            }
        }
    }

    Highlights {
        related_area,
        same_number,
        hint_cells: hint_cells.to_vec(),
        error_cells,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Cell;

    #[test]
    fn test_selected_highlights_area() {
        let cells = core::array::from_fn::<_, 9, _>(|_| core::array::from_fn(|_| Cell::empty()));
        let grid = Grid {
            cells,
            selected: Some(Pos { row: 4, col: 4 }),
            selected_number: None,
            highlights: Highlights::empty(),
        };
        let h = compute(&grid, &GameSettings::default(), &[]);
        assert!(!h.related_area.is_empty());
    }
}
