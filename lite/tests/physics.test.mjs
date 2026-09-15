import test from 'node:test'
import assert from 'node:assert/strict'

import { Ball, BallState } from '../src/physics/Ball.mjs'
import {
  BALL_RADIUS,
  CENTER_LIMIT_X,
  CENTER_LIMIT_Y,
  CORNER_MOUTH,
  FIXED_STEP,
} from '../src/physics/constants.mjs'
import { resolveBallCollision } from '../src/physics/collision.mjs'
import { resolveTableContacts } from '../src/physics/cushion.mjs'
import { advanceBall, contactSlipSpeed } from '../src/physics/motion.mjs'
import { cueStrike } from '../src/physics/shot.mjs'
import { PhysicsWorld } from '../src/physics/World.mjs'
import { tableGeometry } from '../src/snooker/TableGeometry.mjs'
import { SnookerLiteGame } from '../src/game/SnookerLiteGame.mjs'

test('cue strike: top/back spin and side spin have opposite signs', () => {
  const top = cueStrike({ angle: 0, power: 0.5, spinY: 0.35 })
  const back = cueStrike({ angle: 0, power: 0.5, spinY: -0.35 })
  const right = cueStrike({ angle: 0, power: 0.5, spinX: 0.35 })
  const left = cueStrike({ angle: 0, power: 0.5, spinX: -0.35 })

  assert.ok(top.omega.y > 0)
  assert.ok(back.omega.y < 0)
  assert.ok(right.omega.z < 0)
  assert.ok(left.omega.z > 0)
})

test('center strike transitions from sliding toward rolling', () => {
  const ball = new Ball({ id: 0 })
  const strike = cueStrike({ angle: 0, power: 0.42 })
  ball.vel.copy(strike.vel)
  ball.omega.copy(strike.omega)
  ball.state = BallState.SLIDING

  const initialSlip = contactSlipSpeed(ball)
  for (let i = 0; i < 2 / FIXED_STEP; i++) advanceBall(ball, FIXED_STEP)

  assert.ok(contactSlipSpeed(ball) < initialSlip)
  assert.ok(ball.state === BallState.ROLLING || ball.state === BallState.STATIONARY)
})

test('head-on ball collision transfers momentum forward', () => {
  const a = new Ball({ id: 0, x: 0, y: 0 })
  const b = new Ball({ id: 1, x: 2 * BALL_RADIUS, y: 0 })
  a.vel.x = 1.5
  a.state = BallState.SLIDING

  const impact = resolveBallCollision(a, b)
  assert.ok(impact > 1)
  assert.ok(b.vel.x > 1)
  assert.ok(a.vel.x < b.vel.x)
})

test('right cushion reacts differently to opposite side spin', () => {
  const make = (spin) => {
    const ball = new Ball({ id: 0, x: CENTER_LIMIT_X + 0.001, y: 0 })
    ball.vel.set(1.1, 0, 0)
    ball.omega.z = spin
    ball.state = BallState.SLIDING
    resolveTableContacts(ball)
    return ball
  }

  const a = make(24)
  const b = make(-24)
  assert.ok(a.vel.x < 0)
  assert.ok(b.vel.x < 0)
  assert.ok(Math.sign(a.vel.y) === -Math.sign(b.vel.y))
  assert.ok(Math.abs(a.vel.y - b.vel.y) > 0.02)
})

test('corner jaw produces a physical rebound instead of instant pocketing', () => {
  const jaw = tableGeometry.pocket.jaws[0]
  const ball = new Ball({
    id: 0,
    x: jaw.center.x,
    y: jaw.center.y - jaw.radius - BALL_RADIUS + 0.001,
  })
  ball.vel.set(0.25, 0.9, 0)
  ball.state = BallState.SLIDING

  const hits = resolveTableContacts(ball)
  assert.ok(hits.includes('top-jaw'))
  assert.ok(ball.vel.y < 0.9)
  assert.ok(ball.onTable())
})

test('ball entering the corner throat is captured by the pocket', () => {
  const startX = CENTER_LIMIT_X - CORNER_MOUTH * 0.25
  const startY = CENTER_LIMIT_Y - CORNER_MOUTH * 0.25
  const ball = new Ball({ id: 0, x: startX, y: startY })
  const toPocket = tableGeometry.pocket.center.clone().sub(ball.pos).normalize()
  ball.vel.copy(toPocket.scale(0.75))
  ball.state = BallState.SLIDING
  const world = new PhysicsWorld([ball])

  for (let i = 0; i < 1 / FIXED_STEP && ball.onTable(); i++) world.step(FIXED_STEP)
  assert.equal(ball.state, BallState.POCKETED)
})

test('fixed-step simulation is deterministic for identical shots', () => {
  const run = () => {
    const game = new SnookerLiteGame()
    game.aimAngle = 0.63
    game.power = 0.47
    game.spin = { x: 0.12, y: -0.16 }
    assert.equal(game.shoot(), true)
    for (let i = 0; i < 8 * 60; i++) game.update(1 / 60)
    return game.world.balls.map((b) => [
      b.pos.x,
      b.pos.y,
      b.vel.x,
      b.vel.y,
      b.omega.z,
      b.state,
    ])
  }

  assert.deepEqual(run(), run())
})
