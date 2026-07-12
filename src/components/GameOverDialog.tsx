import { useTranslation } from 'react-i18next';
import type { GameStatus } from '../types/generated';

interface GameOverDialogProps {
  status: GameStatus;
  timerDisplay: string;
  onRetry: () => void;
  onNewGame: () => void;
  onHome: () => void;
}

export function GameOverDialog({ status, timerDisplay, onRetry, onNewGame, onHome }: GameOverDialogProps) {
  const { t } = useTranslation();
  const isWon = status === 'Won';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-8 mx-4 max-w-sm w-full text-center animate-pop-in">
        {/* Icon */}
        <div className="text-5xl mb-4">
          {isWon ? '🎉' : '😔'}
        </div>

        <h2 className="text-xl font-bold text-ink-dark mb-2">
          {isWon ? t('gameOver.won') : t('gameOver.lost')}
        </h2>

        <p className="text-sm text-ink-mid mb-2">
          {isWon ? t('gameOver.won_desc') : t('gameOver.lost_desc')}
        </p>

        <p className="text-2xl font-mono font-bold text-primary mb-6">
          {timerDisplay}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="w-full py-3 rounded-xl border-2 border-primary text-primary font-medium
                       hover:bg-primary-pale active:scale-[0.98] transition-all"
          >
            {t('gameOver.retry')}
          </button>
          <button
            onClick={onNewGame}
            className="w-full py-3 rounded-xl bg-primary text-white font-medium
                       hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            {t('gameOver.newGame')}
          </button>
          <button
            onClick={onHome}
            className="w-full py-3 rounded-xl border border-border text-ink-mid font-medium
                       hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            {t('gameOver.home')}
          </button>
        </div>
      </div>
    </div>
  );
}
