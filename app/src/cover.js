// Neon Heist cover renderer: draws the diagonal-split duo poster onto any
// 2D canvas. Pure drawing code — no network, no randomness outside the
// seeded grain, so the same state always paints the same pixels.

export const GRADES = {
  neon: {
    skyTop: "#160b3d", skyBottom: "#04121f", band: "#19e3ff", bandEdge: "#ffffff",
    tintTop: "#ff2ea6", tintBottom: "#19e3ff", accent: "#ff2ea6",
    script: "#7df3ff", shadow: "#ff2ea6", frame: "#ffffff",
  },
  sunset: {
    skyTop: "#2b0f3a", skyBottom: "#3d1408", band: "#ffb020", bandEdge: "#fff3d6",
    tintTop: "#ff5e3a", tintBottom: "#ffb020", accent: "#ff5e3a",
    script: "#ffd166", shadow: "#ff5e3a", frame: "#fff3d6",
  },
  midnight: {
    skyTop: "#05070f", skyBottom: "#0d1b3d", band: "#8b5cff", bandEdge: "#cfe6ff",
    tintTop: "#4d7cff", tintBottom: "#8b5cff", accent: "#8b5cff",
    script: "#b9c8ff", shadow: "#4d7cff", frame: "#cfe6ff",
  },
};

export const SIZES = {
  square: { w: 1080, h: 1080, label: "Square 1080 x 1080" },
  portrait: { w: 1080, h: 1350, label: "Portrait 1080 x 1350" },
  landscape: { w: 1920, h: 1080, label: "Wide 1920 x 1080" },
};

export function defaultState() {
  return {
    hero: null, partner: null,
    heroCrop: { zoom: 1.0, dx: 0, dy: 0.30 },
    partnerCrop: { zoom: 1.0, dx: 0, dy: 0.30 },
    title: "Neon Heist",
    subtitle: "two crews, one night",
    stamp: "TWO CREWS · ONE NIGHT",
    grade: "neon",
    size: "square",
  };
}

// Small deterministic generator so the print grain is identical on every run.
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function diagonal(state, w, h) {
  const top = h * 0.36;
  const bottom = h * 0.60;
  const thick = h * 0.052;
  return {
    heroPoly: [[0, 0], [w, 0], [w, top + (bottom - top) * 1], [0, top]],
    partnerPoly: [[0, bottom + thick], [w, top + thick + (bottom - top)], [w, h], [0, h]],
    bandPoly: [[0, top], [w, bottom], [w, bottom + thick], [0, top + thick]],
    bandTopY: Math.max(top, bottom),
    bandBottomY: Math.min(top + thick, bottom + thick),
  };
}

function tracePoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

