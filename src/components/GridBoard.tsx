import React, { useMemo } from 'react';
import { Cell } from './Cell';
import type { Grid, Highlights, Pos } from '../types/generated';

interface GridBoardProps {
  grid: Grid;
  highlights: Highlights;
  onSelectCell: (row: number, col: number) => void;
}

export const GridBoard = React.memo(function GridBoard({
  grid,
  highlights,
  onSelectCell,
}: GridBoardProps) {
  const selected = grid.selected;

  // Pre-compute highlight sets for O(1) lookup
  const relatedSet = useMemo(
    () => new Set(highlights.related_area.map((p: Pos) => `${p.row},${p.col}`)),
    [highlights.related_area],
  );
  const sameNumberSet = useMemo(
    () => new Set(highlights.same_number.map((p: Pos) => `${p.row},${p.col}`)),
    [highlights.same_number],
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
        className="rounded-lg overflow-hidden shadow-md"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          border: '2.5px solid #3654D2',
          backgroundColor: '#FFFFFF',
        }}
      >
        {grid.cells.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isSelected = selected?.row === r && selected?.col === c;
            const posKey = `${r},${c}`;

            // Box-border logic: thick separators between 3x3 boxes, thin between cells
            // Use only borderRight and borderBottom to avoid double borders
            const isBoxRight = (c + 1) % 3 === 0 && c !== 8;
            const isBoxBottom = (r + 1) % 3 === 0 && r !== 8;

            const borderStyle: React.CSSProperties = {
              borderRight: isBoxRight ? '2.5px solid #3654D2' : '0.5px solid #D0D7E5',
              borderBottom: isBoxBottom ? '2.5px solid #3654D2' : '0.5px solid #D0D7E5',
            };

            return (
              <div key={key} style={borderStyle}>
                <Cell
                  cell={cell}
                  row={r}
                  col={c}
                  isSelected={isSelected}
                  isRelated={relatedSet.has(posKey)}
                  isSameNumber={sameNumberSet.has(posKey)}
                  isHint={hintSet.has(posKey)}
                  isError={errorSet.has(posKey)}
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
