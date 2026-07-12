use crate::types::{Grid, Hint, Pos, StrategyType};

/// Compute valid candidates for a cell at (row, col).
pub(crate) fn candidates(grid: &Grid, row: usize, col: usize) -> Vec<u8> {
    if grid.cells[row][col].value != 0 {
        return vec![];
    }
    let mut used = [false; 10];
    for i in 0..9 {
        let v = grid.cells[row][i].value;
        if v != 0 {
            used[v as usize] = true;
        }
        let v = grid.cells[i][col].value;
        if v != 0 {
            used[v as usize] = true;
        }
    }
    let br = (row / 3) * 3;
    let bc = (col / 3) * 3;
    for r in br..br + 3 {
        for c in bc..bc + 3 {
            let v = grid.cells[r][c].value;
            if v != 0 {
                used[v as usize] = true;
            }
        }
    }
    (1..=9).filter(|&n| !used[n as usize]).collect()
}

/// Build a human-readable candidate list string (e.g. "1, 3, 5").
fn candidate_names(nums: &[u8]) -> String {
    let v: Vec<String> = nums.iter().map(|n| n.to_string()).collect();
    v.join(", ")
}

/// Main entry: find the simplest available hint. Returns None if board is full.
pub fn find_hint(grid: &Grid) -> Option<Hint> {
    // Try strategies in order of simplicity
    naked_single(grid)
        .or_else(|| hidden_single(grid))
        .or_else(|| naked_pair(grid))
        .or_else(|| hidden_pair(grid))
        .or_else(|| pointing(grid))
        .or_else(|| box_line_reduction(grid))
        .or_else(|| x_wing(grid))
        .or_else(|| solver_fallback(grid))
}

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

// ── Strategy 1: Naked Single ────────────────────────────────────────────

fn naked_single(grid: &Grid) -> Option<Hint> {
    for r in 0..9usize {
        for c in 0..9usize {
            let cands = candidates(grid, r, c);
            if cands.len() == 1 {
                let v = cands[0];
                return Some(Hint {
                    strategy: StrategyType::NakedSingle,
                    target: Pos {
                        row: r as u8,
                        col: c as u8,
                    },
                    value: v,
                    related_cells: vec![],
                    eliminated: vec![],
                    message_cn: format!(
                        "唯一数（Naked Single）：该单元格所在行、列、宫格已包含其他所有数字，只有 {} 可以填入。",
                        v
                    ),
                });
            }
        }
    }
    None
}

// ── Strategy 2: Hidden Single ───────────────────────────────────────────

fn hidden_single(grid: &Grid) -> Option<Hint> {
    // Check rows
    for r in 0..9usize {
        for num in 1..=9 {
            let mut found: Option<(usize, Vec<u8>)> = None;
            for c in 0..9usize {
                let cands = candidates(grid, r, c);
                if cands.contains(&num) {
                    if found.is_some() {
                        found = None;
                        break; // appears in >1 cell, not hidden
                    }
                    found = Some((c, cands));
                }
            }
            if let Some((c, cands)) = found {
                return Some(hidden_single_hint(r, c, num, cands, "行"));
            }
        }
    }
    // Check columns
    for c in 0..9usize {
        for num in 1..=9 {
            let mut found: Option<(usize, Vec<u8>)> = None;
            for r in 0..9usize {
                let cands = candidates(grid, r, c);
                if cands.contains(&num) {
                    if found.is_some() {
                        found = None;
                        break;
                    }
                    found = Some((r, cands));
                }
            }
            if let Some((r, cands)) = found {
                return Some(hidden_single_hint(r, c, num, cands, "列"));
            }
        }
    }
    // Check boxes
    for br in (0..3).map(|x| x * 3) {
        for bc in (0..3).map(|x| x * 3) {
            for num in 1..=9 {
                let mut found: Option<(usize, usize, Vec<u8>)> = None;
                'box_loop: for r in br..br + 3 {
                    for c in bc..bc + 3 {
                        let cands = candidates(grid, r, c);
                        if cands.contains(&num) {
                            if found.is_some() {
                                found = None;
                                break 'box_loop;
                            }
                            found = Some((r, c, cands));
                        }
                    }
                }
                if let Some((r, c, cands)) = found {
                    return Some(hidden_single_hint(r, c, num, cands, "宫格"));
                }
            }
        }
    }
    None
}

