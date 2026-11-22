export const measures = {
  compromise: 'Full session compromise',
  deviceBlock: 'Blocked by a registered-device policy',
  otherBlock: 'Blocked by MFA or another access policy',
};

export function filterRecords(records, { query = '', publisher = '', type = '' }) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return records.filter(record => {
    if (publisher && record.publisher !== publisher) return false;
    if (type && record.type !== type) return false;
    const haystack = [record.title, record.publisher, record.type, record.summary, ...record.topics].join(' ').toLowerCase();
    return terms.every(term => haystack.includes(term));
  }).sort((first, second) => second.date.localeCompare(first.date));
}

export function toCsv(rows) {
  return rows.map(row => row.map(cell => '"' + String(cell).replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
}

export function readFilters(hash) {
  const params = new URLSearchParams(hash.slice(1));
  return { query: (params.get('q') || '').slice(0, 200), publisher: params.get('publisher') || '', type: params.get('type') || '' };
}
