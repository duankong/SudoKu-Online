# UI 复刻与交互增强 — 设计文档

## 一、背景与目标

对照 `reference/IMG_9340.png` ~ `IMG_9347.png`（共 8 张参考截图：Dashboard、Settings、Game、Game Settings、Smart Hint 抽屉等界面），完整复刻其视觉设计，同时保留并延伸当前 Web 版本已有的交互模型（WASM 权威状态、dispatch(action) 单入口等），而非照搬参考 App 的交互逻辑。

本设计文档覆盖：Rust 后端新增能力、Dashboard/Game/Settings 三个页面的重构、i18n 双语支持、图标库引入。不涉及 Pro 会员、Share、Rate、Feedback、Privacy、Terms、Version 等功能——这些在参考图中出现但用户明确要求本阶段不实现，也不留占位符。

---

## 二、Rust 后端新增能力

### 决策：新增 3 个 Action，复用现有 dispatch 管线

在现有 `Action` 枚举（`wasm-engine/src/types.rs:127`）基础上新增：

```rust
pub enum Action {
    // ...现有 11 个 variant 不变
    AutoNotes,
    ClearNotes,
    ApplyHint,
}
```

#### `AutoNotes`

对棋盘每个空格（`value == 0`）调用现有的候选数计算逻辑，将结果写入该格 `notes` 字段（覆盖已有笔记）。已填数字的格子不受影响。

**实现细节**：`hint_engine.rs:4` 中的私有 `fn candidates(grid, row, col) -> Vec<u8>` 需改为 `pub(crate) fn candidates(...)`，供新的 `reduce_auto_notes` 直接复用，避免重复实现候选计算逻辑。

#### `ClearNotes`

清空棋盘所有格子的 `notes` 字段（不影响已填数字）。

#### 配套修复：`handle_get_hint` 移除 SolverFallback 提前落子

**代码核查发现的问题**：现有 `handle_get_hint`（`engine.rs:281-301`）在命中 `SolverFallback` 策略时会立即把 `hint.value` 写入 `hint.target` 位置的棋盘格——跳过 `push_undo`/冲突检测/错误计数/笔记清空/`check_game_status` 的标准流程。这是当前代码里已经存在的实现快捷方式，与本设计新增的 "Not Now" 语义（点击 Not Now 后棋盘应保持不变，`GameState.hint` 只是被保留而非被"提前应用"）直接冲突。

**修复方案**：重构 `handle_get_hint`，去掉这个特殊分支——`GetHint` 无论命中哪种策略都只计算并返回 `state.hint`（含基于 `hint.related_cells` 的高亮重算），**不再修改棋盘**。`SolverFallback` 由此并入 Fill 型分支，与 `NakedSingle`/`HiddenSingle` 走完全相同的路径：只有用户点击 "Apply Hint" 显式 dispatch `ApplyHint` 时才真正落子。

#### `ApplyHint`

前提：`GameState.hint` 非 `None`（即当前已通过 `GetHint` 生成一条提示）。按 `hint.strategy` 分支处理：

- **Fill 型**（`NakedSingle` / `HiddenSingle` / `SolverFallback`）：
  直接在 `hint.target` 位置填入 `hint.value`，行为与手动 `InputNumber` 完全一致（触发冲突检测、错误计数、历史入栈、高亮重算、清空该格笔记）。填入的数字样式与手动输入相同（不做"提示专属"配色）。

- **Elimination 型**（`NakedPair` / `HiddenPair` / `Pointing` / `BoxLineReduction` / `XWing`）：
  从 `hint.related_cells` 涉及的格子的现有笔记中移除 `hint.eliminated` 中的数字。若某格当前没有笔记，则该格不受影响（不会主动补全笔记）。

  此行为与"Auto Notes 是否已开启"无关——提示与笔记是两个独立功能，互不依赖。用户确认："这是两个功能，提示和笔记互不冲突"。

两种类型应用后均清除 `GameState.hint`（与其他 Action 一致的"用后即焚"语义）。

### 前端 TypeScript 侧影响

`ts-rs` 会在下次 `cargo test` 时自动重新生成 `Action` 联合类型到 `src/types/generated/`，前端 `src/types/action.ts` 中对应加入这 3 个新 variant 的类型定义（保持与现有 11 个 variant 一致的写法）。

---

## 三、Dashboard 页面重构

### 布局结构（对照参考图 IMG_9340）

```
┌─────────────────────────────┐
│  Sudoku Calm      👑  ⚙️     │  ← 标题 + 皇冠(Pro，不实现) + 齿轮(→ Settings)
│                              │
│  ┌─ Continue Puzzle ───────┐ │  ← 仅当存在存档时显示
│  │ [真实缩略图渲染]          │ │
│  │ Medium · 12:34 已用      │ │
│  └──────────────────────────┘ │
│                              │
│  ┌─ Daily Challenge ───────┐ │
│  │ 今日题目 · 连续 N 天      │ │  ← 真实数据，来自 localStorage
│  └──────────────────────────┘ │
│                              │
│  Play by Difficulty          │
│  [Easy] [Medium]              │
│  [Hard]  [Expert]             │
└─────────────────────────────┘
```

