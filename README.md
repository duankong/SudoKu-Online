<p align="center">
  <h1 align="center">🧩 数独 Online</h1>
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

<table align="center">
  <tr>
    <td align="center" width="50%"><img src="assets/dashboard.png" alt="Dashboard" width="100%" style="border-radius: 12px;" /></td>
    <td align="center" width="50%"><img src="assets/gameplay.png" alt="Gameplay" width="100%" style="border-radius: 12px;" /></td>
  </tr>
</table>

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
npx kill-port 5173
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
