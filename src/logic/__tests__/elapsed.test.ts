import { elapsedParts, staleness } from '../elapsed';

/** Elapsed-time math for the inspection timeline (M5c). */

const at = (s: string) => `${s}T12:00:00.000Z`;

describe('elapsedParts', () => {
  test('the same day is zero, not a negative number', () => {
    expect(elapsedParts(at('2026-06-20'), at('2026-06-20'))).toEqual({
      months: 0,
      days: 0,
      totalDays: 0,
    });
  });

  test('a future timestamp reads as zero rather than counting backwards', () => {
    expect(elapsedParts(at('2026-07-20'), at('2026-06-20')).totalDays).toBe(0);
  });

  test('counts plain days below a month', () => {
    const e = elapsedParts(at('2026-06-08'), at('2026-06-20'));
    expect(e).toEqual({ months: 0, days: 12, totalDays: 12 });
  });

  test('splits into months and leftover days', () => {
    const e = elapsedParts(at('2026-03-08'), at('2026-06-20'));
    expect(e.months).toBe(3);
    expect(e.days).toBe(12);
    expect(e.totalDays).toBe(104);
  });

  test('an exact month has no leftover days', () => {
    const e = elapsedParts(at('2026-05-20'), at('2026-06-20'));
    expect(e.months).toBe(1);
    expect(e.days).toBe(0);
  });

  test('month lengths do not distort the leftover days', () => {
    // Feb → Mar is 28 days, Mar → Apr is 31: both are "1 month, 1 day".
    expect(elapsedParts(at('2026-02-10'), at('2026-03-11'))).toMatchObject({
      months: 1,
      days: 1,
    });
    expect(elapsedParts(at('2026-03-10'), at('2026-04-11'))).toMatchObject({
      months: 1,
      days: 1,
    });
  });

  test('works across a year boundary', () => {
    const e = elapsedParts(at('2025-11-15'), at('2026-06-20'));
    expect(e.months).toBe(7);
    expect(e.days).toBe(5);
  });
});

describe('staleness', () => {
  test('runs from 0 on the day of the inspection to 1 at the threshold', () => {
    expect(staleness(0, 21)).toBe(0);
    expect(staleness(21, 21)).toBe(1);
  });

  test('is linear in between, so equal gaps in days look equally different', () => {
    expect(staleness(7, 21)).toBeCloseTo(1 / 3, 6);
    expect(staleness(14, 21)).toBeCloseTo(2 / 3, 6);
    // The step from 7→14 days shifts it as much as the step from 14→21.
    expect(staleness(14, 21) - staleness(7, 21)).toBeCloseTo(
      staleness(21, 21) - staleness(14, 21),
      6
    );
  });

  test('an overdue hive pins at 1 instead of running off the scale', () => {
    expect(staleness(200, 21)).toBe(1);
  });

  test('follows whatever threshold the beekeeper set', () => {
    expect(staleness(21, 42)).toBeCloseTo(0.5, 6);
  });

  test('a nonsensical threshold reads as fresh instead of dividing by zero', () => {
    expect(staleness(10, 0)).toBe(0);
  });
});
