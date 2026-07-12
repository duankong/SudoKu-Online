# Sudoku Calm — 设计文档

## 一、产品概述

基于 React + Rust WASM 的纯 Web 端数独游戏，托管于 GitHub Pages。核心理念：**干净、专注、沉浸式**。无需下载安装，即开即玩。

区别于传统"给答案"的数独工具，本项目提供**教逻辑**的智能提示系统，逐步骤解释解题推理过程。

---

## 二、技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 前端框架 | React 18+ (TypeScript) | Hooks 处理复杂游戏状态，生态成熟 |
| 样式 | Tailwind CSS 3 | 极速实现 UI 规范，响应式 |
| 路由 | React Router v6 `createHashRouter` | Hash 模式兼容 GitHub Pages 静态托管 |
| 构建 | Vite 5 | 打包速度快，WASM 导入支持好 |
| 游戏引擎 | Rust → WASM (wasm-pack) | 所有计算下沉到 Rust，前端只做渲染 |
| 类型桥接 | ts-rs crate | Rust 类型自动生成 TypeScript 类型，DRY |
| 通信格式 | JSON (serde_json) | 简单直观，9×9 数据量极小 |

---

## 三、核心架构决策

### 决策 1：Rust WASM 全引擎，前端只做渲染

**Rust 端负责所有计算逻辑**：题目生成、求解、智能提示、高亮计算、校验、撤销/重做栈、智能擦除笔记、每日挑战种子。WASM 模块内部持有权威状态，不信任前端传入的 state。

**React 端只负责**：渲染网格/数字/动画、计时器（纯 UI 状态）、音效/震动、localStorage 持久化、路由、键盘事件转发。

### 决策 2：ts-rs 自动生成类型

Rust `#[derive(TS)]` 在构建时自动产出 TypeScript 类型文件至 `src/types/generated.ts`，消除手动同步成本。CI 中执行 `git diff --exit-code` 强制生成文件与源码同步。

### 决策 3：dispatch(action) → newState 单一入口

所有游戏操作统一通过 `dispatch(action)` 调 WASM。WASM 内部持有权威 `GameState`，不接收前端 state JSON。dispatch 是纯函数，无 Rust 端可变全局状态。

### 决策 4：JSON 通信

WASM ↔ JS 使用 JSON 字符串通信。9×9 棋盘数据量极小（<2KB），序列化开销可忽略。调试友好。

### 决策 5：设置分层 — GameSettings vs UISettings

- **GameSettings**（Rust 端，ts-rs 导出）：`show_timer`, `show_hints`, `highlight_areas`, `highlight_numbers` — 影响计算的开关
- **UISettings**（React 端，独立 localStorage key）：`sound`, `haptics` — 纯 UI 偏好，不跨越 WASM 边界

### 决策 6：计时器为 React 本地状态

计时器不进入 WASM。`useTimer` 维护本地 `elapsedSeconds`，仅在游戏完成时将最终时间写入 `GameState`。消除每秒一次的 WASM 往返。

### 决策 7：零延迟触控响应（Perceived Instant）

目标是"手指点到，视觉跟到"。策略：

- **`onPointerDown` 代替 `onClick`**：click 事件有 ~300ms 延迟（移动端双击缩放检测），pointerdown 立即触发
- **WASM 简单操作 <1ms**：选中单元格、填数字、切换笔记这些操作的 Rust 端计算必须在 1ms 内完成（不含序列化）。序列化/反序列化 ~2KB 在 0.1ms 内
- **React.memo 精准重渲染**：`Cell.tsx` 只在高亮状态实际变化时重渲染，81 个格子中通常只有 20-30 个需要更新
- **不防抖用户操作**：dispatch 是同步的，不快于用户手指速度时不节流
- **高亮结果预计算**：WASM 返回的 GameState 中直接包含 `highlighted_cells`（带类别标记的坐标集合），React 只需 O(1) 查表，不在渲染循环中计算

**目标指标：** 从手指触碰到格子颜色变化 <50ms（移动端）/ <30ms（PC 端）。

---

## 四、项目结构

