import * as THREE from 'three';
import { HALF_L, HALF_W, TABLE } from '../config/table.js';
import { createPockets } from '../physics/TableGeometry.js';
import { CameraRig } from './CameraRig.js';

export class SceneRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a08);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.maxPixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.35));
    this.pixelRatio = this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.cameraRig = new CameraRig();
    this.ballMeshes = new Map();
    this.ballLastPositions = new Map();
    this.aimAngle = 0;
    this.cueBallPosition = { x: 0, z: 0 };
    this.powerPull = 0;
    this.guideVisible = true;
    this.lowFpsSamples = 0;
    this.highFpsSamples = 0;

    this.#createLights();
    this.#createTable();
    this.#createAimGuide();
    this.#createCue();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
  }

  #createLights() {
    this.scene.add(new THREE.HemisphereLight(0xc8d4cc, 0x15130f, 0.62));
    const key = new THREE.DirectionalLight(0xfff2d8, 2.05);
    key.position.set(-1.5, 4.4, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 2.3;
    key.shadow.camera.bottom = -2.3;
    key.shadow.bias = -0.00012;
    this.scene.add(key);
  }

  #createTable() {
    const root = new THREE.Group();
    this.tableRoot = root;
    this.scene.add(root);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.length + 0.36, 0.16, TABLE.width + 0.36),
      new THREE.MeshStandardMaterial({ color: 0x3e2418, roughness: 0.62, metalness: 0.01 })
    );
    base.position.y = -0.12;
    base.receiveShadow = true;
    root.add(base);

    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE.length, TABLE.width),
      new THREE.MeshStandardMaterial({ color: 0x18563a, roughness: 0.96, metalness: 0 })
    );
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.y = 0.002;
    cloth.receiveShadow = true;
    root.add(cloth);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x1f3929, roughness: 0.76 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a351f, roughness: 0.62 });
    const rails = [
      { w: TABLE.length + 0.16, d: TABLE.railWidth, x: 0, z: -HALF_W - TABLE.railWidth / 2 },
      { w: TABLE.length + 0.16, d: TABLE.railWidth, x: 0, z: HALF_W + TABLE.railWidth / 2 },
      { w: TABLE.railWidth, d: TABLE.width, x: -HALF_L - TABLE.railWidth / 2, z: 0 },
      { w: TABLE.railWidth, d: TABLE.width, x: HALF_L + TABLE.railWidth / 2, z: 0 },
    ];
    rails.forEach((r) => {
      const wood = new THREE.Mesh(new THREE.BoxGeometry(r.w + 0.06, 0.105, r.d + 0.06), woodMat);
      wood.position.set(r.x, 0.04, r.z);
      wood.receiveShadow = true;
      root.add(wood);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.065, r.d), railMat);
      cushion.position.set(r.x, 0.055, r.z);
      cushion.castShadow = true;
      root.add(cushion);
    });

    const pocketMat = new THREE.MeshStandardMaterial({ color: 0x030403, roughness: 1 });
    for (const p of createPockets()) {
      const pocket = new THREE.Mesh(new THREE.CylinderGeometry(p.radius, p.radius * 0.82, 0.055, 24), pocketMat);
      pocket.position.set(p.x, -0.018, p.z);
      root.add(pocket);
    }

    this.#createTableMarks(root);
  }

  #createTableMarks(root) {
    const material = new THREE.LineBasicMaterial({ color: 0xc7d4ca, transparent: true, opacity: 0.42 });
    const baulkX = -HALF_L + TABLE.baulkDistance;
    const line = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(baulkX, 0.007, -HALF_W),
      new THREE.Vector3(baulkX, 0.007, HALF_W),
    ]);
    root.add(new THREE.Line(line, material));

    const curve = new THREE.EllipseCurve(baulkX, 0, TABLE.dRadius, TABLE.dRadius, Math.PI / 2, -Math.PI / 2, true, 0);
    const points = curve.getPoints(48).map((p) => new THREE.Vector3(p.x, 0.007, p.y));
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  #createAimGuide() {
    const material = new THREE.LineDashedMaterial({
      color: 0xe9dec5,
      transparent: true,
      opacity: 0.58,
      dashSize: 0.055,
      gapSize: 0.035,
    });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(1, 0, 0),
    ]);
    this.guide = new THREE.Line(geometry, material);
    this.guide.computeLineDistances();
    this.guide.position.y = 0.034;
    this.scene.add(this.guide);
  }

  #createCue() {
    const geo = new THREE.CylinderGeometry(0.009, 0.017, 1.55, 14);
    geo.rotateZ(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb98b52, roughness: 0.58 });
    this.cue = new THREE.Mesh(geo, mat);
    this.cue.castShadow = true;
    this.scene.add(this.cue);
  }

  syncBalls(balls) {
    const active = new Set();
    for (const ball of balls) {
      active.add(ball.id);
      let mesh = this.ballMeshes.get(ball.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(ball.radius, 24, 16),
          new THREE.MeshStandardMaterial({ color: ball.color, roughness: 0.2, metalness: 0.01 })
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.ballMeshes.set(ball.id, mesh);
      }

      mesh.visible = !ball.pocketed;
      if (!ball.pocketed) {
        const prev = this.ballLastPositions.get(ball.id) ?? ball.position;
        const dx = ball.position.x - prev.x;
        const dz = ball.position.z - prev.z;
        mesh.position.set(ball.position.x, ball.radius + 0.006, ball.position.z);
        const dist = Math.hypot(dx, dz);
        if (dist > 0.000001) {
          const inv = 1 / dist;
          const axis = new THREE.Vector3(dz * inv, 0, -dx * inv);
          mesh.rotateOnWorldAxis(axis, dist / ball.radius);
        }
        this.ballLastPositions.set(ball.id, { x: ball.position.x, z: ball.position.z });
      }
    }

    for (const [id, mesh] of this.ballMeshes) {
      if (!active.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.ballMeshes.delete(id);
        this.ballLastPositions.delete(id);
      }
    }
  }

  setAim(cueBall, angle, pull = 0, visible = true) {
    this.cameraRig.setAimContext(cueBall, angle);
    if (!cueBall) {
      this.guide.visible = false;
      this.cue.visible = false;
      return;
    }

    this.aimAngle = angle;
    this.cueBallPosition.x = cueBall.position.x;
    this.cueBallPosition.z = cueBall.position.z;
    this.powerPull = pull;
    this.guideVisible = visible;

    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    const len = 1.45;
    const pos = this.guide.geometry.attributes.position;
    pos.setXYZ(0, cueBall.position.x + dx * (cueBall.radius + 0.02), 0, cueBall.position.z + dz * (cueBall.radius + 0.02));
    pos.setXYZ(1, cueBall.position.x + dx * len, 0, cueBall.position.z + dz * len);
    pos.needsUpdate = true;
    this.guide.computeLineDistances();
    this.guide.visible = visible;

    const cueDist = 0.86 + pull * 0.34;
    this.cue.position.set(
      cueBall.position.x - dx * cueDist,
      0.075,
      cueBall.position.z - dz * cueDist,
    );
    this.cue.rotation.set(0, -angle, 0);
    this.cue.visible = visible;
  }

  setCameraMode(mode) {
    this.cameraRig.setMode(mode);
  }

  setStableCamera(value) {
    this.cameraRig.setStable(value);
  }

  setMomentaryTop(active) {
    this.cameraRig.setMomentaryTop(active);
  }

  beginShotView(cueBall, angle) {
    this.cameraRig.beginShot(cueBall, angle);
  }

  endShotView() {
    this.cameraRig.endShot();
  }

  reportFrameRate(fps) {
    if (!Number.isFinite(fps)) return;
    if (fps < 47 && this.pixelRatio > 1.001) {
      this.lowFpsSamples += 1;
      this.highFpsSamples = 0;
      if (this.lowFpsSamples >= 3) {
        this.#setPixelRatio(this.pixelRatio - 0.15);
        this.lowFpsSamples = 0;
      }
      return;
    }

    if (fps > 58 && this.pixelRatio < this.maxPixelRatio - 0.01) {
      this.highFpsSamples += 1;
      this.lowFpsSamples = 0;
      if (this.highFpsSamples >= 8) {
        this.#setPixelRatio(this.pixelRatio + 0.1);
        this.highFpsSamples = 0;
      }
      return;
    }

    this.lowFpsSamples = 0;
    this.highFpsSamples = 0;
  }

  #setPixelRatio(value) {
    const next = Math.max(1, Math.min(this.maxPixelRatio, value));
    if (Math.abs(next - this.pixelRatio) < 0.01) return;
    this.pixelRatio = next;
    this.renderer.setPixelRatio(next);
    this.resize();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.renderer.setSize(rect.width, rect.height, false);
    this.cameraRig.resize(rect.width, rect.height);
  }

  render(dt) {
    this.cameraRig.update(dt);
    this.renderer.render(this.scene, this.cameraRig.camera);
  }
}
