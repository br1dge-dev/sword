export type DeltaSampler = {
  lastSampleMs: number;
  prevValue: number;
  delta: number;
};

/**
 * Sample a delta on a fixed time window to keep thresholds stable even when the render/update rate changes.
 */
export function sampleDelta(state: DeltaSampler, nowMs: number, value: number, windowMs: number) {
  if (state.lastSampleMs < 0) {
    state.lastSampleMs = nowMs;
    state.prevValue = value;
    state.delta = 0;
    return state.delta;
  }
  if (nowMs - state.lastSampleMs >= windowMs) {
    state.delta = value - state.prevValue;
    state.prevValue = value;
    state.lastSampleMs = nowMs;
  }
  return state.delta;
}

export type Cooldown = {
  lastFireMs: number;
};

export function canFireCooldown(state: Cooldown, nowMs: number, minGapMs: number) {
  return state.lastFireMs < 0 || nowMs - state.lastFireMs >= minGapMs;
}

export function markFired(state: Cooldown, nowMs: number) {
  state.lastFireMs = nowMs;
}


