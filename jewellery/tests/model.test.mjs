import test from 'node:test';
import assert from 'node:assert/strict';
import {planPlacement,occupied,distance,catalogue} from '../model.js';
test('mirror placement is symmetric and produces two parts',()=>{const positions=planPlacement('round8',.2,[],450,true);assert.equal(positions.length,2);assert.ok(Math.abs(positions[0]+positions[1]-1)<1e-10);});
test('pendants always snap to centre and cannot stack',()=>{assert.deepEqual(planPlacement('pendant',.4,[],450,true),[0]);assert.equal(planPlacement('pendant',.2,[{catalogueId:'pendant',t:0}],450,true),null);});
test('collision placement shifts away from occupied location',()=>{const existing=[{catalogueId:'round12',t:.2}];const positions=planPlacement('round12',.2,existing,450,false);assert.ok(positions);assert.ok(distance(positions[0],.2)*450>=13);});
test('occupied length uses threading width, not pendant height',()=>{assert.equal(occupied([{catalogueId:'pendant'},{catalogueId:'disc'},{catalogueId:'round12'}]),20);});
test('centre mirror cannot duplicate itself',()=>{assert.deepEqual(planPlacement('round8',0,[],450,true),[0]);});
test('catalogue dimensions contain no appearance data',()=>{for(const p of catalogue){assert.ok(p.dimensions.width>0);assert.ok(p.hole.diameter>0);assert.equal(p.colour,undefined);assert.equal(p.material,undefined);}});

