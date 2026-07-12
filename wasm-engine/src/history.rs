use crate::types::Grid;

pub struct History {
    undo_stack: Vec<Grid>,
    redo_stack: Vec<Grid>,
    max_steps: usize,
}

impl History {
    pub fn new() -> Self {
        Self { undo_stack: Vec::with_capacity(100), redo_stack: Vec::new(), max_steps: 100 }
    }

    pub fn push(&mut self, grid: Grid) {
        self.undo_stack.push(grid);
        self.redo_stack.clear();
        if self.undo_stack.len() > self.max_steps {
            self.undo_stack.remove(0);
        }
    }

    pub fn undo(&mut self, current: &Grid) -> Option<Grid> {
        let prev = self.undo_stack.pop()?;
        self.redo_stack.push(current.clone());
        Some(prev)
    }

    pub fn redo(&mut self) -> Option<Grid> {
        let next = self.redo_stack.pop()?;
        self.undo_stack.push(next.clone());
        Some(next)
    }

    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Cell, Highlights};

    fn empty_grid() -> Grid {
        Grid {
            cells: core::array::from_fn::<_, 9, _>(|_| core::array::from_fn(|_| Cell::empty())),
            selected: None,
            selected_number: None,
            highlights: Highlights::empty(),
        }
    }

    #[test]
    fn test_undo_redo_cycle() {
        let mut h = History::new();
        let g1 = empty_grid();
        h.push(g1.clone());
        let restored = h.undo(&g1);
        assert!(restored.is_some());
        let redone = h.redo();
        assert!(redone.is_some());
    }

    #[test]
    fn test_empty_undo_returns_none() {
        let mut h = History::new();
        assert!(h.undo(&empty_grid()).is_none());
    }
}