```
sudokucalm/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── Cargo.toml

├── wasm-engine/                    # Rust WASM 游戏引擎
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs                  # wasm-bindgen 薄封装（序列化/反序列化）
│       ├── engine.rs               # dispatch/reduce 管线编排
│       ├── grid.rs                 # Grid 数据结构 + 基本操作
│       ├── generator.rs            # 题目生成（回溯 + 挖洞）
│       ├── solver.rs               # 求解器
│       ├── hint_engine.rs          # 提示编排（策略路由）
│       ├── strategies/
│       │   ├── mod.rs
│       │   ├── naked_single.rs
│       │   ├── hidden_single.rs
│       │   ├── naked_pair.rs
│       │   ├── hidden_pair.rs
│       │   ├── pointing.rs
│       │   ├── box_line_reduction.rs
│       │   └── x_wing.rs
│       ├── history.rs              # 撤销/重做栈
│       ├── highlight.rs            # 高亮计算
│       ├── validator.rs            # 冲突校验 + 错误计数 + 完成判定
│       ├── daily.rs                # 每日挑战种子哈希
│       └── types.rs                # 公共类型（+ ts-rs #[derive(TS)] 导出）

├── src/                            # React 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx           # 首页
│   │   ├── Game.tsx                # 游戏主界面（状态分发点）
│   │   └── Settings.tsx            # 设置页面
│   ├── components/
│   │   ├── Grid.tsx                # 9×9 棋盘布局外壳
│   │   ├── Cell.tsx                # 单个格子（React.memo）
│   │   ├── CellNotes.tsx           # 笔记数字 3×3 渲染
│   │   ├── NumberPad.tsx           # 底部数字键盘 1-9
│   │   ├── ActionBar.tsx           # 撤销/重做/提示/擦除按钮组
│   │   ├── HintDrawer.tsx          # 底部提示抽屉
│   │   ├── StatusBar.tsx           # 难度/错误/计时器
│   │   ├── ContinueCard.tsx        # 继续游戏卡片
│   │   ├── DailyCard.tsx           # 每日挑战卡片
│   │   ├── SettingsPanel.tsx       # 设置开关面板
│   │   ├── Switch.tsx              # 通用开关组件
│   │   ├── Modal.tsx               # 通用弹窗组件
│   │   ├── CompletionModal.tsx     # 游戏完成（胜利/失败）弹窗
│   │   ├── LoadingScreen.tsx       # WASM 加载中画面
│   │   ├── ErrorFallback.tsx       # WASM 加载失败 + 重试
│   │   └── ErrorBoundary.tsx       # React 错误边界
│   ├── hooks/
│   │   ├── useGameEngine.ts        # WASM 加载 + dispatch + 状态桥接
│   │   ├── useLocalStorage.ts      # localStorage 读写（debounce 500ms + 损坏处理 + 版本管理）
│   │   ├── useTimer.ts             # 计时器（纯 React state，不调 WASM）
│   │   ├── useKeyboard.ts          # 实体键盘 → Action 映射
│   │   └── useSound.ts             # 音效管理（读 UISettings）
│   ├── utils/
│   │   └── colors.ts               # 色板常量 + 状态 → Tailwind 完整类名映射
│   └── types/
│       ├── generated.ts             # ts-rs 自动生成（勿手改，CI 守卫）
│       └── index.ts                 # 再导出 + 前端专有类型（UISettings 等）

├── .github/
│   └── workflows/
│       └── deploy.yml               # GitHub Actions CI/CD（含 audit + 类型同步检查）

└── public/
    └── sounds/                       # 音效文件（可选）
```

### 分层职责

| 层 | 职责 | 不负责 |
|----|------|--------|
| `wasm-engine/` | 所有游戏计算，**持有权威状态** | UI 渲染、存储、计时 |
| `pages/` | 组装组件，注入 hooks，组合错误边界 | 业务逻辑 |
| `components/` | 无状态 props 渲染 | 状态管理 |
| `hooks/` | 状态 + 副作用 | 可视化渲染 |
| `utils/` | 纯函数常量（返回完整 Tailwind 类名） | 副作用 |

---

## 五、Rust 引擎架构

### 公共 API（wasm-bindgen）

```rust
#[wasm_bindgen]
pub fn new_game(difficulty: &str) -> JsValue;
// 初始化内部 GameState，返回完整状态 JSON

#[wasm_bindgen]
pub fn new_daily_game(seed: u64) -> JsValue;
// 初始化内部 GameState with daily puzzle，返回完整状态 JSON

#[wasm_bindgen]
pub fn dispatch(action_json: &str) -> JsValue;
// 接收 Action JSON，应用到内部 GameState，返回新状态 JSON
// 不接收 state_json —— WASM 持有权威状态，前端不可篡改

#[wasm_bindgen]
pub fn load_game(save_json: &str) -> JsValue;
// 从 localStorage 存档恢复内部 GameState
// 校验存档完整性（version check），损坏则返回全新状态
```

