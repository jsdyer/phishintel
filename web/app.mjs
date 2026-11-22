import { filterRecords, measures, readFilters, toCsv } from './model.mjs';

const byId = id => document.getElementById(id);
const dateFormat = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' });
const displayDate = date => dateFormat.format(new Date(date + 'T12:00:00Z'));
const { query, publisher, type } = Object.fromEntries(['query', 'publisher', 'type'].map(id => [id, byId(id)]));

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value !== undefined) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function citationCard(record) {
  const article = element('article', undefined, 'record');
  const meta = element('div', undefined, 'record-meta');
  meta.append(element('span', record.type, 'kind'), element('span', record.dateLabel + ' ' + displayDate(record.date)));
  const body = element('div');
  const heading = element('h3');
  const link = element('a', record.title);
  link.href = record.url;
  heading.append(link);
  body.append(element('p', record.publisher, 'publisher'), heading, element('p', record.summary), element('div', record.topics.join(' · '), 'topics'));
  article.append(meta, body);
  return article;
}

function download(name, rows) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = element('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setupIndex(data) {
  let visible = [];
  for (const [select, field] of [[publisher, 'publisher'], [type, 'type']]) {
    const choices = [...new Set(data.records.map(record => record[field]))].sort();
    for (const choice of choices) select.add(new Option(choice, choice));
  }
  function render() {
    visible = filterRecords(data.records, { query: query.value, publisher: publisher.value, type: type.value });
    byId('count').textContent = visible.length + ' of ' + data.records.length + ' publications';
    const cards = visible.map(citationCard);
    byId('records').replaceChildren(...(cards.length ? cards : [element('p', 'No publications match these filters. Try another term or reset the filters.', 'empty')]));
    byId('export-index').disabled = visible.length === 0;
  }
  function restore() {
    const filters = readFilters(location.hash);
    query.value = filters.query;
    for (const [select, value] of [[publisher, filters.publisher], [type, filters.type]]) {
      select.value = [...select.options].some(option => option.value === value) ? value : '';
    }
    render();
  }
  function apply() {
    const params = new URLSearchParams();
    if (query.value.trim()) params.set('q', query.value.trim());
    if (publisher.value) params.set('publisher', publisher.value);
    if (type.value) params.set('type', type.value);
    const url = new URL(location.href);
    url.hash = params.toString();
    history.replaceState(null, '', url);
    render();
  }
  restore();
  byId('reviewed').textContent = 'Sources reviewed ' + displayDate(data.reviewed);
  query.addEventListener('input', apply);
  publisher.addEventListener('change', apply);
  type.addEventListener('change', apply);
  byId('filters').addEventListener('submit', event => { event.preventDefault(); apply(); });
  byId('reset').addEventListener('click', () => { byId('filters').reset(); apply(); });
  window.addEventListener('hashchange', restore);
  byId('export-index').addEventListener('click', () => {
    const cols = ['title', 'publisher', 'date', 'dateLabel', 'type', 'topics', 'summary', 'url'];
    download('phishintel-publications.csv', [cols, ...visible.map(record => cols.map(col => col === 'topics' ? record.topics.join(' | ') : record[col]))]);
  });
}

function setupStudy(study) {
  const metric = byId('metric');
  const chart = byId('chart');
  const rows = study.quarters;
  function plot() {
    const key = metric.value;
    const maximum = Math.ceil(Math.max(...rows.map(row => row[key])) / 10) * 10;
    const bars = element('div', undefined, 'bars');
    for (const row of rows) {
      const column = element('div', undefined, 'column');
      const bar = element('div', undefined, 'bar');
      const value = element('span', row[key] + '%');
      bar.style.height = (row[key] / maximum * 100) + '%';
      bar.append(value);
      column.append(bar, element('small', row.period.split(' ')[1]));
      bars.append(column);
    }
    const years = element('div', undefined, 'years');
    const yearCounts = new Map();
    for (const row of rows) {
      const year = row.period.slice(0, 4);
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    }
    years.style.gridTemplateColumns = [...yearCounts.values()].map(count => count + 'fr').join(' ');
    for (const year of yearCounts.keys()) years.append(element('span', year));
    chart.replaceChildren(bars, years);
    chart.setAttribute('aria-label', measures[key] + ', cumulative share. ' + rows.map(row => row.period + ', ' + row[key] + '%').join('. '));
  }
  for (const row of rows) {
    const tr = element('tr');
    const th = element('th', row.period);
    th.scope = 'row';
    tr.append(th, ...[row.otherBlock, row.deviceBlock, row.compromise].map(value => element('td', value + '%')));
    byId('quarters').append(tr);
  }
  metric.addEventListener('change', plot);
  plot();
  const button = byId('export-study');
  button.disabled = false;
  button.addEventListener('click', () => download('phishintel-cyber-centre-figure-7.csv', [
    ['through_quarter', 'blocked_mfa_or_other_policy_pct', 'blocked_registered_device_policy_pct', 'full_session_compromise_pct', 'basis', 'population', 'source_url'],
    ...rows.map(r => [r.period, r.otherBlock, r.deviceBlock, r.compromise, study.basis, study.population, study.source]),
  ]));
}

async function loadData(name) {
  const response = await fetch('./data/' + name + '.json');
  if (!response.ok) throw new Error('Failed to read ' + name);
  return response.json();
}

loadData('outcomes').then(setupStudy).catch(() => {
  byId('chart').textContent = 'Study values could not be loaded. Open the source above or reload to try again.';
  byId('metric').disabled = true;
});
loadData('advisories').then(setupIndex).catch(() => {
  byId('count').textContent = 'The publication index could not be loaded. Reload to try again.';
});
