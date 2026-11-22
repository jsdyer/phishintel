import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterRecords, readFilters, toCsv } from '../web/model.mjs';

const readData = name => JSON.parse(readFileSync(new URL('../web/data/' + name + '.json', import.meta.url)));
const index = readData('advisories');
const study = readData('outcomes');

test('publications have unique identifiers, dated sources and descriptive fields', () => {
  const sources = new Set(['www.canada.ca', 'www.cyber.gc.ca', 'www.rcmp.ca', 'antifraudcentre-centreantifraude.ca', 'competition-bureau.canada.ca']);
  assert.equal(new Set(index.records.map(row => row.id)).size, index.records.length);
  for (const row of index.records) {
    assert.match(row.date, /^\d{4}-\d\d-\d\d$/);
    assert.ok(row.date <= index.reviewed);
    const url = new URL(row.url);
    assert.ok(url.protocol === 'https:' && sources.has(url.hostname));
    assert.ok(row.publisher && row.summary && row.type && row.dateLabel && row.topics.length);
  }
});

test('search combines words, topics and facet filters', () => {
  assert.deepEqual(filterRecords(index.records, { query: 'checkout ticket', publisher: 'Competition Bureau Canada', type: 'Guidance' }).map(row => row.id), ['tickets']);
  assert.equal(filterRecords(index.records, { query: 'nonsense777' }).length, 0);
  assert.ok(filterRecords(index.records, {})[0].date >= index.records.at(-1).date);
});

test('study entries follow the published date range and cumulative categories', () => {
  assert.equal(study.quarters.length, 10);
  assert.equal(study.quarters[0].period, '2023 Q1');
  assert.deepEqual(study.quarters.at(-1), {period:'2025 Q2', otherBlock:35.9, deviceBlock:58, compromise:6.1});
  for (const row of study.quarters) {
    assert.ok(Math.abs(row.otherBlock + row.deviceBlock + row.compromise - 100) < 0.12);
  }
});

test('bookmarks decode and exports escape punctuation', () => {
  assert.deepEqual(readFilters('#q=QR+codes&type=Guidance'), {query:'QR codes', type:'Guidance', publisher:''});
  assert.equal(toCsv([['one, two','quote "word"']]), '"one, two","quote ""word"""\r\n');
});
