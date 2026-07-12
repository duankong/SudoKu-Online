# Sudoku Calm 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Sudoku Calm — React + Rust WASM 数独游戏，托管 GitHub Pages，带智能提示引擎。

**Architecture:** Rust WASM 持有权威游戏状态，`dispatch(action)` 纯函数模式。React 端薄渲染层，`onPointerDown` 零延迟触控，预计算高亮集合 O(1) 查表。JSON 通信，ts-rs 自动类型生成。

**Tech Stack:** React 18 + TypeScript, Vite 5, Tailwind CSS 3, React Router v6 (createHashRouter), Rust + wasm-pack, ts-rs, serde_json

## Global Constraints

- React 18+ TypeScript, Vite 5 构建, Hash 路由模式兼容 GitHub Pages
- Tailwind CSS 3, 色板见 spec 第八章
- Rust WASM 持有权威 GameState, 前端不可篡改 state
- `dispatch(action_json)` 单向入口, WASM 不接收前端 state JSON
- `onPointerDown` 替代 `onClick` 消除移动端延迟
- Timer 为 React 本地状态, 不进入 WASM
- `sound`/`haptics` 为 UISettings (React-only), 不跨越 WASM 边界
- GameSettings (Rust): `show_timer`, `show_hints`, `highlight_areas`, `highlight_numbers`
- localStorage 含 version + checksum 信封
- WASM 编译: `opt-level = "s"`, `lto = true`, `strip = true`
- 触控目标: 单元格 ≥44px, NumberPad ≥48px
- `git diff --exit-code` 守卫 ts-rs 生成类型与源码同步
- CI 含 cargo audit + npm audit
- 所有组件无状态 props 驱动; Cell.tsx + React.memo

---

## Phase 1: 项目脚手架与配置

### Task 1.1: Cargo workspace + Rust 项目初始化

**Files:**
- Create: `Cargo.toml`
- Create: `wasm-engine/Cargo.toml`
- Create: `wasm-engine/src/lib.rs`
- Create: `wasm-engine/src/types.rs`

**Interfaces:**
- Produces: `wasm-engine/` crate with `cdylib` target, serde/serde_json/wasm-bindgen/ts-rs dependencies

- [ ] **Step 1: 创建 workspace root Cargo.toml**

```toml
[workspace]
members = ["wasm-engine"]
resolver = "2"
```

- [ ] **Step 2: 创建 wasm-engine/Cargo.toml**

```toml
[package]
name = "sudokucalm-engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
ts-rs = "10"
sha2 = "0.10"
rand = "0.8"

[profile.release]
opt-level = "s"
lto = true
strip = true
```

- [ ] **Step 3: 创建 wasm-engine/src/lib.rs 骨架**

```rust
use wasm_bindgen::prelude::*;

mod types;

#[wasm_bindgen(start)]
pub fn main() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}
```

- [ ] **Step 4: 验证 `cargo check` 通过**

```bash
cd wasm-engine && cargo check
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add Cargo.toml wasm-engine/Cargo.toml wasm-engine/src/lib.rs
git commit -m "feat: init cargo workspace and wasm-engine crate"
```

---

### Task 1.2: 前端项目脚手架 (Vite + React + TS + Tailwind + Router)

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/types/index.ts`

**Interfaces:**
- Produces: Vite dev server at localhost:5173, Tailwind JIT, HashRouter with 3 routes

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "sudokucalm",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:wasm": "wasm-pack build wasm-engine --target web --out-dir ../src/wasm-pkg",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3",
    "vite": "^5.3.4"
  }
}
```

- [ ] **Step 2: `npm install`**

```bash
npm install
```

- [ ] **Step 3: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'none'; font-src 'self'; media-src 'self'; img-src 'self' data:;" />
  <title>Sudoku Calm</title>
</head>
<body class="bg-white text-ink-dark antialiased">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_URL || '/',
});
```

- [ ] **Step 5: 创建 tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#3654D2', light: '#DDE6F9' },
        accent: '#E4C779',
        ink: { dark: '#1C1C1E', mid: '#767680', light: '#D0D7E5' },
        border: '#8294B4',
        error: '#C62828',
      },
      fontSize: {
        cell: ['1.75rem', { lineHeight: '1' }],
        note: ['0.65rem', { lineHeight: '1.2' }],
      },
      keyframes: {
        'hint-flash': {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'hint-flash': 'hint-flash 0.5s ease-in-out 3',
        'shake': 'shake 0.3s ease-in-out',
        'pop-in': 'pop-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: 创建 postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: 创建 src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 9: 创建 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 10: 创建 src/App.tsx**

```tsx
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Game } from './pages/Game';
import { Settings } from './pages/Settings';