### Action 枚举

```rust
#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum Action {
    SelectCell { row: u8, col: u8 },
    InputNumber { value: u8 },
    ToggleNote { value: u8 },
    ToggleNoteMode,
    Erase,
    Undo,
    Redo,
    GetHint,
    UpdateGameSettings { settings: GameSettings },
    SetFinalTime { seconds: u32 },   // 游戏完成时前端传入最终用时
}
```

注意：`Tick` 不在 Action 中 — 计时器为 React 本地状态。

### 核心数据结构

```rust
#[derive(Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct GameState {
    pub grid: Grid,
    pub difficulty: Difficulty,
    pub solution: [[u8; 9]; 9],
    pub error_count: u8,
    pub max_errors: u8,             // 默认 3
    pub game_status: GameStatus,
    pub elapsed_seconds: u32,       // 仅 SetFinalTime 时写入
    pub settings: GameSettings,
    pub hint: Option<Hint>,         // 当前活跃提示（非 GetHint action 时清除）
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
    // 注意：sound 和 haptics 不在 Rust 端，属于 UISettings
}

#[derive(Serialize, TS)]
#[ts(export)]
pub struct Hint {
    pub strategy: StrategyType,
    pub target: Pos,
    pub value: u8,
    pub related_cells: Vec<Pos>,
    pub eliminated: Vec<u8>,
    pub message_cn: String,         // 前端作为纯文本渲染，不用 dangerouslySetInnerHTML
}

/// 高亮预计算结果 — WASM 每次 dispatch 时计算，React 只需 O(1) 查表
#[derive(Clone, Serialize, TS)]
#[ts(export)]
pub struct Highlights {
    pub related_area: Vec<Pos>,     // 选中格的行/列/宫所有格子
    pub same_number: Vec<Pos>,      // 与选中数字相同的所有格子
    pub hint_cells: Vec<Pos>,       // 提示关联格子（金色）
    pub error_cells: Vec<Pos>,      // 冲突格子（红色）
}

/// 9×9 棋盘
#[derive(Clone, Serialize, TS)]
#[ts(export)]
pub struct Grid {
    pub cells: [[Cell; 9]; 9],
    pub selected: Option<Pos>,
    pub selected_number: Option<u8>,
    pub highlights: Highlights,
}
```

### engine.rs — dispatch 管线

`lib.rs` 只做序列化/反序列化，所有游戏逻辑编排在 `engine.rs`：

```rust
// engine.rs
pub fn reduce(state: &mut GameState, action: &Action) {
    match action {
        Action::InputNumber { value } => reduce_input_number(state, *value),
        Action::SelectCell { row, col } => reduce_select_cell(state, *row, *col),
        Action::GetHint => reduce_get_hint(state),
        // ... 每个 action → private reduce_* 函数
    }
}
```

**WASM 内部状态管理：** 使用 `thread_local!` + `RefCell<Option<GameState>>` 持有权威状态（非 `static mut`，安全）。

**纯函数约束：** 所有策略函数、solver、validator 为无状态纯函数。RNG 每次调用时创建，不持有全局 RNG 状态。

### 填数操作流程

```
dispatch({ type: "InputNumber", value: 5 })
  → validator::conflict_check(grid, pos, 5) → Vec<Pos>
  → grid::set_value(grid, pos, 5, has_conflict)
  → grid::smart_erase_notes(grid, pos, 5)
  → history::push_undo(grid_snapshot)
  → highlight::compute(grid, settings) → HighlightResult
  → validator::check_game_status(grid, solution, error_count) → GameStatus
  → hint = None（清除上次提示）
  → 组装 GameState → return
```

### 智能提示策略链

按难度递进尝试 7 种策略，首个匹配即返回：

1. `naked_single` — 唯一数
2. `hidden_single` — 隐性唯一数
3. `naked_pair` — 显性数对
4. `hidden_pair` — 隐性数对
5. `pointing` — 指向
6. `box_line_reduction` — 宫/行删减
7. `x_wing` — X-Wing

所有策略失败时回退到 solver 暴力求解并直接返回答案。

### 题目生成

