import type { Difficulty, GameStatus } from '../types/generated';

interface StatusBarProps {
  difficulty: Difficulty;
  errorCount: number;
  maxErrors: number;
  gameStatus: GameStatus;
  timerDisplay: string;
  showTimer: boolean;
  onPause: () => void;
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
  onPause,
  onBack,
}: StatusBarProps) {
  const isPaused = gameStatus !== 'Playing';

  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #D0D7E5' }}>
      {/* Left: Back + Difficulty */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label="Back to menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-ink-dark">
          {DIFFICULTY_LABELS[difficulty] || difficulty}
        </span>
      </div>

      {/* Center: Errors + Timer */}
      <div className="flex items-center gap-4">
        {/* Error dots */}
        <div className="flex items-center gap-1" title={`${errorCount}/${maxErrors} errors`}>
          {Array.from({ length: maxErrors }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < errorCount ? 'bg-error' : 'bg-border'
              }`}
            />
          ))}
        </div>

        {/* Timer */}
        {showTimer && (
          <span
            className={`text-sm font-mono tabular-nums min-w-[48px] text-center ${
              isPaused ? 'text-ink-mid' : 'text-ink-dark'
            }`}
          >
            {timerDisplay}
          </span>
        )}
      </div>

      {/* Right: Pause button */}
      <button
        onClick={onPause}
        className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
        aria-label={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        )}
      </button>
    </div>
  );
}