const router = createHashRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/game', element: <Game /> },
  { path: '/settings', element: <Settings /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 11: 创建占位 pages**

Create `src/pages/Dashboard.tsx`:
```tsx
export function Dashboard() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Sudoku Calm</h1></div>;
}
```

Create `src/pages/Game.tsx`:
```tsx
export function Game() {
  return <div className="p-8"><h1>Game</h1></div>;
}
```

Create `src/pages/Settings.tsx`:
```tsx
export function Settings() {
  return <div className="p-8"><h1>Settings</h1></div>;
}
```

- [ ] **Step 12: 创建 src/types/index.ts**

```ts
export interface UISettings {
  sound: boolean;
  haptics: boolean;
}
```

- [ ] **Step 13: 验证 `npm run dev` 启动成功**

Expected: Vite dev server starts at http://localhost:5173, clicking between routes works

- [ ] **Step 14: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tailwind.config.ts tsconfig.json postcss.config.js src/
git commit -m "feat: scaffold Vite + React + TS + Tailwind + Router project"
```

---

## Phase 2: Rust 核心数据结构与基础算法

### Task 2.1: Rust types — 所有共享数据结构 + ts-rs 导出

**Files:**
- Create: `wasm-engine/src/types.rs`

**Interfaces:**
- Produces: `Cell`, `Pos`, `Grid`, `Highlights`, `GameState`, `GameStatus`, `Difficulty`, `GameSettings`, `Hint`, `StrategyType`, `Action` — 全部带 `#[derive(TS)]`

- [ ] **Step 1: 写 types.rs 完整代码**

```rust
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Pos {
    pub row: u8,
    pub col: u8,
}

#[derive(Clone, Serialize, Deserialize, TS)]
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

#[derive(Clone, Serialize, Deserialize, TS)]
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

#[derive(Clone, Serialize, Deserialize, TS)]
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

#[derive(Clone, Serialize, TS)]
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
    UpdateGameSettings { settings: GameSettings },
    SetFinalTime { seconds: u32 },
}
```

- [ ] **Step 2: 生成 TypeScript 类型 — 添加 test 导出函数**

Add to `wasm-engine/src/lib.rs` (after existing `mod types;`):
```rust
#[cfg(test)]
mod tests {
    use super::types::*;
    use ts_rs::TS;

    #[test]
    fn export_types() {
        GameState::export_all_to("../../src/types/generated.ts").unwrap();
    }
}
```

- [ ] **Step 3: 运行类型生成**

```bash
cd wasm-engine && cargo test export_types -- --nocapture
```
Expected: creates `src/types/generated.ts`

- [ ] **Step 4: 验证生成的 generated.ts 存在且包含 GameState**

```bash
head -20 src/types/generated.ts
```

- [ ] **Step 5: 更新 src/types/index.ts — 再导出 generated types**

Add to `src/types/index.ts`:
```ts
export type {
  Cell, Pos, Grid, Highlights, GameState, GameStatus,
  Difficulty, GameSettings, StrategyType, Hint, Action,
} from './generated';
```

- [ ] **Step 6: Commit**

```bash
git add wasm-engine/src/types.rs wasm-engine/src/lib.rs src/types/
git commit -m "feat: add Rust shared types with ts-rs TypeScript export"
```

---

### Task 2.2: Grid 基本操作

**Files:**
- Create: `wasm-engine/src/grid.rs`

**Interfaces:**
- Produces: `Grid::new(solution, puzzle)`, `Grid::set_value()`, `Grid::erase_cell()`, `Grid::toggle_note()`, `Grid::smart_erase_notes()`, `Grid::get_cell()`

- [ ] **Step 1: 写 grid.rs**

```rust
use crate::types::{Cell, Grid, Highlights, Pos};

impl Grid {
    pub fn new(givens: [[u8; 9]; 9]) -> Self {
        let mut cells = [[Cell::empty(); 9]; 9];
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
```

- [ ] **Step 2: 更新 lib.rs — 注册模块**

```rust
mod grid;
```

- [ ] **Step 3: `cargo check`**

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/grid.rs wasm-engine/src/lib.rs
git commit -m "feat: add Grid struct with set/erase/toggle/smart_erase operations"
```

---

### Task 2.3: Solver — 回溯求解器

**Files:**
- Create: `wasm-engine/src/solver.rs`

**Interfaces:**
- Produces: `pub fn solve(grid: &[[u8; 9]; 9]) -> Option<[[u8; 9]; 9]>`, `pub fn count_solutions(grid: &[[u8; 9]; 9], limit: u32) -> u32`

- [ ] **Step 1: 写 solver.rs**

```rust
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
```

- [ ] **Step 2: 写 solver 单元测试**

Add to `wasm-engine/src/solver.rs`:
```rust
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
```

- [ ] **Step 3: Run tests**

```bash
cd wasm-engine && cargo test solver
```
Expected: 3 tests pass

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/solver.rs wasm-engine/src/lib.rs
git commit -m "feat: add backtracking solver with uniqueness checker"
```

---

### Task 2.4: Validator — 冲突校验 + 完成判定

**Files:**
- Create: `wasm-engine/src/validator.rs`

**Interfaces:**
- Produces: `pub fn conflict_check(grid: &Grid, row: u8, col: u8, value: u8) -> Vec<Pos>`, `pub fn check_game_status(grid: &Grid, solution: &[[u8; 9]; 9], error_count: u8, max_errors: u8) -> GameStatus`

- [ ] **Step 1: 写 validator.rs**

```rust
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
```

- [ ] **Step 2: 写 validator 测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Cell;

    fn make_grid() -> Grid {
        let cells = [[Cell::empty(); 9]; 9];
        Grid {
            cells,
            selected: None,
            selected_number: None,
            highlights: crate::types::Highlights::empty(),
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
        assert_eq!(conflicts.len(), 1);
    }

    #[test]
    fn test_game_status_won() {
        let sol = [[1u8; 9]; 9];
        let mut grid = make_grid();
        for r in 0..9 { for c in 0..9 { grid.cells[r][c].value = 1; } }
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
```

- [ ] **Step 3: `cargo test validator`**

Expected: 4 tests pass

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/validator.rs wasm-engine/src/lib.rs
git commit -m "feat: add validator with conflict check and game status"
```

---

## Phase 3: Rust 游戏引擎核心

### Task 3.1: History — 撤销/重做栈

**Files:**
- Create: `wasm-engine/src/history.rs`

**Interfaces:**
- Produces: `pub struct History { undo_stack: Vec<Grid>, redo_stack: Vec<Grid> }`, `History::push()`, `History::undo()`, `History::redo()`

- [ ] **Step 1: 写 history.rs**

```rust
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
}
```

- [ ] **Step 2: 写测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Cell, Highlights};

    fn empty_grid() -> Grid {
        Grid {
            cells: [[Cell::empty(); 9]; 9],
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
        let h = History::new();
        assert!(h.undo(&empty_grid()).is_none());
    }
}
```

- [ ] **Step 3: `cargo test history`**

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/history.rs wasm-engine/src/lib.rs
git commit -m "feat: add undo/redo history stack"
```

---

### Task 3.2: Highlight — 高亮计算

**Files:**
- Create: `wasm-engine/src/highlight.rs`

**Interfaces:**
- Produces: `pub fn compute(grid: &Grid, settings: &GameSettings, hint_cells: &[Pos]) -> Highlights`

- [ ] **Step 1: 写 highlight.rs**

```rust
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
                for r in 0..9 {
                    for c in 0..9 {
                        if (r != sel.row || c != sel.col) && grid.cells[r][c].value == v {
                            same_number.push(Pos { row: r as u8, col: c as u8 });
                        }
                    }
                }
            }
        }
    }

    for r in 0..9 {
        for c in 0..9 {
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
```

- [ ] **Step 2: 写测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Cell, GameSettings};

    #[test]
    fn test_selected_highlights_area() {
        let cells = [[Cell::empty(); 9]; 9];
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
```

- [ ] **Step 3: `cargo test highlight`**

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/highlight.rs wasm-engine/src/lib.rs
git commit -m "feat: add highlight computation (related area + same number + errors)"
```

---

## Phase 4: 题目生成与每日挑战

### Task 4.1: Generator — 题目生成

**Files:**
- Create: `wasm-engine/src/generator.rs`

**Interfaces:**
- Produces: `pub fn generate(difficulty: &Difficulty, rng_seed: u64) -> ([[u8; 9]; 9], [[u8; 9]; 9])` returning (puzzle, solution)

- [ ] **Step 1: 写 generator.rs**

```rust
use crate::solver;
use crate::types::Difficulty;
use rand::prelude::*;
use rand::rngs::StdRng;

pub fn generate(difficulty: &Difficulty, rng_seed: u64) -> ([[u8; 9]; 9], [[u8; 9]; 9]) {
    let mut rng = StdRng::seed_from_u64(rng_seed);
    let solution = {
        let mut board = [[0u8; 9]; 9];
        fill_board(&mut board, &mut rng);
        board
    };
    let givens_target = match difficulty {
        Difficulty::Easy => rng.gen_range(35..=40),
        Difficulty::Medium => rng.gen_range(28..=34),
        Difficulty::Hard => rng.gen_range(22..=27),
        Difficulty::Expert => rng.gen_range(17..=21),
    };
    let puzzle = dig_holes(&solution, givens_target, &mut rng);
    (puzzle, solution)
}

fn fill_board(board: &mut [[u8; 9]; 9], rng: &mut StdRng) -> bool {
    for r in 0..9 {
        for c in 0..9 {
            if board[r][c] == 0 {
                let mut nums: Vec<u8> = (1..=9).collect();
                nums.shuffle(rng);
                for num in nums {
                    if solver::is_valid(board, r, c, num) {
                        board[r][c] = num;
                        if fill_board(board, rng) { return true; }
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    true
}

fn dig_holes(solution: &[[u8; 9]; 9], target_givens: u8, rng: &mut StdRng) -> [[u8; 9]; 9] {
    let mut puzzle = *solution;
    let mut positions: Vec<(usize, usize)> = (0..9).flat_map(|r| (0..9).map(move |c| (r, c))).collect();
    positions.shuffle(rng);
    let mut remaining = 81;
    for (r, c) in positions {
        if remaining <= target_givens as usize { break; }
        let backup = puzzle[r][c];
        puzzle[r][c] = 0;
        let mut test = puzzle;
        let count = solver::count_solutions(&mut test, 2);
        if count == 1 {
            remaining -= 1;
        } else {
            puzzle[r][c] = backup;
        }
    }
    puzzle
}
```

- [ ] **Step 2: 写 generator 测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_easy() {
        let (puzzle, solution) = generate(&Difficulty::Easy, 42);
        let mut given = 0;
        for r in 0..9 { for c in 0..9 { if puzzle[r][c] != 0 { given += 1; } } }
        assert!(given >= 35);
        let solved = solver::solve(&puzzle);
        assert_eq!(solved, Some(solution));
    }

    #[test]
    fn test_generate_expert() {
        let (puzzle, solution) = generate(&Difficulty::Expert, 123);
        let mut given = 0;
        for r in 0..9 { for c in 0..9 { if puzzle[r][c] != 0 { given += 1; } } }
        assert!(given >= 17 && given <= 21);
        let solved = solver::solve(&puzzle);
        assert_eq!(solved, Some(solution));
    }
}
```

- [ ] **Step 3: `cargo test generator`**

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/generator.rs wasm-engine/src/lib.rs
git commit -m "feat: add puzzle generator with difficulty-controlled givens"
```

---

### Task 4.2: Daily — 每日挑战种子

**Files:**
- Create: `wasm-engine/src/daily.rs`

**Interfaces:**
- Produces: `pub fn daily_seed(date_str: &str) -> u64`

- [ ] **Step 1: 写 daily.rs**

```rust
use sha2::{Sha256, Digest};

pub fn daily_seed(date_str: &str) -> u64 {
    let hash = Sha256::digest(date_str.as_bytes());
    u64::from_be_bytes(hash[..8].try_into().unwrap())
}
```

- [ ] **Step 2: 写测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_daily_seed_deterministic() {
        assert_eq!(daily_seed("2026-07-12"), daily_seed("2026-07-12"));
    }

    #[test]
    fn test_daily_seed_different_dates() {
        assert_ne!(daily_seed("2026-07-12"), daily_seed("2026-07-13"));
    }
}
```

- [ ] **Step 3: `cargo test daily`**

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/daily.rs wasm-engine/src/lib.rs
git commit -m "feat: add daily challenge seed (date -> SHA256 -> u64)"
```

---

## Phase 5: 智能提示引擎

### Task 5.1: Hint strategies — naked_single, hidden_single

**Files:**
- Create: `wasm-engine/src/strategies/mod.rs`
- Create: `wasm-engine/src/strategies/naked_single.rs`
- Create: `wasm-engine/src/strategies/hidden_single.rs`

**Interfaces:**
- Produces: `pub trait Strategy: fn try_find(grid: &Grid, solution: &[[u8; 9]; 9]) -> Option<Hint>`

- [ ] **Step 1: 写 strategies/mod.rs**

```rust
pub mod naked_single;
pub mod hidden_single;
pub mod naked_pair;
pub mod hidden_pair;
pub mod pointing;
pub mod box_line_reduction;
pub mod x_wing;

use crate::types::{Grid, Hint};

pub trait Strategy {
    fn try_find(grid: &Grid, solution: &[[u8; 9]; 9]) -> Option<Hint>;
}
```

- [ ] **Step 2: 写 naked_single.rs**

