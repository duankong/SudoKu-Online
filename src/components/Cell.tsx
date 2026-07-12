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
  const isSameAsSelected = selectedNumber !== null && value === selectedNumber && !isEmpty;

  // Determine background color
  let bgStyle: React.CSSProperties = { backgroundColor: '#FFFFFF' };

  if (isHint && isSelected) {
    bgStyle = { backgroundColor: '#E4C779' };
  } else if (isHint) {
    bgStyle = { backgroundColor: '#FDF3D1' };
  } else if (isSelected) {
    bgStyle = { backgroundColor: '#DDE6F9' };
  } else if (isError) {
    bgStyle = { backgroundColor: '#FFEBEE' };
  } else if (isRelated) {
    bgStyle = { backgroundColor: '#ECF1FB' };
  } else if (isSameAsSelected) {
    bgStyle = { backgroundColor: '#ECF1FB' };
  }

  // Determine text color for cell value
  let valueStyle: React.CSSProperties = {};
  if (!isEmpty) {
    if (isError) {
      valueStyle = { color: '#E53935', fontWeight: 600 };
    } else if (isGiven) {
      valueStyle = { color: '#2C2C2E', fontWeight: 700 };
    } else {
      valueStyle = { color: '#3654D2', fontWeight: 600 };
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    onSelect(row, col);
  };

  return (
    <div
      className="relative flex items-center justify-center w-full aspect-square cursor-pointer select-none"
      style={{
        ...bgStyle,
        transition: 'background-color 0.1s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={handlePointerDown}
    >
      {isEmpty ? (
        // Show notes if empty
        notes.length > 0 ? (
          <div
            className="grid grid-cols-3 grid-rows-3 w-full h-full"
            style={{ padding: '1px' }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <span
                key={n}
                className="flex items-center justify-center select-none"
                style={{
                  fontSize: 'clamp(6px, 1.8vw, 10px)',
                  fontWeight: 500,
                  color: notes.includes(n) ? '#8E8E93' : 'transparent',
                  lineHeight: 1,
                }}
              >
                {notes.includes(n) ? n : ''}
              </span>
            ))}
          </div>
        ) : null
      ) : (
        // Show value
        <span
          className="select-none"
          style={{
            fontSize: 'clamp(16px, 5vw, 26px)',
            fontFamily: "'Inter', 'SF Pro Display', 'PingFang SC', system-ui, sans-serif",
            lineHeight: 1,
            ...valueStyle,
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
});
