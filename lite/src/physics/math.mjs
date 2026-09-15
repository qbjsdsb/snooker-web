export class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  set(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  copy(v) {
    this.x = v.x
    this.y = v.y
    this.z = v.z
    return this
  }

  clone() {
    return new Vec3(this.x, this.y, this.z)
  }

  add(v) {
    this.x += v.x
    this.y += v.y
    this.z += v.z
    return this
  }

  sub(v) {
    this.x -= v.x
    this.y -= v.y
    this.z -= v.z
    return this
  }

  scale(s) {
    this.x *= s
    this.y *= s
    this.z *= s
    return this
  }

  addScaled(v, s) {
    this.x += v.x * s
    this.y += v.y * s
    this.z += v.z * s
    return this
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }

  cross(v) {
    const x = this.y * v.z - this.z * v.y
    const y = this.z * v.x - this.x * v.z
    const z = this.x * v.y - this.y * v.x
    return this.set(x, y, z)
  }

  lengthSq() {
    return this.dot(this)
  }

  length() {
    return Math.sqrt(this.lengthSq())
  }

  normalize() {
    const l = this.length()
    if (l > 1e-12) this.scale(1 / l)
    return this
  }
}

export const UP = Object.freeze(new Vec3(0, 0, 1))

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function cross(a, b) {
  return a.clone().cross(b)
}

export function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function nearlyEqual(a, b, epsilon = 1e-9) {
  return Math.abs(a - b) <= epsilon
}
