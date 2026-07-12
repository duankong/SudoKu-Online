import type { Hint } from '../types/generated';

interface HintDrawerProps {
  hint: Hint | null;
  visible: boolean;
  onClose: () => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  NakedSingle: '唯一数',
  HiddenSingle: '隐性唯一数',
  NakedPair: '数对',
  HiddenPair: '隐性数对',
  Pointing: '指向数',
  BoxLineReduction: '宫线删减',
  XWing: 'X翼',
  SolverFallback: '回溯求解',
};

export function HintDrawer({ hint, visible, onClose }: HintDrawerProps) {
  if (!hint) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40
        bg-white rounded-t-2xl shadow-lg
        transform transition-transform duration-300 ease-out
        max-w-[500px] mx-auto
        ${visible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-border" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/30 text-ink-dark">
            {STRATEGY_LABELS[hint.strategy] || hint.strategy}
          </span>
          <span className="text-xs text-ink-mid">{hint.strategy}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label="Close hint"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-6 pt-2">
        <p className="text-sm text-ink-dark leading-relaxed">{hint.message_cn}</p>

        {hint.value > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-ink-mid">推荐填入:</span>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white font-bold text-lg">
              {hint.value}
            </span>
            <span className="text-xs text-ink-mid">
              位置 ({hint.target.row + 1}, {hint.target.col + 1})
            </span>
          </div>
        )}

        {hint.eliminated.length > 0 && (
          <p className="mt-2 text-xs text-ink-mid">
            排除候选数: {hint.eliminated.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