```rust
use crate::types::{Grid, Hint, Pos, StrategyType};
use super::Strategy;

pub struct NakedSingle;

impl Strategy for NakedSingle {
    fn try_find(grid: &Grid, _solution: &[[u8; 9]; 9]) -> Option<Hint> {
        for r in 0..9u8 {
            for c in 0..9u8 {
                let cell = &grid.cells[r as usize][c as usize];
                if cell.value != 0 { continue; }
                let used: Vec<u8> = get_used_in_peers(grid, r, c);
                let candidates: Vec<u8> = (1..=9).filter(|n| !used.contains(n)).collect();
                if candidates.len() == 1 {
                    let v = candidates[0];
                    let related = find_related_cells(grid, r, c, &used);
                    let msg = format!(
                        "Naked Single / 唯一数：该格所在行、列、宫已存在 {}，因此只能填 {}。",
                        used.iter().map(|n| n.to_string()).collect::<Vec<_>>().join("、"),
                        v
                    );
                    return Some(Hint {
                        strategy: StrategyType::NakedSingle,
                        target: Pos { row: r, col: c },
                        value: v,
                        related_cells: related,
                        eliminated: used,
                        message_cn: msg,
                    });
                }
            }
        }
        None
    }
}

fn get_used_in_peers(grid: &Grid, row: u8, col: u8) -> Vec<u8> {
    let mut used = Vec::new();
    let br = (row / 3) * 3;
    let bc = (col / 3) * 3;
    for i in 0..9 {
        add_if_nonzero(&mut used, grid.cells[row as usize][i].value);
        add_if_nonzero(&mut used, grid.cells[i][col as usize].value);
        let r = br + i / 3;
        let c = bc + i % 3;
        add_if_nonzero(&mut used, grid.cells[r as usize][c as usize].value);
    }
    used.sort();
    used.dedup();
    used
}

fn add_if_nonzero(vec: &mut Vec<u8>, v: u8) {
    if v != 0 { vec.push(v); }
}

fn find_related_cells(grid: &Grid, row: u8, col: u8, _used: &[u8]) -> Vec<Pos> {
    let mut cells = Vec::new();
    let br = (row / 3) * 3;
    let bc = (col / 3) * 3;
    for i in 0..9 {
        if i != col && grid.cells[row as usize][i].value != 0 {
            cells.push(Pos { row, col: i });
        }
        if i != row && grid.cells[i][col as usize].value != 0 {
            cells.push(Pos { row: i, col });
        }
        let r = br + i / 3;
        let c = bc + i % 3;
        if (r != row || c != col) && grid.cells[r as usize][c as usize].value != 0 {
            cells.push(Pos { row: r, col: c });
        }
    }
    cells
}
```

- [ ] **Step 3: 写 hidden_single.rs**

```rust
use crate::types::{Grid, Hint, Pos, StrategyType};
use super::Strategy;

pub struct HiddenSingle;

impl Strategy for HiddenSingle {
    fn try_find(grid: &Grid, _solution: &[[u8; 9]; 9]) -> Option<Hint> {
        // Check each row, col, box — for each digit 1-9, count possible positions
        for digit in 1..=9 {
            // Rows
            for r in 0..9u8 {
                let positions: Vec<u8> = (0..9).filter(|&c| {
                    let cell = &grid.cells[r as usize][c as usize];
                    cell.value == digit || (cell.value == 0 && can_place(grid, r, c, digit))
                }).collect();
                if positions.len() == 1 && grid.cells[r as usize][positions[0] as usize].value == 0 {
                    let c = positions[0];
                    let msg = format!(
                        "Hidden Single / 隐性唯一数：在第 {} 行中，数字 {} 只能放在第 {} 列。",
                        r + 1, digit, c + 1
                    );
                    return Some(Hint {
                        strategy: StrategyType::HiddenSingle,
                        target: Pos { row: r, col: c },
                        value: digit,
                        related_cells: vec![],
                        eliminated: (1..=9).filter(|&n| n != digit).collect(),
                        message_cn: msg,
                    });
                }
            }
            // Cols
            for c in 0..9u8 {
                let positions: Vec<u8> = (0..9).filter(|&r| {
                    let cell = &grid.cells[r as usize][c as usize];
                    cell.value == digit || (cell.value == 0 && can_place(grid, r, c, digit))
                }).collect();
                if positions.len() == 1 && grid.cells[positions[0] as usize][c as usize].value == 0 {
                    let r = positions[0];
                    let msg = format!(
                        "Hidden Single / 隐性唯一数：在第 {} 列中，数字 {} 只能放在第 {} 行。",
                        c + 1, digit, r + 1
                    );
                    return Some(Hint {
                        strategy: StrategyType::HiddenSingle,
                        target: Pos { row: r, col: c },
                        value: digit,
                        related_cells: vec![],
                        eliminated: (1..=9).filter(|&n| n != digit).collect(),
                        message_cn: msg,
                    });
                }
            }
            // Boxes
            for br in (0..3).map(|x| x * 3) {
                for bc in (0..3).map(|x| x * 3) {
                    let positions: Vec<Pos> = (0..9).filter_map(|i| {
                        let r = br + i / 3;
                        let c = bc + i % 3;
                        let cell = &grid.cells[r as usize][c as usize];
                        if cell.value == digit || (cell.value == 0 && can_place(grid, r, c, digit)) {
                            Some(Pos { row: r, col: c })
                        } else { None }
                    }).collect();
                    if positions.len() == 1 && grid.cells[positions[0].row as usize][positions[0].col as usize].value == 0 {
                        let p = &positions[0];
                        let msg = format!(
                            "Hidden Single / 隐性唯一数：在第 {} 宫（第{}行第{}列）中，数字 {} 只能放在此格。",
                            ((br / 3) * 3 + bc / 3 + 1), p.row + 1, p.col + 1, digit
                        );
                        return Some(Hint {
                            strategy: StrategyType::HiddenSingle,
                            target: Pos { row: p.row, col: p.col },
                            value: digit,
                            related_cells: vec![],
                            eliminated: (1..=9).filter(|&n| n != digit).collect(),
                            message_cn: msg,
                        });
                    }
                }
            }
        }
        None
    }
}

fn can_place(grid: &Grid, row: u8, col: u8, digit: u8) -> bool {
    for i in 0..9 {
        if grid.cells[row as usize][i].value == digit { return false; }
        if grid.cells[i][col as usize].value == digit { return false; }
    }
    let br = (row / 3) * 3;
    let bc = (col / 3) * 3;
    for r in br..br + 3 {
        for c in bc..bc + 3 {
            if grid.cells[r as usize][c as usize].value == digit { return false; }
        }
    }
    true
}
```

- [ ] **Step 4: 写提示引擎测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Cell, Highlights};

    #[test]
    fn test_naked_single_finds_obvious() {
        let mut cells = [[Cell::empty(); 9]; 9];
        // Fill row 0 with 1-8 except col 8
        for c in 0..8 { cells[0][c].value = (c + 1) as u8; cells[0][c].is_given = true; }
        let grid = Grid { cells, selected: None, selected_number: None, highlights: Highlights::empty() };
        let hint = NakedSingle::try_find(&grid, &[[0; 9]; 9]);
        assert!(hint.is_some());
        let h = hint.unwrap();
        assert_eq!(h.value, 9);
    }
}
```

- [ ] **Step 5: `cargo test strategies`**

- [ ] **Step 6: Commit**

```bash
git add wasm-engine/src/strategies/ wasm-engine/src/lib.rs
git commit -m "feat: add naked_single and hidden_single hint strategies"
```

---

### Task 5.2: Remaining strategies (naked_pair, hidden_pair, pointing, box_line_reduction, x_wing) + hint_engine

**Files:**
- Create: `wasm-engine/src/strategies/naked_pair.rs`
- Create: `wasm-engine/src/strategies/hidden_pair.rs`
- Create: `wasm-engine/src/strategies/pointing.rs`
- Create: `wasm-engine/src/strategies/box_line_reduction.rs`
- Create: `wasm-engine/src/strategies/x_wing.rs`
- Create: `wasm-engine/src/hint_engine.rs`

**Interfaces:**
- Produces: `pub fn get_hint(grid: &Grid, solution: &[[u8; 9]; 9]) -> Hint`

- [ ] **Step 1: 写 hint_engine.rs — 策略链编排**

```rust
use crate::strategies::{
    naked_single::NakedSingle, hidden_single::HiddenSingle,
    naked_pair::NakedPair, hidden_pair::HiddenPair,
    pointing::Pointing, box_line_reduction::BoxLineReduction,
    x_wing::XWing, Strategy,
};
use crate::solver;
use crate::types::{Grid, Hint, Pos, StrategyType};

pub fn get_hint(grid: &Grid, solution: &[[u8; 9]; 9]) -> Hint {
    let strategies: Vec<Box<dyn Strategy>> = vec![
        Box::new(NakedSingle),
        Box::new(HiddenSingle),
        Box::new(NakedPair),
        Box::new(HiddenPair),
        Box::new(Pointing),
        Box::new(BoxLineReduction),
        Box::new(XWing),
    ];

    for s in &strategies {
        if let Some(hint) = s.try_find(grid, solution) {
            return hint;
        }
    }

    // Fallback: find first empty cell and return solver answer
    for r in 0..9u8 {
        for c in 0..9u8 {
            if grid.cells[r as usize][c as usize].value == 0 {
                let value = solution[r as usize][c as usize];
                return Hint {
                    strategy: StrategyType::SolverFallback,
                    target: Pos { row: r, col: c },
                    value,
                    related_cells: vec![],
                    eliminated: vec![],
                    message_cn: format!("无法用基础策略推断，该格应填 {}（求解器推算）。", value),
                };
            }
        }
    }

    Hint {
        strategy: StrategyType::SolverFallback,
        target: Pos { row: 0, col: 0 },
        value: 0,
        related_cells: vec![],
        eliminated: vec![],
        message_cn: "棋盘已全部填满。".to_string(),
    }
}
```

- [ ] **Step 2: 写简化的 remaining strategies (skeleton implementations)**

For each of `naked_pair.rs`, `hidden_pair.rs`, `pointing.rs`, `box_line_reduction.rs`, `x_wing.rs` — write valid skeleton implementations that return `None`. These are deliberately minimal for MVP — the strategy chain falls through to SolverFallback for cases these don't cover. Full algorithm implementations can be added incrementally in future iterations without changing the interface.

```rust
// naked_pair.rs
use crate::types::{Grid, Hint};
use super::Strategy;

pub struct NakedPair;
impl Strategy for NakedPair {
    fn try_find(_grid: &Grid, _solution: &[[u8; 9]; 9]) -> Option<Hint> {
        // Naked Pair: two cells in the same house share exactly the same two candidates.
        // All other candidates in those two cells can be eliminated; those two digits can
        // also be eliminated from all other cells in the house.
        // For MVP, returns None — strategy chain advances to next strategy.
        None
    }
}
```

(Write equivalent for all 5 files — each with its own descriptive comment explaining what the strategy would detect)

- [ ] **Step 3: `cargo check` + `cargo test`**

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/strategies/ wasm-engine/src/hint_engine.rs wasm-engine/src/lib.rs
git commit -m "feat: add hint engine with strategy chain and skeleton advanced strategies"
```

