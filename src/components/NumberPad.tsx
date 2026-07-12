import { Eraser } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NumberPadProps {
  onNumber: (value: number) => void;
  onErase: () => void;
  onToggleNote: (value: number) => void;
  selectedCellNotes: number[];
  hasSelectedValue: boolean;
  disabled: boolean;
}

export function NumberPad({
  onNumber,
  onErase,
  onToggleNote,
  selectedCellNotes,
  hasSelectedValue,
  disabled,
}: NumberPadProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-[500px] mx-auto px-2">
      {/* Number buttons 1-9 with candidate sub-row */}
      <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <div key={n} className="flex flex-col items-center">
            {/* Main number button — always dispatches InputNumber */}
            <button
              onClick={() => onNumber(n)}
              disabled={disabled}
              className={`
                flex items-center justify-center
                w-full aspect-square rounded-xl
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

            {/* Candidate sub-row dot — ToggleNote */}
            {!hasSelectedValue && (
              <button
                onClick={() => onToggleNote(n)}
                disabled={disabled}
                className={`
                  flex items-center justify-center
                  w-4 h-4 mt-0.5 rounded-full
                  transition-all duration-75
                  ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 active:scale-90'}
                `}
                aria-label={`Toggle note ${n}`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    selectedCellNotes.includes(n)
                      ? 'bg-primary'
                      : 'bg-gray-200'
                  }`}
                />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Erase button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={onErase}
          disabled={disabled}
          className={`
            flex items-center gap-1.5 px-5 py-2 rounded-lg
            text-sm font-medium
            border border-border bg-white
            text-ink-mid hover:bg-gray-50 active:scale-95 transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Eraser size={16} />
          {t('game.erase')}
        </button>
      </div>
    </div>
  );
}
