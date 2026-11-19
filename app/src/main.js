// Neon Heist editor: wires the controls in index.html to the cover renderer
// and exports PNGs. Photos are read with FileReader on this machine only and
// are never uploaded anywhere. Shot mode (?shot=...) is handled by shots.js.

import { SIZES, defaultState, drawCover, renderCoverToCanvas } from "./cover.js";
import { applyShotMode } from "./shots.js";

const state = defaultState();
const stage = document.getElementById("stage");
const stageCtx = stage.getContext("2d");

function currentSize() {
  return SIZES[state.size] || SIZES.square;
}

function fitStageToSize() {
  const { w, h } = currentSize();
  const scale = Math.min(900 / w, 900 / h, 1);
  stage.width = Math.round(w * scale);
  stage.height = Math.round(h * scale);
}

export function repaint() {
  fitStageToSize();
  drawCover(stageCtx, stage.width, stage.height, state);
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("could not read that image"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("could not read that file"));
    reader.readAsDataURL(file);
  });
}

function loadSample(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("sample did not load"));
    img.src = path;
  });
}

function bindPhoto(inputId, sampleId, slot) {
  const input = document.getElementById(inputId);
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      state[slot] = await loadImageFile(file);
      repaint();
    } catch { /* keep the previous photo */ }
  });
  const sampleBtn = document.getElementById(sampleId);
  if (sampleBtn) {
    sampleBtn.addEventListener("click", async () => {
      try {
        state[slot] = await loadSample(slot === "hero" ? "samples/boulevard.jpg" : "samples/pier.jpg");
        repaint();
      } catch { /* sample missing: leave the photo as it is */ }
    });
  }
}

function bindCrop(prefix, slot) {
  const cropKey = slot === "hero" ? "heroCrop" : "partnerCrop";
  const zoom = document.getElementById("zoom" + prefix);
  const panX = document.getElementById("panX" + prefix);
  const panY = document.getElementById("panY" + prefix);
  if (zoom) zoom.addEventListener("input", () => { state[cropKey].zoom = Number(zoom.value); repaint(); });
  if (panX) panX.addEventListener("input", () => { state[cropKey].dx = Number(panX.value); repaint(); });
  if (panY) panY.addEventListener("input", () => { state[cropKey].dy = Number(panY.value); repaint(); });
}

function bindText(inputId, key) {
  const input = document.getElementById(inputId);
  input.addEventListener("input", () => { state[key] = input.value; repaint(); });
}

function bindRadios(name, key) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) { state[key] = radio.value; repaint(); }
    });
  });
}

function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(false); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(true);
    }, "image/png");
  });
}

async function exportOne() {
  const size = currentSize();
  const canvas = renderCoverToCanvas(size.w, size.h, state);
  await downloadCanvas(canvas, `neon-heist-${state.size}.png`);
}

async function exportAll() {
  for (const key of Object.keys(SIZES)) {
    const size = SIZES[key];
    const canvas = renderCoverToCanvas(size.w, size.h, state);
    await downloadCanvas(canvas, `neon-heist-${key}.png`);
  }
}

function bindExports() {
  document.getElementById("exportOne").addEventListener("click", exportOne);
  document.getElementById("exportAll").addEventListener("click", exportAll);
  const clearB = document.getElementById("clearB");
  if (clearB) {
    clearB.addEventListener("click", () => {
      state.partner = null;
      repaint();
    });
  }
}

export async function startEditor() {
  bindPhoto("photoA", "sampleA", "hero");
  bindPhoto("photoB", "sampleB", "partner");
  bindCrop("A", "hero");
  bindCrop("B", "partner");
  bindText("title", "title");
  bindText("subtitle", "subtitle");
  bindText("stamp", "stamp");
  bindRadios("grade", "grade");
  bindRadios("size", "size");
  bindExports();
  try {
    state.hero = await loadSample("samples/boulevard.jpg");
    state.partner = await loadSample("samples/pier.jpg");
  } catch { /* samples are optional; the user can pick their own photos */ }
  await document.fonts.ready;
  repaint();
}

const params = new URLSearchParams(window.location.search);
if (params.has("shot")) {
  applyShotMode(params, state, { stage, stageCtx, repaint, loadSample });
} else {
  startEditor();
}