---

## Phase 6: Rust WASM 入口 — engine + lib

### Task 6.1: engine.rs — dispatch/reduce 管线

**Files:**
- Create: `wasm-engine/src/engine.rs`

**Interfaces:**
- Produces: `pub fn reduce(state: &mut GameState, action: &Action)`

- [ ] **Step 1: 写 engine.rs**

```rust
use crate::types::*;
use crate::{generator, highlight, history, hint_engine, validator};
use history::History;

thread_local! {
    static HISTORY: std::cell::RefCell<History> = std::cell::RefCell::new(History::new());
}

pub fn reduce(state: &mut GameState, action: &Action) {
    if state.game_status != GameStatus::Playing {
        match action {
            Action::Undo => reduce_undo(state),
            _ => return, // No-op when game is over
        }
        return;
    }
    match action {
        Action::SelectCell { row, col } => reduce_select_cell(state, *row, *col),
        Action::InputNumber { value } => reduce_input_number(state, *value),
        Action::ToggleNote { value } => reduce_toggle_note(state, *value),
        Action::ToggleNoteMode => {} // UI-only, handled in React
        Action::Erase => reduce_erase(state),
        Action::Undo => reduce_undo(state),
        Action::Redo => reduce_redo(state),
        Action::GetHint => reduce_get_hint(state),
        Action::UpdateGameSettings { settings } => state.settings = settings.clone(),
        Action::SetFinalTime { seconds } => state.elapsed_seconds = *seconds,
    }
    // Recompute highlights after every action
    let hint_cells: Vec<Pos> = state.hint.as_ref().map_or(vec![], |h| h.related_cells.clone());
    state.grid.highlights = highlight::compute(&state.grid, &state.settings, &hint_cells);
    // Clear stale hint on non-hint actions
    if !matches!(action, Action::GetHint) {
        state.hint = None;
    }
}

fn reduce_select_cell(state: &mut GameState, row: u8, col: u8) {
    let current = state.grid.selected;
    state.grid.selected = Some(Pos { row, col });
    let sel_val = state.grid.cells[row as usize][col as usize].value;
    if sel_val != 0 {
        if current == Some(Pos { row, col }) && state.grid.selected_number == Some(sel_val) {
            state.grid.selected_number = None;
        } else {
            state.grid.selected_number = Some(sel_val);
        }
    } else {
        state.grid.selected_number = None;
    }
}

fn reduce_input_number(state: &mut GameState, value: u8) {
    let sel = match state.grid.selected {
        Some(ref s) => s.clone(),
        None => return,
    };
    let cell = &state.grid.cells[sel.row as usize][sel.col as usize];
    if cell.is_given || cell.value == value { return; }
    // Save for undo
    HISTORY.with(|h| h.borrow_mut().push(state.grid.clone()));
    // Validate
    let conflicts = validator::conflict_check(&state.grid, sel.row, sel.col, value);
    let is_error = !conflicts.is_empty();
    if is_error {
        state.error_count += 1;
        // Mark conflicting cells as error too
        for p in &conflicts {
            state.grid.cells[p.row as usize][p.col as usize].is_error = true;
        }
    }
    state.grid.set_value(sel.row, sel.col, value, is_error);
    state.grid.smart_erase_notes(sel.row, sel.col, value);
    state.grid.selected_number = Some(value);
    // Check game status
    state.game_status = validator::check_game_status(
        &state.grid, &state.solution, state.error_count, state.max_errors,
    );
}

fn reduce_toggle_note(state: &mut GameState, value: u8) {
    let sel = match state.grid.selected {
        Some(ref s) => s.clone(),
        None => return,
    };
    HISTORY.with(|h| h.borrow_mut().push(state.grid.clone()));
    state.grid.toggle_note(sel.row, sel.col, value);
}

fn reduce_erase(state: &mut GameState) {
    let sel = match state.grid.selected {
        Some(ref s) => s.clone(),
        None => return,
    };
    HISTORY.with(|h| h.borrow_mut().push(state.grid.clone()));
    // Clear errors from related cells
    for r in 0..9 { for c in 0..9 { state.grid.cells[r][c].is_error = false; } }
    state.grid.erase_cell(sel.row, sel.col);
}

fn reduce_undo(state: &mut GameState) {
    let prev = HISTORY.with(|h| h.borrow_mut().undo(&state.grid));
    if let Some(grid) = prev {
        state.grid = grid;
        // Recalculate error count from scratch
        state.error_count = state.grid.cells.iter().flatten().filter(|c| c.is_error).count() as u8;
        state.game_status = validator::check_game_status(
            &state.grid, &state.solution, state.error_count, state.max_errors,
        );
    }
}

fn reduce_redo(state: &mut GameState) {
    let next = HISTORY.with(|h| h.borrow_mut().redo());
    if let Some(grid) = next {
        state.grid = grid;
    }
}

fn reduce_get_hint(state: &mut GameState) {
    let hint = hint_engine::get_hint(&state.grid, &state.solution);
    state.hint = Some(hint);
}
```

- [ ] **Step 2: Write integration test**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_select_and_input_flow() {
        let (puzzle, solution) = generator::generate(&Difficulty::Easy, 99);
        let mut state = GameState {
            grid: Grid::new(puzzle),
            difficulty: Difficulty::Easy,
            solution,
            error_count: 0,
            max_errors: 3,
            game_status: GameStatus::Playing,
            elapsed_seconds: 0,
            settings: GameSettings::default(),
            hint: None,
        };
        reduce(&mut state, &Action::SelectCell { row: 0, col: 0 });
        assert_eq!(state.grid.selected, Some(Pos { row: 0, col: 0 }));
    }
}
```

- [ ] **Step 3: `cargo test engine`**

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/src/engine.rs wasm-engine/src/lib.rs
git commit -m "feat: add engine reduce pipeline with full dispatch flow"
```

---

### Task 6.2: lib.rs — WASM 入口 + 存档

**Files:**
- Modify: `wasm-engine/src/lib.rs`

- [ ] **Step 1: 重写 lib.rs 为完整 WASM 入口**

```rust
use wasm_bindgen::prelude::*;
use std::cell::RefCell;

mod types;
mod grid;
mod solver;
mod validator;
mod generator;
mod history;
mod highlight;
mod daily;
mod hint_engine;
mod strategies;
mod engine;

use types::*;

thread_local! {
    static GAME_STATE: RefCell<Option<GameState>> = RefCell::new(None);
}

#[wasm_bindgen(start)]
pub fn main() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}

#[wasm_bindgen]
pub fn new_game(difficulty_str: &str) -> JsValue {
    let difficulty = match difficulty_str {
        "easy" => Difficulty::Easy,
        "medium" => Difficulty::Medium,
        "hard" => Difficulty::Hard,
        "expert" => Difficulty::Expert,
        _ => Difficulty::Easy,
    };
    let seed = js_sys::Math::random() as u64 * 1000000u64;
    let (puzzle, solution) = generator::generate(&difficulty, seed);
    let state = GameState {
        grid: Grid::new(puzzle),
        difficulty,
        solution,
        error_count: 0,
        max_errors: 3,
        game_status: GameStatus::Playing,
        elapsed_seconds: 0,
        settings: GameSettings::default(),
        hint: None,
    };
    let json = serde_json::to_string(&state).unwrap();
    GAME_STATE.with(|gs| *gs.borrow_mut() = Some(state));
    JsValue::from_str(&json)
}

#[wasm_bindgen]
pub fn new_daily_game(seed: u64) -> JsValue {
    let difficulty = Difficulty::Medium;
    let (puzzle, solution) = generator::generate(&difficulty, seed);
    let state = GameState {
        grid: Grid::new(puzzle),
        difficulty,
        solution,
        error_count: 0,
        max_errors: 3,
        game_status: GameStatus::Playing,
        elapsed_seconds: 0,
        settings: GameSettings::default(),
        hint: None,
    };
    let json = serde_json::to_string(&state).unwrap();
    GAME_STATE.with(|gs| *gs.borrow_mut() = Some(state));
    JsValue::from_str(&json)
}

#[wasm_bindgen]
pub fn dispatch(action_json: &str) -> JsValue {
    let action: Action = serde_json::from_str(action_json).unwrap();
    GAME_STATE.with(|gs| {
        let mut borrowed = gs.borrow_mut();
        let mut state = borrowed.take().unwrap_or_else(|| {
            // Fallback: create empty state if none exists
            GameState {
                grid: Grid::new([[0; 9]; 9]),
                difficulty: Difficulty::Easy,
                solution: [[0; 9]; 9],
                error_count: 0,
                max_errors: 3,
                game_status: GameStatus::Playing,
                elapsed_seconds: 0,
                settings: GameSettings::default(),
                hint: None,
            }
        });
        engine::reduce(&mut state, &action);
        let json = serde_json::to_string(&state).unwrap();
        *borrowed = Some(state);
        JsValue::from_str(&json)
    })
}

#[wasm_bindgen]
pub fn load_game(save_json: &str) -> JsValue {
    let state: GameState = match serde_json::from_str(save_json) {
        Ok(s) => s,
        Err(_) => {
            return JsValue::from_str("{\"error\": \"corrupted\"}");
        }
    };
    let json = serde_json::to_string(&state).unwrap();
    GAME_STATE.with(|gs| *gs.borrow_mut() = Some(state));
    JsValue::from_str(&json)
}
```

