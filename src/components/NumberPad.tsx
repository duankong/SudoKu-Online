import { Eraser } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NumberPadProps {
  selectedNumber: number | null;
  onNumber: (value: number) => void;
  onErase: () => void;
  onToggleNote: (value: number) => void;
  selectedCellNotes: number[];
  disabled: boolean;
}

export function NumberPad({
  selectedNumber,
  onNumber,
  onErase,
  onToggleNote,
  selectedCellNotes,
  disabled,
}: NumberPadProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-[500px] mx-auto">
      {/* Number buttons 1-9 + Erase */}
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const isActive = selectedNumber === n;
          const inNotes = selectedCellNotes.includes(n);

          return (
            <div key={n} className="flex flex-col items-center">
              {/* Main number button */}
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

              {/* Candidate sub-row — note number + dot indicator */}
              <div className="flex flex-col items-center mt-2">
                <button
                  onClick={() => onToggleNote(n)}
                  disabled={disabled}
                  className={`
                    flex items-center justify-center
                    w-8 h-6
                    transition-all duration-75 rounded
                    ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-primary-pale active:scale-90'}
                  `}
                  aria-label={`Toggle note ${n}`}
                >
                  <span
                    className="font-medium leading-none select-none"
                    style={{
                      color: inNotes ? '#3654D2' : '#C8CCD5',
                      fontSize: '14px',
                    }}
                  >
                    {n}
                  </span>
                </button>
                {/* Dot: filled blue when this number is selected, else gray hollow */}
                <div
                  className="w-1.5 h-1.5 rounded-full mt-0.5"
                  style={{
                    backgroundColor: isActive ? '#3654D2' : '#D0D7E5',
                    transition: 'background-color 0.1s ease',
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Erase button — 10th column */}
        <div className="flex flex-col items-center">
          <button
            onClick={onErase}
            disabled={disabled}
            className={`
              flex items-center justify-center
              w-full aspect-square rounded-xl
              transition-all duration-75
              bg-white border shadow-sm
              hover:bg-primary-pale hover:border-primary hover:shadow-md
              active:scale-95
              ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
            `}
            style={{ borderColor: '#D0D7E5' }}
            aria-label={t('game.erase')}
          >
            <Eraser size={20} style={{ color: '#8E8E93' }} />
          </button>
          {/* Spacer to align with candidate sub-row */}
          <div className="mt-2 w-8 h-6" />
        </div>
      </div>
    </div>
  );
}
