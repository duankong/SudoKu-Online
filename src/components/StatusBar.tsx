import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, ArrowLeft } from 'lucide-react';
import type { Difficulty, GameStatus } from '../types/generated';

interface StatusBarProps {
  difficulty: Difficulty;
  gameStatus: GameStatus;
  onBack: () => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  Easy: '简单',
  Medium: '中等',
  Hard: '困难',
  Expert: '专家',
};

export function StatusBar({
  difficulty,
  onBack,
}: StatusBarProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #D0D7E5' }}>
      {/* Left: Back + Difficulty */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label="Back to menu"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-medium text-ink-dark">
          {DIFFICULTY_LABELS[difficulty] || difficulty}
        </span>
      </div>

      {/* Right: "..." menu → /settings */}
      <button
        onClick={() => navigate('/settings')}
        className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
        aria-label="Settings"
      >
        <MoreHorizontal size={20} />
      </button>
    </div>
  );
}