fn hidden_single_hint(r: usize, c: usize, num: u8, cands: Vec<u8>, unit: &str) -> Hint {
    let others: Vec<String> = cands.iter().filter(|&&n| n != num).map(|n| n.to_string()).collect();
    Hint {
        strategy: StrategyType::HiddenSingle,
        target: Pos {
            row: r as u8,
            col: c as u8,
        },
        value: num,
        related_cells: vec![],
        eliminated: cands.iter().filter(|&&n| n != num).copied().collect(),
        message_cn: format!(
            "隐性唯一数（Hidden Single）：在该{}中，数字 {} 只能出现在 ({},{}) 这一个位置，排除候选数 [{}]。",
            unit,
            num,
            r + 1,
            c + 1,
            others.join(", ")
        ),
    }
}

// ── Strategy 3: Naked Pair ──────────────────────────────────────────────

fn naked_pair(grid: &Grid) -> Option<Hint> {
    // Check rows
    for r in 0..9usize {
        if let Some(h) = find_naked_pair_in_cells(grid, (0..9).map(|c| (r, c)).collect()) {
            return Some(h);
        }
    }
    // Check cols
    for c in 0..9usize {
        if let Some(h) = find_naked_pair_in_cells(grid, (0..9).map(|r| (r, c)).collect()) {
            return Some(h);
        }
    }
    // Check boxes
    for br in (0..3).map(|x| x * 3) {
        for bc in (0..3).map(|x| x * 3) {
            let cells: Vec<(usize, usize)> =
                (br..br + 3).flat_map(|r| (bc..bc + 3).map(move |c| (r, c))).collect();
            if let Some(h) = find_naked_pair_in_cells(grid, cells) {
                return Some(h);
            }
        }
    }
    None
}

fn find_naked_pair_in_cells(grid: &Grid, cell_positions: Vec<(usize, usize)>) -> Option<Hint> {
    let cells_with_cands: Vec<(usize, usize, Vec<u8>)> = cell_positions
        .into_iter()
        .map(|(r, c)| (r, c, candidates(grid, r, c)))
        .filter(|(_, _, cands)| cands.len() == 2)
        .collect();

    for i in 0..cells_with_cands.len() {
        for j in (i + 1)..cells_with_cands.len() {
            let (r1, c1, ref cands1) = cells_with_cands[i];
            let (r2, c2, ref cands2) = cells_with_cands[j];
            if cands1 == cands2 {
                let n1 = cands1[0];
                let n2 = cands1[1];
                // Check if these candidates appear in OTHER cells — if so, we can eliminate
                let mut eliminated = Vec::new();
                let related = vec![
                    Pos { row: r1 as u8, col: c1 as u8 },
                    Pos { row: r2 as u8, col: c2 as u8 },
                ];
                for (r3, c3, _) in &cells_with_cands {
                    if (*r3, *c3) == (r1, c1) || (*r3, *c3) == (r2, c2) {
                        continue;
                    }
                    // We found the pair, but we need to check if n1 or n2 appear in other cells' candidates
                }
                // Find cells in the same unit that also contain n1 or n2
                let all_positions: Vec<(usize, usize)> = if r1 == r2 {
                    (0..9).map(|c| (r1, c)).collect()
                } else if c1 == c2 {
                    (0..9).map(|r| (r, c1)).collect()
                } else {
                    let br = (r1 / 3) * 3;
                    let bc = (c1 / 3) * 3;
                    (br..br + 3).flat_map(|r| (bc..bc + 3).map(move |c| (r, c))).collect()
                };
                for (r, c) in &all_positions {
                    if (*r == r1 && *c == c1) || (*r == r2 && *c == c2) {
                        continue;
                    }
                    let cands = candidates(grid, *r, *c);
                    if cands.contains(&n1) {
                        eliminated.push(n1);
                    }
                    if cands.contains(&n2) {
                        eliminated.push(n2);
                    }
                }
                eliminated.dedup();
                if !eliminated.is_empty() {
                    return Some(Hint {
                        strategy: StrategyType::NakedPair,
                        target: Pos { row: r1 as u8, col: c1 as u8 },
                        value: 0,
                        related_cells: related,
                        eliminated,
                        message_cn: format!(
                            "数对（Naked Pair）：两个单元格 ({},{}) 和 ({},{}) 的候选数都是 [{} 和 {}]，\
                             因此该区域其他单元格可以排除这两个数字。",
                            r1 + 1, c1 + 1, r2 + 1, c2 + 1, n1, n2
                        ),
                    });
                }
            }
        }
    }
    None
}

