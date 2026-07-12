import React from 'react';
import type { Cell as CellData } from '../types/generated';

interface CellProps {
  cell: CellData;
  row: number;
  col: number;
  isSelected: boolean;
  isRelated: boolean;
  isSameNumber: boolean;
  isHint: boolean;
  isError: boolean;
  onSelect: (row: number, col: number) => void;
}

export const Cell = React.memo(function Cell({
  cell,
  row,
  col,
  isSelected,
  isRelated,
  isSameNumber,
  isHint,
  isError,
  onSelect,
}: CellProps) {
  const { value, notes, is_given } = cell;

  const isGiven = is_given;
  const isEmpty = value === 0;

  // ── Background color ───────────────────────────────────────────
  // Priority: selected > error > hint > same-number > related > default
  let bgStyle: React.CSSProperties = { backgroundColor: '#FFFFFF' };

  if (isHint && isSelected) {
    bgStyle = { backgroundColor: '#E4C779' };
  } else if (isSelected) {
    // Deep blue solid background — highest visual priority
    bgStyle = { backgroundColor: '#3654D2' };
  } else if (isError) {
    bgStyle = { backgroundColor: '#FFEBEE' };
  } else if (isHint) {
    bgStyle = { backgroundColor: '#FDF3D1' };
  } else if (isSameNumber) {
    // Light semi-transparent lavender-blue for same-number cells
    bgStyle = { backgroundColor: '#ECF1FB' };
  } else if (isRelated) {
    bgStyle = { backgroundColor: '#ECF1FB' };
  }

  // ── Value text color ───────────────────────────────────────────
  let valueStyle: React.CSSProperties = {};
  if (!isEmpty) {
    if (isSelected && !isHint) {
      // White text on deep blue background for maximum contrast
      valueStyle = { color: '#FFFFFF', fontWeight: 700 };
    } else if (isHint && isSelected) {
      valueStyle = { color: '#2C2C2E', fontWeight: 700 };
    } else if (isError) {
      valueStyle = { color: '#E53935', fontWeight: 600 };
    } else if (isGiven) {
      valueStyle = { color: '#2C2C2E', fontWeight: 700 };
    } else {
      valueStyle = { color: '#3654D2', fontWeight: 600 };
    }
  }

  // ── Note text color (for empty cells with notes) ───────────────
  const noteColor = isSelected
    ? '#BCC6ED'   // lighter on deep-blue background
    : '#8E8E93';  // default ink-mid

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
                  color: notes.includes(n) ? noteColor : 'transparent',
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
