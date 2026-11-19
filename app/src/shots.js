// Shot mode for screenshots: ?shot=cover draws one exported cover full-frame
// at the window's size, ?shot=editor shows the editor with sample photos
// loaded. Both use only the kit's sample photos, never a real person's photo.
// The page sets document.title to "shot-ready" once the frame is painted.

import { GRADES, SIZES, drawCover } from "./cover.js";

function readGrade(params, state) {
  const grade = params.get("grade");
  if (grade && GRADES[grade]) state.grade = grade;
}

function readCaption(params, state) {
  const caption = params.get("caption");
  if (caption) state.title = caption;
  const subtitle = params.get("subtitle");
  if (subtitle) state.subtitle = subtitle;
}

function readSize(params, state) {
  const size = params.get("size");
  if (size && SIZES[size]) state.size = size;
}

async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to system fonts if a font file is missing */ }
}

async function paintCover(params, state, helpers) {
  readGrade(params, state);
  readCaption(params, state);
  readSize(params, state);
  document.querySelectorAll(".topbar, .controls, .stage-hint").forEach((el) => {
    el.style.display = "none";
  });
  const frame = document.querySelector(".stage-frame");
  if (frame) {
    frame.style.padding = "0";
    frame.style.border = "none";
    frame.style.borderRadius = "0";
    frame.style.background = "#05070f";
    frame.style.boxShadow = "none";
  }
  const layout = document.querySelector(".layout");
  if (layout) { layout.style.display = "block"; layout.style.padding = "0"; layout.style.margin = "0"; layout.style.maxWidth = "none"; }
  const panel = document.querySelector(".stage-panel");
  if (panel) panel.style.margin = "0";
  document.body.style.margin = "0";
  document.body.style.background = "#05070f";

  try {
    state.hero = await helpers.loadSample("samples/boulevard.jpg");
    state.partner = await helpers.loadSample("samples/pier.jpg");
  } catch { /* draw the cover over the night gradient without photos */ }
  await waitForFonts();
  const canvas = helpers.stage;
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.borderRadius = "0";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawCover(helpers.stageCtx, canvas.width, canvas.height, state);
  document.title = "shot-ready";
}

async function paintEditor(params, state, helpers) {
  readGrade(params, state);
  readCaption(params, state);
  readSize(params, state);
  const gradeRadio = document.querySelector(`input[name="grade"][value="${state.grade}"]`);
  if (gradeRadio) gradeRadio.checked = true;
  const sizeRadio = document.querySelector(`input[name="size"][value="${state.size}"]`);
  if (sizeRadio) sizeRadio.checked = true;
  const titleInput = document.getElementById("title");
  if (titleInput) titleInput.value = state.title;
  try {
    state.hero = await helpers.loadSample("samples/boulevard.jpg");
    state.partner = await helpers.loadSample("samples/pier.jpg");
  } catch { /* the editor still opens; the user picks their own photos */ }
  await waitForFonts();
  helpers.repaint();
  document.title = "shot-ready";
}

export function applyShotMode(params, state, helpers) {
  const shot = params.get("shot");
  if (shot === "cover") {
    paintCover(params, state, helpers).catch(() => { document.title = "shot-ready"; });
  } else {
    paintEditor(params, state, helpers).catch(() => { document.title = "shot-ready"; });
  }
}
