import { advanceBall } from './motion.mjs'
import { resolveBallCollision, timeToBallCollision } from './collision.mjs'
import { resolveTableContacts } from './cushion.mjs'
import { advancePocketed, tryCapturePocket } from './pocket.mjs'

export class PhysicsWorld {
  constructor(balls = []) {
    this.balls = balls
    this.time = 0
    this.lastEvents = []
  }

  allStationary() {
    return this.balls.every((b) => !b.inMotion())
  }

  step(dt) {
    this.lastEvents = []
    let remaining = dt
    let guard = 0

    while (remaining > 1e-8 && guard++ < 12) {
      let hit = null
      let hitTime = remaining + 1

      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const a = this.balls[i]
          const b = this.balls[j]
          const t = timeToBallCollision(a, b, remaining)
          if (t !== null && t < hitTime) {
            hit = { a, b }
            hitTime = t
          }
        }
      }

      const chunk = hit ? Math.max(0, Math.min(hitTime, remaining)) : remaining
      if (chunk > 1e-8) this.advanceChunk(chunk)

      if (hit) {
        const speed = resolveBallCollision(hit.a, hit.b)
        this.lastEvents.push({ type: 'ball-ball', speed, a: hit.a.id, b: hit.b.id })
        // Nudge time forward so a just-resolved touching pair cannot pin the loop.
        const epsilon = Math.min(remaining - chunk, 1e-7)
        if (epsilon > 0) this.advanceChunk(epsilon)
        remaining -= chunk + Math.max(0, epsilon)
      } else {
        remaining = 0
      }
    }

    if (guard >= 12 && remaining > 1e-8) this.advanceChunk(remaining)
    this.time += dt
  }

  advanceChunk(dt) {
    for (const ball of this.balls) {
      if (ball.inMotion()) advanceBall(ball, dt)
      else advancePocketed(ball, dt)
    }

    for (const ball of this.balls) {
      if (!ball.onTable()) continue
      const contacts = resolveTableContacts(ball)
      for (const contact of contacts) {
        this.lastEvents.push({ type: 'cushion', ball: ball.id, contact })
      }
      if (tryCapturePocket(ball)) {
        this.lastEvents.push({ type: 'pocket', ball: ball.id })
      }
    }
  }
}