// ── Strategy 4: Hidden Pair ─────────────────────────────────────────────

fn hidden_pair(grid: &Grid) -> Option<Hint> {
    // For each row, col, box: find two candidates that appear in exactly the same two cells
    for r in 0..9usize {
        if let Some(h) = find_hidden_pair_in_unit(grid, (0..9).map(|c| (r, c)).collect()) {
            return Some(h);
        }
    }
    for c in 0..9usize {
        if let Some(h) = find_hidden_pair_in_unit(grid, (0..9).map(|r| (r, c)).collect()) {
            return Some(h);
        }
    }
    for br in (0..3).map(|x| x * 3) {
        for bc in (0..3).map(|x| x * 3) {
            let cells: Vec<(usize, usize)> =
                (br..br + 3).flat_map(|r| (bc..bc + 3).map(move |c| (r, c))).collect();
            if let Some(h) = find_hidden_pair_in_unit(grid, cells) {
                return Some(h);
            }
        }
    }
    None
}

fn find_hidden_pair_in_unit(grid: &Grid, positions: Vec<(usize, usize)>) -> Option<Hint> {
    // For each candidate 1-9, track which cells contain it
    for n1 in 1..=9 {
        for n2 in (n1 + 1)..=9 {
            let mut cells_n1: Vec<(usize, usize)> = vec![];
            let mut cells_n2: Vec<(usize, usize)> = vec![];
            for &(r, c) in &positions {
                let cands = candidates(grid, r, c);
                if cands.contains(&n1) {
                    cells_n1.push((r, c));
                }
                if cands.contains(&n2) {
                    cells_n2.push((r, c));
                }
            }
            // Hidden pair: both n1 and n2 appear in exactly the same two cells
            if cells_n1.len() == 2 && cells_n2.len() == 2 && cells_n1 == cells_n2 {
                let (r1, c1) = cells_n1[0];
                let (r2, c2) = cells_n1[1];
                // Check if these cells have extra candidates to eliminate
                let cands1 = candidates(grid, r1, c1);
                let mut eliminated = vec![];
                for &n in &cands1 {
                    if n != n1 && n != n2 {
                        eliminated.push(n);
                    }
                }
                let cands2 = candidates(grid, r2, c2);
                for &n in &cands2 {
                    if n != n1 && n != n2 && !eliminated.contains(&n) {
                        eliminated.push(n);
                    }
                }
                if !eliminated.is_empty() {
                    return Some(Hint {
                        strategy: StrategyType::HiddenPair,
                        target: Pos { row: r1 as u8, col: c1 as u8 },
                        value: 0,
                        related_cells: vec![
                            Pos { row: r1 as u8, col: c1 as u8 },
                            Pos { row: r2 as u8, col: c2 as u8 },
                        ],
                        eliminated,
                        message_cn: format!(
                            "隐性数对（Hidden Pair）：数字 {} 和 {} 在该区域中只能出现在 ({},{}) 和 ({},{}) 两个位置，\
                             因此这两个单元格的其他候选数可以排除。",
                            n1, n2, r1+1, c1+1, r2+1, c2+1
                        ),
                    });
                }
            }
        }
    }
    None
}

// ── Strategy 5: Pointing Pair ───────────────────────────────────────────

