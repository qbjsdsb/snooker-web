import * as THREE from 'three';
import { HALF_L, HALF_W, TABLE } from '../config/table.js';
import { createPockets } from '../physics/TableGeometry.js';

export class SceneRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a08);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 30);
    this.cameraMode = 'aim';
    this.ballMeshes = new Map();
    this.ballLastPositions = new Map();
    this.aimAngle = 0;
    this.cueBallPosition = { x: 0, z: 0 };
    this.powerPull = 0;
    this.guideVisible = true;

    this.#createLights();
    this.#createTable();
    this.#createAimGuide();
    this.#createCue();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
  }

  #createLights() {
    this.scene.add(new THREE.HemisphereLight(0xc8d4cc, 0x15130f, 0.58));
    const key = new THREE.DirectionalLight(0xfff2d8, 2.2);
    key.position.set(-1.5, 4.4, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 2.3;
    key.shadow.camera.bottom = -2.3;
    this.scene.add(key);
  }

  #createTable() {
    const root = new THREE.Group();
    this.tableRoot = root;
    this.scene.add(root);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE.length + 0.36, 0.16, TABLE.width + 0.36),
      new THREE.MeshStandardMaterial({ color: 0x4c2c1c, roughness: 0.5, metalness: 0.02 })
    );
    base.position.y = -0.12;
    base.castShadow = true;
    base.receiveShadow = true;
    root.add(base);

    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(TABLE.length, TABLE.width),
      new THREE.MeshStandardMaterial({ color: 0x18563a, roughness: 0.94, metalness: 0 })
    );
    cloth.rotation.x = -Math.PI / 2;
    cloth.position.y = 0.002;
    cloth.receiveShadow = true;
    root.add(cloth);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x23402d, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4126, roughness: 0.5 });
    const rails = [
      { w: TABLE.length + 0.16, d: TABLE.railWidth, x: 0, z: -HALF_W - TABLE.railWidth / 2 },
      { w: TABLE.length + 0.16, d: TABLE.railWidth, x: 0, z: HALF_W + TABLE.railWidth / 2 },
      { w: TABLE.railWidth, d: TABLE.width, x: -HALF_L - TABLE.railWidth / 2, z: 0 },
      { w: TABLE.railWidth, d: TABLE.width, x: HALF_L + TABLE.railWidth / 2, z: 0 },
    ];
    rails.forEach((r) => {
      const wood = new THREE.Mesh(new THREE.BoxGeometry(r.w + 0.06, 0.115, r.d + 0.06), woodMat);
      wood.position.set(r.x, 0.045, r.z);
      wood.castShadow = true;
      root.add(wood);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.07, r.d), railMat);
      cushion.position.set(r.x, 0.058, r.z);
      cushion.castShadow = true;
      root.add(cushion);
    });

    const pocketMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    for (const p of createPockets()) {
      const pocket = new THREE.Mesh(new THREE.CylinderGeometry(p.radius, p.radius * 0.82, 0.06, 28), pocketMat);
      pocket.position.set(p.x, -0.018, p.z);
      root.add(pocket);
    }

    this.#createTableMarks(root);
  }

  #createTableMarks(root) {
    const material = new THREE.LineBasicMaterial({ color: 0xc7d4ca, transparent: true, opacity: 0.46 });
    const baulkX = -HALF_L + TABLE.baulkDistance;
    const line = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(baulkX, 0.007, -HALF_W), new THREE.Vector3(baulkX, 0.007, HALF_W)
    ]);
    root.add(new THREE.Line(line, material));

    const curve = new THREE.EllipseCurve(baulkX, 0, TABLE.dRadius, TABLE.dRadius, Math.PI/2, -Math.PI/2, true, 0);
    const points = curve.getPoints(48).map((p) => new THREE.Vector3(p.x, 0.007, p.y));
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  #createAimGuide() {
    const material = new THREE.LineDashedMaterial({ color: 0xe9dec5, transparent: true, opacity: 0.65, dashSize: 0.055, gapSize: 0.035 });
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1,0,0)]);
    this.guide = new THREE.Line(geometry, material);
    this.guide.computeLineDistances();
    this.guide.position.y = 0.034;
    this.scene.add(this.guide);
  }

  #createCue() {
    const geo = new THREE.CylinderGeometry(0.009, 0.017, 1.55, 18);
    geo.rotateZ(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb98b52, roughness: 0.55 });
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
          new THREE.SphereGeometry(ball.radius, 30, 20),
          new THREE.MeshStandardMaterial({ color: ball.color, roughness: 0.22, metalness: 0.02 })
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.ballMeshes.set(ball.id, mesh);
      }
      mesh.visible = !ball.pocketed;
      if (!ball.pocketed) {
        const prev = this.ballLastPositions.get(ball.id) ?? { x: ball.position.x, z: ball.position.z };
        const dx = ball.position.x - prev.x;
        const dz = ball.position.z - prev.z;
        mesh.position.set(ball.position.x, ball.radius + 0.006, ball.position.z);
        const dist = Math.hypot(dx, dz);
        if (dist > 0.000001) {
          const axis = new THREE.Vector3(dz, 0, -dx).normalize();
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
    if (!cueBall) {
      this.guide.visible = false;
      this.cue.visible = false;
      return;
    }
    this.aimAngle = angle;
    this.cueBallPosition = { x: cueBall.position.x, z: cueBall.position.z };
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
      cueBall.position.z - dz * cueDist
    );
    this.cue.rotation.set(0, -angle, 0);
    this.cue.visible = visible;
  }

  setCameraMode(mode) { this.cameraMode = mode; }

  updateCamera(dt) {
    const p = this.cueBallPosition;
    const dx = Math.cos(this.aimAngle);
    const dz = Math.sin(this.aimAngle);
    let targetPos, lookAt;
    if (this.cameraMode === 'top') {
      targetPos = new THREE.Vector3(0, 5.25, 0.001);
      lookAt = new THREE.Vector3(0, 0, 0);
      this.camera.up.set(0, 0, -1);
    } else if (this.cameraMode === 'tactical') {
      targetPos = new THREE.Vector3(-0.25, 3.25, 3.45);
      lookAt = new THREE.Vector3(0.1, 0, 0);
      this.camera.up.set(0, 1, 0);
    } else {
      targetPos = new THREE.Vector3(p.x - dx * 1.42, 0.78, p.z - dz * 1.42);
      lookAt = new THREE.Vector3(p.x + dx * 0.65, 0.03, p.z + dz * 0.65);
      this.camera.up.set(0, 1, 0);
    }
    const t = 1 - Math.exp(-dt * 7.5);
    this.camera.position.lerp(targetPos, t);
    const currentDir = new THREE.Vector3();
    this.camera.getWorldDirection(currentDir);
    const currentLook = this.camera.position.clone().add(currentDir);
    currentLook.lerp(lookAt, t);
    this.camera.lookAt(currentLook);
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.renderer.setSize(rect.width, rect.height, false);
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
  }

  screenToTable(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, point)) return null;
    return { x: point.x, z: point.z };
  }

  render(dt) {
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
