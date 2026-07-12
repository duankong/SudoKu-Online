<p align="center">
  <h1 align="center">🧩 数独 Calm</h1>
  <p align="center"><em>Sudoku, done beautifully.</em></p>
</p>

<p align="center">
  <a href="https://github.com/duankong/SudoKu-Online/actions"><img src="https://img.shields.io/github/actions/workflow/status/duankong/SudoKu-Online/deploy.yml?branch=master&style=flat-square" alt="Build"></a>
  <a href="https://github.com/duankong/SudoKu-Online/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://github.com/duankong/SudoKu-Online/tags"><img src="https://img.shields.io/github/v/tag/duankong/SudoKu-Online?style=flat-square&label=version" alt="Version"></a>
</p>

<p align="center">
  <a href="https://duankong.github.io/SudoKu-Online/">🎮 Play Now</a> · <a href="#-features">✨ Features</a> · <a href="#-tech-stack">🛠 Tech Stack</a> · <a href="#-development">💻 Dev</a>
</p>

---

<p align="center">
  <img src="assets/dashboard.png" alt="Dashboard" width="45%" style="border-radius: 12px;" />
  &nbsp;&nbsp;
  <img src="assets/gameplay.png" alt="Gameplay" width="45%" style="border-radius: 12px;" />
</p>

---

## ✨ Features

| 🎯 | Feature | Description |
|---|---|---|
| 🎚️ | **4 Difficulty Levels** | Easy → Medium → Hard → Expert — progressive challenge for every skill level |
| 📅 | **Daily Challenge** | A fresh puzzle every day, shared globally — build your streak! 🔥 |
| 💡 | **Smart Hints** | 7 solving strategies with bilingual explanations (EN / 中文), powered by logical deduction |
| ↩️ | **Undo / Redo** | Full move history — experiment fearlessly, never lose progress |
| ✏️ | **Auto Notes** | Instant pencil marks for all empty cells, one tap to toggle on/off |
| 💾 | **Progress Auto-Save** | Close your browser anytime — pick up exactly where you left off |
| ⌨️ | **Keyboard Shortcuts** | `1`–`9` input · `Del` erase · `Ctrl+Z` undo · `Ctrl+Y` redo · `←↑↓→` navigate |
| 🌐 | **i18n Internationalization** | English & 中文 — switch seamlessly in Settings |
| 🚀 | **Zero Server** | Entire engine runs in-browser via WebAssembly — no backend, no network, no lag |
| 🎨 | **Clean UI** | TailwindCSS-designed, mobile-first, distraction-free gameplay |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                   React UI                    │
│  Dashboard · Game · Settings · Components    │
│  TypeScript · TailwindCSS · react-i18next    │
├─────────────────────────────────────────────┤
│              JSON dispatch layer              │
│   dispatch(action) → new_state               │
├─────────────────────────────────────────────┤
│               Rust WASM Engine                │
│  Generator · Solver · Validator · Hints      │
│  History · Highlight · Engine                │
└─────────────────────────────────────────────┘
```

**Why Rust + WASM?** Sudoku generation and solving are computationally intensive. A backtracking solver can explore thousands of branches — Rust compiles to native-speed WebAssembly, keeping everything snappy inside your browser.

---

## 🛠 Tech Stack

| 🧱 Layer | 🛠️ Technology |
|---------|-------------|
| **UI** | React 18 · TypeScript · TailwindCSS · Lucide Icons |
| **Routing** | React Router v6 (Hash mode) |
| **i18n** | react-i18next |
| **Engine** | Rust · WASM (wasm-pack) |
| **Dev Tooling** | Vite · ts-rs |
| **CI/CD** | GitHub Actions · GitHub Pages |

---

## 📁 Project Structure

```
sudokucalm/
├── wasm-engine/                  🦀 Rust WASM engine
│   └── src/
│       ├── generator.rs          Puzzle generation (backtrack fill + dig holes)
│       ├── solver.rs             Backtracking solver & uniqueness verification
│       ├── validator.rs          Conflict detection & game status
│       ├── hint_engine.rs        7-strategy smart hint system
│       ├── history.rs            Undo/redo history stack
│       └── highlight.rs          Related-area & same-number highlights
├── src/
│   ├── pages/                    📄 Dashboard · Game · Settings
│   ├── components/               🧩 GridBoard · Cell · NumberPad · Toolbar · HintDrawer
│   ├── hooks/                    🪝 useGameEngine · useLocalStorage · useTimer
│   ├── i18n/                     🌐 EN & ZH translation files
│   └── types/                    📐 TypeScript types (ts-rs auto-generated + manual)
└── assets/                       🖼️ Screenshots
```

---

## 💻 Development

### 📋 Prerequisites

- **Node.js** `≥20`
- **Rust** `stable` + `wasm32-unknown-unknown` target
- **wasm-pack** (`cargo install wasm-pack`)

### ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Compile Rust → WASM
npm run build:wasm

# 3. Kill stale dev servers & start
npx kill-port 5173 5174 5175 5176 5177 5178 5179
npm run dev
# → http://localhost:5173 🎉
```

### 🧪 Testing

```bash
# Rust unit tests (55+ tests)
cd wasm-engine && cargo test

# Full production build
npm run build
# → dist/ ready to deploy
```

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

[MIT](LICENSE) © 2026 [duankong](https://github.com/duankong)

---

<p align="center">
  <sub>Built with ❤️ using React + Rust WASM</sub>
</p>
