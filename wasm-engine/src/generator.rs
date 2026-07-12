use crate::solver::count_solutions;
use crate::types::Difficulty;
use rand::prelude::*;
use rand::rngs::StdRng;
use sha2::{Digest, Sha256};

/// Generate a complete solved board using backtracking with randomized candidate order.
pub fn fill_board(rng: &mut StdRng) -> [[u8; 9]; 9] {
    let mut board = [[0u8; 9]; 9];
    fill_backtrack(&mut board, rng);
    board
}

fn fill_backtrack(board: &mut [[u8; 9]; 9], rng: &mut StdRng) -> bool {
    for r in 0..9 {
        for c in 0..9 {
            if board[r][c] == 0 {
                let mut nums: Vec<u8> = (1..=9).collect();
                nums.shuffle(rng);
                for num in nums {
                    if is_safe(board, r, c, num) {
                        board[r][c] = num;
                        if fill_backtrack(board, rng) {
                            return true;
                        }
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    true
}

fn is_safe(board: &[[u8; 9]; 9], row: usize, col: usize, num: u8) -> bool {
    for i in 0..9 {
        if board[row][i] == num || board[i][col] == num {
            return false;
        }
    }
    let br = (row / 3) * 3;
    let bc = (col / 3) * 3;
    for r in br..br + 3 {
        for c in bc..bc + 3 {
            if board[r][c] == num {
                return false;
            }
        }
    }
    true
}

/// Remove cells from a solved board while ensuring the puzzle retains a unique solution.
/// Returns the puzzle grid (with zeros for removed cells) and the solution.
pub fn dig_holes(
    solution: &[[u8; 9]; 9],
    difficulty: Difficulty,
    rng: &mut StdRng,
) -> ([[u8; 9]; 9], [[u8; 9]; 9]) {
    let target_blanks = blanks_for_difficulty(difficulty);
    let mut puzzle = *solution;

    // Create shuffled list of all 81 positions
    let mut positions: Vec<(usize, usize)> = Vec::with_capacity(81);
    for r in 0..9 {
        for c in 0..9 {
            positions.push((r, c));
        }
    }
    positions.shuffle(rng);

    let mut removed = 0;
    for (r, c) in positions {
        if removed >= target_blanks {
            break;
        }
        let backup = puzzle[r][c];
        puzzle[r][c] = 0;

        let mut board_copy = puzzle;
        if count_solutions(&mut board_copy, 2) == 1 {
            removed += 1;
        } else {
            // Restore — removal would create multiple solutions
            puzzle[r][c] = backup;
        }
    }

    (puzzle, *solution)
}

fn blanks_for_difficulty(d: Difficulty) -> usize {
    match d {
        Difficulty::Easy => 40,
        Difficulty::Medium => 48,
        Difficulty::Hard => 54,
        Difficulty::Expert => 58,
    }
}

/// Seed an RNG deterministically from a date string (YYYY-MM-DD) for daily challenges.
pub fn seed_from_date(date_str: &str) -> StdRng {
    let mut hasher = Sha256::new();
    hasher.update(date_str.as_bytes());
    let hash = hasher.finalize();
    let seed: [u8; 32] = hash.into();
    let seed_u64 = u64::from_le_bytes([
        seed[0], seed[1], seed[2], seed[3], seed[4], seed[5], seed[6], seed[7],
    ]);
    StdRng::seed_from_u64(seed_u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fill_board_is_valid() {
        let mut rng = StdRng::seed_from_u64(42);
        let board = fill_board(&mut rng);
        // Every cell filled
        for r in 0..9 {
            for c in 0..9 {
                assert!(board[r][c] >= 1 && board[r][c] <= 9);
            }
        }
        // No row/col/box conflicts
        for r in 0..9 {
            for c in 0..9 {
                let v = board[r][c];
                // Check it's safe in its position
                for i in 0..9 {
                    if i != c {
                        assert_ne!(board[r][i], v);
                    }
                    if i != r {
                        assert_ne!(board[i][c], v);
                    }
                }
            }
        }
    }

    #[test]
    fn test_dig_holes_produces_correct_blanks() {
        let mut rng = StdRng::seed_from_u64(123);
        let solution = fill_board(&mut rng);
        let mut rng2 = StdRng::seed_from_u64(456);
        let (puzzle, sol) = dig_holes(&solution, Difficulty::Easy, &mut rng2);
        let blanks: usize = puzzle
            .iter()
            .map(|row| row.iter().filter(|&&v| v == 0).count())
            .sum();
        assert_eq!(blanks, 40);
        assert_eq!(sol, solution);
    }

    #[test]
    fn test_seed_from_date_is_deterministic() {
        let mut rng1 = seed_from_date("2026-07-12");
        let mut rng2 = seed_from_date("2026-07-12");
        let v1: u32 = rng1.gen();
        let v2: u32 = rng2.gen();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_seed_from_date_different_dates() {
        let mut rng1 = seed_from_date("2026-07-12");
        let mut rng2 = seed_from_date("2026-07-13");
        let v1: u32 = rng1.gen();
        let v2: u32 = rng2.gen();
        assert_ne!(v1, v2);
    }
}
