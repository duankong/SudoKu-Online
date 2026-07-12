import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameEngine } from '../hooks/useGameEngine';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTimer } from '../hooks/useTimer';
import { StatusBar } from '../components/StatusBar';
import { GridBoard } from '../components/GridBoard';
import { NumberPad } from '../components/NumberPad';
import { Toolbar } from '../components/Toolbar';
import { HintDrawer } from '../components/HintDrawer';
import { GameOverDialog } from '../components/GameOverDialog';
import type { GameStatus, Difficulty } from '../types/generated';

export function Game() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const engine = useGameEngine();
  const storage = useLocalStorage();
  const timer = useTimer();

  const [noteMode, setNoteMode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [paused, setPaused] = useState(false);

  // Track if game was initialized
  const initialized = useRef(false);

  // Initialize game from params or saved state
  useEffect(() => {
    if (engine.loading || initialized.current) return;

    const mode = searchParams.get('mode');
    const difficulty = searchParams.get('difficulty') as Difficulty | null;

    if (mode === 'daily') {
      const today = new Date().toISOString().split('T')[0];
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
    if (engine.state && !initialized.current === false && !timer.running) {
      timer.start();
    }
  }, [engine.state?.grid]);

  // Auto-save on state change
  useEffect(() => {
    if (engine.state && engine.state.game_status === 'Playing') {
      storage.save(engine.state);
    }
  }, [engine.state]);

  // Handle timer sync with WASM
  useEffect(() => {
    if (engine.state && timer.seconds > 0 && timer.seconds !== engine.state.elapsed_seconds) {
      engine.dispatch({ type: 'setFinalTime', seconds: timer.seconds });
    }
  }, [timer.seconds]);

  const handleSelectCell = useCallback(
    (row: number, col: number) => {
      if (paused || !engine.state) return;
      if (engine.state.game_status !== 'Playing') return;
      engine.dispatch({ type: 'selectCell', row, col });
    },
    [engine, paused],
  );

  const handleNumber = useCallback(
    (value: number) => {
      if (paused || !engine.state) return;
      if (engine.state.game_status !== 'Playing') return;
      if (noteMode) {
        engine.dispatch({ type: 'toggleNote', value });
      } else {
        engine.dispatch({ type: 'inputNumber', value });
      }
      setShowHint(false);
    },
    [engine, noteMode, paused],
  );

  const handleErase = useCallback(() => {
    if (paused || !engine.state) return;
    engine.dispatch({ type: 'erase' });
  }, [engine, paused]);

  const handleUndo = useCallback(() => {
    if (paused || !engine.state) return;
    engine.dispatch({ type: 'undo' });
  }, [engine, paused]);

  const handleRedo = useCallback(() => {
    if (paused || !engine.state) return;
    engine.dispatch({ type: 'redo' });
  }, [engine, paused]);

  const handleHint = useCallback(() => {
    if (paused || !engine.state) return;
    engine.dispatch({ type: 'getHint' });
    setShowHint(true);
  }, [engine, paused]);

  const handlePause = useCallback(() => {
    if (paused) {
      timer.resume();
      setPaused(false);
    } else {
      timer.pause();
      setPaused(true);
    }
  }, [paused, timer]);

  const handleNewGame = useCallback(() => {
    const diff = engine.state?.difficulty || 'Easy';
    engine.newGame(diff);
    timer.start();
    setShowHint(false);
    setPaused(false);
  }, [engine, timer]);

  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleToggleNoteMode = useCallback(() => {
    setNoteMode((m) => !m);
    engine.dispatch({ type: 'toggleNoteMode' });
  }, [engine]);

  // Loading / Error states
  if (engine.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-ink-mid text-lg">加载中...</div>
      </div>
    );
  }

  if (engine.error || !engine.state) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-error text-lg">加载失败</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-primary text-white"
        >
          重试
        </button>
      </div>
    );
  }

  const { state } = engine;
  const gameOver = state.game_status === 'Won' || state.game_status === 'Lost';
  const gameStatus: GameStatus = state.game_status;
  const disabled = paused || gameOver;

  return (
    <div className="flex flex-col h-screen max-w-[500px] mx-auto bg-white">
      {/* Status bar */}
      <StatusBar
        difficulty={state.difficulty}
        errorCount={state.error_count}
        maxErrors={state.max_errors}
        gameStatus={gameStatus}
        timerDisplay={timer.format()}
        showTimer={state.settings.show_timer}
        onPause={handlePause}
        onBack={handleHome}
      />

      {/* Paused overlay */}
      {paused && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/90">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-ink-dark mb-4">已暂停</h2>
            <button
              onClick={handlePause}
              className="px-6 py-3 rounded-xl bg-primary text-white font-medium
                         hover:bg-primary/90 active:scale-95 transition-all"
            >
              继续游戏
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onHint={handleHint}
        onErase={handleErase}
        disabled={disabled}
      />

      {/* Grid */}
      <div className="flex-1 flex items-start justify-center px-2 pt-2 pb-1">
        <GridBoard
          grid={state.grid}
          highlights={state.grid.highlights}
          selectedNumber={state.grid.selected_number}
          onSelectCell={handleSelectCell}
        />
      </div>

      {/* Number pad */}
      <div className="pb-4 pt-1">
        <NumberPad
          onNumber={handleNumber}
          onErase={handleErase}
          onToggleNoteMode={handleToggleNoteMode}
          noteMode={noteMode}
          disabled={disabled}
        />
      </div>

      {/* Hint drawer */}
      <HintDrawer
        hint={state.hint}
        visible={showHint}
        onClose={() => setShowHint(false)}
      />

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