fn pointing(grid: &Grid) -> Option<Hint> {
    for br in (0..3).map(|x| x * 3) {
        for bc in (0..3).map(|x| x * 3) {
            for num in 1..=9 {
                let mut rows = vec![];
                let mut cols = vec![];
                for r in br..br + 3 {
                    for c in bc..bc + 3 {
                        let cands = candidates(grid, r, c);
                        if cands.contains(&num) {
                            rows.push(r);
                            cols.push(c);
                        }
                    }
                }
                if rows.is_empty() {
                    continue;
                }
                // Check if all occurrences are in the same row
                let first_row = rows[0];
                if rows.iter().all(|&r| r == first_row) {
                    // Pointing: num in this box only appears in one row
                    // Can eliminate num from that row outside the box
                    let cols_in_row: Vec<usize> = (0..9)
                        .filter(|&c| c < bc || c >= bc + 3)
                        .filter(|&c| candidates(grid, first_row, c).contains(&num))
                        .collect();
                    if !cols_in_row.is_empty() {
                        let related: Vec<Pos> = (bc..bc + 3)
                            .map(|c| Pos { row: first_row as u8, col: c as u8 })
                            .collect();
                        return Some(Hint {
                            strategy: StrategyType::Pointing,
                            target: Pos { row: first_row as u8, col: cols_in_row[0] as u8 },
                            value: 0,
                            related_cells: related,
                            eliminated: vec![num],
                            message_cn: format!(
                                "指向数（Pointing）：在该宫格中，数字 {} 只能出现在第 {} 行，\
                                 因此该行其他宫格的候选数 {} 可以排除。",
                                num, first_row + 1, num
                            ),
                        });
                    }
                }
                // Check if all occurrences are in the same column
                let first_col = cols[0];
                if cols.iter().all(|&c| c == first_col) {
                    let rows_in_col: Vec<usize> = (0..9)
                        .filter(|&r| r < br || r >= br + 3)
                        .filter(|&r| candidates(grid, r, first_col).contains(&num))
                        .collect();
                    if !rows_in_col.is_empty() {
                        let related: Vec<Pos> = (br..br + 3)
                            .map(|r| Pos { row: r as u8, col: first_col as u8 })
                            .collect();
                        return Some(Hint {
                            strategy: StrategyType::Pointing,
                            target: Pos { row: rows_in_col[0] as u8, col: first_col as u8 },
                            value: 0,
                            related_cells: related,
                            eliminated: vec![num],
                            message_cn: format!(
                                "指向数（Pointing）：在该宫格中，数字 {} 只能出现在第 {} 列，\
                                 因此该列其他宫格的候选数 {} 可以排除。",
                                num, first_col + 1, num
                            ),
                        });
                    }
                }
            }
        }
    }
    None
}

// ── Strategy 6: Box/Line Reduction ──────────────────────────────────────

fn box_line_reduction(grid: &Grid) -> Option<Hint> {
    // For each row: if a candidate only appears within one box, eliminate from rest of box
    for r in 0..9usize {
        for num in 1..=9 {
            let mut box_indices = std::collections::BTreeSet::new();
            for c in 0..9usize {
                if candidates(grid, r, c).contains(&num) {
                    box_indices.insert(c / 3);
                }
            }
            if box_indices.len() == 1 {
                let bc = *box_indices.first().unwrap() * 3;
                let br = (r / 3) * 3;
                let mut elim_cells = vec![];
                for rr in br..br + 3 {
                    for cc in bc..bc + 3 {
                        if rr != r && candidates(grid, rr, cc).contains(&num) {
                            elim_cells.push((rr, cc));
                        }
                    }
                }
                if !elim_cells.is_empty() {
                    let related: Vec<Pos> = (0..9)
                        .filter(|&c| candidates(grid, r, c).contains(&num))
                        .map(|c| Pos { row: r as u8, col: c as u8 })
                        .collect();
                    return Some(Hint {
                        strategy: StrategyType::BoxLineReduction,
                        target: Pos { row: elim_cells[0].0 as u8, col: elim_cells[0].1 as u8 },
                        value: 0,
                        related_cells: related,
                        eliminated: vec![num],
                        message_cn: format!(
                            "宫线删减（Box/Line Reduction）：第 {} 行的数字 {} 只能出现在一个宫格中，\
                             因此该宫格其他行的候选数 {} 可以排除。",
                            r + 1, num, num
                        ),
                    });
                }
            }
        }
    }
    // Same for columns
    for c in 0..9usize {
        for num in 1..=9 {
            let mut box_indices = std::collections::BTreeSet::new();
            for r in 0..9usize {
                if candidates(grid, r, c).contains(&num) {
                    box_indices.insert(r / 3);
                }
            }
            if box_indices.len() == 1 {
                let br = *box_indices.first().unwrap() * 3;
                let bc = (c / 3) * 3;
                let mut elim_cells = vec![];
                for rr in br..br + 3 {
                    for cc in bc..bc + 3 {
                        if cc != c && candidates(grid, rr, cc).contains(&num) {
                            elim_cells.push((rr, cc));
                        }
                    }
                }
                if !elim_cells.is_empty() {
                    let related: Vec<Pos> = (0..9)
                        .filter(|&r| candidates(grid, r, c).contains(&num))
                        .map(|r| Pos { row: r as u8, col: c as u8 })
                        .collect();
                    return Some(Hint {
                        strategy: StrategyType::BoxLineReduction,
                        target: Pos { row: elim_cells[0].0 as u8, col: elim_cells[0].1 as u8 },
                        value: 0,
                        related_cells: related,
                        eliminated: vec![num],
                        message_cn: format!(
                            "宫线删减（Box/Line Reduction）：第 {} 列的数字 {} 只能出现在一个宫格中，\
                             因此该宫格其他列的候选数 {} 可以排除。",
                            c + 1, num, num
                        ),
                    });
                }
            }
        }
    }
    None
}

