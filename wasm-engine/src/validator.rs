use crate::types::{GameStatus, Grid, Pos};

pub fn conflict_check(grid: &Grid, row: u8, col: u8, value: u8) -> Vec<Pos> {
    let mut conflicts = Vec::new();
    let r = row as usize;
    let c = col as usize;
    for i in 0..9 {
        if i != c && grid.cells[r][i].value == value {
            conflicts.push(Pos { row, col: i as u8 });
        }
        if i != r && grid.cells[i][c].value == value {
            conflicts.push(Pos { row: i as u8, col });
        }
    }
    let box_r = (r / 3) * 3;
    let box_c = (c / 3) * 3;
    for br in box_r..box_r + 3 {
        for bc in box_c..box_c + 3 {
            if (br != r || bc != c) && grid.cells[br][bc].value == value {
                conflicts.push(Pos { row: br as u8, col: bc as u8 });
            }
        }
    }
    conflicts
}

pub fn check_game_status(
    grid: &Grid,
    solution: &[[u8; 9]; 9],
    error_count: u8,
    max_errors: u8,
) -> GameStatus {
    if error_count > max_errors {
        return GameStatus::Lost;
    }
    for r in 0..9 {
        for c in 0..9 {
            let v = grid.cells[r][c].value;
            if v == 0 || v != solution[r][c] {
                return GameStatus::Playing;
            }
        }
    }
    GameStatus::Won
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Cell, Highlights};

    fn make_grid() -> Grid {
        let cells = core::array::from_fn::<_, 9, _>(|_| core::array::from_fn(|_| Cell::empty()));
        Grid {
            cells,
            selected: None,
            selected_number: None,
            highlights: Highlights::empty(),
        }
    }

    #[test]
    fn test_conflict_check_clean() {
        let mut grid = make_grid();
        grid.cells[0][1].value = 5;
        let conflicts = conflict_check(&grid, 0, 0, 3);
        assert!(conflicts.is_empty());
    }

    #[test]
    fn test_conflict_check_row_conflict() {
        let mut grid = make_grid();
        grid.cells[0][1].value = 3;
        let conflicts = conflict_check(&grid, 0, 0, 3);
        assert!(!conflicts.is_empty(), "should find row conflict at (0,1)");
    }

    #[test]
    fn test_game_status_won() {
        let sol = [[1u8; 9]; 9];
        let mut grid = make_grid();
        for r in 0..9 {
            for c in 0..9 {
                grid.cells[r][c].value = 1;
            }
        }
        let status = check_game_status(&grid, &sol, 0, 3);
        assert!(matches!(status, GameStatus::Won));
    }

    #[test]
    fn test_game_status_lost() {
        let sol = [[1u8; 9]; 9];
        let status = check_game_status(&make_grid(), &sol, 4, 3);
        assert!(matches!(status, GameStatus::Lost));
    }
}
