// Snooker Lite uses metres, seconds and kilograms.
// Playing-area dimensions follow WPBSA nominal 12 ft table dimensions.
export const TABLE_LENGTH = 3.569
export const TABLE_WIDTH = 1.778
export const BALL_RADIUS = 0.02625
export const BALL_DIAMETER = BALL_RADIUS * 2
export const BALL_MASS = 0.142
export const BALL_INERTIA = (2 / 5) * BALL_MASS * BALL_RADIUS * BALL_RADIUS
export const G = 9.81

// Tunable cloth / collision parameters. Values are deliberately isolated here
// so calibration can happen without rewriting the solver.
export const SLIDING_MU = 0.18
export const ROLLING_MU = 0.007
export const SPIN_DECAY = 0.52
export const BALL_RESTITUTION = 0.925
export const CUSHION_RESTITUTION = 0.80
export const CUSHION_FRICTION = 0.18

export const MAX_CUE_SPEED = 5.4
export const MAX_SPIN_OFFSET = 0.45
export const FIXED_STEP = 1 / 512

// One-pocket vertical-slice geometry. These are prototype tuning values,
// intentionally separated from official playing-area dimensions.
export const CORNER_MOUTH = 0.090
export const JAW_RADIUS = 0.034
export const POCKET_CAPTURE_RADIUS = 0.071
export const POCKET_CENTER_OFFSET = 0.055

export const CENTER_LIMIT_X = TABLE_LENGTH / 2 - BALL_RADIUS
export const CENTER_LIMIT_Y = TABLE_WIDTH / 2 - BALL_RADIUS
