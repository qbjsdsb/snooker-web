import {
  BALL_INERTIA,
  BALL_MASS,
  BALL_RADIUS,
  CENTER_LIMIT_X,
  CENTER_LIMIT_Y,
  CUSHION_FRICTION,
  CUSHION_RESTITUTION,
} from './constants.mjs'
import { BallState } from './Ball.mjs'
import { Vec3, clamp } from './math.mjs'
import {
  isInsidePocketMouthForRightRail,
  isInsidePocketMouthForTopRail,
  tableGeometry,
} from '../snooker/TableGeometry.mjs'

function contactVelocity(ball, arm) {
  return ball.vel.clone().add(ball.omega.clone().cross(arm))
}

function applyCushionImpulse(ball, inwardNormal) {
  const n = inwardNormal.clone().normalize()
  const r = n.clone().scale(-BALL_RADIUS)
  const contact = contactVelocity(ball, r)
  const vn = contact.dot(n)
  if (vn >= 0) return false

  const jn = -(1 + CUSHION_RESTITUTION) * vn * BALL_MASS
  const tangent = new Vec3(-n.y, n.x, 0)
  const vt = contact.dot(tangent)
  const tangentInvMass = 1 / BALL_MASS + (BALL_RADIUS * BALL_RADIUS) / BALL_INERTIA
  const idealJt = -vt / tangentInvMass
  const jt = clamp(
    idealJt,
    -CUSHION_FRICTION * Math.abs(jn),
    CUSHION_FRICTION * Math.abs(jn)
  )

  const impulse = n.clone().scale(jn).addScaled(tangent, jt)
  ball.vel.addScaled(impulse, 1 / BALL_MASS)
  ball.omega.addScaled(r.clone().cross(impulse), 1 / BALL_INERTIA)
  ball.state = BallState.SLIDING
  return true
}

function resolveRail(ball, axis, limit, sign, openMouth) {
  const coord = axis === 'x' ? ball.pos.x : ball.pos.y
  if (sign * coord <= limit) return false
  if (openMouth(ball)) return false

  if (axis === 'x') ball.pos.x = sign * limit
  else ball.pos.y = sign * limit

  const n = axis === 'x' ? new Vec3(-sign, 0, 0) : new Vec3(0, -sign, 0)
  return applyCushionImpulse(ball, n)
}

function resolveJaw(ball, jaw) {
  const dx = ball.pos.x - jaw.center.x
  const dy = ball.pos.y - jaw.center.y
  const effectiveRadius = jaw.radius + BALL_RADIUS
  const d2 = dx * dx + dy * dy
  if (d2 >= effectiveRadius * effectiveRadius) return false

  const d = Math.sqrt(Math.max(d2, 1e-12))
  const n = new Vec3(dx / d, dy / d, 0)
  ball.pos.x = jaw.center.x + n.x * effectiveRadius
  ball.pos.y = jaw.center.y + n.y * effectiveRadius
  return applyCushionImpulse(ball, n)
}

export function resolveTableContacts(ball) {
  if (!ball.onTable()) return []
  const hits = []

  if (resolveRail(ball, 'x', CENTER_LIMIT_X, -1, () => false)) hits.push('left')
  if (
    resolveRail(
      ball,
      'x',
      CENTER_LIMIT_X,
      1,
      (b) => isInsidePocketMouthForRightRail(b.pos.y)
    )
  ) hits.push('right')
  if (resolveRail(ball, 'y', CENTER_LIMIT_Y, -1, () => false)) hits.push('bottom')
  if (
    resolveRail(
      ball,
      'y',
      CENTER_LIMIT_Y,
      1,
      (b) => isInsidePocketMouthForTopRail(b.pos.x)
    )
  ) hits.push('top')

  for (const jaw of tableGeometry.pocket.jaws) {
    if (resolveJaw(ball, jaw)) hits.push(jaw.id)
  }

  return hits
}
