import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTimer } from '../hooks/useTimer';
import { GridBoard } from '../components/GridBoard';
import { NumberPad } from '../components/NumberPad';
import { Toolbar } from '../components/Toolbar';
import { HintDrawer } from '../components/HintDrawer';
import { GameOverDialog } from '../components/GameOverDialog';
import { getLocalDateString, updateDailyStreak } from './Dashboard';
import { loadGameSettings } from './Settings';
import type { GameStatus, Difficulty } from '../types/generated';

export function Game() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const engine = useGameEngine();
  const storage = useLocalStorage();
  const timer = useTimer();
  const { t } = useTranslation();

  const [showHint, setShowHint] = useState(false);

  // Track if game was initialized
  const initialized = useRef(false);
  const settingsApplied = useRef(false);

  // Initialize game from params or saved state
  useEffect(() => {
    if (engine.loading || initialized.current) return;

    const mode = searchParams.get('mode');
    const difficulty = searchParams.get('difficulty') as Difficulty | null;

    if (mode === 'daily') {
      const today = getLocalDateString();
      engine.newDaily(today);
      initialized.current = true;
    } else if (mode === 'continue') {
      const saved = storage.load();
      if (saved) {
        engine.loadState(saved).then(() => {
          timer.sync(saved.elapsed_seconds ?? 0);
          timer.resume();
        });
        initialized.current = true;
      } else {
        engine.newGame('Easy');
        initialized.current = true;
      }
    } else if (difficulty) {
      engine.newGame(difficulty);
      initialized.current = true;
    } else {
      engine.newGame('Easy');
      initialized.current = true;
    }
  }, [engine.loading, engine.newGame, engine.newDaily, engine.loadState, searchParams, storage, timer]);

  // Apply saved game settings — always use latest from localStorage,
  // even for continue mode (user may have changed settings since the save).
  useEffect(() => {
    if (!engine.state || !initialized.current || settingsApplied.current) return;
    settingsApplied.current = true;
    const savedSettings = loadGameSettings();
    engine.dispatch({ type: 'updateGameSettings', settings: savedSettings });
  }, [engine.state]);

  // Consolidated timer lifecycle — depends on full state to catch every
  // transition, including setFinalTime dispatches that re-sync the state.
  useEffect(() => {
    if (!engine.state || !initialized.current) return;
    if (engine.state.game_status === 'Playing') {
      if (!timer.running) timer.start();
    } else {
      timer.pause();
    }
  }, [engine.state]);

  // Auto-save on state change (Playing only)
  useEffect(() => {
    if (engine.state && engine.state.game_status === 'Playing') {
      storage.save(engine.state);
    }
  }, [engine.state]);

  // Remove saved game when puzzle is finished or lost
  useEffect(() => {
    if (engine.state && engine.state.game_status !== 'Playing') {
      storage.deleteSave();
    }
  }, [engine.state?.game_status]);

  // Update daily streak when game is won
  useEffect(() => {
    if (engine.state?.game_status === 'Won') {
      const mode = searchParams.get('mode');
      if (mode === 'daily') {
        updateDailyStreak();
      }
    }
  }, [engine.state?.game_status]);

  // Handle timer sync with WASM
  useEffect(() => {
    if (engine.state && timer.seconds > 0 && timer.seconds !== engine.state.elapsed_seconds) {
      engine.dispatch({ type: 'setFinalTime', seconds: timer.seconds });
    }
  }, [timer.seconds]);

  // Keyboard input support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engine.state || engine.state.game_status !== 'Playing') return;

      // Number keys 1-9
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        engine.dispatch({ type: 'inputNumber', value: parseInt(e.key) });
        setShowHint(false);
        return;
      }

      // Delete / Backspace → erase
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        engine.dispatch({ type: 'erase' });
        return;
      }

      // Ctrl+Z → undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        engine.dispatch({ type: 'undo' });
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y → redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        engine.dispatch({ type: 'redo' });
        return;
      }

      // Arrow keys → navigate selected cell
      const sel = engine.state.grid.selected;
      if (sel && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const moves: Record<string, [number, number]> = {
          ArrowUp:    [-1, 0],
          ArrowDown:  [1, 0],
          ArrowLeft:  [0, -1],
          ArrowRight: [0, 1],
        };
        const [dr, dc] = moves[e.key];
        const nr = Math.max(0, Math.min(8, sel.row + dr));
        const nc = Math.max(0, Math.min(8, sel.col + dc));
        engine.dispatch({ type: 'selectCell', row: nr, col: nc });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine.state]);

  const handleSelectCell = useCallback(
    async (row: number, col: number) => {
      if (!engine.state) return;
      if (engine.state.game_status !== 'Playing') return;

      const hint = engine.state.hint;

      // If hint is active and user clicks the hinted cell → apply it
      if (hint && hint.target.row === row && hint.target.col === col && showHint) {
        await engine.dispatch({ type: 'applyHint' });
        setShowHint(false);
        return;
      }

      // Select cell
      await engine.dispatch({ type: 'selectCell', row, col });
    },
    [engine, showHint],
  );

  const handleNumber = useCallback(
    (value: number) => {
      if (!engine.state) return;
      if (engine.state.game_status !== 'Playing') return;
      engine.dispatch({ type: 'inputNumber', value });
      setShowHint(false);
    },
    [engine],
  );

  const handleToggleNote = useCallback(
    (value: number) => {
      if (!engine.state) return;
      if (engine.state.game_status !== 'Playing') return;
      engine.dispatch({ type: 'toggleNote', value });
    },
    [engine],
  );

  const handleErase = useCallback(() => {
    if (!engine.state) return;
    engine.dispatch({ type: 'erase' });
  }, [engine]);

  const handleUndo = useCallback(() => {
    if (!engine.state) return;
    engine.dispatch({ type: 'undo' });
  }, [engine]);

  const handleRedo = useCallback(() => {
    if (!engine.state) return;
    engine.dispatch({ type: 'redo' });
  }, [engine]);

  const handleHint = useCallback(async () => {
    if (!engine.state) return;
    if (engine.state.settings.show_hints) {
      // Show explanations: get hint, then show drawer
      await engine.dispatch({ type: 'getHint' });
      setShowHint(true);
    } else {
      // Skip explanations: get hint, then auto-apply
      await engine.dispatch({ type: 'getHint' });
      await engine.dispatch({ type: 'applyHint' });
    }
  }, [engine]);

  const handleAutoNotes = useCallback(() => {
    if (!engine.state) return;
    const boardHasNotes = engine.state.grid.cells.some(
      (row) => row.some((c) => c.notes.length > 0),
    );
    if (boardHasNotes) {
      engine.dispatch({ type: 'clearNotes' });
    } else {
      engine.dispatch({ type: 'autoNotes' });
    }
  }, [engine]);

  const handleApplyHint = useCallback(() => {
    if (!engine.state) return;
    engine.dispatch({ type: 'applyHint' });
    setShowHint(false);
  }, [engine]);

  const handleNewGame = useCallback(async () => {
    const diff = engine.state?.difficulty || 'Easy';
    await engine.newGame(diff);
    // Re-apply saved settings — newGame uses GameSettings::default()
    const savedSettings = loadGameSettings();
    await engine.dispatch({ type: 'updateGameSettings', settings: savedSettings });
    timer.start();
    setShowHint(false);
  }, [engine, timer]);

  const handleRetry = useCallback(() => {
    if (!engine.state) return;
    engine.dispatch({ type: 'resetPuzzle' });
    timer.start();
    setShowHint(false);
  }, [engine, timer]);

  const handleHome = useCallback(() => {
    if (engine.state && engine.state.game_status === 'Playing') {
      storage.save(engine.state);
    }
    navigate('/');
  }, [navigate, engine.state, storage]);

  // Loading / Error states
  if (engine.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-ink-mid text-lg animate-pulse">{t('game.loading')}</div>
      </div>
    );
  }

  if (engine.error || !engine.state) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-error text-lg">{t('game.loadError')}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all"
        >
          {t('game.retry')}
        </button>
      </div>
    );
  }

  // At this point engine.state is guaranteed non-null
  const state = engine.state;
  const sel = state.grid.selected;
  const selectedCell = sel ? state.grid.cells[sel.row][sel.col] : null;
  const selectedCellNotes: number[] = selectedCell ? selectedCell.notes : [];

  const gameOver = state.game_status === 'Won' || state.game_status === 'Lost';
  const disabled = gameOver;
  const gameStatus: GameStatus = state.game_status;

  // Determine if board has any notes (for auto-notes / clear-notes toggle)
  const hasNotes = state.grid.cells.some((row) => row.some((c) => c.notes.length > 0));

  return (
    <div className="flex flex-col min-h-screen bg-bg-board pt-[20vh]">
      {/* Board header — 2 rows: top=nav, bottom=stats */}
      <div className="flex-shrink-0 px-2 pt-3 pb-3">
        <div className="w-full max-w-[500px] mx-auto mb-1.5">
          {/* Row 1: ← back · difficulty · ⚙ settings */}
          <div className="flex items-center justify-between" style={{ marginBottom: '30px' }}>
            <button
              onClick={handleHome}
              className="p-1 text-ink-dark hover:text-ink transition-colors"
              aria-label="Back to menu"
            >
              <ArrowLeft size={20} />
            </button>
            <span className="text-sm font-semibold text-ink-dark">
              {t(`dashboard.${state.difficulty.toLowerCase()}`)}
            </span>
            <button
              onClick={() => navigate('/settings')}
              className="p-1 text-ink-dark hover:text-ink transition-colors"
              aria-label="Settings"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
          {/* Row 2: errors (left) · (spacer) · timer (right) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 w-[72px]">
              <AlertTriangle
                size={16}
                className={state.error_count > 0 ? 'text-error' : 'text-ink-light'}
              />
              <span className={`text-sm font-medium tabular-nums ${
                state.error_count > 0 ? 'text-error' : 'text-ink-mid'
              }`}>
                {state.error_count}/{state.max_errors}
              </span>
            </div>
            <span className="text-sm font-mono font-medium tabular-nums text-ink-mid w-[72px] text-right">
              {state.settings.show_timer ? timer.format() : ''}
            </span>
          </div>
        </div>
        <div className="flex items-start justify-center">
          <GridBoard
            grid={state.grid}
            highlights={state.grid.highlights}
            onSelectCell={handleSelectCell}
          />
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAutoNotes={handleAutoNotes}
        onHint={handleHint}
        hasNotes={hasNotes}
        disabled={disabled}
      />

      {/* Number pad */}
      <div className="pb-4 pt-3">
        <NumberPad
          selectedNumber={state.grid.selected_number}
          onNumber={handleNumber}
          onErase={handleErase}
          onToggleNote={handleToggleNote}
          selectedCellNotes={selectedCellNotes}
          disabled={disabled}
        />
      </div>

      {/* Hint drawer — bottom sheet */}
      <HintDrawer
        hint={state.hint}
        visible={showHint}
        onClose={() => setShowHint(false)}
        onApplyHint={handleApplyHint}
      />

      {/* Game over dialog */}
      {gameOver && (
        <GameOverDialog
          status={gameStatus}
          timerDisplay={timer.format()}
          onRetry={handleRetry}
          onNewGame={handleNewGame}
          onHome={handleHome}
        />
      )}
    </div>
  );
}
