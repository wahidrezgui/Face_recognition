import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildZoneSvgLines,
  buildZoneSvgMarkup,
  normalizeZone,
  normalizeZoneColor,
} from './zoneStyleCore.js';

test('normalizeZoneColor handles named and hex colors', () => {
  assert.equal(normalizeZoneColor('green'), '#008000');
  assert.equal(normalizeZoneColor('#abc'), '#AABBCC');
});

test('normalizeZone defaults missing pattern fields', () => {
  assert.deepEqual(normalizeZone({ color: '#FF0000' }), {
    color: '#FF0000',
    pattern_type: 'none',
    pattern_color: null,
  });
});

test('buildZoneSvgLines renders line and cross patterns', () => {
  const lineZone = normalizeZone({
    color: '#FF0000',
    pattern_type: 'line',
    pattern_color: '#FFFF00',
  });
  const crossZone = normalizeZone({
    color: '#FF0000',
    pattern_type: 'cross',
    pattern_color: '#FFFF00',
  });

  const lineMarkup = buildZoneSvgLines(lineZone);
  const crossMarkup = buildZoneSvgLines(crossZone);

  assert.match(lineMarkup, /stroke="#FFFF00"/);
  assert.equal((lineMarkup.match(/<line /g) || []).length, 1);
  assert.equal((crossMarkup.match(/<line /g) || []).length, 2);
});

test('buildZoneSvgMarkup includes background rect', () => {
  const markup = buildZoneSvgMarkup({
    color: '#FF0000',
    pattern_type: 'cross',
    pattern_color: '#FFFF00',
  });

  assert.match(markup, /<rect[^>]+fill="#FF0000"/);
  assert.match(markup, /<svg[^>]+viewBox="0 0 25 20"/);
});