1. `fill_board()` — 回溯填入完整合法棋盘
2. `dig_holes(difficulty)` — 逐步挖空，每次挖洞后 solver 验证唯一解
3. 按难度控制已知数范围：Easy 35-40, Medium 28-34, Hard 22-27, Expert 17-21

生成完成后测量耗时。若 Expert 耗时 >50ms，前端展示 "生成中..." 过渡态。

### 撤销/重做

- `History { undo_stack: Vec<Grid>, redo_stack: Vec<Grid> }`
- 每次操作前 push 当前 Grid 快照到 undo_stack
- Undo 时 push 到 redo_stack
- Grid Clone 快照约 1.6KB/步，最多保留 100 步
- 游戏完成（Won/Lost）后，除 Undo 外所有 Action 均为无操作（idempotent no-op）

### 每日挑战种子

```rust
fn daily_seed(date_str: &str) -> u64 {
    // date_str → SHA256 → 取前 8 字节 → u64
    // 同一天全球玩家同一题目
}
```

种子可预测是设计意图（透明性），非安全缺陷。预留 `seed_version: u8` 字段支持未来算法升级。

### WASM 编译优化

```toml
[profile.release]
opt-level = "s"
lto = true
strip = true
```

目标：WASM 二进制 gzip 后 <100KB。

---

## 六、React 数据流

### 单向数据流

```
用户交互 → dispatch(action) → WASM 计算 → new GameState → React setState → 子组件 re-render(props)
```

**零延迟触控：** Cell 和 NumberPad 使用 `onPointerDown`（非 `onClick`）消除移动端 300ms 双击检测延迟。

**高亮极速渲染：** WASM 返回的 `Grid.highlights` 已预计算 4 类坐标集合。Cell 组件渲染时只需：

```ts
const isHighlighted = cellState.highlights.related_area.has(pos); // O(1) Set lookup
```

无需在 React 渲染循环中做行/列/宫计算。`Cell.tsx` 包裹 `React.memo`，只在高亮状态变化时重渲染。

### useGameEngine 接口

```typescript
interface WasmEngineState {
    status: 'loading' | 'ready' | 'error';
    error: string | null;
    state: GameState | null;
    dispatch: (action: Action) => void;
    newGame: (difficulty: string) => void;
    loadGame: (saved: GameState) => void;
    retry: () => void;
}
```

**加载态处理：**
- `loading` → 渲染 `<LoadingScreen>`（品牌标题 + 淡入脉冲动画）
- `error` → 渲染 `<ErrorFallback>`（错误说明 + 重试按钮）
- `ready` + `state === null` → Dashboard 正常渲染

**错误处理：**
- `dispatch` 内部 try-catch，WASM panic 不会导致 React 崩溃
- `<ErrorBoundary>` 包裹每个 page，捕获渲染异常

### 其他 Hooks 职责

| Hook | 触发源 | 职责 |
|------|--------|------|
| `useLocalStorage` | state 变化 (debounce 500ms) | 序列化存 localStorage（含 version + checksum 信封）；读取时校验完整性，损坏则清理并返回 null |
| `useTimer` | `game_status === Playing` | 本地 `useRef(startTime) + setInterval` 计算 elapsed，不调 WASM；`Page Visibility API` 监听 tab 切换暂停/恢复；游戏完成时 dispatch `SetFinalTime` |
| `useKeyboard` | `window.keydown` | 1-9→InputNumber, Backspace→Erase, Ctrl/Cmd+Z→Undo, N→ToggleNoteMode, 方向键→相邻格移动；守卫：`event.isComposing` 跳过, `event.repeat` 跳过, `<input>` 焦点时跳过, `preventDefault()` 阻止默认行为 |
| `useSound` | dispatch 后回调 | 填数音/错误音/完成音，读 UISettings（独立 localStorage key `sudokucalm_ui`） |

### 设计约束

- `useGameEngine` 内部 try-catch dispatch 调用
- `useTimer` **不调 WASM** — elapsed_seconds 是本地 React state
- `useKeyboard` 只做键码→Action 映射，不含游戏逻辑判断
- 所有子组件为无状态 props 驱动
- `Cell.tsx` 包裹 `React.memo`，只在 props 变化时重渲染
- Grid/StatusBar/ActionBar/HintDrawer 包裹 `React.memo`

---

## 七、路由设计

使用 `createHashRouter`（React Router v6.4+），三个路由：

```
#/          →  Dashboard    首页仪表盘
#/game      →  Game         游戏主界面
#/settings  →  Settings     设置页
```

### 首次进入流程

