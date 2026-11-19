// Neon Heist cover engine: draws the diagonal-split duo poster onto a canvas at its own size.
// Two photos fill two panels sliced by one bold diagonal; a neon night grade, a hard-shadow
// condensed title and a script subtitle finish the poster. Everything is deterministic: the grain
// comes from a fixed-seed generator, so two draws of the same inputs are byte-identical.

// Grades: the night palettes the cover can wear. Each grade names its two neon poles, its deep
// background, the title's hard-shadow colour and the subtitle colour.
export const GRADES = {
  neon: { top: '#ff2d78', bottom: '#00e5ff', deep: '#14001f', shadow: '#ff2d78', sub: '#ffd319', band: '#00e5ff' },
  sunset: { top: '#ff7a18', bottom: '#ff2d78', deep: '#2b0a2e', shadow: '#ff7a18', sub: '#ffe9a8', band: '#ffd319' },
  midnight: { top: '#00b3a4', bottom: '#2b6bff', deep: '#04122b', shadow: '#00b3a4', sub: '#9be8ff', band: '#00e5ff' },
};

// Post sizes the app exports, keyed by the label the editor shows.
export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
};

// A tiny deterministic generator, so the grain never changes between runs.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Draws one photo cover-filling a polygon clip, with its own zoom and pan offsets.
function drawPhotoInClip(ctx, photo, clip, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(clip[0][0], clip[0][1]);
  for (let i = 1; i < clip.length; i++) ctx.lineTo(clip[i][0], clip[i][1]);
  ctx.closePath();
  ctx.clip();
  if (photo && photo.img) {
    const img = photo.img;
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = base * (photo.zoom || 1);
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const ox = (w - pw) / 2 + (photo.dx || 0) * w * 0.2;
    const oy = (h - ph) / 2 + (photo.dy || 0) * h * 0.2;
    ctx.drawImage(img, ox, oy, pw, ph);
  } else {
    // No photo yet: a flat deep panel with a soft diagonal sheen, so the poster still reads.
    ctx.fillStyle = '#241031';
    ctx.fillRect(0, 0, w, h);
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// The diagonal that slices the poster: where it meets the top edge and the bottom edge, as
// fractions of the width. The landscape cover leans the slash further for a wider duo read.
function diagonalFor(w, h) {
  if (w > h) return { top: 0.58, bottom: 0.30 };
  if (h > w) return { top: 0.68, bottom: 0.24 };
  return { top: 0.64, bottom: 0.26 };
}

// Washes the whole cover in the grade: a neon top-to-bottom grade, a deep shadow lift and a
// cool vignette, all in cheap composite passes.
function applyGrade(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, w * 0.35, h);
  wash.addColorStop(0, grade.top + '55');
  wash.addColorStop(0.55, 'rgba(0,0,0,0)');
  wash.addColorStop(1, grade.bottom + '44');
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const deep = ctx.createLinearGradient(0, h * 0.55, 0, h);
  deep.addColorStop(0, 'rgba(0,0,0,0)');
  deep.addColorStop(1, grade.deep + 'aa');
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

// The bold diagonal band that separates the two panels: a neon stripe edged in white.
function drawDiagonalBand(ctx, w, h, diag, grade) {
  const t = diag.top * w;
  const b = diag.bottom * w;
  const bandW = w * 0.022;
  const band = [[t - bandW, 0], [t + bandW, 0], [b + bandW, h], [b - bandW, h]];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(band[0][0], band[0][1]);
  for (let i = 1; i < band.length; i++) ctx.lineTo(band[i][0], band[i][1]);
  ctx.closePath();
  ctx.fillStyle = grade.band;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.stroke();
  ctx.restore();
}

// Sprinkles deterministic grain over the cover, so the poster reads printed, not flat.
function drawGrain(ctx, w, h) {
  const rnd = seededRandom(20261119);
  ctx.save();
  ctx.globalAlpha = 0.035;
  const step = Math.max(3, Math.round(w / 360));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (rnd() < 0.5) {
        ctx.fillStyle = rnd() < 0.5 ? '#ffffff' : '#000000';
        ctx.fillRect(x, y, step, step);
      }
    }
  }
  ctx.restore();
}

// Fits the caption to one line at the biggest size that still fits the width.
function fitFont(ctx, text, family, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

// Draws the title block: a rotated condensed title with a hard neon offset shadow and a white
// outline, plus the script subtitle tucked under it. `angle` tilts the whole block along the slash.
function drawTitleBlock(ctx, w, h, caption, subtitle, grade) {
  const text = (caption || 'NEON HEIST').trim().toUpperCase();
  const sub = (subtitle || '').trim();
  const cx = w * 0.5;
  const cy = h * 0.78;
  const angle = -0.07;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxW = w * 0.92;
  const size = fitFont(ctx, text, 'Anton, sans-serif', h * 0.13, maxW);
  const shadowOff = Math.max(6, size * 0.09);
  // Hard offset shadow in the grade's neon pole, then the white face with a dark outline.
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.fillStyle = grade.shadow;
  ctx.fillText(text, shadowOff, shadowOff);
  ctx.lineWidth = Math.max(4, size * 0.075);
  ctx.strokeStyle = '#12001f';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  if (sub) {
    const subSize = fitFont(ctx, sub, 'Pacifico, cursive', size * 0.42, maxW * 0.8);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.sub;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(sub, 0, size * 0.72);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// A small rotated stamp in the top corner, the poster's own tag line.
function drawStamp(ctx, w, h, grade) {
  const stamp = 'TWO CREWS · ONE NIGHT';
  const size = Math.max(14, w * 0.016);
  ctx.save();
  ctx.translate(w * 0.06, h * 0.055);
  ctx.rotate(-0.06);
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const pad = size * 0.7;
  const tw = ctx.measureText(stamp).width;
  ctx.fillStyle = 'rgba(10,0,18,0.72)';
  ctx.fillRect(-pad, -size * 0.85, tw + pad * 2, size * 1.7);
  ctx.strokeStyle = grade.band;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.strokeRect(-pad, -size * 0.85, tw + pad * 2, size * 1.7);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(stamp, 0, 0);
  ctx.restore();
}

// Draws the full cover: `photos` is { hero, partner } with { img, zoom, dx, dy } each (either may
// be null), and `opts` carries { caption, subtitle, grade } with grade a key of GRADES.
export function drawCover(canvas, photos, opts) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[opts.grade] || GRADES.neon;
  const diag = diagonalFor(w, h);
  ctx.fillStyle = grade.deep;
  ctx.fillRect(0, 0, w, h);
  const heroClip = [[0, 0], [diag.top * w, 0], [diag.bottom * w, h], [0, h]];
  const partnerClip = [[diag.top * w, 0], [w, 0], [w, h], [diag.bottom * w, h]];
  const heroPhoto = photos.hero && photos.hero.img ? photos.hero : null;
  const partnerPhoto = photos.partner && photos.partner.img ? photos.partner : (heroPhoto || null);
  drawPhotoInClip(ctx, heroPhoto, heroClip, w, h);
  drawPhotoInClip(ctx, partnerPhoto, partnerClip, w, h);
  applyGrade(ctx, w, h, grade);
  drawDiagonalBand(ctx, w, h, diag, grade);
  drawStamp(ctx, w, h, grade);
  drawTitleBlock(ctx, w, h, opts.caption, opts.subtitle, grade);
  // Thin white frame, so the poster holds its edge at any size.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(4, w * 0.006);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  drawGrain(ctx, w, h);
}
