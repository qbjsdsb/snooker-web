import { Ball, BallState } from '../physics/Ball.mjs'
import { BALL_RADIUS, FIXED_STEP } from '../physics/constants.mjs'
import { Vec3, clamp } from '../physics/math.mjs'
import { cueStrike } from '../physics/shot.mjs'
import { PhysicsWorld } from '../physics/World.mjs'

function makeRack() {
  const cue = new Ball({
    id: 0,
    kind: 'cue',
    color: 0xf4f1e8,
    x: 0.18,
    y: -0.34,
  })
  const red = new Ball({
    id: 1,
    kind: 'red',
    color: 0xb51f2e,
    x: 1.20,
    y: 0.45,
  })
  return [cue, red]
}

export class SnookerLiteGame {
  constructor() {
    this.fixedStep = FIXED_STEP
    this.accumulator = 0
    this.aimAngle = 0.63
    this.power = 0.38
    this.spin = { x: 0, y: 0 }
    this.guideEnabled = true
    this.shotActive = false
    this.lastShotResult = null
    this.reset()
  }

  reset() {
    const balls = makeRack()
    this.cueBall = balls[0]
    this.redBall = balls[1]
    this.world = new PhysicsWorld(balls)
    this.accumulator = 0
    this.shotActive = false
    this.lastShotResult = null
  }

  setAimFromPoint(x, y) {
    if (!this.canAim()) return
    const dx = x - this.cueBall.pos.x
    const dy = y - this.cueBall.pos.y
    if (dx * dx + dy * dy < 1e-8) return
    this.aimAngle = Math.atan2(dy, dx)
  }

  nudgeAim(deltaRadians) {
    if (!this.canAim()) return
    this.aimAngle += deltaRadians
  }

  setPower(value) {
    this.power = clamp(value, 0.02, 1)
  }

  setSpin(x, y) {
    const length = Math.hypot(x, y)
    const max = 0.45
    const scale = length > max ? max / length : 1
    this.spin.x = x * scale
    this.spin.y = y * scale
  }

  canAim() {
    return !this.shotActive && this.world.allStationary() && this.cueBall.onTable()
  }

  canShoot() {
    return this.canAim()
  }

  shoot() {
    if (!this.canShoot()) return false
    const strike = cueStrike({
      angle: this.aimAngle,
      power: this.power,
      spinX: this.spin.x,
      spinY: this.spin.y,
    })
    this.cueBall.vel.copy(strike.vel)
    this.cueBall.omega.copy(strike.omega)
    this.cueBall.state = BallState.SLIDING
    this.shotActive = true
    this.lastShotResult = null
    return true
  }

  update(realDt) {
    this.accumulator += Math.min(realDt, 0.05)
    let stepped = false

    while (this.accumulator >= this.fixedStep) {
      this.world.step(this.fixedStep)
      this.accumulator -= this.fixedStep
      stepped = true
    }

    if (stepped && this.shotActive && this.world.allStationary()) {
      this.shotActive = false
      this.lastShotResult = {
        redPotted: !this.redBall.onTable(),
        cuePotted: !this.cueBall.onTable(),
      }
    }
  }

  aimGuide() {
    if (!this.guideEnabled || !this.cueBall.onTable() || !this.redBall.onTable()) {
      return null
    }

    const dir = new Vec3(Math.cos(this.aimAngle), Math.sin(this.aimAngle), 0)
    const toRed = this.redBall.pos.clone().sub(this.cueBall.pos)
    const projection = toRed.dot(dir)
    const radius = 2 * BALL_RADIUS
    const perpendicularSq = Math.max(0, toRed.lengthSq() - projection * projection)
    const radiusSq = radius * radius

    if (projection <= 0 || perpendicularSq > radiusSq) {
      return {
        direction: dir,
        end: this.cueBall.pos.clone().addScaled(dir, 1.45),
        ghost: null,
        objectPath: null,
        cueDeflection: null,
      }
    }

    const contactDistance = projection - Math.sqrt(radiusSq - perpendicularSq)
    const ghost = this.cueBall.pos.clone().addScaled(dir, contactDistance)
    const objectDir = this.redBall.pos.clone().sub(ghost).normalize()
    const cueTangent = dir.clone().addScaled(objectDir, -dir.dot(objectDir))

    return {
      direction: dir,
      end: ghost.clone(),
      ghost,
      objectPath: {
        from: this.redBall.pos.clone(),
        to: this.redBall.pos.clone().addScaled(objectDir, 0.72),
      },
      cueDeflection:
        cueTangent.lengthSq() > 1e-6
          ? {
              from: ghost.clone(),
              to: ghost.clone().addScaled(cueTangent.normalize(), 0.38),
            }
          : null,
    }
  }
}
