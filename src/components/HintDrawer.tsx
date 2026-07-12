import { useTranslation } from 'react-i18next';
import { Lightbulb, X } from 'lucide-react';
import type { Hint } from '../types/generated';

interface HintDrawerProps {
  hint: Hint | null;
  visible: boolean;
  onClose: () => void;
  onApplyHint: () => void;
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

export function HintDrawer({ hint, visible, onClose, onApplyHint }: HintDrawerProps) {
  const { t } = useTranslation();

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

      {/* Header — "Smart Hint" */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-accent" />
          <span className="text-base font-semibold text-ink-dark">{t('hint.smartHint')}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
          aria-label={t('hint.notNow')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Strategy badge + description */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent/30 text-ink-dark">
            {STRATEGY_LABELS[hint.strategy] || hint.strategy}
          </span>
          <span className="text-xs text-ink-mid">{hint.strategy}</span>
        </div>

        <p className="text-sm text-ink-dark leading-relaxed">{hint.message_cn}</p>

        {hint.value > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-ink-mid">{t('hint.recommended')}</span>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white font-bold text-lg">
              {hint.value}
            </span>
            <span className="text-xs text-ink-mid">
              {t('hint.position', { row: hint.target.row + 1, col: hint.target.col + 1 })}
            </span>
          </div>
        )}

        {hint.eliminated.length > 0 && (
          <p className="mt-2 text-xs text-ink-mid">
            {t('hint.eliminate')} {hint.eliminated.join(', ')}
          </p>
        )}
      </div>

      {/* Bottom buttons: Not Now + Apply Hint */}
      <div className="flex items-center gap-3 px-4 pb-6 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-ink-mid
                     hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          {t('hint.notNow')}
        </button>
        <button
          onClick={onApplyHint}
          className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium
                     hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          {t('hint.applyHint')}
        </button>
      </div>
    </div>
  );
}
