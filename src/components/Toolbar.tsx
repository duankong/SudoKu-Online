interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
  onErase: () => void;
  disabled: boolean;
}

export function Toolbar({ onUndo, onRedo, onHint, onErase, disabled }: ToolbarProps) {
  const btnClass = `
    p-2 rounded-lg text-ink-mid
    hover:bg-gray-100 hover:text-ink-dark
    active:scale-90 transition-all
    disabled:opacity-30 disabled:cursor-not-allowed
  `;

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <button onClick={onUndo} disabled={disabled} className={btnClass} aria-label="Undo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
        </svg>
      </button>

      <button onClick={onRedo} disabled={disabled} className={btnClass} aria-label="Redo">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
        </svg>
      </button>

      <button onClick={onErase} disabled={disabled} className={btnClass} aria-label="Erase">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 20H7L3 12l4-8h13" />
          <line x1="6" y1="12" x2="16" y2="12" />
        </svg>
      </button>

      <button onClick={onHint} disabled={disabled} className={btnClass} aria-label="Hint">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
    </div>
  );
}
