import { describe, expect, it } from 'vitest';
import { levelFromRms } from '../system/micLevel';

describe('microphone level', () => {
  it('maps loudness to 0..1: a quiet room is empty, speaking up close is full', () => {
    expect(levelFromRms(0)).toBe(0);
    expect(levelFromRms(0.001)).toBe(0); // -60 dBFS: silence
    expect(levelFromRms(0.03)).toBeGreaterThan(0.4); // about -30 dBFS: normal speech
    expect(levelFromRms(0.03)).toBeLessThan(0.8);
    expect(levelFromRms(0.2)).toBe(1); // -14 dBFS and louder
    expect(levelFromRms(1)).toBe(1);
  });

  it('grows with the loudness', () => {
    let prev = -1;
    for (let rms = 0.001; rms <= 0.3; rms *= 1.3) {
      const l = levelFromRms(rms);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
  });
});
