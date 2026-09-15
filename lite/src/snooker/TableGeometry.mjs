import {
  BALL_RADIUS,
  CENTER_LIMIT_X,
  CENTER_LIMIT_Y,
  CORNER_MOUTH,
  JAW_RADIUS,
  POCKET_CAPTURE_RADIUS,
  POCKET_CENTER_OFFSET,
  TABLE_LENGTH,
  TABLE_WIDTH,
} from '../physics/constants.mjs'
import { Vec3 } from '../physics/math.mjs'

export const tableGeometry = Object.freeze({
  playingLength: TABLE_LENGTH,
  playingWidth: TABLE_WIDTH,
  centerLimitX: CENTER_LIMIT_X,
  centerLimitY: CENTER_LIMIT_Y,
  ballRadius: BALL_RADIUS,
  // Vertical slice: one tuned top-right corner pocket.
  pocket: Object.freeze({
    mouth: CORNER_MOUTH,
    center: new Vec3(
      CENTER_LIMIT_X + POCKET_CENTER_OFFSET,
      CENTER_LIMIT_Y + POCKET_CENTER_OFFSET,
      0
    ),
    captureRadius: POCKET_CAPTURE_RADIUS,
    jaws: Object.freeze([
      Object.freeze({
        id: 'top-jaw',
        center: new Vec3(
          CENTER_LIMIT_X - CORNER_MOUTH,
          CENTER_LIMIT_Y + JAW_RADIUS,
          0
        ),
        radius: JAW_RADIUS,
      }),
      Object.freeze({
        id: 'right-jaw',
        center: new Vec3(
          CENTER_LIMIT_X + JAW_RADIUS,
          CENTER_LIMIT_Y - CORNER_MOUTH,
          0
        ),
        radius: JAW_RADIUS,
      }),
    ]),
  }),
})

export function isInsidePocketMouthForTopRail(x) {
  return x > CENTER_LIMIT_X - CORNER_MOUTH
}

export function isInsidePocketMouthForRightRail(y) {
  return y > CENTER_LIMIT_Y - CORNER_MOUTH
}
