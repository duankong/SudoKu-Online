pub fn solve(grid: &[[u8; 9]; 9]) -> Option<[[u8; 9]; 9]> {
    let mut board = *grid;
    if solve_backtrack(&mut board) { Some(board) } else { None }
}

fn solve_backtrack(board: &mut [[u8; 9]; 9]) -> bool {
    for r in 0..9 {
        for c in 0..9 {
            if board[r][c] == 0 {
                for num in 1..=9 {
                    if is_valid(board, r, c, num) {
                        board[r][c] = num;
                        if solve_backtrack(board) { return true; }
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    true
}

pub fn is_valid(board: &[[u8; 9]; 9], row: usize, col: usize, num: u8) -> bool {
    for i in 0..9 {
        if board[row][i] == num { return false; }
        if board[i][col] == num { return false; }
    }
    let box_r = (row / 3) * 3;
    let box_c = (col / 3) * 3;
    for r in box_r..box_r + 3 {
        for c in box_c..box_c + 3 {
            if board[r][c] == num { return false; }
        }
    }
    true
}

pub fn count_solutions(board: &mut [[u8; 9]; 9], limit: u32) -> u32 {
    for r in 0..9 {
        for c in 0..9 {
            if board[r][c] == 0 {
                let mut count = 0;
                for num in 1..=9 {
                    if is_valid(board, r, c, num) {
                        board[r][c] = num;
                        count += count_solutions(board, limit - count);
                        board[r][c] = 0;
                        if count >= limit { return count; }
                    }
                }
                return count;
            }
        }
    }
    1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solve_valid_puzzle() {
        let puzzle: [[u8; 9]; 9] = [
            [5,3,0,0,7,0,0,0,0],
            [6,0,0,1,9,5,0,0,0],
            [0,9,8,0,0,0,0,6,0],
            [8,0,0,0,6,0,0,0,3],
            [4,0,0,8,0,3,0,0,1],
            [7,0,0,0,2,0,0,0,6],
            [0,6,0,0,0,0,2,8,0],
            [0,0,0,4,1,9,0,0,5],
            [0,0,0,0,8,0,0,7,9],
        ];
        let result = solve(&puzzle);
        assert!(result.is_some());
    }

    #[test]
    fn test_is_valid_detects_conflict() {
        let puzzle: [[u8; 9]; 9] = [[0; 9]; 9];
        assert!(is_valid(&puzzle, 0, 0, 5));
    }

    #[test]
    fn test_count_solutions_unique() {
        let mut puzzle: [[u8; 9]; 9] = [
            [5,3,0,0,7,0,0,0,0],
            [6,0,0,1,9,5,0,0,0],
            [0,9,8,0,0,0,0,6,0],
            [8,0,0,0,6,0,0,0,3],
            [4,0,0,8,0,3,0,0,1],
            [7,0,0,0,2,0,0,0,6],
            [0,6,0,0,0,0,2,8,0],
            [0,0,0,4,1,9,0,0,5],
            [0,0,0,0,8,0,0,7,9],
        ];
        let count = count_solutions(&mut puzzle, 2);
        assert_eq!(count, 1);
    }
}
