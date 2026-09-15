import { SnookerLiteGame } from './game/SnookerLiteGame.mjs'
import { Controls } from './input/Controls.mjs'
import { Renderer } from './render/Renderer.mjs'

const root = document.querySelector('#app')
const viewport = document.querySelector('#viewport')
const status = document.querySelector('#status')
const debug = document.querySelector('#debug')

const game = new SnookerLiteGame()
const renderer = new Renderer(viewport)
const controls = new Controls({
  game,
  renderer,
  root,
  onStatus: (text) => {
    status.textContent = text
  },
})

const debugEnabled = new URLSearchParams(location.search).get('debug') === '1'
debug.hidden = !debugEnabled

let last = performance.now()
let lastResult = null
let fpsClock = last
let fpsFrames = 0
let fps = 60

function formatBall(ball) {
  return `${ball.state}  v=${Math.hypot(ball.vel.x, ball.vel.y).toFixed(2)}m/s  spin=${ball.omega.z.toFixed(1)}`
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now

  game.update(dt)
  renderer.sync(game, dt)
  renderer.render()

  if (game.lastShotResult && game.lastShotResult !== lastResult) {
    lastResult = game.lastShotResult
    if (lastResult.redPotted && !lastResult.cuePotted) {
      status.textContent = '红球入袋。这个手感对了，再扩成完整斯诺克。'
    } else if (lastResult.cuePotted) {
      status.textContent = '白球落袋。按 R 或“重新摆球”再试。'
    } else {
      status.textContent = '球已停稳 · 可以继续微调角度、力度或杆法'
    }
    controls.syncUI()
  }

  fpsFrames++
  if (now - fpsClock >= 500) {
    fps = Math.round((fpsFrames * 1000) / (now - fpsClock))
    fpsFrames = 0
    fpsClock = now
    if (debugEnabled) {
      debug.innerHTML = `
        <strong>${fps} fps</strong>
        <span>step ${(game.fixedStep * 1000).toFixed(3)} ms</span>
        <span>白球 ${formatBall(game.cueBall)}</span>
        <span>红球 ${formatBall(game.redBall)}</span>
      `
    }
  }

  requestAnimationFrame(frame)
}

controls.syncUI()
renderer.sync(game, 0)
requestAnimationFrame(frame)