### 关键变更

1. **皇冠图标**：仅作视觉展示，不绑定任何点击行为（Pro 功能不实现，无占位提示）。
2. **齿轮图标**：导航到 `/settings`（主设置页，见第五节）。
3. **Continue Puzzle 缩略图**：真实渲染当前存档棋盘的静态缩略图（读取 `sudokucalm-save` 中的 grid 数据，用简化的 9×9 SVG/DOM 网格渲染已填数字位置，不含交互）。**注**：当前 Dashboard 完全没有这个元素（只有文字"进度 XX%"），这是全新增加的可视化组件，不存在"占位图片"可替换。
4. **Daily Challenge 卡片**：展示真实的连续挑战天数（streak），数据存储在新的 localStorage key `sudokucalm-daily-progress`：
   ```json
   { "lastCompletedDate": "2026-07-11", "streak": 5 }
   ```
   每日挑战完成时更新：若 `lastCompletedDate` 是昨天则 `streak += 1`，否则重置为 1；日期用本地时区的 `YYYY-MM-DD`。

   **同步修改现有逻辑**：当前 Dashboard 获取"今日题目"日期用的是 `new Date().toISOString().split('T')[0]`（UTC 时区），与新增的 streak 判定（本地时区）在本地午夜前后可能不一致。本次一并将每日题目的日期获取改为本地时区（拼接本地年/月/日为 `YYYY-MM-DD`，不使用 `toISOString`），确保题目请求与 streak 判定使用同一套日期逻辑。
5. 不实现：Share / Rate / Feedback / Privacy / Terms / Version 等入口，参考图中出现的这些项目本阶段完全跳过，不做任何占位（无灰色禁用按钮，无"即将推出"文案）。

---

## 四、Game 页面重构

### StatusBar（对照参考图 IMG_9343）

- **错误显示**：由当前的"点状指示器"（dot indicators）改为"图标 + 数字"格式，例如 ⚠ 1/3。
- **"···" 更多菜单**：点击后整页跳转（`navigate('/game-settings')`，非页内弹出菜单），展示局内可调整项：音量、配色（highlight 相关开关）、声音开关、计时器显示开关。此设置页与 Dashboard 的"Settings → Game Settings"共用同一路由/组件，两个入口指向同一处。

### Toolbar（对照参考图 IMG_9343/9344）

由纯图标按钮组改为"图标 + 文字标签"：

```
[↶ Undo]  [↷ Redo]  [✎ Auto Notes]  [💡 Hint]
```

- **Auto Notes 按钮**：点击后 dispatch `AutoNotes`，随后按钮标签切换为 **"Clear Notes"**；再次点击时 dispatch `ClearNotes` 并将标签切回 "Auto Notes"。该状态（是否处于"已生成笔记"模式）为前端本地 UI state，不持久化到存档（每次新游戏/加载存档时重置为 "Auto Notes"）。
- **移除现有 Erase 按钮**：当前 Toolbar 含 Undo/Redo/**Erase**/Hint 四个纯图标按钮，其中 Erase 与 NumberPad 底部已有的独立"擦除"按钮功能重复。本次重构从 Toolbar 中移除 Erase（NumberPad 的擦除按钮作为唯一保留入口），腾出的位置放置 Auto Notes。

### NumberPad（对照参考图 IMG_9343，含候选数字子行）

在现有 1-9 数字网格基础上，每个数字下方新增一行小号候选数字子区域：

- **移除现有"笔记模式/填数模式"切换按钮**：当前 NumberPad 顶部有一个模式切换胶囊按钮（`onToggleNoteMode` / `noteMode` prop），决定点击主数字键时触发 `InputNumber` 还是 `ToggleNote`。本次重构移除该按钮及相关 prop：主数字网格固定触发 `InputNumber`；笔记的增删统一通过下方新增的候选数字子行完成。
- **数据来源**：直接读取当前选中格（`grid.selected` 对应的 cell）的 `notes` 字段（`Vec<u8>` 或等价位图），**不做实时候选计算**——用户已明确澄清是"直接读取该格已存在的笔记"，非动态求解候选数。
- **交互**：
  - 若选中格 `notes` 包含某数字 N，则数字 N 下方的圆点变为**实心蓝色**（视觉上标记"这是当前笔记候选之一"）。
  - 点击这个小号候选数字，dispatch 现有的 `ToggleNote(value)` action——这是移除笔记模式切换按钮后，笔记增删的唯一入口。
  - 若当前格已填入数字（非空格），候选子行不显示笔记内容（因为已确定数字，没有候选意义）。

### HintDrawer（对照参考图 IMG_9345，Smart Hint）

