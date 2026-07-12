# Sudoku Calm — 项目开发指南

React + Rust WASM 数独游戏，托管于 GitHub Pages。

## 环境要求

- Node.js 20+
- Rust (stable) + wasm32-unknown-unknown target
- wasm-pack (`cargo install wasm-pack`)

## 快速启动

```bash
# 1. 编译 Rust → WASM
npm run build:wasm
# 等价于: wasm-pack build wasm-engine --target web --out-dir ../src/wasm-pkg --no-opt

# 2. 启动开发服务器
npm run dev
# → http://localhost:5173

# 3. 运行 Rust 测试
cd wasm-engine && cargo test

# 4. 生产构建
npm run build
# 输出到 dist/
```

## 项目结构

```
sudokucalm/
├── wasm-engine/              # Rust WASM 引擎
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs            # WASM 入口 & dispatch 函数
│       ├── types.rs          # 共享数据类型 (ts-rs 导出)
│       ├── grid.rs           # 棋盘操作 (填数/笔记/擦除)
│       ├── generator.rs      # 题目生成 (回溯填板 + 挖洞)
│       ├── solver.rs         # 回溯求解器 & 唯一性验证
│       ├── validator.rs      # 冲突检测 & 游戏状态判定
│       ├── history.rs        # 撤销/重做历史栈
│       ├── highlight.rs      # 关联区域 & 数字共振高亮
│       └── hint_engine.rs    # 智能提示 (7种策略 + 回溯兜底)
├── src/
│   ├── main.tsx              # React 入口
│   ├── App.tsx               # Hash 路由 (createHashRouter)
│   ├── pages/
│   │   ├── Dashboard.tsx     # 首页 (继续/每日/难度选择)
│   │   ├── Game.tsx          # 游戏主页面
│   │   └── Settings.tsx      # 设置页面
│   ├── components/
│   │   ├── Cell.tsx           # 单格 (React.memo + onPointerDown)
│   │   ├── GridBoard.tsx      # 9×9 棋盘 (预计算 Set 实现 O(1) 高亮)
│   │   ├── StatusBar.tsx      # 状态栏 (难度/错误点/计时器)
│   │   ├── NumberPad.tsx      # 数字键盘 + 笔记模式切换
│   │   ├── Toolbar.tsx        # 撤销/重做/提示/擦除
│   │   ├── HintDrawer.tsx     # 提示底部抽屉
│   │   └── GameOverDialog.tsx # 胜利/失败弹窗
│   ├── hooks/
│   │   ├── useGameEngine.ts   # WASM 加载 & dispatch 封装
│   │   ├── useLocalStorage.ts # 存档持久化 (SaveEnvelope)
│   │   └── useTimer.ts        # 游戏计时器
│   ├── types/
│   │   ├── index.ts           # UISettings + generated 再导出
│   │   ├── action.ts          # Action 联合类型 (12 variants)
│   │   └── generated/         # ts-rs 自动生成的 TypeScript 类型
│   └── wasm-pkg/              # wasm-pack 构建输出 (git-ignored)
├── dist/                      # Vite 生产构建输出
├── .github/workflows/deploy.yml  # GitHub Pages CI/CD
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

## WASM 通信协议

JS 与 Rust 之间通过 JSON 字符串通信：

```
JS → Rust: dispatch(action_json) → new_state_json
JS → Rust: load_state(json)       (恢复存档)
JS → Rust: new_game(difficulty_json)
JS → Rust: new_daily(date_string)
```

Action 格式 (tagged union):
```json
{ "type": "selectCell", "row": 0, "col": 0 }
{ "type": "inputNumber", "value": 5 }
{ "type": "toggleNote", "value": 3 }
{ "type": "toggleNoteMode" }
{ "type": "erase" }
{ "type": "undo" }
{ "type": "redo" }
{ "type": "getHint" }
{ "type": "newGame", "difficulty": "Easy" }
{ "type": "updateGameSettings", "settings": { ... } }
{ "type": "setFinalTime", "seconds": 120 }
```

## 关键设计决策

- **`onPointerDown`** 替代 `onClick` — 移动端零延迟触摸响应
- **`React.memo`** 在 Cell/GridBoard 上 — 使用预计算的 `Set<string>` 实现 O(1) 高亮查找
- **Hash 路由** (`createHashRouter`) — 兼容 GitHub Pages 静态托管
- **`thread_local!` + `RefCell`** — WASM 内部状态管理，单线程安全
- **不可变 reducer 模式** — `reduce(state, action) → new_state`，不修改原状态
- **`check_game_status` 使用 `>=`** — max_errors=3 意味着第 3 次错误即判负
- **`wasm-opt = false`** (Cargo.toml) + `--no-opt` (CLI) — 跳过 binaryen 下载

## 常见问题

**WASM 编译失败 "failed to download binaryen"**
→ `package.json` 的 `build:wasm` 脚本已包含 `--no-opt` 标志

**Vite 构建时 tsc 报错**
→ 运行 `cd wasm-engine && cargo test` 确认最新类型已生成到 `src/types/generated/`

**开发服务器 CSP 阻止 WASM 加载**
→ `index.html` 中 `connect-src 'self'` 已配置，允许 fetch 加载 .wasm 文件
