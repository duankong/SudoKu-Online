import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../hooks/useGameEngine';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTimer } from '../hooks/useTimer';
import { StatusBar } from '../components/StatusBar';
import { GridBoard } from '../components/GridBoard';
import { NumberPad } from '../components/NumberPad';
import { Toolbar } from '../components/Toolbar';
import { HintDrawer } from '../components/HintDrawer';
import { GameOverDialog } from '../components/GameOverDialog';
import { getLocalDateString, updateDailyStreak } from './Dashboard';
import type { GameStatus, Difficulty } from '../types/generated';

export function Game() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const engine = useGameEngine();
  const storage = useLocalStorage();
  const timer = useTimer();
  const { t } = useTranslation();

  const [autoNotesActive, setAutoNotesActive] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Track if game was initialized
  const initialized = useRef(false);

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

  // Start timer when state first loads
  useEffect(() => {
    if (engine.state && initialized.current && !timer.running) {
      timer.start();
    }
  }, [engine.state?.grid]);

  // Auto-save on state change
  useEffect(() => {
    if (engine.state && engine.state.game_status === 'Playing') {
      storage.save(engine.state);
    }
  }, [engine.state]);

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

  const handleSelectCell = useCallback(
    (row: number, col: number) => {
      if (!engine.state) return;
      if (engine.state.game_status !== 'Playing') return;
      engine.dispatch({ type: 'selectCell', row, col });
    },
    [engine],
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

  const handleHint = useCallback(() => {
    if (!engine.state) return;
    engine.dispatch({ type: 'getHint' });
    setShowHint(true);
  }, [engine]);

  const handleAutoNotes = useCallback(() => {
    if (!engine.state) return;
    if (autoNotesActive) {
      engine.dispatch({ type: 'clearNotes' });
      setAutoNotesActive(false);
    } else {
      engine.dispatch({ type: 'autoNotes' });
      setAutoNotesActive(true);
    }
  }, [engine, autoNotesActive]);

  const handleApplyHint = useCallback(() => {
    if (!engine.state) return;
    engine.dispatch({ type: 'applyHint' });
    setShowHint(false);
  }, [engine]);

  const handleNewGame = useCallback(() => {
    const diff = engine.state?.difficulty || 'Easy';
    engine.newGame(diff);
    timer.start();
    setShowHint(false);
    setAutoNotesActive(false);
  }, [engine, timer]);

  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

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
  const hasSelectedValue = selectedCell ? selectedCell.value !== 0 : false;
  const selectedCellNotes: number[] = selectedCell ? selectedCell.notes : [];

  const gameOver = state.game_status === 'Won' || state.game_status === 'Lost';
  const disabled = gameOver;
  const gameStatus: GameStatus = state.game_status;

  return (
    <div className="flex flex-col h-screen bg-bg-board">
      {/* Status bar — full width at top */}
      <StatusBar
        difficulty={state.difficulty}
        errorCount={state.error_count}
        maxErrors={state.max_errors}
        gameStatus={gameStatus}
        timerDisplay={timer.format()}
        showTimer={state.settings.show_timer}
        onBack={handleHome}
      />

      {/* === Main area: board + sidebar === */}
      <div className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-center md:gap-8 md:p-6 overflow-auto">

        {/* Left: Grid Board */}
        <div className="flex-shrink-0 w-full max-w-[580px] px-2 pt-2 md:px-0 md:pt-0">
          <GridBoard
            grid={state.grid}
            highlights={state.grid.highlights}
            selectedNumber={state.grid.selected_number}
            onSelectCell={handleSelectCell}
          />
        </div>

        {/* Right: Controls sidebar (hidden on small screens) */}
        <div className="hidden md:flex flex-col w-72 gap-4 shrink-0">
          {/* Inline status */}
          <div className="bg-white rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-ink-dark capitalize">{state.difficulty}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-mid tabular-nums">
                  {t('statusBar.errors', { count: state.error_count, max: state.max_errors })}
                </span>
                {state.settings.show_timer && (
                  <span className="text-sm font-mono tabular-nums text-ink-dark">
                    {timer.format()}
                  </span>
                )}
              </div>
            </div>

            {/* Toolbar */}
            <Toolbar
              onUndo={handleUndo}
              onRedo={handleRedo}
              onAutoNotes={handleAutoNotes}
              onHint={handleHint}
              autoNotesActive={autoNotesActive}
              disabled={disabled}
            />
          </div>

          {/* Number pad */}
          <div className="bg-white rounded-2xl border border-border p-4">
            <NumberPad
              onNumber={handleNumber}
              onErase={handleErase}
              onToggleNote={handleToggleNote}
              selectedCellNotes={selectedCellNotes}
              hasSelectedValue={hasSelectedValue}
              disabled={disabled}
            />
          </div>

          {/* Hint panel (inline, shown when hint is active) */}
          {showHint && state.hint && (
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <HintDrawer
                hint={state.hint}
                visible={true}
                onClose={() => setShowHint(false)}
                onApplyHint={handleApplyHint}
                inline
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile controls (below board on small screens) */}
      <div className="md:hidden">
        {/* Toolbar */}
        <Toolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAutoNotes={handleAutoNotes}
          onHint={handleHint}
          autoNotesActive={autoNotesActive}
          disabled={disabled}
        />

        {/* Number pad */}
        <div className="pb-4 pt-1">
          <NumberPad
            onNumber={handleNumber}
            onErase={handleErase}
            onToggleNote={handleToggleNote}
            selectedCellNotes={selectedCellNotes}
            hasSelectedValue={hasSelectedValue}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Mobile Hint drawer (bottom sheet) */}
      <div className="md:hidden">
        <HintDrawer
          hint={state.hint}
          visible={showHint}
          onClose={() => setShowHint(false)}
          onApplyHint={handleApplyHint}
        />
      </div>

      {/* Game over dialog */}
      {gameOver && (
        <GameOverDialog
          status={gameStatus}
          timerDisplay={timer.format()}
          onNewGame={handleNewGame}
          onHome={handleHome}
        />
      )}
    </div>
  );
}
