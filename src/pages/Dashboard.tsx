import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Calendar, BarChart3, Clock, Flame, Globe, Sprout, Scale, Mountain, Gem, ChevronRight, Hash } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { setLanguage } from '../i18n';
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

const DIFFICULTIES: { key: Difficulty; labelKey: string; descKey: string; icon: React.ReactNode; iconBg: string; iconColor: string }[] = [
  { key: 'Easy',  labelKey: 'dashboard.easy',  descKey: 'dashboard.easy_desc',  icon: <Sprout size={22} strokeWidth={1.5} />,  iconBg: '#e6f6ee', iconColor: '#28a745' },
  { key: 'Medium',labelKey: 'dashboard.medium',descKey: 'dashboard.medium_desc',icon: <Scale size={22} strokeWidth={1.5} />,   iconBg: '#e6f0ff', iconColor: '#0066ff' },
  { key: 'Hard',  labelKey: 'dashboard.hard',  descKey: 'dashboard.hard_desc',  icon: <Mountain size={22} strokeWidth={1.5} />,iconBg: '#fff2e0', iconColor: '#f29900' },
  { key: 'Expert',labelKey: 'dashboard.expert',descKey: 'dashboard.expert_desc',icon: <Gem size={22} strokeWidth={1.5} />,      iconBg: '#f3eaff', iconColor: '#9944dd' },
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
        borderRadius: '4px',
        overflow: 'hidden',
        width: '92px',
        height: '92px',
        border: '1px solid #8B9DC7',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        lineHeight: 0,
        fontSize: 0,
      }}
    >
      {cells.flat().map((cell: any, i: number) => {
        const row = Math.floor(i / 9);
        const col = i % 9;
        const val = cell.is_given || cell.value !== 0 ? cell.value : null;
        const isGiven = cell.is_given;
        const hasNotes = !val && cell.notes && cell.notes.length > 0;

        const isBoxRight = (col + 1) % 3 === 0 && col !== 8;
        const isBoxBottom = (row + 1) % 3 === 0 && row !== 8;

        return (
          <div
            key={i}
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              verticalAlign: 'top',
              fontSize: '7px',
              lineHeight: '10px',
              textAlign: 'center',
              backgroundColor: val !== null
                ? (isGiven ? '#F2F4F8' : '#ECF1FB')
                : '#FFFFFF',
              fontWeight: isGiven ? 700 : 600,
              color: isGiven ? '#2C2C2E' : '#3654D2',
              borderRight: isBoxRight ? '1px solid #3654D2' : '0.5px solid #D0D7E5',
              borderBottom: isBoxBottom ? '1px solid #3654D2' : '0.5px solid #D0D7E5',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {val ? val : null}
            {hasNotes && (
              <span
                style={{
                  position: 'absolute',
                  width: '3px',
                  height: '3px',
                  borderRadius: '50%',
                  backgroundColor: '#8E8E93',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyThumbnail() {
  return (
    <div
      style={{
        borderRadius: '4px',
        overflow: 'hidden',
        width: '92px',
        height: '92px',
        border: '1px solid #8B9DC7',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        lineHeight: 0,
        fontSize: 0,
      }}
    >
      {Array.from({ length: 81 }).map((_, i) => {
        const col = i % 9;
        const row = Math.floor(i / 9);
        const isBoxRight = (col + 1) % 3 === 0 && col !== 8;
        const isBoxBottom = (row + 1) % 3 === 0 && row !== 8;
        return (
          <div
            key={i}
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              verticalAlign: 'top',
              backgroundColor: '#FFFFFF',
              borderRight: isBoxRight ? '1px solid #3654D2' : '0.5px solid #D0D7E5',
              borderBottom: isBoxBottom ? '1px solid #3654D2' : '0.5px solid #D0D7E5',
              boxSizing: 'border-box',
            }}
          />
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
  saveInfo: SaveInfo | null;
  onContinue: () => void;
  onNewPuzzle: () => void;
  t: (key: string, opts?: any) => string;
}) {
  const hasData = savedState != null && saveInfo != null;
  const diffLabel = saveInfo
    ? t(`dashboard.${saveInfo.difficulty.toLowerCase()}`, saveInfo.difficulty)
    : '';
  const timerStr = hasData ? formatTime(savedState.elapsed_seconds ?? 0) : '00:00';

  return (
    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border p-5 flex flex-col">
      {/* Title row with thumbnail on the right */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-bg-cell flex items-center justify-center shrink-0">
            <Hash size={20} className="text-primary" strokeWidth={2} />
          </div>
          <h3 className="text-lg font-bold text-ink-dark truncate">
            {t('dashboard.continue')}
          </h3>
        </div>
        <div className="w-[92px] shrink-0">
          {hasData ? (
            <SaveThumbnail cells={savedState.grid.cells} />
          ) : (
            <EmptyThumbnail />
          )}
        </div>
      </div>

      {/* Difficulty · Timer (placeholder when no save) */}
      <p className="text-sm text-ink-mid mb-3">
        {hasData ? `${diffLabel} · ${timerStr}` : t('dashboard.noPuzzle')}
      </p>

      {/* Progress bar + percent */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${saveInfo?.progress ?? 0}%` }}
          />
        </div>
        <span className="text-sm font-bold text-primary tabular-nums shrink-0">
          {saveInfo?.progress ?? 0}%
        </span>
      </div>

      {/* Fill remaining space so buttons align */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onContinue}
          disabled={!hasData}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            hasData
              ? 'bg-primary text-white hover:bg-primary/90 active:scale-[0.98]'
              : 'bg-gray-200 text-ink-light cursor-not-allowed'
          }`}
        >
          {t('dashboard.continueBtn')}
        </button>
        <button
          onClick={onNewPuzzle}
          className="flex-[0_0_auto] py-2.5 px-4 rounded-xl bg-primary-pale text-sm font-semibold text-primary
                     hover:bg-primary-light active:scale-[0.98] transition-all"
        >
          {t('dashboard.newPuzzle')}
        </button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
        <div className="flex-1 flex justify-end items-center gap-2">
          <button
            onClick={() => {
              const next = i18n.language?.startsWith('zh') ? 'en' : 'zh';
              setLanguage(next);
            }}
            className="flex items-center justify-center gap-1 w-[68px] py-1 rounded-lg border border-border
                       text-xs font-medium text-ink-mid hover:bg-gray-50 active:bg-gray-100 transition-colors"
            aria-label="Toggle language"
          >
            <Globe size={14} className="text-primary" />
            <span>{i18n.language?.startsWith('zh') ? '中文' : 'EN'}</span>
          </button>
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
        {/* Continue Puzzle — always shown */}
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

        {/* Daily Challenge — matching Continue Card style */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border p-5 flex flex-col">
          {/* Header: icon + title — same mb as Continue Card */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-bg-cell flex items-center justify-center shrink-0">
              <Calendar size={20} className="text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-ink-dark truncate">
              {t('dashboard.daily')}
            </h3>
          </div>

          {/* Push tags to middle */}
          <div className="flex-1" />

          {/* Tags row — evenly distributed */}
          <div className="flex justify-between mb-3">
            <span className="flex items-center gap-1.5 text-sm text-ink-mid">
              <BarChart3 size={14} className="text-ink-mid" />
              {t('dashboard.hard')}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-ink-mid">
              <Clock size={14} className="text-ink-mid" />
              {t('dashboard.daily_duration')}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-ink-mid">
              <Flame size={14} className="text-ink-mid" />
              {t('dashboard.daily_streak', { count: dailyProgress.streak })}
            </span>
          </div>

          {/* Fill remaining space so buttons align */}
          <div className="flex-1" />

          {/* Action button */}
          <button
            onClick={() => navigate('/game?mode=daily')}
            className="w-full py-2.5 rounded-xl bg-primary-pale text-sm font-semibold text-primary
                       hover:bg-primary-light active:scale-[0.98] transition-all"
          >
            {dailyCompleted ? t('dashboard.daily_completed_btn') : t('dashboard.daily_btn')}
          </button>
        </div>
      </div>

      {/* Difficulty Selection */}
      <h2 className="text-lg font-bold text-ink-dark mb-6">
        {t('dashboard.play')}
      </h2>
      <div className="grid grid-cols-2 gap-4 w-full">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            onClick={() => navigate(`/game?difficulty=${d.key}`)}
            className="flex items-center gap-3 px-4 py-4 rounded-2xl
                       transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(255, 255, 255, 0.55)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* Left: Circle icon */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: d.iconBg, color: d.iconColor }}
            >
              {d.icon}
            </div>
            {/* Center: text */}
            <div className="flex-1 text-left min-w-0">
              <div
                className="font-semibold truncate"
                style={{ fontSize: '17px', color: '#1a1a24' }}
              >
                {t(d.labelKey)}
              </div>
              <div
                className="mt-0.5"
                style={{ fontSize: '13px', color: '#787a8c' }}
              >
                {t(d.descKey)}
              </div>
            </div>
            {/* Right: arrow */}
            <ChevronRight size={18} style={{ color: '#b0b3c2' }} className="shrink-0" />
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
