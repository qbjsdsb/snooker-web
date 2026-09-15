import assert from 'node:assert/strict';
import { aimDeltaFromPixels, clampSensitivity, normalizeAngle } from '../src/input/aimMath.js';

assert.equal(clampSensitivity(-10), 0.35, 'sensitivity should clamp low');
assert.equal(clampSensitivity(99), 1.8, 'sensitivity should clamp high');
assert.equal(clampSensitivity('bad'), 1, 'invalid sensitivity should fall back');

const normal = aimDeltaFromPixels(40, 1, false);
const fine = aimDeltaFromPixels(40, 1, true);
assert(normal > 0, 'rightward mouse movement should rotate aim positively');
assert(fine > 0 && fine < normal * 0.2, 'fine aim should be much slower than normal aim');
assert.equal(aimDeltaFromPixels(-40, 1, false), -normal, 'aim response should be symmetric');

const wrappedPositive = normalizeAngle(Math.PI * 3);
const wrappedNegative = normalizeAngle(-Math.PI * 3);
assert(Math.abs(wrappedPositive - Math.PI) < 1e-9, 'positive angles should wrap into [-pi, pi]');
assert(Math.abs(wrappedNegative - Math.PI) < 1e-9, 'negative angles should wrap consistently');

console.log('Input/camera smoke tests passed: sensitivity / fine aim / angle wrapping');