- [ ] **Step 2: Add `console_error_panic_hook` to Cargo.toml**

```toml
console_error_panic_hook = "0.1"
js-sys = "0.3"
```

- [ ] **Step 3: Build WASM**

```bash
wasm-pack build wasm-engine --target web --out-dir ../src/wasm-pkg
```
Expected: creates `src/wasm-pkg/` with `.wasm` and `.js` files

- [ ] **Step 4: Verify the generated JS wrapper exists**

```bash
ls src/wasm-pkg/sudokucalm_engine.js
```

- [ ] **Step 5: Commit**

```bash
git add wasm-engine/src/lib.rs wasm-engine/Cargo.toml src/wasm-pkg/ .gitignore
git commit -m "feat: complete WASM entry point with new_game, dispatch, load_game"
```

---

## Phase 7: React Hooks — WASM 绑定层

### Task 7.1: useGameEngine — 核心 hook

**Files:**
- Create: `src/hooks/useGameEngine.ts`

**Interfaces:**
- Consumes: WASM module at `src/wasm-pkg/sudokucalm_engine.js` (from Task 6.2)
- Produces: `useGameEngine()` → `{ state: GameState | null, loading, error, dispatch, newGame, newDailyGame, loadGame }`

- [ ] **Step 1: 写 useGameEngine.ts**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../types';
import type { InitOutput } from '../wasm-pkg/sudokucalm_engine';

type WasmModule = InitOutput & {
  new_game(difficulty: string): string;
  new_daily_game(seed: number): string;
  dispatch(action_json: string): string;
  load_game(save_json: string): string;
};

export type EngineStatus = 'loading' | 'ready' | 'error';

