import {
  COMPRESSION_LADDER,
  MAX_EDGE,
  TARGET_BYTES,
  isWithinBudget,
  nextCompression,
  resizeTarget,
} from '../photos';

describe('resizeTarget', () => {
  it('scales a landscape phone photo to the long edge', () => {
    // iPhone 13 main camera, 12 MP.
    expect(resizeTarget(4032, 3024)).toEqual({ width: 1280, height: 960 });
  });

  it('scales a portrait photo by its height', () => {
    expect(resizeTarget(3024, 4032)).toEqual({ width: 960, height: 1280 });
  });

  it('handles a square photo', () => {
    expect(resizeTarget(2000, 2000)).toEqual({ width: 1280, height: 1280 });
  });

  it('preserves the aspect ratio', () => {
    const out = resizeTarget(4000, 2250)!;
    expect(out.width / out.height).toBeCloseTo(4000 / 2250, 2);
  });

  it('leaves a photo that is already small enough alone', () => {
    expect(resizeTarget(800, 600)).toBeNull();
  });

  it('leaves a photo exactly at the limit alone', () => {
    expect(resizeTarget(MAX_EDGE, 720)).toBeNull();
  });

  it('resizes one pixel over the limit', () => {
    expect(resizeTarget(MAX_EDGE + 1, 720)).not.toBeNull();
  });

  it('never rounds a dimension down to zero', () => {
    // A panoramic shot along a row of hives: 0.4 px would round to 0, which
    // no image library accepts.
    const out = resizeTarget(5000, 2)!;
    expect(out.width).toBe(1280);
    expect(out.height).toBe(1);
  });

  it('respects a custom max edge', () => {
    expect(resizeTarget(2000, 1000, 500)).toEqual({ width: 500, height: 250 });
  });

  it('refuses nonsense dimensions rather than guessing', () => {
    expect(resizeTarget(0, 0)).toBeNull();
    expect(resizeTarget(-100, 200)).toBeNull();
    expect(resizeTarget(Number.NaN, 200)).toBeNull();
    expect(resizeTarget(Number.POSITIVE_INFINITY, 200)).toBeNull();
  });
});

describe('nextCompression', () => {
  it('walks down the ladder', () => {
    expect(nextCompression(0.7)).toBe(0.5);
    expect(nextCompression(0.5)).toBe(0.35);
  });

  it('stops at the bottom rather than destroying the photo', () => {
    expect(nextCompression(0.35)).toBeNull();
  });

  it('returns null for a quality that is not on the ladder', () => {
    expect(nextCompression(0.9)).toBeNull();
  });

  it('reaches every rung from the top', () => {
    const walked: number[] = [COMPRESSION_LADDER[0]];
    let step: number | null = COMPRESSION_LADDER[0];
    while ((step = nextCompression(step)) !== null) walked.push(step);
    expect(walked).toEqual([...COMPRESSION_LADDER]);
  });

  it('is ordered strictly downwards', () => {
    for (let i = 1; i < COMPRESSION_LADDER.length; i++) {
      expect(COMPRESSION_LADDER[i]).toBeLessThan(COMPRESSION_LADDER[i - 1]);
    }
  });
});

describe('isWithinBudget', () => {
  it('accepts a typical compressed frame photo', () => {
    expect(isWithinBudget(150 * 1024)).toBe(true);
  });

  it('accepts a file exactly on the limit', () => {
    expect(isWithinBudget(TARGET_BYTES)).toBe(true);
  });

  it('rejects one byte over', () => {
    expect(isWithinBudget(TARGET_BYTES + 1)).toBe(false);
  });

  it('rejects a full-resolution original', () => {
    expect(isWithinBudget(4 * 1024 * 1024)).toBe(false);
  });
});

describe('the storage budget as a whole', () => {
  it('keeps a heavy season inside a sane amount of phone storage', () => {
    // The number that matters to a beekeeper: 40 hives, inspected 8 times a
    // year, 3 photos each. This is the promise M6 is making.
    const photos = 40 * 8 * 3;
    const worstCaseBytes = photos * TARGET_BYTES;
    expect(worstCaseBytes / (1024 * 1024)).toBeLessThan(200);
  });
});
