// 부대끼리 끼임: 좁은 길에서 마주 오거나 앞에 선 아군이 있어도 서로 비켜 지나간다(tools/jamcase.mjs 장면)
import test from 'node:test';
import assert from 'node:assert/strict';
import { runCase } from '../tools/jamcase.mjs';

const ok = (name, lim) => { const r = runCase(name); for (const x of r) assert.ok(x.t != null && x.t <= lim, `${name}: ${x.ty}#${x.id} ${x.t == null ? '못 감 @' + x.at.join(',') : x.t + '초'}`); };
test('너비 1칸 길: 마주 오는 보병 두 분대가 서로 비켜 지나간다', () => ok('infHead1', 30));
test('너비 1칸 길: 서 있는 아군 분대를 지나간다', () => ok('infIdle1', 30));
test('너비 2칸 길: 마주 오는 보병과 전차가 엇갈린다(보병이 비킨다)', () => ok('infTank', 30));
test('너비 1칸 길: 서 있는 아군 보병을 전차·차량이 지나간다', () => ok('tankInf1', 25));
test('너비 2칸 길: 마주 오는 전차 둘이 오른쪽으로 비켜 엇갈린다', () => ok('tankHead', 22));
test('너비 2칸 길: 길 가운데 선 아군 전차 옆으로 차량이 지나간다', () => ok('tankIdle', 22));