```
App 挂载
  → useGameEngine 异步加载 WASM
    → loading: 显示 LoadingScreen
    → error: 显示 ErrorFallback (含 retry)
    → ready: 继续
  → useLocalStorage 读取 "sudokucalm_save" 和 "sudokucalm_ui"
  → Dashboard 渲染

首页行为:
  - 有存档 → 显示 ContinueCard（难度/已用时间/进度）
  - 无存档 → 不显示 ContinueCard
  - 始终显示 DailyCard + 难度选择按钮

点击"继续" → loadGame(saved) → navigate("/game")
点击"新游戏" → newGame(difficulty) → navigate("/game")
访问 /game 且 state 为空 → navigate("/", { replace: true })
```

---

## 八、样式系统

### 色板

| Token | 值 | 用途 |
|-------|-----|------|
| `primary` | `#3654D2` | 按钮、开关激活、选中格、玩家数字 |
| `primary-light` | `#DDE6F9` | 关联区域高亮背景 |
| `accent` | `#E4C779` | 提示线索金色高亮 |
| `ink-dark` | `#1C1C1E` | 已知数字 |
| `ink-mid` | `#767680` | 笔记数字（原 #8E8E93 对比度不达标，已加深） |
| `ink-light` | `#D0D7E5` | 单格细线（装饰性，无需强对比） |
| `border` | `#8294B4` | 3×3 宫格粗线 |
| `error` | `#C62828` | 错误标记（原 #D9534F 对比度不达标） |

### 网格渲染优先级

```
1. 选中格      → bg-primary text-white ring-2 ring-primary
2. 关联区域    → bg-primary-light
3. 数字共振    → bg-primary-light/60
4. 提示线索    → bg-accent/40 + 金色闪烁动画 (opacity on pseudo-element, GPU-composited)
5. 错误格      → bg-error/15 + border-error（颜色+形状双重区分，满足 WCAG 1.4.1）
6. 默认空      → bg-white
```

### 文字规范

- 已知数字：`text-ink-dark font-semibold text-[1.75rem]`
- 玩家数字：`text-primary font-medium text-[1.75rem]`
- 笔记数字：`text-ink-mid text-[0.65rem]`，CSS Grid 3×3 固定布局，非 notes 位 opacity-0 占位

### 响应式

- **< 640px**：棋盘宽 = `min(100vw - 16px, 400px)`（减少 padding），整体高度用 `100dvh` flex 布局防滚动
- **≥ 640px**：棋盘宽 = `min(500px, 60vh)`
- **≥ 1024px**：水平布局，ActionBar 置于棋盘右侧

### 触控目标

- 单元格最小 44px（符合 Apple HIG）
- NumberPad 按钮最小 48px（符合 Material Design）

### 动画

| 动画 | 实现 | respects reduced-motion |
|------|------|------------------------|
| 填数 pop-in | `scale(0.8→1)` + `opacity`，150ms ease-out | ✅ → 直接显示 |
| 提示金色闪烁 | `@keyframes hint-flash` opacity on `::after` pseudo，重复 3 次 | ✅ → 静态金色背景 |
| 错误抖动 | `translateX(±4px)`，300ms | ✅ → 静态红色边框 |
| 抽屉滑入 | `translateY(100%→0)`，300ms | ✅ → 直接显示 |
| WASM 加载 | 标题 opacity 脉冲 | ✅ → 静态标题 |

### 可访问性 (a11y)

- Grid: `role="grid"` + 每行 `role="row"` + 每格 `role="gridcell"` + `aria-rowindex` + `aria-colindex` + `aria-selected`
- 隐藏 `aria-live="polite"` 区域：播报提示、错误、胜利/失败
- 错误格除颜色外叠加 border 样式（WCAG 1.4.1）
- 选中格 `:focus-visible` 自定义样式
- `prefers-reduced-motion: reduce` 禁用所有动画
- `prefers-color-scheme: dark` 留后续版本支持

---

## 九、数据持久化

### 存档格式

```json
{
  "version": 1,
  "checksum": "sha256-hex...",
  "data": { /* GameState JSON */ }
}
```

- `version`：用于未来迁移，版本不匹配则丢弃并提示用户
- `checksum`：SHA-256 of `data`，校验不通过则丢弃并清理（防止损坏/corrupted 存档导致 WASM panic）
- `serde_json::from_str` 始终用 `Result` 处理，永不 `unwrap()`

### UISettings 独立存储

