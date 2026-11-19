// Neon Heist editor: wires the page — two photo slots with crop sliders, caption and subtitle,
// grade and size pickers, live preview, and PNG export in all three post sizes. A `?shot=` query
// sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const gradeSelect = document.getElementById('grade');
const sizeSelect = document.getElementById('size');
const status = document.getElementById('status');

// Each slot keeps its image plus its crop: zoom and pan offsets, driven by the sliders.
const photos = {
  hero: { img: null, zoom: 1, dx: 0, dy: 0 },
  partner: { img: null, zoom: 1, dx: 0, dy: 0 },
};

function redraw() {
  drawCover(canvas, photos, {
    caption: captionInput.value,
    subtitle: subtitleInput.value,
    grade: gradeSelect.value,
  });
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function readFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      loadImage(reader.result).then(resolve, reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bindSlot(slot) {
  document.getElementById(`photo-${slot}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    photos[slot].img = await readFileAsImage(file);
    redraw();
  });
  document.getElementById(`sample-${slot}`).addEventListener('click', async () => {
    photos[slot].img = await loadImage(`samples/${slot === 'hero' ? 'boulevard' : 'pier'}.jpg`);
    redraw();
  });
  for (const [key, id] of [['zoom', `zoom-${slot}`], ['dx', `dx-${slot}`], ['dy', `dy-${slot}`]]) {
    document.getElementById(id).addEventListener('input', (e) => {
      photos[slot][key] = Number(e.target.value);
      redraw();
    });
  }
}

bindSlot('hero');
bindSlot('partner');
captionInput.addEventListener('input', redraw);
subtitleInput.addEventListener('input', redraw);
gradeSelect.addEventListener('change', redraw);

// Switching size resizes the live canvas to that post size, so the preview is the real cover.
sizeSelect.addEventListener('change', () => {
  const size = SIZES[sizeSelect.value];
  canvas.width = size.w;
  canvas.height = size.h;
  redraw();
});

// Exports the current cover at one size by drawing it on an offscreen canvas at that size.
function exportSize(key) {
  const size = SIZES[key];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, photos, {
    caption: captionInput.value,
    subtitle: subtitleInput.value,
    grade: gradeSelect.value,
  });
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-heist-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(`neon-heist-${size.w}x${size.h}.png`);
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', async () => {
  const name = await exportSize(sizeSelect.value);
  status.textContent = `Saved ${name}`;
});

document.getElementById('export-all').addEventListener('click', async () => {
  const names = [];
  for (const key of Object.keys(SIZES)) names.push(await exportSize(key));
  status.textContent = `Saved ${names.join(', ')}`;
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), async (scene) => {
    if (scene.hero) photos.hero.img = await loadImage(scene.hero);
    if (scene.partner) photos.partner.img = await loadImage(scene.partner);
    if (scene.caption) captionInput.value = scene.caption;
    if (scene.subtitle !== undefined) subtitleInput.value = scene.subtitle;
    if (scene.grade) gradeSelect.value = scene.grade;
    if (scene.size && SIZES[scene.size]) {
      sizeSelect.value = scene.size;
      canvas.width = SIZES[scene.size].w;
      canvas.height = SIZES[scene.size].h;
    }
    // Wait for the shipped fonts before painting, so the lettering is the real one.
    await document.fonts.ready;
    redraw();
  });
} else {
  // A first paint with the sample photos, so the editor never opens empty.
  loadImage('samples/boulevard.jpg').then((img) => { photos.hero.img = img; redraw(); }).catch(() => redraw());
  loadImage('samples/pier.jpg').then((img) => { photos.partner.img = img; redraw(); }).catch(() => redraw());
  redraw();
}
