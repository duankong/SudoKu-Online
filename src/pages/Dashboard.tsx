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
    // Already completed today — no change
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
        <div className="flex-1" /> {/* spacer */}
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

      {/* Top row: Continue Puzzle + Daily Challenge (side by side on desktop) */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Continue Puzzle */}
        {hasSave && saveInfo && savedState && (
          <button
            onClick={() => navigate('/game?mode=continue')}
            className="flex-1 p-4 rounded-2xl bg-bg-board border border-border text-left
                       hover:bg-gray-100 active:scale-[0.98] transition-all"
          >
            <div className="text-sm font-medium text-ink-dark mb-2">{t('dashboard.continue')}</div>
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 flex-shrink-0">
                <SaveThumbnail cells={savedState.grid.cells} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-ink-dark">
                  {t(`dashboard.${saveInfo.difficulty.toLowerCase()}`, saveInfo.difficulty)}
                </div>
                <div className="text-xs text-ink-mid mt-0.5">
                  {t('dashboard.progress', { progress: saveInfo.progress })}
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Daily Challenge */}
        <button
          onClick={() => navigate('/game?mode=daily')}
          className="flex-1 p-4 rounded-2xl bg-accent/15 border border-accent/30 text-left
                     hover:bg-accent/25 active:scale-[0.98] transition-all"
        >
          <div className="text-sm font-medium text-ink-dark">{t('dashboard.daily')}</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-lg font-semibold text-ink-dark">{today}</span>
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
