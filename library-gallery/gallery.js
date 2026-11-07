import { libraries } from './libraries.js';

const byId = id => document.getElementById(id);
const gallery = byId('gallery');
const image = byId('library-photo');
const photoFrame = byId('photo-frame');
const credit = byId('photo-credit');
const license = byId('photo-license');
const marks = [...byId('route-marks').children];
let currentIndex = 0;
let attempt = 0;

function formatStop(index) {
  return String(index + 1).padStart(2, '0');
}

function imageState(state) {
  photoFrame.dataset.state = state;
  byId('photo-loading').hidden = state !== 'loading';
  byId('photo-error').hidden = state !== 'error';
}

function loadPhoto(library) {
  imageState('loading');
  image.alt = library.alt;
  image.src = './' + library.photo + (attempt ? '?retry=' + attempt : '');
}

function renderFacts(facts) {
  byId('library-facts').replaceChildren(...facts.map((fact, index) => {
    const row = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'fact-index';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = formatStop(index);
    const body = document.createElement('div');
    const paragraph = document.createElement('p');
    paragraph.textContent = fact.text;
    const source = document.createElement('a');
    source.href = fact.url;
    source.textContent = fact.source + ' ↗';
    body.append(paragraph, source);
    row.append(number, body);
    return row;
  }));
}

function showLibrary(index, updateAddress = false) {
  currentIndex = (index + libraries.length) % libraries.length;
  const library = libraries[currentIndex];
  attempt = 0;
  byId('stop-number').textContent = '第 ' + formatStop(currentIndex) + ' / 06 站';
  byId('library-city').textContent = library.city;
  byId('library-name').textContent = library.name;
  byId('library-place').textContent = library.place;
  credit.textContent = library.author + ' / Wikimedia Commons（网页尺寸）';
  credit.href = library.file;
  license.textContent = library.license;
  license.href = library.licenseUrl;
  marks.forEach((mark, markIndex) => mark.classList.toggle('is-current', markIndex === currentIndex));
  renderFacts(library.facts);
  loadPhoto(library);
  if (updateAddress) {
    history.replaceState(null, '', '#' + library.id);
    byId('announcement').textContent = '第 ' + (currentIndex + 1) + ' 座，' + library.name + '，' + library.place;
    if (gallery.getBoundingClientRect().top < 0) gallery.scrollIntoView({ block: 'start' });
  }
}

function stationFromHash() {
  return libraries.findIndex(library => '#' + library.id === location.hash);
}

image.addEventListener('load', () => imageState('ready'));
image.addEventListener('error', () => imageState('error'));
byId('photo-retry').addEventListener('click', () => {
  attempt += 1;
  loadPhoto(libraries[currentIndex]);
});
byId('previous').addEventListener('click', () => showLibrary(currentIndex - 1, true));
byId('next').addEventListener('click', () => showLibrary(currentIndex + 1, true));
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
  if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  showLibrary(currentIndex + (event.key === 'ArrowLeft' ? -1 : 1), true);
});
window.addEventListener('hashchange', () => {
  const index = stationFromHash();
  if (index >= 0 && index !== currentIndex) showLibrary(index);
});

showLibrary(Math.max(0, stationFromHash()));
gallery.hidden = false;
