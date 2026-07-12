import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MoreHorizontal, ArrowLeft } from 'lucide-react';
import type { Difficulty, GameStatus } from '../types/generated';

interface StatusBarProps {
  difficulty: Difficulty;
  errorCount: number;
  maxErrors: number;
  gameStatus: GameStatus;
  timerDisplay: string;
  showTimer: boolean;
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
  errorCount,
  maxErrors,
  gameStatus,
  timerDisplay,
  showTimer,
  onBack,
}: StatusBarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

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

      {/* Center: Errors + Timer */}
      <div className="flex items-center gap-4">
        {/* Error icon + count */}
        <div className="flex items-center gap-1.5" title={t('statusBar.errors', { count: errorCount, max: maxErrors })}>
          <AlertTriangle
            size={16}
            className={errorCount > 0 ? 'text-error' : 'text-ink-light'}
          />
          <span className={`text-xs font-medium tabular-nums ${
            errorCount > 0 ? 'text-error' : 'text-ink-mid'
          }`}>
            {errorCount}/{maxErrors}
          </span>
        </div>

        {/* Timer */}
        {showTimer && (
          <span className={`text-sm font-mono tabular-nums min-w-[48px] text-center ${
            gameStatus !== 'Playing' ? 'text-ink-mid' : 'text-ink-dark'
          }`}>
            {timerDisplay}
          </span>
        )}
      </div>

      {/* Right: "..." menu → /game-settings */}
      <button
        onClick={() => navigate('/game-settings')}
        className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
        aria-label="Game Settings"
      >
        <MoreHorizontal size={20} />
      </button>
    </div>
  );
}
