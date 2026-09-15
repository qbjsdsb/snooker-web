// Phase 0 deliberately keeps rules minimal. This class is the future boundary for
// score, ball-on, fouls, respots and frame state so rules never leak into physics.
export class SnookerRules {
  constructor() {
    this.score = { player: 0, opponent: 0 };
    this.phase = 'lab';
  }

  reset() {
    this.score.player = 0;
    this.score.opponent = 0;
    this.phase = 'lab';
  }
}
