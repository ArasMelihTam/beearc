import {
  isQueenAging,
  parseMarkColor,
  queenAgeMonths,
  queenAgeParts,
  QUEEN_MARK_COLORS,
} from '../queens';

/**
 * Queen date math and mark colors (M5a). Pure functions only — same style as
 * rules.test.ts: hand-made inputs, no phone, no database.
 */

// ---------------------------------------------------------------------------
// Marking colors
// ---------------------------------------------------------------------------

describe('parseMarkColor', () => {
  test('the offered colors are exactly the five paint colors', () => {
    expect([...QUEEN_MARK_COLORS]).toEqual(['white', 'yellow', 'red', 'green', 'blue']);
  });

  test('accepts the official colors', () => {
    expect(parseMarkColor('green')).toBe('green');
    expect(parseMarkColor('white')).toBe('white');
  });

  test('unmarked and junk both read as null, never a crash', () => {
    expect(parseMarkColor(null)).toBeNull();
    expect(parseMarkColor('')).toBeNull();
    expect(parseMarkColor('turquoise')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Age
// ---------------------------------------------------------------------------

describe('queenAgeMonths', () => {
  const introduced = '2025-05-10T12:00:00.000Z';

  test('is 0 on the day she was introduced', () => {
    expect(queenAgeMonths(introduced, introduced)).toBe(0);
  });

  test('counts only COMPLETED months', () => {
    // One day short of a month is still 0 months old.
    expect(queenAgeMonths(introduced, '2025-06-09T12:00:00.000Z')).toBe(0);
    expect(queenAgeMonths(introduced, '2025-06-10T12:00:00.000Z')).toBe(1);
  });

  test('counts across a year boundary', () => {
    expect(queenAgeMonths(introduced, '2026-05-10T12:00:00.000Z')).toBe(12);
    expect(queenAgeMonths(introduced, '2026-07-10T12:00:00.000Z')).toBe(14);
  });

  test('a future date (typo) reads as 0, never negative', () => {
    expect(queenAgeMonths('2027-01-01T12:00:00.000Z', '2026-01-01T12:00:00.000Z')).toBe(0);
  });
});

describe('queenAgeParts', () => {
  test('splits months into years + months', () => {
    expect(queenAgeParts(0)).toEqual({ years: 0, months: 0 });
    expect(queenAgeParts(11)).toEqual({ years: 0, months: 11 });
    expect(queenAgeParts(12)).toEqual({ years: 1, months: 0 });
    expect(queenAgeParts(14)).toEqual({ years: 1, months: 2 });
    expect(queenAgeParts(25)).toEqual({ years: 2, months: 1 });
  });
});

describe('isQueenAging', () => {
  test('flags queens in their third season and beyond', () => {
    expect(isQueenAging(23)).toBe(false);
    expect(isQueenAging(24)).toBe(true);
    expect(isQueenAging(30)).toBe(true);
  });
});
