import {
  directionFor,
  endsFor,
  isValidTransfer,
  otherHiveIdOf,
  type TransferEnds,
} from '../transfers';

/**
 * One stored row, read from both ends (M5b): hive A gave two frames of brood
 * to hive B. A's history must say "gave", B's must say "received", and both
 * must name the other hive — from the same row.
 */
const A = 'hive-a';
const B = 'hive-b';
const C = 'hive-c';
const move: TransferEnds = { fromHiveId: A, toHiveId: B };

describe('directionFor', () => {
  test('the donor gave, the receiver received', () => {
    expect(directionFor(move, A)).toBe('gave');
    expect(directionFor(move, B)).toBe('received');
  });

  test('an unrelated hive gets null, not a wrong answer', () => {
    expect(directionFor(move, C)).toBeNull();
  });
});

describe('otherHiveIdOf', () => {
  test('each end points at the other one', () => {
    expect(otherHiveIdOf(move, A)).toBe(B);
    expect(otherHiveIdOf(move, B)).toBe(A);
  });

  test('unrelated hive → null', () => {
    expect(otherHiveIdOf(move, C)).toBeNull();
  });
});

describe('isValidTransfer', () => {
  test('two different hives are needed', () => {
    expect(isValidTransfer(A, B)).toBe(true);
  });

  test('a hive cannot give to itself', () => {
    expect(isValidTransfer(A, A)).toBe(false);
  });

  test('an unfinished form is not valid', () => {
    expect(isValidTransfer(A, null)).toBe(false);
    expect(isValidTransfer(null, B)).toBe(false);
    expect(isValidTransfer(null, null)).toBe(false);
  });
});

describe('endsFor', () => {
  test('"this hive gave" puts it on the from side', () => {
    expect(endsFor(A, 'gave', B)).toEqual({ fromHiveId: A, toHiveId: B });
  });

  test('"this hive received" puts it on the to side', () => {
    expect(endsFor(A, 'received', B)).toEqual({ fromHiveId: B, toHiveId: A });
  });

  test('round-trip: whatever the form builds reads back the same way', () => {
    for (const direction of ['gave', 'received'] as const) {
      const ends = endsFor(A, direction, B);
      expect(directionFor(ends, A)).toBe(direction);
      expect(otherHiveIdOf(ends, A)).toBe(B);
    }
  });
});
