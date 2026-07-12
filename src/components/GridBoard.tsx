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
        className="rounded-2xl overflow-hidden shadow-md"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          border: '2.5px solid #3654D2',
          backgroundColor: '#3654D2',
          gap: '0.5px',
          padding: '0',
        }}
      >
        {grid.cells.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isSelected = selected?.row === r && selected?.col === c;
            const posKey = `${r},${c}`;

            // Box-border logic: draw thicker separators between 3x3 boxes
            const isBoxRight = (c + 1) % 3 === 0 && c !== 8;
            const isBoxBottom = (r + 1) % 3 === 0 && r !== 8;
            const isBoxLeft = c % 3 === 0 && c !== 0;
            const isBoxTop = r % 3 === 0 && r !== 0;

            // Build inline border styles for fine-grained control
            const borderStyle: React.CSSProperties = {
              borderRight: isBoxRight ? '2.5px solid #3654D2' : '0.5px solid #D0D7E5',
              borderBottom: isBoxBottom ? '2.5px solid #3654D2' : '0.5px solid #D0D7E5',
              borderLeft: isBoxLeft ? '2.5px solid #3654D2' : '0.5px solid #D0D7E5',
              borderTop: isBoxTop ? '2.5px solid #3654D2' : '0.5px solid #D0D7E5',
            };

            return (
              <div key={key} style={borderStyle}>
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