// ── Strategy 7: X-Wing ──────────────────────────────────────────────────

fn x_wing(grid: &Grid) -> Option<Hint> {
    for num in 1..=9 {
        // Row-based X-Wing: find two rows where num appears in exactly the same two columns
        let mut row_positions: Vec<(usize, Vec<usize>)> = vec![];
        for r in 0..9usize {
            let cols: Vec<usize> = (0..9).filter(|&c| candidates(grid, r, c).contains(&num)).collect();
            if cols.len() == 2 {
                row_positions.push((r, cols));
            }
        }
        for i in 0..row_positions.len() {
            for j in (i + 1)..row_positions.len() {
                let (r1, ref cols1) = row_positions[i];
                let (r2, ref cols2) = row_positions[j];
                if cols1 == cols2 {
                    let c1 = cols1[0];
                    let c2 = cols1[1];
                    // Can eliminate num from c1 and c2 in all other rows
                    let mut eliminated = 0u32;
                    for r in 0..9usize {
                        if r != r1 && r != r2 {
                            if candidates(grid, r, c1).contains(&num) { eliminated += 1; }
                            if candidates(grid, r, c2).contains(&num) { eliminated += 1; }
                        }
                    }
                    if eliminated > 0 {
                        return Some(Hint {
                            strategy: StrategyType::XWing,
                            target: Pos { row: r1 as u8, col: c1 as u8 },
                            value: num,
                            related_cells: vec![
                                Pos { row: r1 as u8, col: c1 as u8 },
                                Pos { row: r1 as u8, col: c2 as u8 },
                                Pos { row: r2 as u8, col: c1 as u8 },
                                Pos { row: r2 as u8, col: c2 as u8 },
                            ],
                            eliminated: vec![num],
                            message_cn: format!(
                                "X翼（X-Wing）：数字 {} 在第 {} 行和第 {} 行都只能出现在第 {} 列和第 {} 列，\
                                 形成矩形(行), 因此这两列的其他行可以排除数字 {}。",
                                num, r1+1, r2+1, c1+1, c2+1, num
                            ),
                        });
                    }
                }
            }
        }
        // Column-based X-Wing
        let mut col_positions: Vec<(usize, Vec<usize>)> = vec![];
        for c in 0..9usize {
            let rows: Vec<usize> = (0..9).filter(|&r| candidates(grid, r, c).contains(&num)).collect();
            if rows.len() == 2 {
                col_positions.push((c, rows));
            }
        }
        for i in 0..col_positions.len() {
            for j in (i + 1)..col_positions.len() {
                let (c1, ref rows1) = col_positions[i];
                let (c2, ref rows2) = col_positions[j];
                if rows1 == rows2 {
                    let r1 = rows1[0];
                    let r2 = rows1[1];
                    let mut eliminated = 0u32;
                    for c in 0..9usize {
                        if c != c1 && c != c2 {
                            if candidates(grid, r1, c).contains(&num) { eliminated += 1; }
                            if candidates(grid, r2, c).contains(&num) { eliminated += 1; }
                        }
                    }
                    if eliminated > 0 {
                        return Some(Hint {
                            strategy: StrategyType::XWing,
                            target: Pos { row: r1 as u8, col: c1 as u8 },
                            value: num,
                            related_cells: vec![
                                Pos { row: r1 as u8, col: c1 as u8 },
                                Pos { row: r1 as u8, col: c2 as u8 },
                                Pos { row: r2 as u8, col: c1 as u8 },
                                Pos { row: r2 as u8, col: c2 as u8 },
                            ],
                            eliminated: vec![num],
                            message_cn: format!(
                                "X翼（X-Wing）：数字 {} 在第 {} 列和第 {} 列都只能出现在第 {} 行和第 {} 行，\
                                 形成矩形(列), 因此这两行的其他列可以排除数字 {}。",
                                num, c1+1, c2+1, r1+1, r2+1, num
                            ),
                        });
                    }
                }
            }
        }
    }
    None
}

