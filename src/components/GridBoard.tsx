import React, { useMemo } from 'react';
import { Cell } from './Cell';
import type { Grid, Highlights, Pos } from '../types/generated';

interface GridBoardProps {
  grid: Grid;
  highlights: Highlights;
  selectedNumber: number | null;
  onSelectCell: (row: number, col: number) => void;
}

export const GridBoard = React.memo(function GridBoard({
  grid,
  highlights,
  selectedNumber,
  onSelectCell,
}: GridBoardProps) {
  const selected = grid.selected;

  // Pre-compute highlight sets for O(1) lookup
  const relatedSet = useMemo(
    () => new Set(highlights.related_area.map((p: Pos) => `${p.row},${p.col}`)),
    [highlights.related_area],
  );
  const hintSet = useMemo(
    () => new Set(highlights.hint_cells.map((p: Pos) => `${p.row},${p.col}`)),
    [highlights.hint_cells],
  );
  const errorSet = useMemo(
    () => new Set(highlights.error_cells.map((p: Pos) => `${p.row},${p.col}`)),
    [highlights.error_cells],
  );

  const handleSelect = (row: number, col: number) => {
    onSelectCell(row, col);
  };

  // Build grid with 3x3 box borders
  return (
    <div className="w-full max-w-[500px] mx-auto">
      <div
        className="grid grid-cols-9 border-2 border-ink-dark rounded-sm overflow-hidden"
        style={{ borderColor: '#1C1C1E' }}
      >
        {grid.cells.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isSelected = selected?.row === r && selected?.col === c;
            const posKey = `${r},${c}`;

            // Border logic for 3x3 boxes
            const borderRight = (c + 1) % 3 === 0 && c !== 8 ? 'border-r-2' : 'border-r';
            const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? 'border-b-2' : 'border-b';
            const borderColor = (c + 1) % 3 === 0 && c !== 8 ? 'border-r-ink-dark' : 'border-r-border';
            const borderColorB = (r + 1) % 3 === 0 && r !== 8 ? 'border-b-ink-dark' : 'border-b-border';

            return (
              <div
                key={key}
                className={`${borderRight} ${borderBottom} ${borderColor} ${borderColorB}`}
              >
                <Cell
                  cell={cell}
                  row={r}
                  col={c}
                  isSelected={isSelected}
                  isRelated={relatedSet.has(posKey)}
                  isHint={hintSet.has(posKey)}
                  isError={errorSet.has(posKey)}
                  selectedNumber={selectedNumber}
                  onSelect={handleSelect}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
});