function drawPhotoCover(ctx, img, box, crop) {
  const { x, y, w, h } = box;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * crop.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = x + w / 2 + crop.dx * w;
  const cy = y + h / 2 + crop.dy * h;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

function paintPhotoPanel(ctx, img, poly, box, crop, grade) {
  if (!img) return false;
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  drawPhotoCover(ctx, img, box, crop);
  const tint = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  tint.addColorStop(0, grade.tintTop + "2e");
  tint.addColorStop(1, grade.tintBottom + "24");
  ctx.fillStyle = tint;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.restore();
  return true;
}

function splitTitle(ctx, title, maxWidth) {
  const words = String(title || "Neon Heist").trim().toUpperCase().split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const trial = line ? line + " " + word : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function drawTitleBlock(ctx, w, h, state, grade) {
  const unit = w / 1080;
  const titleSize = Math.round(132 * unit * (w >= 1900 ? 0.82 : 1));
  ctx.save();
  ctx.translate(w * 0.065, h * 0.80);
  ctx.rotate(-0.07);
  ctx.textBaseline = "alphabetic";
  ctx.font = `${titleSize}px Anton, sans-serif`;
  const lines = splitTitle(ctx, state.title, w * 0.66);
  const lineHeight = titleSize * 0.94;
  const blockHeight = lines.length * lineHeight;
  ctx.translate(0, -blockHeight + lineHeight * 0.28);
  lines.forEach((lineText, i) => {
    const y = i * lineHeight;
    ctx.font = `${titleSize}px Anton, sans-serif`;
    ctx.fillStyle = grade.shadow;
    ctx.fillText(lineText, titleSize * 0.055, y + titleSize * 0.05);
    ctx.lineWidth = Math.max(3, 9 * unit);
    ctx.strokeStyle = "#0a0620";
    ctx.lineJoin = "round";
    ctx.strokeText(lineText, 0, y);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(lineText, 0, y);
  });
  const subSize = Math.round(54 * unit * (w >= 1900 ? 0.85 : 1));
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.shadowColor = grade.script;
  ctx.shadowBlur = 18 * unit;
  ctx.fillStyle = grade.script;
  ctx.fillText(state.subtitle || "", 4, lines.length * lineHeight + subSize * 0.35);
  ctx.restore();
}

function drawStamp(ctx, w, h, state, grade) {
  const unit = w / 1080;
  const size = Math.round(26 * unit);
  ctx.save();
  ctx.translate(w * 0.965, h * 0.075);
  ctx.rotate(0.08);
  ctx.font = `${size}px Anton, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(2 * unit)}px`; } catch { /* older canvas */ }
  const text = String(state.stamp || "").toUpperCase();
  const tw = ctx.measureText(text).width;
  const padX = 16 * unit;
  const padY = 10 * unit;
  const boxW = tw + padX * 2;
  const boxH = size + padY * 2;
  ctx.fillStyle = "rgba(5, 8, 20, 0.72)";
  ctx.fillRect(-boxW, -size - padY, boxW, boxH);
  ctx.lineWidth = Math.max(2, 3 * unit);
  ctx.strokeStyle = grade.band;
  ctx.strokeRect(-boxW, -size - padY, boxW, boxH);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(text, -padX, -size / 2 + size * 0.06);
  ctx.restore();
}

function drawGrain(ctx, w, h) {
  const rand = seededRandom(20261119 + w * 7 + h * 13);
  const count = Math.floor((w * h) / 900);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const light = rand() > 0.5;
    ctx.fillStyle = light ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 2);
  }
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const glow = ctx.createRadialGradient(
    w / 2, h * 0.42, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  glow.addColorStop(0, "rgba(0,0,10,0)");
  glow.addColorStop(1, "rgba(0,0,10,0.42)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

export function drawCover(ctx, w, h, state) {
  const grade = GRADES[state.grade] || GRADES.neon;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const geo = diagonal(state, w, h);
  const heroBox = { x: 0, y: 0, w, h: geo.bandTopY };
  const partnerBox = { x: 0, y: geo.bandBottomY, w, h: h - geo.bandBottomY };
  const partnerImg = state.partner || state.hero;
  const partnerCrop = state.partner ? state.partnerCrop : state.heroCrop;
  paintPhotoPanel(ctx, state.hero, geo.heroPoly, heroBox, state.heroCrop, grade);
  paintPhotoPanel(ctx, partnerImg, geo.partnerPoly, partnerBox, partnerCrop, grade);

  ctx.save();
  tracePoly(ctx, geo.bandPoly);
  ctx.fillStyle = grade.band;
  ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.004);
  ctx.strokeStyle = grade.bandEdge;
  ctx.stroke();
  ctx.restore();

  drawStamp(ctx, w, h, state, grade);
  drawTitleBlock(ctx, w, h, state, grade);
  drawGrain(ctx, w, h);
  drawVignette(ctx, w, h);

  ctx.save();
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeStyle = grade.frame;
  ctx.globalAlpha = 0.55;
  ctx.strokeRect(w * 0.018, h * 0.014, w * 0.964, h * 0.972);
  ctx.restore();
}

export function renderCoverToCanvas(w, h, state) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext("2d"), w, h, state);
  return canvas;
}