- 标题由现有格式改为 **"Smart Hint"**。
- 底部双按钮：**"Not Now"**（关闭抽屉，不消费当前 hint，`GameState.hint` 保留，用户可重新打开抽屉查看）、**"Apply Hint"**（dispatch `ApplyHint`，随后关闭抽屉）。
- Fill 型与 Elimination 型提示内容展示保持现有的策略徽章 + 说明文案结构；底部双按钮为全新增加——现有 HintDrawer 目前只有右上角一个关闭(X)按钮，没有任何底部按钮可供替换。

---

## 五、Settings 重构

### 决策：拆分为「主设置页」+「局内 Game Settings 页」

**主设置页**（`/settings`，从 Dashboard 齿轮进入）：

```
┌─────────────────────────────┐
│  ← Settings                  │
│                              │
│  Language        [EN ▾]      │  ← 中英文切换，默认 English
│                              │
│  ▸ Game Settings              │  ← 跳转到 /game-settings
│                              │
│  Sound            [ ⚪ ]      │  ← 原 UISettings，与 Game Settings 合并统一放置
│  Haptics          [ ⚪ ]      │
└─────────────────────────────┘
```

用户明确要求："统一放设置吧"——将声音/震动（原 UISettings）与语言选择集中在主设置页，而非分散。

**Game Settings 页**（`/game-settings`）：

沿用现有 `GameSettings`（`show_timer` / `show_hints` / `highlight_areas` / `highlight_numbers`）四项开关，UI 样式对照参考图 IMG_9344 重新排版（图标 + 文字 + 开关，分组展示）。两个入口（Dashboard → Settings → Game Settings；Game 内 "···" 菜单）指向同一组件/路由，行为完全一致。

---

## 六、i18n 双语支持

### 技术选型：react-i18next（用户明确要求使用成熟库，而非自研方案）

```
src/i18n/
├── index.ts          # i18next.init() 配置，语言检测与持久化
├── locales/
│   ├── en.json
│   └── zh.json
```

- 默认语言：**English**（用户确认）。
- 语言偏好持久化：新 localStorage key `sudokucalm-language`，存储 `"en"` 或 `"zh"`。
- 所有现有中文硬编码文案迁移为 `t('key')` 调用，翻译资源覆盖 Dashboard / Game / Settings / Game Settings / HintDrawer 全部界面文案。
- 语言切换后立即生效（无需刷新页面），`i18next` 触发组件重渲染。

---

## 七、图标库

### 技术选型：lucide-react（用户明确选择，替代手写内联 SVG）

新增依赖 `lucide-react`。替换范围：

- StatusBar 错误图标、"···" 菜单图标
- Toolbar 的 Undo/Redo/Auto Notes/Hint 图标
- Dashboard 齿轮/皇冠图标
- Settings 页各项前缀图标

现有手写 SVG（如 Toolbar 中的内联 `<svg>`）全部替换为对应的 lucide 组件，保持视觉尺寸/描边宽度与参考图一致（通过 `size` / `strokeWidth` props 调整）。

---

## 八、范围之外（本阶段明确不做）

- Pro / 皇冠订阅功能——无任何交互绑定，纯视觉图标。
- Share / Rate / Feedback / Privacy / Terms / Version 等设置项——参考图中存在但完全跳过，不加占位符、不加"即将推出"提示。此处的 "Version" 特指参考图中那种可点击跳转的版本详情菜单项；现有 Settings 页面底部本来就有一行静态文字 "Sudoku Calm v0.1.0 · Built with React + Rust WASM"，与"不实现 Version 菜单项"不冲突，本次保留不变。
- 深色模式（dark mode）——沿用现有浅色配色方案，不在本次范围内。
- 实时候选数求解算法——数字键盘候选显示为读取已有笔记，非新增求解逻辑。

---

## 九、验证计划

1. **Rust 端**：为 `AutoNotes`、`ClearNotes`、`ApplyHint`（含 fill 型与 elimination 型两条分支）各写单元测试，覆盖 `wasm-engine/src` 现有测试文件对应模块；同时更新 `engine.rs` 现有测试模块中依赖 "SolverFallback 在 GetHint 时提前落子" 这一旧行为的断言（改为验证 `GetHint` 后棋盘不变、需显式 `ApplyHint` 才落子）；确认 `cargo test` 全部通过后类型正确生成到 `src/types/generated/`。
2. **前端**：
   - `npx tsc --noEmit` 确认新增 Action 类型、i18n 类型无报错。
   - `npm run build` 完整构建通过。
   - 开发模式手动走查：Dashboard 缩略图渲染、Daily Challenge streak 计数、Game 内 Auto Notes/Clear Notes 切换、NumberPad 候选数字点选、Smart Hint 抽屉 Apply/Not Now、语言切换、Settings 双页跳转一致性。
3. 对照 8 张参考截图逐屏视觉比对（间距、字号、图标、配色），确认与当前 Tailwind 色板（`primary`/`accent`/`ink`/`border`/`error` 等，见项目现有 `tailwind.config.ts`）保持一致，不引入新色值。
