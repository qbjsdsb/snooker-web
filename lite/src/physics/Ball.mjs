import { Vec3 } from './math.mjs'

export const BallState = Object.freeze({
  STATIONARY: 'stationary',
  SLIDING: 'sliding',
  ROLLING: 'rolling',
  POCKETED: 'pocketed',
})

export class Ball {
  constructor({ id, kind = 'object', x = 0, y = 0, color = 0xffffff }) {
    this.id = id
    this.kind = kind
    this.color = color
    this.pos = new Vec3(x, y, 0)
    this.vel = new Vec3()
    this.omega = new Vec3()
    this.state = BallState.STATIONARY
    this.pocketDepth = 0
  }

  inMotion() {
    return this.state === BallState.SLIDING || this.state === BallState.ROLLING
  }

  onTable() {
    return this.state !== BallState.POCKETED
  }

  stop() {
    this.vel.set(0, 0, 0)
    this.omega.set(0, 0, 0)
    this.state = BallState.STATIONARY
  }

  clone() {
    const b = new Ball({ id: this.id, kind: this.kind, color: this.color })
    b.pos.copy(this.pos)
    b.vel.copy(this.vel)
    b.omega.copy(this.omega)
    b.state = this.state
    b.pocketDepth = this.pocketDepth
    return b
  }
}