export function useGameEngine() {
  const [status, setStatus] = useState<EngineStatus>('loading');
  const [state, setState] = useState<GameState | null>(null);
  const wasmRef = useRef<WasmModule | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('../wasm-pkg/sudokucalm_engine.js')
      .then(async (m) => {
        const wasm = (await m.default()) as WasmModule;
        if (!cancelled) {
          wasmRef.current = wasm;
          setStatus('ready');
        }
      })
      .catch((err) => {
        console.error('WASM load failed:', err);
        if (!cancelled) setStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  const updateState = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.error) {
        console.error('WASM error:', parsed.error);
        return null;
      }
      setState(parsed);
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const newGame = useCallback((difficulty: string): GameState | null => {
    if (!wasmRef.current) return null;
    const json = wasmRef.current.new_game(difficulty);
    return updateState(json);
  }, [updateState]);

  const newDailyGame = useCallback((seed: number): GameState | null => {
    if (!wasmRef.current) return null;
    const json = wasmRef.current.new_daily_game(seed);
    return updateState(json);
  }, [updateState]);

  const dispatch = useCallback((action: object): GameState | null => {
    if (!wasmRef.current) return null;
    const actionJson = JSON.stringify(action);
    const resultJson = wasmRef.current.dispatch(actionJson);
    return updateState(resultJson);
  }, [updateState]);

  const loadGame = useCallback((saveJson: string): GameState | null => {
    if (!wasmRef.current) return null;
    const json = wasmRef.current.load_game(saveJson);
    return updateState(json);
  }, [updateState]);

  return { state, status, dispatch, newGame, newDailyGame, loadGame };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameEngine.ts
git commit -m "feat: add useGameEngine hook for WASM binding"
```

---

### Task 7.2: useLocalStorage — 持久化 hook

**Files:**
- Create: `src/hooks/useLocalStorage.ts`

**Interfaces:**
- Produces: `useLocalStorage<T>(key, defaultValue) → [T, (v: T) => void]`

- [ ] **Step 1: 写 useLocalStorage.ts**

```ts
import { useCallback, useState } from 'react';

const STORAGE_VERSION = 1;
const SAVE_KEY = 'sudokucalm_save';
const UI_SETTINGS_KEY = 'sudokucalm_ui_settings';

export async function checksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface SaveEnvelope {
  version: number;
  checksum: string;
  payload: string;
}

export function saveGame(json: string) {
  checksum(json).then((cs) => {
    const envelope: SaveEnvelope = { version: STORAGE_VERSION, checksum: cs, payload: json };
    localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
  });
}

export function loadGameSave(): string | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const envelope: SaveEnvelope = JSON.parse(raw);
    if (envelope.version !== STORAGE_VERSION) return null;
    return envelope.payload;
  } catch {
    return null;
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setAndPersist = useCallback(
    (newValue: T) => {
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    },
    [key]
  );

  return [value, setAndPersist];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useLocalStorage.ts
git commit -m "feat: add useLocalStorage hook with versioned save envelope"
```

---

### Task 7.3: useTimer — 计时器 hook

**Files:**
- Create: `src/hooks/useTimer.ts`

**Interfaces:**
- Produces: `useTimer(running: boolean) → { seconds, display, reset, pause }`

- [ ] **Step 1: 写 useTimer.ts**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const display = useCallback(() => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [seconds]);

  const reset = useCallback(() => setSeconds(0), []);
  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { seconds, display, reset, pause };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTimer.ts
git commit -m "feat: add useTimer hook for game timer display"
```

---

## Phase 8: React 组件

### Task 8.1: Cell 组件 — 单个格子 (React.memo 优化)

**Files:**
- Create: `src/components/Cell.tsx`

**Interfaces:**
- Consumes: `Cell` type from `src/types`, highlight sets from parent
- Produces: `<Cell>` component with `React.memo`

- [ ] **Step 1: 写 Cell.tsx**

```tsx
import React from 'react';
import type { Cell as CellData, Pos } from '../types';

interface CellProps {
  cell: CellData;
  row: number;
  col: number;
  isSelected: boolean;
  isRelated: boolean;
  isSameNumber: boolean;
  isHint: boolean;
  isError: boolean;
  onSelect: (row: number, col: number) => void;
}

export const Cell = React.memo(function Cell({
  cell,
  row,
  col,
  isSelected,
  isRelated,
  isSameNumber,
  isHint,
  isError,
  onSelect,
}: CellProps) {
  const isThickBorderRight = (col + 1) % 3 === 0 && col !== 8;
  const isThickBorderBottom = (row + 1) % 3 === 0 && row !== 8;

  const getBgColor = () => {
    if (isSelected) return 'bg-primary-light';
    if (isHint) return 'bg-accent/30 animate-hint-flash';
    if (isRelated) return 'bg-primary-light/50';
    return 'bg-white';
  };

  const getTextColor = () => {
    if (isError) return 'text-error';
    if (cell.is_given) return 'text-ink-dark';
    return 'text-primary';
  };

  const getFontWeight = () => {
    if (cell.is_given) return 'font-bold';
    if (isSameNumber && cell.value !== 0) return 'font-bold';
    return 'font-normal';
  };

  // Notes display: 3x3 mini-grid
  const renderNotes = () => {
    if (cell.value !== 0 || cell.notes.length === 0) return null;
    return (
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-0.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span
            key={n}
            className="flex items-center justify-center text-note text-ink-mid"
          >
            {cell.notes.includes(n) ? n : ''}
          </span>
        ))}
      </div>
    );
  };

  return (
    <button
      className={`
        relative w-full aspect-square select-none touch-none
        border-[0.5px] border-ink-light
        ${isThickBorderRight ? 'border-r-2 border-r-border' : ''}
        ${isThickBorderBottom ? 'border-b-2 border-b-border' : ''}
        ${getBgColor()}
        transition-colors duration-75
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset
        cursor-pointer
      `}
      style={{ minWidth: 0, minHeight: 0 }}
      onPointerDown={(e) => {
        e.preventDefault();
        onSelect(row, col);
      }}
      role="gridcell"
      aria-rowindex={row + 1}
      aria-colindex={col + 1}
      aria-label={`Row ${row + 1}, Column ${col + 1}${cell.value ? `, value ${cell.value}` : ', empty'}${cell.is_given ? ', given' : ''}`}
    >
      {cell.value !== 0 ? (
        <span className={`text-cell ${getTextColor()} ${getFontWeight()}`}>
          {cell.value}
        </span>
      ) : (
        renderNotes()
      )}
    </button>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Cell.tsx
git commit -m "feat: add Cell component with React.memo and highlight states"
```

---

### Task 8.2: NumberPad 组件

**Files:**
- Create: `src/components/NumberPad.tsx`

- [ ] **Step 1: 写 NumberPad.tsx**

```tsx
import React from 'react';

interface NumberPadProps {
  isNoteMode: boolean;
  onNumber: (value: number) => void;
  onToggleNoteMode: () => void;
  onErase: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
}

const btnBase = `
  flex items-center justify-center rounded-lg
  active:scale-95 transition-transform duration-75
  select-none touch-none
  min-h-[48px] min-w-[44px]
`;

export const NumberPad = React.memo(function NumberPad({
  isNoteMode,
  onNumber,
  onToggleNoteMode,
  onErase,
  onUndo,
  onRedo,
  onHint,
}: NumberPadProps) {
  return (
    <div className="flex flex-col gap-2 px-2 pb-2 safe-bottom">
      {/* Numbers 1-9 */}
      <div className="grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            className={`${btnBase} bg-primary-light text-primary font-semibold text-xl hover:bg-primary/10`}
            onPointerDown={(e) => { e.preventDefault(); onNumber(n); }}
            aria-label={`Enter ${n}`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Tools */}
      <div className="grid grid-cols-5 gap-1.5">
        <button
          className={`${btnBase} text-sm ${isNoteMode ? 'bg-primary text-white' : 'bg-ink-light/30 text-ink-mid'}`}
          onPointerDown={(e) => { e.preventDefault(); onToggleNoteMode(); }}
          aria-label={isNoteMode ? 'Note mode on' : 'Note mode off'}
        >
          笔记
        </button>
        <button
          className={`${btnBase} bg-ink-light/30 text-ink-mid text-sm`}
          onPointerDown={(e) => { e.preventDefault(); onErase(); }}
          aria-label="Erase"
        >
          擦除
        </button>
        <button
          className={`${btnBase} bg-ink-light/30 text-ink-mid text-sm`}
          onPointerDown={(e) => { e.preventDefault(); onUndo(); }}
          aria-label="Undo"
        >
          撤销
        </button>
        <button
          className={`${btnBase} bg-ink-light/30 text-ink-mid text-sm`}
          onPointerDown={(e) => { e.preventDefault(); onRedo(); }}
          aria-label="Redo"
        >
          重做
        </button>
        <button
          className={`${btnBase} bg-accent/30 text-ink-dark text-sm font-medium`}
          onPointerDown={(e) => { e.preventDefault(); onHint(); }}
          aria-label="Get hint"
        >
          提示
        </button>
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NumberPad.tsx
git commit -m "feat: add NumberPad component with tools bar"
```

---

### Task 8.3: GridBoard 组件 — 9x9 棋盘

**Files:**
- Create: `src/components/GridBoard.tsx`

- [ ] **Step 1: 写 GridBoard.tsx**

```tsx
import React, { useMemo } from 'react';
import { Cell } from './Cell';
import type { GameState, Pos } from '../types';

interface GridBoardProps {
  state: GameState;
  onSelectCell: (row: number, col: number) => void;
}

export const GridBoard = React.memo(function GridBoard({ state, onSelectCell }: GridBoardProps) {
  const { cells, selected, highlights } = state.grid;

  // Pre-compute highlight sets for O(1) per-cell lookup
  const highlightSets = useMemo(() => {
    const relatedSet = new Set(highlights.related_area.map((p: Pos) => `${p.row},${p.col}`));
    const numberSet = new Set(highlights.same_number.map((p: Pos) => `${p.row},${p.col}`));
    const hintSet = new Set(highlights.hint_cells.map((p: Pos) => `${p.row},${p.col}`));
    const errorSet = new Set(highlights.error_cells.map((p: Pos) => `${p.row},${p.col}`));
    return { relatedSet, numberSet, hintSet, errorSet };
  }, [highlights]);

  return (
    <div
      className="grid grid-cols-9 border-2 border-border max-w-[500px] mx-auto w-full"
      role="grid"
      aria-label="Sudoku grid"
    >
      {cells.flat().map((cell, idx) => {
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        const key = `${r},${c}`;
        return (
          <Cell
            key={key}
            cell={cell}
            row={r}
            col={c}
            isSelected={selected?.row === r && selected?.col === c}
            isRelated={highlightSets.relatedSet.has(key)}
            isSameNumber={highlightSets.numberSet.has(key)}
            isHint={highlightSets.hintSet.has(key)}
            isError={cell.is_error || highlightSets.errorSet.has(key)}
            onSelect={onSelectCell}
          />
        );
      })}
    </div>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GridBoard.tsx
git commit -m "feat: add GridBoard component with highlight set pre-computation"
```

---

### Task 8.4: HintDrawer + StatusBar 组件

**Files:**
- Create: `src/components/HintDrawer.tsx`
- Create: `src/components/StatusBar.tsx`

- [ ] **Step 1: 写 HintDrawer.tsx**

```tsx
import React from 'react';
import type { Hint } from '../types';

interface HintDrawerProps {
  hint: Hint | null;
  onDismiss: () => void;
}

const strategyNames: Record<string, string> = {
  NakedSingle: '唯一数',
  HiddenSingle: '隐性唯一数',
  NakedPair: '数对',
  HiddenPair: '隐性数对',
  Pointing: '指向',
  BoxLineReduction: '区块删减法',
  XWing: 'X-Wing',
  SolverFallback: '求解器',
};

export const HintDrawer = React.memo(function HintDrawer({ hint, onDismiss }: HintDrawerProps) {
  if (!hint) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg border-t border-ink-light animate-pop-in"
      role="dialog"
      aria-label="Hint explanation"
      aria-live="polite"
    >
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-primary bg-primary-light px-2 py-0.5 rounded-full">
            {strategyNames[hint.strategy] || hint.strategy}
          </span>
          <button
            className="text-ink-mid text-sm p-2 -m-2"
            onPointerDown={(e) => { e.preventDefault(); onDismiss(); }}
            aria-label="Dismiss hint"
          >
            关闭
          </button>
        </div>
        <p className="text-ink-dark text-sm leading-relaxed">{hint.message_cn}</p>
        <p className="text-ink-mid text-xs mt-1">应填入数字：<span className="font-bold text-primary text-lg">{hint.value}</span></p>
      </div>
    </div>
  );
});
```

- [ ] **Step 2: 写 StatusBar.tsx**

```tsx
import React from 'react';

interface StatusBarProps {
  difficulty: string;
  errorCount: number;
  maxErrors: number;
  timeDisplay: string;
  showTimer: boolean;
  onPause: () => void;
}

const diffLabels: Record<string, string> = {
  Easy: '简单', Medium: '中等', Hard: '困难', Expert: '专家',
};

export const StatusBar = React.memo(function StatusBar({
  difficulty, errorCount, maxErrors, timeDisplay, showTimer, onPause,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-sm font-medium text-ink-mid">{diffLabels[difficulty] || difficulty}</span>
      <div className="flex items-center gap-3">
        {showTimer && (
          <span className="text-sm font-mono text-ink-dark tabular-nums">{timeDisplay()}</span>
        )}
        <span className="text-sm text-error font-medium">
          {Array.from({ length: maxErrors }, (_, i) => (
            <span key={i} className={i < errorCount ? 'opacity-100' : 'opacity-20'}>●</span>
          ))}
        </span>
        <button
          className="text-ink-mid text-sm p-1 -m-1"
          onPointerDown={(e) => { e.preventDefault(); onPause(); }}
          aria-label="Pause"
        >
          暂停
        </button>
      </div>
    </div>
  );
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/HintDrawer.tsx src/components/StatusBar.tsx
git commit -m "feat: add HintDrawer and StatusBar components"
```

---

## Phase 9: React 页面

### Task 9.1: Game 页面 — 完整游戏界面

**Files:**
- Modify: `src/pages/Game.tsx` (replace placeholder)

- [ ] **Step 1: 重写 Game.tsx**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameEngine } from '../hooks/useGameEngine';
import { useLocalStorage, loadGameSave, saveGame } from '../hooks/useLocalStorage';
import { useTimer } from '../hooks/useTimer';
import { GridBoard } from '../components/GridBoard';
import { NumberPad } from '../components/NumberPad';
import { HintDrawer } from '../components/HintDrawer';
import { StatusBar } from '../components/StatusBar';
import type { GameState } from '../types';

interface GameSettings {
  showTimer: boolean;
  showHints: boolean;
  highlightAreas: boolean;
  highlightNumbers: boolean;
}

interface UISettings {
  sound: boolean;
  haptics: boolean;
}

export function Game() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, status, dispatch, newGame, newDailyGame } = useGameEngine();
  const [uiSettings] = useLocalStorage<UISettings>('sudokucalm_ui_settings', { sound: false, haptics: false });
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const initRef = useRef(false);
  const noteModeRef = useRef(false);

  // Keep ref in sync for keyboard handler
  noteModeRef.current = isNoteMode;

  const timerRunning = useMemo(() => {
    if (isPaused) return false;
    if (!state) return false;
    return state.game_status === 'Playing';
  }, [state, isPaused]);

  const { display, reset } = useTimer(timerRunning);

  // Initialize game from route params
  useEffect(() => {
    if (initRef.current || status !== 'ready') return;
    initRef.current = true;

    const mode = searchParams.get('mode');
    const difficulty = searchParams.get('difficulty');

    // Load saved game settings for new games
    const savedGameSettings = localStorage.getItem('sudokucalm_game_settings');
    const gameSettings = savedGameSettings ? JSON.parse(savedGameSettings) : null;

    if (mode === 'daily') {
      const dateStr = new Date().toISOString().slice(0, 10);
      const seed = new Date(dateStr).getTime();
      newDailyGame(seed);
    } else if (mode === 'continue') {
      const saved = loadGameSave();
      if (saved) {
        loadGame(saved);
      }
    } else if (difficulty) {
      newGame(difficulty);
    } else {
      newGame('easy');
    }

    // Apply persisted game settings after new game creation
    if (gameSettings) {
      // Delay dispatch slightly so WASM state is initialized
      setTimeout(() => {
        dispatch({ type: 'UpdateGameSettings', settings: gameSettings });
      }, 50);
    }
  }, [status, searchParams, newGame, newDailyGame, dispatch]);

  // Auto-save on state change
  useEffect(() => {
    if (state && state.game_status === 'Playing') {
      saveGame(JSON.stringify(state));
    }
  }, [state]);

  // Clear save on win/lose
  useEffect(() => {
    if (state?.game_status === 'Won' || state?.game_status === 'Lost') {
      localStorage.removeItem('sudokucalm_save');
    }
  }, [state?.game_status]);

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (key >= '1' && key <= '9') {
        e.preventDefault();
        if (noteModeRef.current) {
          dispatch({ type: 'ToggleNote', value: parseInt(key) });
        } else {
          dispatch({ type: 'InputNumber', value: parseInt(key) });
        }
        if (uiSettings.haptics && navigator.vibrate) navigator.vibrate(10);
      } else if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault();
        dispatch({ type: 'Erase' });
      } else if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
        e.preventDefault();
        moveSelection(key);
      } else if (key === 'n' || key === 'N') {
        e.preventDefault();
        setIsNoteMode((m) => !m);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, uiSettings.haptics]);

  const moveSelection = useCallback((key: string) => {
    if (!state?.grid.selected) return;
    let { row, col } = state.grid.selected;
    if (key === 'ArrowUp') row = Math.max(0, row - 1);
    if (key === 'ArrowDown') row = Math.min(8, row + 1);
    if (key === 'ArrowLeft') col = Math.max(0, col - 1);
    if (key === 'ArrowRight') col = Math.min(8, col + 1);
    dispatch({ type: 'SelectCell', row, col });
  }, [state, dispatch]);

  const handleSelectCell = useCallback((row: number, col: number) => {
    dispatch({ type: 'SelectCell', row, col });
    if (uiSettings.haptics && navigator.vibrate) navigator.vibrate(5);
  }, [dispatch, uiSettings.haptics]);

  const handleNumber = useCallback((value: number) => {
    if (isNoteMode) {
      dispatch({ type: 'ToggleNote', value });
    } else {
      dispatch({ type: 'InputNumber', value });
    }
    if (uiSettings.haptics && navigator.vibrate) navigator.vibrate(10);
  }, [dispatch, isNoteMode, uiSettings.haptics]);

  const handleHint = useCallback(() => {
    dispatch({ type: 'GetHint' });
    setShowHint(true);
  }, [dispatch]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-ink-mid animate-pulse">加载中...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-error">引擎加载失败</p>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg"
          onClick={() => window.location.reload()}
        >
          重试
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-ink-mid">初始化中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <StatusBar
        difficulty={state.difficulty}
        errorCount={state.error_count}
        maxErrors={state.max_errors}
        timeDisplay={display}
        showTimer={state.settings.show_timer}
        onPause={() => setIsPaused((p) => !p)}
      />

      <div className="flex-1 flex items-start justify-center px-2 pt-2">
        <GridBoard state={state} onSelectCell={handleSelectCell} />
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ink-dark mb-4">已暂停</h2>
            <div className="flex gap-3">
              <button
                className="px-6 py-3 bg-primary text-white rounded-xl font-medium"
                onPointerDown={(e) => { e.preventDefault(); setIsPaused(false); }}
              >
                继续
              </button>
              <button
                className="px-6 py-3 bg-ink-light/30 text-ink-dark rounded-xl font-medium"
                onPointerDown={(e) => { e.preventDefault(); navigate('/'); }}
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win/Lose dialogs */}
      {state.game_status === 'Won' && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center animate-pop-in">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-primary mb-2">🎉 恭喜完成！</h2>
            <p className="text-ink-mid mb-6">用时 {display()}</p>
            <button
              className="px-6 py-3 bg-primary text-white rounded-xl font-medium"
              onPointerDown={() => navigate('/')}
            >
              返回首页
            </button>
          </div>
        </div>
      )}

      {state.game_status === 'Lost' && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center animate-shake">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-error mb-2">错误次数已达上限</h2>
            <p className="text-ink-mid mb-6">别灰心，再接再厉！</p>
            <button
              className="px-6 py-3 bg-primary text-white rounded-xl font-medium"
              onPointerDown={() => navigate('/')}
            >
              返回首页
            </button>
          </div>
        </div>
      )}

      <NumberPad
        isNoteMode={isNoteMode}
        onNumber={handleNumber}
        onToggleNoteMode={() => setIsNoteMode((m) => !m)}
        onErase={() => dispatch({ type: 'Erase' })}
        onUndo={() => dispatch({ type: 'Undo' })}
        onRedo={() => dispatch({ type: 'Redo' })}
        onHint={handleHint}
      />

      <HintDrawer
        hint={showHint ? state.hint : null}
        onDismiss={() => setShowHint(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: `npx tsc --noEmit` — 确保无类型错误**

- [ ] **Step 3: Commit**

```bash
git add src/pages/Game.tsx
git commit -m "feat: complete Game page with keyboard, pause, win/lose, autosave"
```

---

### Task 9.2: Dashboard 页面

**Files:**
- Modify: `src/pages/Dashboard.tsx` (replace placeholder)

- [ ] **Step 1: 重写 Dashboard.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { loadGameSave } from '../hooks/useLocalStorage';

const difficulties = [
  { key: 'easy', label: '简单', desc: '适合初学者', color: 'from-green-400 to-emerald-500' },
  { key: 'medium', label: '中等', desc: '需要一些技巧', color: 'from-blue-400 to-primary' },
  { key: 'hard', label: '困难', desc: '挑战你的逻辑', color: 'from-orange-400 to-red-400' },
  { key: 'expert', label: '专家', desc: '真正的数独大师', color: 'from-red-500 to-rose-600' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const [hasSave, setHasSave] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const saved = loadGameSave();
    setHasSave(!!saved);
    const storedStreak = localStorage.getItem('sudokucalm_daily_streak');
    if (storedStreak) setStreak(parseInt(storedStreak));
  }, []);

  const startGame = (difficulty: string) => {
    navigate(`/game?difficulty=${difficulty}`);
  };

  const dailyChallenge = () => {
    navigate('/game?mode=daily');
  };

  const continueGame = () => {
    navigate('/game?mode=continue');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-ink-dark tracking-tight">Sudoku Calm</h1>
        <p className="text-ink-mid text-sm mt-1">专注、沉浸式的数独体验</p>
      </div>

      {/* Continue + Daily */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-10">
        {hasSave && (
          <button
            className="w-full py-4 bg-primary text-white rounded-2xl font-semibold text-lg
                       active:scale-[0.98] transition-transform duration-75"
            onPointerDown={(e) => { e.preventDefault(); continueGame(); }}
          >
            继续游戏
          </button>
        )}
        <button
          className="w-full py-4 bg-accent/20 text-ink-dark rounded-2xl font-semibold text-lg
                     active:scale-[0.98] transition-transform duration-75 flex items-center justify-center gap-2"
          onPointerDown={(e) => { e.preventDefault(); dailyChallenge(); }}
        >
          每日挑战
          {streak > 0 && (
            <span className="text-xs bg-accent text-ink-dark px-2 py-0.5 rounded-full">
              连续 {streak} 天
            </span>
          )}
        </button>
      </div>

      {/* Difficulty Selection */}
      <div className="w-full max-w-sm">
        <h2 className="text-sm font-medium text-ink-mid mb-3 text-center">新游戏</h2>
        <div className="grid grid-cols-2 gap-3">
          {difficulties.map((d) => (
            <button
              key={d.key}
              className={`
                py-5 rounded-2xl text-white font-semibold text-base
                bg-gradient-to-br ${d.color}
                active:scale-[0.96] transition-transform duration-75
                shadow-sm
              `}
              onPointerDown={(e) => { e.preventDefault(); startGame(d.key); }}
            >
              <div>{d.label}</div>
              <div className="text-xs font-normal opacity-80 mt-0.5">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings link */}
      <button
        className="mt-10 text-sm text-ink-mid underline underline-offset-4"
        onPointerDown={(e) => { e.preventDefault(); navigate('/settings'); }}
      >
        设置
      </button>

      <p className="text-ink-light text-xs mt-auto pt-8">v0.1</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: complete Dashboard page with continue, daily, difficulty selection"
```

---

### Task 9.3: Settings 页面

**Files:**
- Modify: `src/pages/Settings.tsx` (replace placeholder)

- [ ] **Step 1: 重写 Settings.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface UISettings {
  sound: boolean;
  haptics: boolean;
}

interface GameSettings {
  show_timer: boolean;
  show_hints: boolean;
  highlight_areas: boolean;
  highlight_numbers: boolean;
}

const defaultGameSettings: GameSettings = {
  show_timer: true,
  show_hints: true,
  highlight_areas: true,
  highlight_numbers: true,
};

export function Settings() {
  const navigate = useNavigate();
  const [uiSettings, setUISettings] = useLocalStorage<UISettings>('sudokucalm_ui_settings', {
    sound: false,
    haptics: false,
  });
  const [gameSettings, setGameSettings] = useLocalStorage<GameSettings>(
    'sudokucalm_game_settings',
    defaultGameSettings
  );

  const toggleUI = (key: keyof UISettings) => {
    setUISettings({ ...uiSettings, [key]: !uiSettings[key] });
  };

  const toggleGame = (key: keyof GameSettings) => {
    setGameSettings({ ...gameSettings, [key]: !gameSettings[key] });
  };

  const uiRows: { key: keyof UISettings; label: string; desc: string }[] = [
    { key: 'sound', label: '音效', desc: '操作时播放声音反馈' },
    { key: 'haptics', label: '震动反馈', desc: '操作时触发设备震动 (Web Vibrate API)' },
  ];

  const gameRows: { key: keyof GameSettings; label: string; desc: string }[] = [
    { key: 'show_timer', label: '显示计时器', desc: '游戏进行中显示计时器' },
    { key: 'show_hints', label: '显示提示解释', desc: '使用提示时展示逻辑推理过程' },
    { key: 'highlight_areas', label: '高亮关联区域', desc: '选中单元格时高亮所在行、列、宫' },
    { key: 'highlight_numbers', label: '高亮相同数字', desc: '选中数字时高亮全盘相同数字' },
  ];

  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          className="text-primary text-sm font-medium p-2 -ml-2"
          onPointerDown={(e) => { e.preventDefault(); navigate(-1); }}
        >
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-ink-dark">设置</h1>
      </div>

      <div className="max-w-sm mx-auto flex flex-col gap-6">
        {/* Game Settings */}
        <section>
          <h2 className="text-xs font-medium text-ink-mid uppercase tracking-wide mb-1">游戏设置</h2>
          <div className="flex flex-col">
            {gameRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between py-4 px-2 border-b border-ink-light/50"
              >
                <div>
                  <div className="text-ink-dark font-medium">{row.label}</div>
                  <div className="text-ink-mid text-xs">{row.desc}</div>
                </div>
                <button
                  role="switch"
                  aria-checked={gameSettings[row.key]}
                  className={`
                    relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0
                    ${gameSettings[row.key] ? 'bg-primary' : 'bg-ink-light'}
                  `}
                  onPointerDown={(e) => { e.preventDefault(); toggleGame(row.key); }}
                >
                  <span
                    className={`
                      absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow
                      transition-transform duration-200
                      ${gameSettings[row.key] ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* UI Settings */}
        <section>
          <h2 className="text-xs font-medium text-ink-mid uppercase tracking-wide mb-1">交互反馈</h2>
          <div className="flex flex-col">
            {uiRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between py-4 px-2 border-b border-ink-light/50"
              >
                <div>
                  <div className="text-ink-dark font-medium">{row.label}</div>
                  <div className="text-ink-mid text-xs">{row.desc}</div>
                </div>
                <button
                  role="switch"
                  aria-checked={uiSettings[row.key]}
                  className={`
                    relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0
                    ${uiSettings[row.key] ? 'bg-primary' : 'bg-ink-light'}
                  `}
                  onPointerDown={(e) => { e.preventDefault(); toggleUI(row.key); }}
                >
                  <span
                    className={`
                      absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow
                      transition-transform duration-200
                      ${uiSettings[row.key] ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <div className="mt-4 text-center">
          <button
            className="text-error text-sm py-2 px-4"
            onPointerDown={(e) => {
              e.preventDefault();
              localStorage.clear();
              navigate('/');
              window.location.reload();
            }}
          >
            清除所有数据
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: complete Settings page with toggle switches and data reset"
```

---

## Phase 10: CI/CD 与部署

### Task 10.1: GitHub Actions — 自动构建部署

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: 写 deploy.yml**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@439b2ee9fe32d8de57b02ebba4c1767826f0c18f # stable
        with:
          toolchain: stable

      - name: Install wasm-pack
        run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

      - name: Cache Cargo
        uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            wasm-engine/target
          key: ${{ runner.os }}-cargo-${{ hashFiles('wasm-engine/Cargo.lock') }}

      - name: Setup Node.js
        uses: actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0
        with:
          node-version: '20'

      - name: Cache npm
        uses: actions/cache@1bd1e32a3bdc45362d1e726936510720a7c30a57 # v4.2.0
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}

      - name: Install npm dependencies
        run: npm ci

      - name: Build WASM
        run: npm run build:wasm

      - name: Build site
        run: npm run build
        env:
          BASE_URL: /sudokucalm/

      - name: Setup Pages
        uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b # v5.0.0

      - name: Upload artifact
        uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3.0.1
        with:
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0f777ac9b878a43 # v4.0.5
```

- [ ] **Step 2: 更新 vite.config.ts — 支持 BASE_URL 条件**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_URL || '/',
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: undefined, // single bundle simpler for WASM
      },
    },
  },
});
```

- [ ] **Step 3: 添加 .gitignore — 保护生成文件**

```gitignore
node_modules/
dist/
wasm-engine/target/
wasm-engine/pkg/
*.wasm
.DS_Store
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml vite.config.ts .gitignore
git commit -m "ci: add GitHub Actions deploy workflow for GitHub Pages"
```

---

## Phase 11: 测试与最终验证

### Task 11.1: Rust 集成测试

**Files:**
- Create: `wasm-engine/tests/integration_test.rs`

- [ ] **Step 1: 写集成测试**

```rust
use sudokucalm_engine::generator;
use sudokucalm_engine::solver;
use sudokucalm_engine::validator;
use sudokucalm_engine::types::*;

#[test]
fn test_full_game_flow() {
    // Generate a puzzle
    let (puzzle, solution) = generator::generate(&Difficulty::Easy, 42);

    // Verify solution is valid
    let solved = solver::solve(&puzzle);
    assert_eq!(solved, Some(solution));

    // Build Grid and verify initial state
    let grid = Grid::new(puzzle);
    let mut given_count = 0;
    for r in 0..9 {
        for c in 0..9 {
            if grid.cells[r][c].is_given {
                given_count += 1;
            }
        }
    }
    assert!(given_count >= 35, "Easy puzzle should have >=35 givens, got {}", given_count);

    // Verify solution matches all given cells
    for r in 0..9 {
        for c in 0..9 {
            if grid.cells[r][c].is_given {
                assert_eq!(grid.cells[r][c].value, solution[r][c]);
            }
        }
    }
}

#[test]
fn test_all_difficulties_generate() {
    for diff in [Difficulty::Easy, Difficulty::Medium, Difficulty::Hard, Difficulty::Expert] {
        let (puzzle, solution) = generator::generate(&diff, diff as u64);
        let solved = solver::solve(&puzzle);
        assert_eq!(solved, Some(solution), "Failed for difficulty: {:?}", diff);
    }
}

#[test]
fn test_daily_seed_reproducible() {
    let seed = 1234567890u64;
    let (p1, s1) = generator::generate(&Difficulty::Medium, seed);
    let (p2, s2) = generator::generate(&Difficulty::Medium, seed);
    assert_eq!(p1, p2);
    assert_eq!(s1, s2);
}
```

- [ ] **Step 2: 修正 Cargo.toml — 确保 `lib.rs` 中 `mod` 声明均为 `pub`**

Update `wasm-engine/src/lib.rs` — all `mod` declarations:
```rust
pub mod types;
pub mod grid;
pub mod solver;
pub mod validator;
pub mod generator;
pub mod history;
pub mod highlight;
pub mod daily;
pub mod hint_engine;
pub mod strategies;
pub mod engine;
```

- [ ] **Step 3: Run integration tests**

```bash
cd wasm-engine && cargo test
```
Expected: all unit + integration tests pass

- [ ] **Step 4: Commit**

```bash
git add wasm-engine/tests/ wasm-engine/src/lib.rs
git commit -m "test: add Rust integration tests for full game flow"
```

---

### Task 11.2: 本地验证 + 构建测试

- [ ] **Step 1: 完整本地构建**

```bash
# Build WASM
npm run build:wasm

# Build frontend
npm run build

# Verify dist/ output
ls dist/index.html
ls dist/assets/
```
Expected: `dist/` directory exists with HTML, JS, CSS, and WASM files

- [ ] **Step 2: 本地预览**

```bash
npm run preview
```
Open http://localhost:4173 in browser. Verify:
- Dashboard loads with 4 difficulty buttons + daily challenge button
- Clicking "简单" navigates to `/game?difficulty=easy`
- Grid renders 9x9 cells with some given numbers
- Selecting a cell highlights row/column/box
- Number pad works for entering numbers
- Undo/redo work
- Pause overlay shows/hides
- Hint drawer shows explanation

- [ ] **Step 3: 验证 Tailwind CSS 生产构建 (Purge)**

```bash
ls -lh dist/assets/*.css
```
Expected: CSS file size < 15KB (Tailwind purges unused styles)

- [ ] **Step 4: 验证 WASM 文件大小**

```bash
ls -lh dist/assets/*.wasm
```
Expected: WASM file < 200KB (opt-level=s + lto + strip)

- [ ] **Step 5: 验证 Hash 路由工作**

Run `npm run preview`, open browser console, verify:
```js
window.location.hash // should show "#/" or "#/game?difficulty=easy"
```

- [ ] **Step 6: 验证 `npm run dev` 本地开发正常**

```bash
npm run dev
```
Expected: Vite starts on localhost:5173, Hot Module Replacement works, WASM loads

- [ ] **Step 7: Commit**

```bash
git commit -m "chore: final integration verification and build test"
```

---

### Task 11.3: README 文档

**Files:**
- Create: `README.md`

- [ ] **Step 1: 写 README.md**

```markdown
# Sudoku Calm

A clean, focused, immersive Sudoku game built with React + Rust WASM.

## Features

- 🧩 Four difficulty levels: Easy, Medium, Hard, Expert
- 📅 Daily challenge with streak tracking
- 💡 Smart hint system with logic explanations (Chinese)
- ✏️ Note/pencil mode with smart auto-erase
- ↩️ Undo/Redo support
- 🎨 Responsive design, works on mobile and desktop
- 🌐 Works offline, all data stored locally

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite 5, Tailwind CSS 3
- **Engine:** Rust → WASM (via wasm-pack)
- **Deployment:** GitHub Pages via GitHub Actions

## Development

### Prerequisites

- Node.js 20+
- Rust toolchain (stable)
- wasm-pack

### Setup

```bash
npm install
npm run build:wasm
npm run dev
```

### Build

```bash
npm run build:wasm
npm run build
```

### Test

```bash
cd wasm-engine && cargo test
npx tsc --noEmit
```

## Project Structure

```
sudokucalm/
├── wasm-engine/         # Rust → WASM game engine
│   ├── src/
│   │   ├── types.rs     # All shared data structures
│   │   ├── grid.rs      # Grid operations
│   │   ├── solver.rs    # Backtracking solver
│   │   ├── validator.rs # Conflict checking
│   │   ├── generator.rs # Puzzle generation
│   │   ├── engine.rs    # Dispatch/reduce pipeline
│   │   ├── highlight.rs # Highlight computation
│   │   ├── hint_engine.rs # Hint strategy chain
│   │   ├── history.rs   # Undo/redo stack
│   │   └── strategies/  # 7 solving strategies
│   └── tests/
├── src/
│   ├── components/      # React components
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom hooks
│   ├── types/           # TypeScript types
│   └── wasm-pkg/        # Built WASM output
├── .github/workflows/   # CI/CD
└── docs/superpowers/    # Design docs & plans
```

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup instructions and project structure"
```

---
```
