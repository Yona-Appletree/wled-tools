import { describe, expect, it } from 'vitest';
import { dateFilenamePart } from './date-filename-part.ts';

describe('dateFilenamePart', () => {
  it('returns a sortable date string', () => {
    const date = new Date('2021-01-01 12:34:56');
    expect(dateFilenamePart(date)).toEqual('2021-01-01T12-34-56');
  });
});
