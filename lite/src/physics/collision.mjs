import { BallState } from './Ball.mjs'
import {
  BALL_INERTIA,
  BALL_MASS,
  BALL_RADIUS,
  BALL_RESTITUTION,
} from './constants.mjs'
import { Vec3, clamp } from './math.mjs'

export function timeToBallCollision(a, b, maxT) {
  if (!a.onTable() || !b.onTable()) return null

  const px = b.pos.x - a.pos.x
  const py = b.pos.y - a.pos.y
  const vx = b.vel.x - a.vel.x
  const vy = b.vel.y - a.vel.y
  const diameter = 2 * BALL_RADIUS

  const A = vx * vx + vy * vy
  const B = 2 * (px * vx + py * vy)
  const C = px * px + py * py - diameter * diameter

  if (C <= 0) return 0
  if (A < 1e-12 || B >= 0) return null

  const discriminant = B * B - 4 * A * C
  if (discriminant < 0) return null

  const t = (-B - Math.sqrt(discriminant)) / (2 * A)
  if (t < -1e-9 || t > maxT + 1e-9) return null
  return Math.max(0, t)
}

function contactVelocity(ball, arm) {
  return ball.vel.clone().add(ball.omega.clone().cross(arm))
}

export function resolveBallCollision(a, b) {
  const n = new Vec3(b.pos.x - a.pos.x, b.pos.y - a.pos.y, 0)
  const distance = n.length()
  if (distance < 1e-10) n.set(1, 0, 0)
  else n.scale(1 / distance)

  const rA = n.clone().scale(BALL_RADIUS)
  const rB = n.clone().scale(-BALL_RADIUS)
  const vA = contactVelocity(a, rA)
  const vB = contactVelocity(b, rB)
  const relative = vB.sub(vA)
  const relNormal = relative.dot(n)

  // Already separating: only remove geometric overlap.
  if (relNormal >= 0) {
    separateOverlap(a, b, n, distance)
    return 0
  }

  const inverseMassSum = 2 / BALL_MASS
  const jn = -((1 + BALL_RESTITUTION) * relNormal) / inverseMassSum

  const tangent = relative.clone().addScaled(n, -relNormal)
  const tangentSpeed = tangent.length()
  let tangentDir = new Vec3()
  let jt = 0

  if (tangentSpeed > 1e-9) {
    tangentDir = tangent.scale(1 / tangentSpeed)
    const dynamicFriction = 0.01 + 0.108 * Math.exp(-1.088 * tangentSpeed)
    const tangentInverseMass =
      2 / BALL_MASS + (2 * BALL_RADIUS * BALL_RADIUS) / BALL_INERTIA
    const idealJt = -tangentSpeed / tangentInverseMass
    jt = clamp(idealJt, -dynamicFriction * jn, dynamicFriction * jn)
  }

  const impulse = n.clone().scale(jn).addScaled(tangentDir, jt)

  // A receives -J, B receives +J.
  a.vel.addScaled(impulse, -1 / BALL_MASS)
  b.vel.addScaled(impulse, 1 / BALL_MASS)

  const torqueA = rA.clone().cross(impulse.clone().scale(-1))
  const torqueB = rB.clone().cross(impulse)
  a.omega.addScaled(torqueA, 1 / BALL_INERTIA)
  b.omega.addScaled(torqueB, 1 / BALL_INERTIA)

  a.state = BallState.SLIDING
  b.state = BallState.SLIDING
  separateOverlap(a, b, n, distance)
  return Math.abs(relNormal)
}

function separateOverlap(a, b, normal, distance) {
  const overlap = 2 * BALL_RADIUS - distance
  if (overlap <= 0) return
  const correction = overlap * 0.5005
  a.pos.addScaled(normal, -correction)
  b.pos.addScaled(normal, correction)
}
