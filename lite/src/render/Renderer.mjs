import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js'

import {
  BALL_RADIUS,
  TABLE_LENGTH,
  TABLE_WIDTH,
  CORNER_MOUTH,
} from '../physics/constants.mjs'
import { tableGeometry } from '../snooker/TableGeometry.mjs'

const CLOTH_Z = 0
const RAIL_H = 0.085
const CUSHION_W = 0.075
const WOOD_W = 0.135

function lineMaterial(color, opacity = 1) {
  return new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
}

function makeLine(material) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ])
  const line = new THREE.Line(geometry, material)
  line.visible = false
  return line
}

function updateLine(line, from, to, z = BALL_RADIUS * 0.6) {
  const position = line.geometry.attributes.position
  position.setXYZ(0, from.x, from.y, z)
  position.setXYZ(1, to.x, to.y, z)
  position.needsUpdate = true
  line.visible = true
}

export class Renderer {
  constructor(container) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0b100f)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = false
    container.appendChild(this.renderer.domElement)
    this.canvas = this.renderer.domElement

    this.camera = new THREE.OrthographicCamera(-2, 2, 1, -1, 0.1, 20)
    this.camera.up.set(0, 0, 1)
    this.camera.position.set(0, -4.8, 5.65)
    this.camera.lookAt(0, 0.05, 0)

    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.tablePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    this.hitPoint = new THREE.Vector3()

    this.ballMeshes = new Map()
    this.ballShadows = new Map()
    this.lastRotations = new Map()

    this.buildLighting()
    this.buildTable()
    this.buildGuide()
    this.buildCue()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
  }

  buildLighting() {
    this.scene.add(new THREE.HemisphereLight(0xeef7f2, 0x17201b, 1.8))
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(-1.5, -2.2, 5.8)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight(0x9fd8c1, 0.7)
    fill.position.set(2.4, 1.2, 3.4)
    this.scene.add(fill)
  }

  buildTable() {
    const group = new THREE.Group()
    this.scene.add(group)

    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE_LENGTH + 0.08, TABLE_WIDTH + 0.08, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x0c6748, roughness: 0.86, metalness: 0 })
    )
    cloth.position.z = -0.03
    group.add(cloth)

    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e1d16,
      roughness: 0.55,
      metalness: 0.02,
    })
    const cushionMaterial = new THREE.MeshStandardMaterial({
      color: 0x075039,
      roughness: 0.9,
      metalness: 0,
    })

    const halfL = TABLE_LENGTH / 2
    const halfW = TABLE_WIDTH / 2

    const addRail = (x, y, length, horizontal) => {
      const wood = new THREE.Mesh(
        new THREE.BoxGeometry(
          horizontal ? length : WOOD_W,
          horizontal ? WOOD_W : length,
          RAIL_H
        ),
        woodMaterial
      )
      wood.position.set(x, y, RAIL_H * 0.33)
      group.add(wood)

      const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(
          horizontal ? length : CUSHION_W,
          horizontal ? CUSHION_W : length,
          RAIL_H * 0.7
        ),
        cushionMaterial
      )
      cushion.position.set(
        x + (horizontal ? 0 : -Math.sign(x) * (WOOD_W - CUSHION_W) * 0.28),
        y + (horizontal ? -Math.sign(y) * (WOOD_W - CUSHION_W) * 0.28 : 0),
        RAIL_H * 0.31
      )
      group.add(cushion)
    }

    addRail(0, -halfW - WOOD_W * 0.45, TABLE_LENGTH + WOOD_W * 2, true)
    addRail(-halfL - WOOD_W * 0.45, 0, TABLE_WIDTH, false)

    // Top/right rails stop before the single prototype corner pocket.
    const topLength = TABLE_LENGTH - CORNER_MOUTH * 1.6
    addRail(-CORNER_MOUTH * 0.8, halfW + WOOD_W * 0.45, topLength, true)
    const rightLength = TABLE_WIDTH - CORNER_MOUTH * 1.6
    addRail(halfL + WOOD_W * 0.45, -CORNER_MOUTH * 0.8, rightLength, false)

    const pocket = new THREE.Mesh(
      new THREE.CircleGeometry(tableGeometry.pocket.captureRadius * 1.08, 40),
      new THREE.MeshBasicMaterial({ color: 0x030504 })
    )
    pocket.position.set(tableGeometry.pocket.center.x, tableGeometry.pocket.center.y, 0.002)
    group.add(pocket)

    for (const jaw of tableGeometry.pocket.jaws) {
      const jawMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(jaw.radius, jaw.radius, RAIL_H * 0.75, 28),
        cushionMaterial
      )
      jawMesh.rotation.x = Math.PI / 2
      jawMesh.position.set(jaw.center.x, jaw.center.y, RAIL_H * 0.28)
      group.add(jawMesh)
    }

    // Quiet tournament-room floor gives depth without moving the camera.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 8),
      new THREE.MeshStandardMaterial({ color: 0x111816, roughness: 1 })
    )
    floor.position.z = -0.11
    group.add(floor)
  }

  buildCue() {
    const cueMaterial = new THREE.MeshStandardMaterial({
      color: 0xc49a62,
      roughness: 0.52,
    })
    this.cue = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.013, 0.013), cueMaterial)
    this.cue.position.z = BALL_RADIUS * 0.95
    this.scene.add(this.cue)
  }

  buildGuide() {
    this.guideLine = makeLine(lineMaterial(0xe8f3ec, 0.56))
    this.objectLine = makeLine(lineMaterial(0xf4c6c9, 0.66))
    this.deflectionLine = makeLine(lineMaterial(0xb8d9cf, 0.42))
    this.scene.add(this.guideLine, this.objectLine, this.deflectionLine)

    this.ghost = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 20, 14),
      new THREE.MeshBasicMaterial({
        color: 0xf4f1e8,
        transparent: true,
        opacity: 0.20,
        depthWrite: false,
      })
    )
    this.ghost.visible = false
    this.scene.add(this.ghost)
  }

  ensureBall(ball) {
    if (this.ballMeshes.has(ball.id)) return
    const material = new THREE.MeshStandardMaterial({
      color: ball.color,
      roughness: 0.24,
      metalness: 0,
    })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 32, 22), material)
    this.scene.add(mesh)
    this.ballMeshes.set(ball.id, mesh)

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(BALL_RADIUS * 1.18, 28),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.20,
        depthWrite: false,
      })
    )
    shadow.position.z = 0.003
    this.scene.add(shadow)
    this.ballShadows.set(ball.id, shadow)
  }

  sync(game, dt = 0) {
    for (const ball of game.world.balls) {
      this.ensureBall(ball)
      const mesh = this.ballMeshes.get(ball.id)
      const shadow = this.ballShadows.get(ball.id)
      const sink = ball.pocketDepth * 0.16
      mesh.position.set(ball.pos.x, ball.pos.y, BALL_RADIUS - sink)
      shadow.position.set(ball.pos.x, ball.pos.y, 0.003)
      shadow.material.opacity = 0.20 * (1 - ball.pocketDepth)
      mesh.visible = ball.pocketDepth < 0.98
      shadow.visible = mesh.visible

      if (dt > 0 && ball.inMotion()) {
        const axis = new THREE.Vector3(ball.omega.x, ball.omega.y, ball.omega.z)
        const speed = axis.length()
        if (speed > 1e-5) {
          axis.normalize()
          mesh.rotateOnWorldAxis(axis, speed * dt)
        }
      }
    }

    const cueBall = game.cueBall
    const dirX = Math.cos(game.aimAngle)
    const dirY = Math.sin(game.aimAngle)
    const cueLength = 1.18
    this.cue.rotation.z = game.aimAngle
    this.cue.position.set(
      cueBall.pos.x - dirX * (cueLength * 0.5 + BALL_RADIUS * 1.35),
      cueBall.pos.y - dirY * (cueLength * 0.5 + BALL_RADIUS * 1.35),
      BALL_RADIUS * 0.92
    )
    this.cue.visible = game.canAim()

    this.syncGuide(game)
  }

  syncGuide(game) {
    this.guideLine.visible = false
    this.objectLine.visible = false
    this.deflectionLine.visible = false
    this.ghost.visible = false

    if (!game.canAim()) return
    const guide = game.aimGuide()
    if (!guide) return

    updateLine(this.guideLine, game.cueBall.pos, guide.end)

    if (guide.ghost) {
      this.ghost.position.set(guide.ghost.x, guide.ghost.y, BALL_RADIUS)
      this.ghost.visible = true
    }
    if (guide.objectPath) updateLine(this.objectLine, guide.objectPath.from, guide.objectPath.to)
    if (guide.cueDeflection) {
      updateLine(this.deflectionLine, guide.cueDeflection.from, guide.cueDeflection.to)
    }
  }

  screenToTable(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const point = this.raycaster.ray.intersectPlane(this.tablePlane, this.hitPoint)
    return point ? { x: point.x, y: point.y } : null
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(width, height, false)

    const aspect = width / height
    let viewHeight = 2.62
    let viewWidth = viewHeight * aspect
    const minWidth = 4.35
    if (viewWidth < minWidth) {
      viewWidth = minWidth
      viewHeight = viewWidth / aspect
    }

    this.camera.left = -viewWidth / 2
    this.camera.right = viewWidth / 2
    this.camera.top = viewHeight / 2
    this.camera.bottom = -viewHeight / 2
    this.camera.updateProjectionMatrix()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }
}
