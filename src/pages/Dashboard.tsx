import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Settings as SettingsIcon } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Difficulty } from '../types/generated';

const DAILY_PROGRESS_KEY = 'sudokucalm-daily-progress';

interface DailyProgress {
  lastCompletedDate: string;
  streak: number;
}

export function getLocalDateString(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadDailyProgress(): DailyProgress {
  try {
    const raw = localStorage.getItem(DAILY_PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lastCompletedDate: '', streak: 0 };
}

export function updateDailyStreak() {
  const today = getLocalDateString();
  const progress = loadDailyProgress();
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));

  if (progress.lastCompletedDate === today) {
    return;
  }

  const nextStreak = progress.lastCompletedDate === yesterday
    ? progress.streak + 1
    : 1;

  saveDailyProgress({ lastCompletedDate: today, streak: nextStreak });
}

function saveDailyProgress(progress: DailyProgress) {
  try {
    localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(progress));
  } catch { /* ignore */ }
}

const DIFFICULTIES: { key: Difficulty; labelKey: string; descKey: string; color: string }[] = [
  { key: 'Easy', labelKey: 'dashboard.easy', descKey: 'dashboard.easy_desc', color: 'bg-green-100 text-green-700 border-green-200' },
  { key: 'Medium', labelKey: 'dashboard.medium', descKey: 'dashboard.medium_desc', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'Hard', labelKey: 'dashboard.hard', descKey: 'dashboard.hard_desc', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'Expert', labelKey: 'dashboard.expert', descKey: 'dashboard.expert_desc', color: 'bg-red-100 text-red-700 border-red-200' },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function SaveThumbnail({ cells }: { cells: any[][] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(9, 1fr)',
        gap: '0.5px',
        width: '100%',
        aspectRatio: '1',
        backgroundColor: '#D0D7E5',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {cells.flat().map((cell: any, i: number) => {
        const val = cell.is_given || cell.value !== 0 ? cell.value : null;
        const isGiven = cell.is_given;
        return (
          <div
            key={i}
            style={{
              backgroundColor: val !== null
                ? (isGiven ? '#F2F4F8' : '#ECF1FB')
                : '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(4px, 1.2vw, 8px)',
              fontWeight: isGiven ? 700 : 600,
              color: isGiven ? '#2C2C2E' : '#3654D2',
              aspectRatio: '1',
            }}
          >
            {val}
          </div>
        );
      })}
    </div>
  );
}

interface SaveInfo {
  difficulty: string;
  progress: number;
}

function ContinueCard({
  savedState,
  saveInfo,
  onContinue,
  onNewPuzzle,
  t,
}: {
  savedState: any;
  saveInfo: SaveInfo;
  onContinue: () => void;
  onNewPuzzle: () => void;
  t: (key: string, opts?: any) => string;
}) {
  const diffLabel = t(`dashboard.${saveInfo.difficulty.toLowerCase()}`, saveInfo.difficulty);
  const timerStr = formatTime(savedState.elapsed_seconds ?? 0);

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border p-5">
      <div className="flex gap-4">
        {/* Left: text content */}
        <div className="flex-1 min-w-0">
          {/* Icon + Title row */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg leading-none">#</span>
            </div>
            <h3 className="text-lg font-bold text-ink-dark truncate">
              {t('dashboard.continue')}
            </h3>
          </div>

          {/* Difficulty · Timer */}
          <p className="text-sm text-ink-mid mb-3">
            {diffLabel} · {timerStr}
          </p>

          {/* Progress bar + percent */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${saveInfo.progress}%` }}
              />
            </div>
            <span className="text-sm font-bold text-primary tabular-nums shrink-0">
              {saveInfo.progress}%
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={onContinue}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                         hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              {t('dashboard.continueBtn')}
            </button>
            <button
              onClick={onNewPuzzle}
              className="flex-[0_0_auto] py-2.5 px-4 rounded-xl border border-border text-sm font-semibold text-ink-mid
                         hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              {t('dashboard.newPuzzle')}
            </button>
          </div>
        </div>

        {/* Right: Mini sudoku thumbnail */}
        <div className="w-[92px] shrink-0 self-start">
          <SaveThumbnail cells={savedState.grid.cells} />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const storage = useLocalStorage();
  const hasSave = storage.hasSave();
  const savedState = hasSave ? storage.load() : null;

  const today = useMemo(() => getLocalDateString(), []);
  const dailyProgress = useMemo(() => loadDailyProgress(), []);

  const saveInfo = savedState
    ? {
        difficulty: savedState.difficulty,
        progress: countFilled(savedState.grid.cells),
      }
    : null;

  const dailyCompleted = dailyProgress.lastCompletedDate === today;

  return (
    <div className="min-h-screen bg-white max-w-4xl mx-auto flex flex-col px-6 py-8 md:py-12">
      {/* Header with crown and gear */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex-1" />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-ink-dark tracking-tight">{t('app.title')}</h1>
          <p className="text-sm text-ink-mid mt-1">{t('app.subtitle')}</p>
        </div>
        <div className="flex-1 flex justify-end items-start gap-2">
          <Crown size={22} className="text-accent opacity-60" />
          <button
            onClick={() => navigate('/settings')}
            className="p-1 text-ink-mid hover:text-ink-dark transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon size={22} />
          </button>
        </div>
      </div>

      {/* Top row: Continue Puzzle + Daily Challenge */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Continue Puzzle — redesigned card */}
        {hasSave && saveInfo && savedState && (
          <ContinueCard
            savedState={savedState}
            saveInfo={saveInfo}
            onContinue={() => navigate('/game?mode=continue')}
            onNewPuzzle={() => {
              const diff = savedState?.difficulty || 'Easy';
              try { localStorage.removeItem('sudokucalm-save'); } catch { /* ignore */ }
              navigate(`/game?difficulty=${diff}`);
            }}
            t={t}
          />
        )}

        {/* Daily Challenge */}
        <button
          onClick={() => navigate('/game?mode=daily')}
          className="flex-1 p-5 rounded-2xl bg-accent/15 border border-accent/30 text-left
                     hover:bg-accent/25 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/30 flex items-center justify-center shrink-0">
              <span className="text-lg leading-none">📅</span>
            </div>
            <h3 className="text-lg font-bold text-ink-dark">{t('dashboard.daily')}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-mid">{today}</span>
            {dailyCompleted ? (
              <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                {dailyProgress.streak > 0
                  ? t('dashboard.streak', { count: dailyProgress.streak })
                  : t('dashboard.today')}
              </span>
            ) : dailyProgress.streak > 0 ? (
              <span className="text-xs font-medium text-ink-mid bg-white/60 px-2 py-0.5 rounded-full">
                {t('dashboard.streak', { count: dailyProgress.streak })}
              </span>
            ) : null}
          </div>
        </button>
      </div>

      {/* Difficulty Selection */}
      <h2 className="text-sm font-medium text-ink-mid uppercase tracking-wider mb-3">
        {t('dashboard.play')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            onClick={() => navigate(`/game?difficulty=${d.key}`)}
            className={`p-4 rounded-xl border text-left transition-all
                       hover:shadow-sm active:scale-[0.98] ${d.color}`}
          >
            <div className="font-semibold">{t(d.labelKey)}</div>
            <div className="text-xs mt-0.5 opacity-70">{t(d.descKey)}</div>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="mt-auto pt-8" />
    </div>
  );
}

function countFilled(cells: any[][]): number {
  let filled = 0;
  let total = 0;
  for (const row of cells) {
    for (const cell of row) {
      total++;
      if (!cell.is_given && cell.value !== 0) filled++;
    }
  }
  if (total === 0) return 0;
  const empties = cells.flat().filter((c: any) => !c.is_given).length;
  if (empties === 0) return 100;
  return Math.round((filled / empties) * 100);
}
