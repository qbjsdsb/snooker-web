# Snooker Web — Phase 0 Physics & Feel Lab

一个开源的高品质网页斯诺克项目。当前阶段优先验证击球手感、球体运动、旋转、碰撞、库边与袋口，再逐步扩展标准 22 球、完整斯诺克规则、AI 与比赛模式。

**在线试玩：** https://qbjsdsb.github.io/snooker-web/

## 当前实现

- WPBSA 比赛区域比例：3569 × 1778 mm
- 52.5 mm 球径
- Three.js 3D 球台、球体、灯光和阴影
- 固定 `1/240s` 物理步长
- 球-球碰撞
- 带开口的库边碰撞
- 简化袋角 jaw 碰撞与落袋判定
- 白球高杆 / 低杆 / 左右塞第一版模型
- 鼠标/触屏瞄准
- 拖动蓄力松手击球 + 力量滑杆
- 瞄准 / 战术 / 俯视三镜头
- 6 个 Physics Lab 测试场景：定杆、跟杆、拉杆、薄球、吃库、袋口
- `physics / game / rendering / input / rules / lab` 分层

## 本地运行

无需安装运行时依赖。Three.js 通过 import map 从 jsDelivr 载入。

```bash
npm start
```

然后访问：

```text
http://127.0.0.1:4173
```

运行物理自检：

```bash
npm test
```

## 自动部署

`main` 每次 push 都会运行物理 smoke tests，并通过 GitHub Actions 自动部署到 GitHub Pages。

GitHub Pages 首次启用时，请在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。之后不需要重复设置。

## 当前明确是近似模型的部分

- 高低杆和左右塞用于验证连续手感，目前不宣称达到 Mathavan / Han 论文级精度。
- 袋口几何已不只是“圆形触发器”，但 jaw、shelf 与 rattling 仍需继续校准。
- 暂无跳球、扎杆、自由球、foul and a miss、完整计分和 AI。

## Roadmap

1. 标准球测试校准定杆 / 跟杆 / 拉杆距离曲线。
2. 提升 pocket jaw / shelf 几何，完善 rattling / jaw rejection。
3. 将运动状态进一步拆为 sliding → rolling → spinning → stationary。
4. 加入动态碰撞、库边、击球和落袋音效。
5. 扩展为标准 22 球并进入 Snooker Rules v0.1。
6. 加入可解释的斯诺克 AI、安全球与难度误差模型。

## License

MIT
