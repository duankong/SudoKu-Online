import { Undo2, Redo2, Pencil, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onAutoNotes: () => void;
  onHint: () => void;
  autoNotesActive: boolean;
  disabled: boolean;
}

export function Toolbar({ onUndo, onRedo, onAutoNotes, onHint, autoNotesActive, disabled }: ToolbarProps) {
  const { t } = useTranslation();

  const btnClass = `
    flex items-center gap-1.5 px-3 py-2 rounded-xl
    text-sm font-medium
    transition-all duration-75
    disabled:opacity-30 disabled:cursor-not-allowed
    active:scale-95
  `;

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <button
        onClick={onUndo}
        disabled={disabled}
        className={`${btnClass} text-ink-mid hover:bg-primary-pale hover:text-primary`}
        aria-label={t('game.undo')}
      >
        <Undo2 size={18} />
        <span>{t('game.undo')}</span>
      </button>

      <button
        onClick={onRedo}
        disabled={disabled}
        className={`${btnClass} text-ink-mid hover:bg-primary-pale hover:text-primary`}
        aria-label={t('game.redo')}
      >
        <Redo2 size={18} />
        <span>{t('game.redo')}</span>
      </button>

      <button
        onClick={onAutoNotes}
        disabled={disabled}
        className={`${btnClass} ${
          autoNotesActive
            ? 'bg-primary text-white hover:bg-primary/90'
            : 'text-ink-mid hover:bg-primary-pale hover:text-primary'
        }`}
        aria-label={autoNotesActive ? t('game.clearNotes') : t('game.autoNotes')}
      >
        <Pencil size={18} />
        <span>{autoNotesActive ? t('game.clearNotes') : t('game.autoNotes')}</span>
      </button>

      <button
        onClick={onHint}
        disabled={disabled}
        className={`${btnClass} text-ink-mid hover:bg-primary-pale hover:text-primary`}
        aria-label={t('game.hint')}
      >
        <Lightbulb size={18} />
        <span>{t('game.hint')}</span>
      </button>
    </div>
  );
}
