// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the chosen post size, and
// ?shot=editor shows the editor with both photos loaded. window.__shotReady is set once painted.
// The cover scene draws the exported cover itself at the gate's largest size, exactly as the app
// exports it; the editor scene shows the live preview with both panels filled.
//   ?shot=cover&size=landscape&caption=Neon%20Heist&grade=neon
//   ?shot=editor&size=portrait&caption=Neon%20Heist&grade=sunset
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const caption = query.get('caption') ?? 'Neon Heist';
  const subtitle = query.get('subtitle') ?? 'two crews, one night';
  const grade = query.get('grade') ?? 'neon';
  const size = query.get('size') ?? 'landscape';
  await load({
    hero: 'samples/boulevard.jpg',
    partner: 'samples/pier.jpg',
    caption,
    subtitle,
    grade,
    size,
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
