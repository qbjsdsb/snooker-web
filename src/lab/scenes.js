import { BALL_COLORS, HALF_L, TABLE } from '../config/table.js';

const b = (id, kind, color, x, z) => ({ id, kind, color, x, z, radius: TABLE.ballRadius });

export const LAB_SCENES = [
  {
    id: 'stun', name: '定杆', description: '正碰测试：中心击球观察碰撞后白球停顿。',
    power: 44, spin: { top: 0, side: 0 }, aimAt: 'red-1',
    balls: [b('cue','cue',BALL_COLORS.cue,-0.80,0), b('red-1','red',BALL_COLORS.red,0.05,0), b('black','black',BALL_COLORS.black,0.82,0.28)]
  },
  {
    id: 'follow', name: '跟杆', description: '高杆测试：白球撞红球后继续向前。',
    power: 50, spin: { top: 0.74, side: 0 }, aimAt: 'red-1',
    balls: [b('cue','cue',BALL_COLORS.cue,-0.90,0), b('red-1','red',BALL_COLORS.red,0.02,0), b('black','black',BALL_COLORS.black,0.95,-0.32)]
  },
  {
    id: 'draw', name: '拉杆', description: '低杆测试：白球撞红球后尝试回拉。',
    power: 58, spin: { top: -0.92, side: 0 }, aimAt: 'red-1',
    balls: [b('cue','cue',BALL_COLORS.cue,-0.82,0), b('red-1','red',BALL_COLORS.red,0.02,0), b('black','black',BALL_COLORS.black,0.86,0.35)]
  },
  {
    id: 'thin', name: '薄球', description: '改变瞄准，观察目标球与白球分离角。',
    power: 42, spin: { top: 0.10, side: 0 }, aimPoint: { x: 0.08, z: -0.026 },
    balls: [b('cue','cue',BALL_COLORS.cue,-0.88,0.20), b('red-1','red',BALL_COLORS.red,0.04,0), b('black','black',BALL_COLORS.black,1.1,-0.40)]
  },
  {
    id: 'cushion', name: '吃库', description: '左右塞测试：相同入射方向下观察库后线路变化。',
    power: 52, spin: { top: 0.08, side: 0.78 }, aimPoint: { x: 0.65, z: -0.86 },
    balls: [b('cue','cue',BALL_COLORS.cue,-0.70,0.30), b('red-1','red',BALL_COLORS.red,0.80,0.32), b('black','black',BALL_COLORS.black,1.18,-0.20)]
  },
  {
    id: 'pocket', name: '袋口', description: '袋角与落袋测试：微调瞄准观察进袋或弹袋。',
    power: 34, spin: { top: 0.10, side: 0 }, aimAt: 'red-1',
    balls: [b('cue','cue',BALL_COLORS.cue,0.5224,0.0693), b('red-1','red',BALL_COLORS.red,1.15,0.48), b('black','black',BALL_COLORS.black,-0.95,-0.28)]
  },
];

export function cloneScene(scene) {
  return {
    ...scene,
    spin: { ...scene.spin },
    aimPoint: scene.aimPoint ? { ...scene.aimPoint } : null,
    balls: scene.balls.map((x) => ({ ...x })),
  };
}