// ── Strategy 8: Solver Fallback ─────────────────────────────────────────

fn solver_fallback(grid: &Grid) -> Option<Hint> {
    // Use the brute-force solver to find the next cell
    let mut board = [[0u8; 9]; 9];
    for r in 0..9usize {
        for c in 0..9usize {
            board[r][c] = grid.cells[r][c].value;
        }
    }
    let solution = crate::solver::solve(&board)?;
    // Find first empty cell and return its solution value
    for r in 0..9usize {
        for c in 0..9usize {
            if grid.cells[r][c].value == 0 {
                let v = solution[r][c];
                let cands = candidates(grid, r, c);
                let cand_str = candidate_names(&cands);
                return Some(Hint {
                    strategy: StrategyType::SolverFallback,
                    target: Pos { row: r as u8, col: c as u8 },
                    value: v,
                    related_cells: vec![],
                    eliminated: vec![],
                    message_cn: format!(
                        "回溯求解（Solver）：该单元格({},{})的候选数为 [{}]，\
                         通过回溯搜索确定答案为 {}。建议先观察周围单元格的逻辑关系。",
                        r + 1, c + 1, cand_str, v
                    ),
                });
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Cell, Highlights};

    fn make_grid_from_values(values: [[u8; 9]; 9]) -> Grid {
        let cells = core::array::from_fn::<_, 9, _>(|r| {
            core::array::from_fn(|c| {
                let v = values[r][c];
                if v != 0 {
                    Cell { value: v, notes: vec![], is_given: true, is_error: false }
                } else {
                    Cell::empty()
                }
            })
        });
        Grid {
            cells,
            selected: None,
            selected_number: None,
            highlights: Highlights::empty(),
        }
    }

    #[test]
    fn test_naked_single_found() {
        // A grid where one cell has only one candidate
        let mut values = [[0u8; 9]; 9];
        // Fill row 0 with 1..8, leaving col 8 empty with only candidate 9
        for c in 0..8 {
            values[0][c] = (c + 1) as u8;
        }
        values[1][0] = 9; // block the box
        let grid = make_grid_from_values(values);
        let hint = naked_single(&grid);
        assert!(hint.is_some());
        let h = hint.unwrap();
        assert_eq!(h.target, Pos { row: 0, col: 8 });
        assert_eq!(h.value, 9);
    }

    #[test]
    fn test_find_hint_returns_simplest() {
        // Nearly full grid with one obvious empty
        let mut values = [[0u8; 9]; 9];
        for c in 0..8 {
            values[0][c] = (c + 1) as u8;
        }
        values[1][0] = 9;
        let grid = make_grid_from_values(values);
        let hint = find_hint(&grid);
        assert!(hint.is_some());
        assert!(matches!(hint.unwrap().strategy, StrategyType::NakedSingle));
    }

    #[test]
    fn test_no_hint_on_full_grid() {
        // Use a valid solved grid
        let puzzle: [[u8; 9]; 9] = [
            [5,3,4,6,7,8,9,1,2],
            [6,7,2,1,9,5,3,4,8],
            [1,9,8,3,4,2,5,6,7],
            [8,5,9,7,6,1,4,2,3],
            [4,2,6,8,5,3,7,9,1],
            [7,1,3,9,2,4,8,5,6],
            [9,6,1,5,3,7,2,8,4],
            [2,8,7,4,1,9,6,3,5],
            [3,4,5,2,8,6,1,7,9],
        ];
        let grid = make_grid_from_values(puzzle);
        let hint = find_hint(&grid);
        assert!(hint.is_none());
    }
}
