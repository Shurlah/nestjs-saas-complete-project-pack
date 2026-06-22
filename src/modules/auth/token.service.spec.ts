import { parseDuration } from './token.service';

describe('parseDuration', () => {
  it.each([
    ['15m', 900_000],
    ['7d', 604_800_000],
    ['30s', 30_000],
    ['2h', 7_200_000],
  ])('parses %s', (value, expected) => {
    expect(parseDuration(value)).toBe(expected);
  });

  it('rejects ambiguous duration values', () => {
    expect(() => parseDuration('100')).toThrow('Unsupported duration');
  });
});