```json
// localStorage key: "sudokucalm_ui"
{
  "sound": true,
  "haptics": true
}
```

React 端 `useSound` 直接从该 key 读取，不经过 WASM。

---

## 十、本地开发与调试

### 开发环境启动

```bash
# 前置条件
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# 首次/类型变更后：构建 WASM + 生成 TS 类型
wasm-pack build wasm-engine --target web --out-dir ../src/wasm-pkg

# 启动前端开发服务器
npm install
npm run dev
# → Vite dev server at http://localhost:5173
```

### WASM 热更新

Rust 代码修改后需重新 `wasm-pack build`。Vite 不自动监听 Rust 变更。开发时可配置 `vite-plugin-wasm` 或在 `package.json` 添加 watch 脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build:wasm": "wasm-pack build wasm-engine --target web --out-dir ../src/wasm-pkg",
    "dev:wasm": "cargo watch -C wasm-engine -s 'wasm-pack build --target web --out-dir ../src/wasm-pkg'",
    "dev:full": "concurrently \"npm run dev\" \"npm run dev:wasm\""
  }
}
```

使用 `concurrently` 并行启动 Vite + cargo-watch，Rust 变更时自动重新编译 WASM，Vite HMR 自动刷新页面。

### Vite base 路径配置

```ts
// vite.config.ts
export default defineConfig({
  base: process.env.BASE_URL || '/',   // 本地 '/' ，CI 设 BASE_URL='/sudokucalm/'
  // ...
});
```

- **本地 `npm run dev`**：`base = '/'`，访问 `http://localhost:5173`
- **CI `npm run build`**：`BASE_URL=/sudokucalm/`，资源路径加仓库名前缀
- React Router Hash 模式两端兼容，无需调整

### 调试工具

- Chrome DevTools → Sources → 查看 WASM 反编译后的 Rust 源码（需 dev 构建 + DWARF）
- `wasm-pack build --dev` 保留调试符号，release 用 `--release`
- 开发时在 `console.log` 中输出 dispatch 耗时：`performance.now()` 差值

---

## 十一、CI/CD 部署

### GitHub Actions 工作流

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write   # 仅 gh-pages 推送所需

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown

      - name: Install wasm-pack (pinned)
        uses: jetli/wasm-pack-action@v0.4.0
        with:
          version: 'v0.13.0'

      - name: Audit Rust dependencies
        run: cargo audit --deny warnings
        working-directory: wasm-engine

      - name: Audit npm dependencies
        run: npm audit --audit-level=high

      - name: Build WASM
        run: wasm-pack build wasm-engine --target web --out-dir ../src/wasm-pkg

      - name: Check generated types sync
        run: git diff --exit-code src/types/generated.ts
        # 若 Rust 类型变更但未重新生成 generated.ts，CI 失败

      - name: Install npm deps
        run: npm ci

      - name: Build Vite
        run: npm run build
        env:
          BASE_URL: /sudokucalm/

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@373f7f263a76c20808c831209c920827a82a2847  # v3.9.3 (pinned SHA)
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 关键配置

- `vite.config.ts` 中 `base: '/sudokucalm/'`
- React Router 使用 `createHashRouter`
- GitHub Pages Source → `gh-pages` 分支
- `index.html` 包含 CSP meta 标签：
  ```html
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'none'; font-src 'self'; media-src 'self'; img-src 'self' data:;">
  ```

---

## 十二、测试策略

| 层级 | 工具 | 范围 |
|------|------|------|
| Rust 单元 | `cargo test` | 每个策略正确性、validator、history、generator 唯一解、dispatch 纯函数性 |
| Rust 集成 | `cargo test` | 完整流程：生成 → dispatch 序列 → 校验 → 完成判定；状态复原性测试 |
| React 渲染 | Vitest + Testing Library | 组件 mock props 渲染、事件回调、Cell 高亮优先级逻辑 |
| E2E | Playwright (可选) | 完整用户流程：首页 → 选难度 → 填数 → 完成 |

**Rust 层测试优先级最高** — 游戏逻辑正确性为整个应用的生命线。

**关键测试用例（Rust）：**
- 每种策略用已知盘面验证推理正确性
- `digit_holes` 后 solver 验证唯一解
- 两个不同顺序但等价的操作序列产生相同终态
- 错误超过 max_errors 后状态正确转换
- Undo/Redo 栈在边界情况（空栈 undo、满栈 push）行为正确
