import React from 'react';
import type { Cell as CellData } from '../types/generated';

interface CellProps {
  cell: CellData;
  row: number;
  col: number;
  isSelected: boolean;
  isRelated: boolean;
  isHint: boolean;
  isError: boolean;
  selectedNumber: number | null;
  onSelect: (row: number, col: number) => void;
}

export const Cell = React.memo(function Cell({
  cell,
  row,
  col,
  isSelected,
  isRelated,
  isHint,
  isError,
  selectedNumber,
  onSelect,
}: CellProps) {
  const { value, notes, is_given } = cell;

  const isGiven = is_given;
  const isEmpty = value === 0;
  const isSameAsSelected = selectedNumber !== null && value === selectedNumber;

  // Determine styling classes
  let bgClass = 'bg-white';
  if (isSelected) {
    bgClass = 'bg-primary-light';
  } else if (isRelated) {
    bgClass = 'bg-[#F5F7FC]';
  } else if (isHint) {
    bgClass = 'bg-accent/30';
  }

  // Error state
  const errorClass = isError ? 'bg-error/15 text-error' : '';

  // Same number highlight
  const sameNumberClass = isSameAsSelected && !isSelected ? 'bg-accent/25 font-bold' : '';

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    onSelect(row, col);
  };

  return (
    <div
      className={`
        relative flex items-center justify-center
        w-full aspect-square cursor-pointer select-none
        transition-colors duration-75
        ${bgClass} ${sameNumberClass} ${errorClass}
        ${isHint ? 'animate-hint-flash' : ''}
      `}
      onPointerDown={handlePointerDown}
    >
      {isEmpty ? (
        // Show notes if empty
        notes.length > 0 ? (
          <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[2px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span
                key={n}
                className="flex items-center justify-center text-[7px] sm:text-[9px] text-ink-mid font-medium"
              >
                {notes.includes(n) ? n : ''}
              </span>
            ))}
          </div>
        ) : null
      ) : (
        // Show value
        <span
          className={`
            text-xl sm:text-2xl md:text-3xl font-medium
            ${isGiven ? 'text-ink-dark font-semibold' : 'text-primary'}
            ${isSameAsSelected && !isSelected ? 'font-bold' : ''}
            ${isError ? 'text-error' : ''}
          `}
        >
          {value}
        </span>
      )}
    </div>
  );
});
