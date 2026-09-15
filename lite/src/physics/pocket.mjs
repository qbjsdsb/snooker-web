import { BallState } from './Ball.mjs'
import { CORNER_MOUTH, CENTER_LIMIT_X, CENTER_LIMIT_Y } from './constants.mjs'
import { distance2D } from './math.mjs'
import { tableGeometry } from '../snooker/TableGeometry.mjs'

export function tryCapturePocket(ball) {
  if (!ball.onTable()) return false

  const pocket = tableGeometry.pocket
  const inThroat =
    ball.pos.x > CENTER_LIMIT_X - CORNER_MOUTH * 0.72 &&
    ball.pos.y > CENTER_LIMIT_Y - CORNER_MOUTH * 0.72

  if (!inThroat) return false
  if (distance2D(ball.pos, pocket.center) >= pocket.captureRadius) return false

  ball.state = BallState.POCKETED
  ball.vel.scale(0.18)
  ball.omega.scale(0.35)
  ball.pocketDepth = 0
  return true
}

export function advancePocketed(ball, dt) {
  if (ball.state !== BallState.POCKETED) return
  ball.pocketDepth = Math.min(1, ball.pocketDepth + dt * 3.4)
}
