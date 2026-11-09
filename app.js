const list = document.querySelector('#list');
const search = document.querySelector('#search');
const year = document.querySelector('#year');
const sort = document.querySelector('#sort');
const count = document.querySelector('#count');
let lectures = [];

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const getYear = value => String(value ?? '').match(/\b(?:19|20)\d{2}\b/)?.[0] || 'undated';
const isVideo = url => /\.(?:mp4|mov|mkv|avi|wmv|webm|m4v|mpg|mpeg|vob|mts|m2ts)(?:\?|$)/i.test(url || '');

function normalizeLikely(item, index) {
  const foundYear = getYear(item.path);
  return {
    n: 55 + index,
    id: `likely-${item.id}`,
    filename: item.filename,
    text: '',
    title: item.filename,
    summary: 'Machine transcript and summary; attribution requires human review.',
    duration: Number(item.duration_seconds) || 0,
    date: foundYear === 'undated' ? '' : foundYear,
    year: foundYear,
    audio: item.media.replace(/\.wma$/i, '.mp3'),
    transcript: item.transcript ? `g-raid4-likely/${item.transcript}` : null,
    summaryUrl: item.summary ? `g-raid4-likely/${item.summary}` : null,
    path: item.path,
    unverified: true
  };
}

function player(item) {
  const title = esc(item.title);
  const source = esc(item.audio);
  if (isVideo(item.audio)) return `<video controls preload="none" src="${source}" aria-label="Play ${title}"></video>`;
  return `<audio controls preload="none" src="${source}" aria-label="Play ${title}"></audio>`;
}

function render() {
  const query = search.value.trim().toLocaleLowerCase();
  let rows = lectures.filter(item => {
    const yearMatch = year.value === 'all' || (year.value === 'likely' ? item.unverified : item.year === year.value);
    const searchable = [item.title, item.summary, item.text, item.filename, item.path].join(' ').toLocaleLowerCase();
    return yearMatch && (!query || searchable.includes(query));
  });
  if (sort.value === 'title') rows.sort((a, b) => a.title.localeCompare(b.title));
  if (sort.value === 'short') rows.sort((a, b) => a.duration - b.duration);
  if (sort.value === 'new') rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  count.textContent = `${rows.length} of ${lectures.length} recordings`;
  list.innerHTML = rows.length ? rows.map((item, index) => `<article class="lecture${item.unverified ? ' unverified' : ''}" id="${esc(item.id)}">
    <span class="number">${String(index + 1).padStart(2, '0')}</span>
    <div>
      <p class="meta">${esc(item.date || 'Undated')} · ${(item.duration / 60).toFixed(1)} min${item.unverified ? ' · Likely attribution' : ''}</p>
      <h3>${item.url ? `<a href="${esc(item.url)}">${esc(item.title)}</a>` : esc(item.title)}${item.unverified ? ' <span class="question" title="Likely attribution; not verified">?</span>' : ''}</h3>
      <p>${esc(item.summary)}</p>
      <p class="resource-links">
        ${item.url ? `<a class="read-link" href="${esc(item.url)}">Open lecture & full transcript ↗</a>` : ''}
        ${item.transcript ? `<a class="read-link" href="${esc(item.transcript)}" target="_blank" rel="noopener">Read transcript ↗</a>` : ''}
        ${item.summaryUrl ? `<a class="read-link" href="${esc(item.summaryUrl)}" target="_blank" rel="noopener">Read summary ↗</a>` : ''}
      </p>
    </div>
    ${player(item)}
  </article>`).join('') : '<div class="empty"><h3>No matching recordings</h3><p>Try another search or choose all years.</p><button id="reset">Clear filters</button></div>';
  document.querySelector('#reset')?.addEventListener('click', () => { search.value = ''; year.value = 'all'; render(); });
}

[search, year, sort].forEach(element => element.addEventListener(element === search ? 'input' : 'change', render));
document.addEventListener('play', event => {
  if (!['AUDIO', 'VIDEO'].includes(event.target.tagName)) return;
  document.querySelectorAll('audio, video').forEach(media => { if (media !== event.target) media.pause(); });
}, true);

Promise.all([
  fetch('lectures.json?v=20261109').then(response => { if (!response.ok) throw Error('Could not load curated index'); return response.json(); }),
  fetch('g-raid4-likely/catalog.json?v=20261109').then(response => { if (!response.ok) throw Error('Could not load likely index'); return response.json(); })
]).then(([curated, likely]) => {
  lectures = [...curated.map(item => ({...item, unverified: false})), ...likely.map(normalizeLikely)];
  render();
}).catch(error => {
  count.textContent = 'Collection unavailable';
  list.innerHTML = `<p>The collection index could not load (${esc(error.message)}). Please reload the page.</p>`;
});
