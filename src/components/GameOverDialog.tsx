import type { GameStatus } from '../types/generated';

interface GameOverDialogProps {
  status: GameStatus;
  timerDisplay: string;
  onNewGame: () => void;
  onHome: () => void;
}

export function GameOverDialog({ status, timerDisplay, onNewGame, onHome }: GameOverDialogProps) {
  const isWon = status === 'Won';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-8 mx-4 max-w-sm w-full text-center animate-pop-in">
        {/* Icon */}
        <div className={`text-5xl mb-4 ${isWon ? '' : ''}`}>
          {isWon ? '🎉' : '😔'}
        </div>

        <h2 className="text-xl font-bold text-ink-dark mb-2">
          {isWon ? '恭喜通关！' : '游戏结束'}
        </h2>

        <p className="text-sm text-ink-mid mb-2">
          {isWon ? '你完成了这道数独！' : '错误次数已用完'}
        </p>

        <p className="text-2xl font-mono font-bold text-primary mb-6">
          {timerDisplay}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onNewGame}
            className="w-full py-3 rounded-xl bg-primary text-white font-medium
                       hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            再来一局
          </button>
          <button
            onClick={onHome}
            className="w-full py-3 rounded-xl border border-border text-ink-mid font-medium
                       hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
