import type { Difficulty, GameSettings } from './generated';

export type Action =
  | { type: 'selectCell'; row: number; col: number }
  | { type: 'inputNumber'; value: number }
  | { type: 'toggleNote'; value: number }
  | { type: 'toggleNoteMode' }
  | { type: 'erase' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'getHint' }
  | { type: 'newGame'; difficulty: Difficulty }
  | { type: 'updateGameSettings'; settings: GameSettings }
  | { type: 'setFinalTime'; seconds: number }
  | { type: 'autoNotes' }
  | { type: 'clearNotes' }
  | { type: 'applyHint' };
