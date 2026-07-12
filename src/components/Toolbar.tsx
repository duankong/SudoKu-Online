import { Undo2, Redo2, Pencil, Eraser, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onAutoNotes: () => void;
  onHint: () => void;
  hasNotes: boolean;
  disabled: boolean;
}

export function Toolbar({ onUndo, onRedo, onAutoNotes, onHint, hasNotes, disabled }: ToolbarProps) {
  const { t } = useTranslation();

  const btnClass = `
    flex items-center gap-1.5 px-3 py-2 rounded-xl
    text-sm font-medium
    transition-all duration-75
    disabled:opacity-30 disabled:cursor-not-allowed
    active:scale-95
    text-ink-mid hover:bg-primary-pale hover:text-primary
  `;

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <button
        onClick={onUndo}
        disabled={disabled}
        className={btnClass}
        aria-label={t('game.undo')}
      >
        <Undo2 size={18} />
        <span>{t('game.undo')}</span>
      </button>

      <button
        onClick={onRedo}
        disabled={disabled}
        className={btnClass}
        aria-label={t('game.redo')}
      >
        <Redo2 size={18} />
        <span>{t('game.redo')}</span>
      </button>

      <button
        onClick={onAutoNotes}
        disabled={disabled}
        className={btnClass}
        aria-label={hasNotes ? t('game.clearNotes') : t('game.autoNotes')}
      >
        {hasNotes ? <Eraser size={18} /> : <Pencil size={18} />}
        <span>{hasNotes ? t('game.clearNotes') : t('game.autoNotes')}</span>
      </button>

      <button
        onClick={onHint}
        disabled={disabled}
        className={btnClass}
        aria-label={t('game.hint')}
      >
        <Lightbulb size={18} />
        <span>{t('game.hint')}</span>
      </button>
    </div>
  );
}
