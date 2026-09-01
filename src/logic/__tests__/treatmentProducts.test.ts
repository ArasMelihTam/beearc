import {
  findCustomProduct,
  forgetCustomProduct,
  isUsableName,
  normalizeName,
  parseCustomProducts,
  rememberCustomProduct,
  serializeCustomProducts,
  type CustomProduct,
} from '../treatmentProducts';

const p = (name: string, durationDays: number | null = null, withdrawalDays: number | null = null): CustomProduct => ({
  name,
  durationDays,
  withdrawalDays,
});

describe('normalizeName', () => {
  test('ignores case and surrounding space', () => {
    expect(normalizeName('  Apiguard ')).toBe(normalizeName('apiguard'));
  });

  test('folds all four Turkish i-forms together', () => {
    // The trap this guards: 'APIVAR'.toLocaleLowerCase('tr') is 'apıvar'
    // with a DOTLESS i, so without folding, "APIVAR" and "Apivar" would be
    // remembered as two different products and the chip list would sprout
    // duplicates the beekeeper never asked for.
    const forms = ['APIVAR', 'Apivar', 'apivar', 'APIVAR'.toLocaleLowerCase('tr')];
    expect(new Set(forms.map(normalizeName)).size).toBe(1);
    expect(normalizeName('İLAÇ')).toBe(normalizeName('ilaç'));
  });

  test('collapses runs of inner whitespace', () => {
    expect(normalizeName('Bee  Vital')).toBe(normalizeName('Bee Vital'));
  });
});

describe('isUsableName', () => {
  test('rejects empty and whitespace-only names', () => {
    expect(isUsableName('')).toBe(false);
    expect(isUsableName('   ')).toBe(false);
    expect(isUsableName('Apiguard')).toBe(true);
  });
});

describe('parseCustomProducts', () => {
  test('round-trips through serialize', () => {
    const list = [p('Apiguard', 28, 28), p('Bee Vital', 14, null)];
    expect(parseCustomProducts(serializeCustomProducts(list))).toEqual(list);
  });

  test('empty and missing input give an empty list', () => {
    expect(parseCustomProducts(null)).toEqual([]);
    expect(parseCustomProducts(undefined)).toEqual([]);
    expect(parseCustomProducts('')).toEqual([]);
  });

  test('corrupt JSON is dropped, never thrown', () => {
    // A broken setting must not stop a beekeeper recording a treatment.
    expect(parseCustomProducts('{not json')).toEqual([]);
    expect(parseCustomProducts('"a string"')).toEqual([]);
    expect(parseCustomProducts('42')).toEqual([]);
  });

  test('entries without a usable name are skipped', () => {
    const raw = JSON.stringify([{ name: '  ' }, { durationDays: 5 }, null, 7, { name: 'Ok' }]);
    expect(parseCustomProducts(raw).map((x) => x.name)).toEqual(['Ok']);
  });

  test('non-numeric durations become null rather than NaN', () => {
    const raw = JSON.stringify([{ name: 'X', durationDays: 'twenty', withdrawalDays: null }]);
    expect(parseCustomProducts(raw)).toEqual([p('X')]);
  });

  test('duplicates collapse to the first occurrence', () => {
    const raw = JSON.stringify([p('Apiguard', 28), p('APIGUARD', 99)]);
    expect(parseCustomProducts(raw)).toEqual([p('Apiguard', 28)]);
  });
});

describe('rememberCustomProduct', () => {
  test('adds a new product at the front — most recently used, first to hand', () => {
    const list = rememberCustomProduct([p('Old')], p('New', 21));
    expect(list.map((x) => x.name)).toEqual(['New', 'Old']);
  });

  test('re-saving updates the numbers instead of duplicating', () => {
    const list = rememberCustomProduct([p('Apiguard', 28, 28)], p('apiguard', 14, 7));
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(p('apiguard', 14, 7));
  });

  test('re-saving adopts the new spelling', () => {
    // If you decide it is "Apiguard" and not "apiguard", the list follows.
    expect(rememberCustomProduct([p('apiguard')], p('Apiguard'))[0].name).toBe('Apiguard');
  });

  test('trims the stored name', () => {
    expect(rememberCustomProduct([], p('  Apiguard  '))[0].name).toBe('Apiguard');
  });

  test('an unusable name is not remembered', () => {
    expect(rememberCustomProduct([p('Keep')], p('   '))).toEqual([p('Keep')]);
  });
});

describe('findCustomProduct', () => {
  test('matches regardless of case and space', () => {
    expect(findCustomProduct([p('Apiguard', 28)], ' APIGUARD ')?.durationDays).toBe(28);
  });

  test('returns null for an unknown or empty name', () => {
    expect(findCustomProduct([p('Apiguard')], 'Apivar')).toBeNull();
    expect(findCustomProduct([p('Apiguard')], '  ')).toBeNull();
  });
});

describe('forgetCustomProduct', () => {
  test('removes the matching entry and leaves the rest', () => {
    const list = forgetCustomProduct([p('A'), p('B')], 'a');
    expect(list.map((x) => x.name)).toEqual(['B']);
  });

  test('forgetting something absent changes nothing', () => {
    expect(forgetCustomProduct([p('A')], 'Z')).toEqual([p('A')]);
  });
});
