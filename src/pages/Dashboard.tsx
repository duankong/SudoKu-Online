import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Difficulty } from '../types/generated';

const DIFFICULTIES: { key: Difficulty; label: string; description: string; color: string }[] = [
  { key: 'Easy', label: '简单', description: '适合新手入门', color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'Medium', label: '中等', description: '稍有挑战性', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'Hard', label: '困难', description: '需要一定技巧', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'Expert', label: '专家', description: '高难度挑战', color: 'bg-red-100 text-red-700 border-red-200' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const storage = useLocalStorage();
  const hasSave = storage.hasSave();
  const savedState = hasSave ? storage.load() : null;

  // Format save info
  const saveInfo = savedState
    ? {
        difficulty: savedState.difficulty,
        progress: countFilled(savedState.grid.cells),
      }
    : null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-white max-w-[500px] mx-auto flex flex-col px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-ink-dark tracking-tight">Sudoku Calm</h1>
        <p className="text-sm text-ink-mid mt-2">专注 · 沉浸 · 逻辑之美</p>
      </div>

      {/* Continue Game */}
      {hasSave && saveInfo && (
        <button
          onClick={() => navigate('/game?mode=continue')}
          className="w-full mb-4 p-5 rounded-2xl bg-primary text-white text-left
                     hover:bg-primary/95 active:scale-[0.98] transition-all"
        >
          <div className="text-sm opacity-80">继续游戏</div>
          <div className="text-lg font-semibold mt-1">
            {DIFFICULTIES.find((d) => d.key === saveInfo.difficulty)?.label} · 进度 {saveInfo.progress}%
          </div>
        </button>
      )}

      {/* Daily Challenge */}
      <button
        onClick={() => navigate('/game?mode=daily')}
        className="w-full mb-8 p-5 rounded-2xl bg-accent/20 border border-accent/40 text-left
                   hover:bg-accent/30 active:scale-[0.98] transition-all"
      >
        <div className="text-sm text-ink-mid">每日挑战</div>
        <div className="text-lg font-semibold text-ink-dark mt-1">{today}</div>
      </button>

      {/* Difficulty Selection */}
      <h2 className="text-sm font-medium text-ink-mid uppercase tracking-wider mb-3">选择难度</h2>
      <div className="grid grid-cols-2 gap-3">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            onClick={() => navigate(`/game?difficulty=${d.key}`)}
            className={`p-4 rounded-xl border text-left transition-all
                       hover:shadow-sm active:scale-[0.98] ${d.color}`}
          >
            <div className="font-semibold">{d.label}</div>
            <div className="text-xs mt-0.5 opacity-70">{d.description}</div>
          </button>
        ))}
      </div>

      {/* Bottom */}
      <div className="mt-auto pt-8 flex justify-center">
        <button
          onClick={() => navigate('/settings')}
          className="text-sm text-ink-mid hover:text-ink-dark transition-colors flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          设置
        </button>
      </div>
    </div>
  );
}

function countFilled(cells: any[][]): number {
  let filled = 0;
  let total = 0;
  for (const row of cells) {
    for (const cell of row) {
      total++;
      if (!cell.is_given && cell.value !== 0) filled++;
    }
  }
  if (total === 0) return 0;
  // Progress based on user-filled cells out of empty cells
  const empties = cells.flat().filter((c: any) => !c.is_given).length;
  if (empties === 0) return 100;
  return Math.round((filled / empties) * 100);
}
