interface NumberPadProps {
  onNumber: (value: number) => void;
  onErase: () => void;
  onToggleNoteMode: () => void;
  noteMode: boolean;
  disabled: boolean;
}

export function NumberPad({ onNumber, onErase, onToggleNoteMode, noteMode, disabled }: NumberPadProps) {
  return (
    <div className="w-full max-w-[500px] mx-auto px-2">
      {/* Mode toggle */}
      <div className="flex justify-center mb-2">
        <button
          onClick={onToggleNoteMode}
          disabled={disabled}
          className={`
            px-4 py-1.5 text-xs font-medium rounded-full transition-colors
            ${noteMode ? 'bg-primary text-white' : 'bg-gray-100 text-ink-mid'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/80 hover:text-white'}
          `}
        >
          {noteMode ? '笔记模式' : '填数模式'}
        </button>
      </div>

      {/* Number buttons 1-9 */}
      <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => onNumber(n)}
            disabled={disabled}
            className={`
              flex items-center justify-center
              aspect-square rounded-xl
              text-xl sm:text-2xl font-semibold
              transition-all duration-75
              bg-white border shadow-sm
              hover:bg-primary-pale hover:border-primary hover:shadow-md
              active:scale-95
              ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
            `}
            style={{
              borderColor: '#D0D7E5',
              color: '#3654D2',
              fontFamily: "'Inter', 'SF Pro Display', 'PingFang SC', system-ui, sans-serif",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Erase button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={onErase}
          disabled={disabled}
          className={`
            flex items-center gap-1 px-6 py-2 rounded-lg
            text-sm font-medium text-ink-mid
            border border-border bg-white
            hover:bg-gray-50 active:scale-95 transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
          擦除
        </button>
      </div>
    </div>
  );
}
