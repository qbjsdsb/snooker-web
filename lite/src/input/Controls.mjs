export class Controls {
  constructor({ game, renderer, root, onStatus }) {
    this.game = game
    this.renderer = renderer
    this.root = root
    this.onStatus = onStatus

    this.power = root.querySelector('#power')
    this.powerValue = root.querySelector('#powerValue')
    this.shoot = root.querySelector('#shoot')
    this.reset = root.querySelector('#reset')
    this.guide = root.querySelector('#guide')
    this.spinPad = root.querySelector('#spinPad')
    this.spinDot = root.querySelector('#spinDot')

    this.touchAimPointer = null
    this.spinPointer = null

    this.bind()
    this.syncUI()
  }

  bind() {
    const canvas = this.renderer.canvas

    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch' && event.pointerId !== this.touchAimPointer) return
      this.aimFromPointer(event)
    })

    canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') {
        this.touchAimPointer = event.pointerId
        canvas.setPointerCapture(event.pointerId)
      }
      this.aimFromPointer(event)
    })

    canvas.addEventListener('pointerup', (event) => {
      if (event.pointerId === this.touchAimPointer) this.touchAimPointer = null
    })
    canvas.addEventListener('pointercancel', (event) => {
      if (event.pointerId === this.touchAimPointer) this.touchAimPointer = null
    })

    canvas.addEventListener(
      'wheel',
      (event) => {
        if (!this.game.canAim()) return
        event.preventDefault()
        const next = this.game.power - Math.sign(event.deltaY) * 0.025
        this.game.setPower(next)
        this.syncPower()
      },
      { passive: false }
    )

    this.power.addEventListener('input', () => {
      this.game.setPower(Number(this.power.value) / 100)
      this.syncPower()
    })

    this.shoot.addEventListener('click', () => {
      if (this.game.shoot()) this.onStatus?.('击球中…')
      this.syncUI()
    })

    this.reset.addEventListener('click', () => {
      this.game.reset()
      this.onStatus?.('移动鼠标瞄准 · 调整力度 · 击球')
      this.syncUI()
    })

    this.guide.addEventListener('click', () => {
      this.game.guideEnabled = !this.game.guideEnabled
      this.guide.setAttribute('aria-pressed', String(this.game.guideEnabled))
      this.guide.classList.toggle('active', this.game.guideEnabled)
    })

    this.spinPad.addEventListener('pointerdown', (event) => {
      if (!this.game.canAim()) return
      this.spinPointer = event.pointerId
      this.spinPad.setPointerCapture(event.pointerId)
      this.updateSpin(event)
    })
    this.spinPad.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.spinPointer) this.updateSpin(event)
    })
    const endSpin = (event) => {
      if (event.pointerId === this.spinPointer) this.spinPointer = null
    }
    this.spinPad.addEventListener('pointerup', endSpin)
    this.spinPad.addEventListener('pointercancel', endSpin)
    this.spinPad.addEventListener('dblclick', () => {
      this.game.setSpin(0, 0)
      this.syncSpin()
    })

    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const fine = event.shiftKey ? 0.00045 : 0.0018
        this.game.nudgeAim((event.key === 'ArrowLeft' ? 1 : -1) * fine)
      } else if (event.key === ' ') {
        event.preventDefault()
        if (this.game.shoot()) this.onStatus?.('击球中…')
      } else if (event.key.toLowerCase() === 'r') {
        this.game.reset()
        this.onStatus?.('已重新摆球')
      } else if (event.key.toLowerCase() === 'g') {
        this.game.guideEnabled = !this.game.guideEnabled
        this.syncUI()
      }
    })
  }

  aimFromPointer(event) {
    if (!this.game.canAim()) return
    const point = this.renderer.screenToTable(event.clientX, event.clientY)
    if (point) this.game.setAimFromPoint(point.x, point.y)
  }

  updateSpin(event) {
    const rect = this.spinPad.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let nx = (event.clientX - cx) / (rect.width / 2)
    let ny = -(event.clientY - cy) / (rect.height / 2)
    const length = Math.hypot(nx, ny)
    if (length > 0.82) {
      nx *= 0.82 / length
      ny *= 0.82 / length
    }
    this.game.setSpin(nx * 0.45, ny * 0.45)
    this.syncSpin()
  }

  syncPower() {
    const percent = Math.round(this.game.power * 100)
    this.power.value = String(percent)
    this.powerValue.textContent = `${percent}%`
  }

  syncSpin() {
    const x = this.game.spin.x / 0.45
    const y = this.game.spin.y / 0.45
    this.spinDot.style.left = `${50 + x * 41}%`
    this.spinDot.style.top = `${50 - y * 41}%`
  }

  syncUI() {
    this.syncPower()
    this.syncSpin()
    const enabled = this.game.canAim()
    this.shoot.disabled = !this.game.canShoot()
    this.power.disabled = !enabled
    this.spinPad.classList.toggle('disabled', !enabled)
    this.guide.classList.toggle('active', this.game.guideEnabled)
    this.guide.setAttribute('aria-pressed', String(this.game.guideEnabled))
  }
}
