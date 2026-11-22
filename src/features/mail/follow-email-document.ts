/**
 * Fit the message to the frame's width and report its height whenever the
 * layout changes. Mirrors MEASURE_SCRIPT in email-html.ts. Returns a cleanup.
 */
export function followEmailDocument(frame: HTMLIFrameElement, doc: Document, onHeight: (h: number) => void): () => void {
  let last = 0;
  let queued = 0;

  const fit = () => {
    const body = doc.body;
    const root = doc.documentElement;
    if (!body) return;
    body.style.zoom = '';
    const view = root.clientWidth;
    const content = Math.max(root.scrollWidth, body.scrollWidth);
    if (view > 0 && content > view + 1) {
      body.style.zoom = String(Math.max(0.25, Math.floor((view / content) * 1000) / 1000));
    }
  };
  const post = () => {
    queued = 0;
    if (!doc.body) return;
    const h = Math.ceil(doc.body.getBoundingClientRect().height);
    if (h > 0 && h !== last) {
      last = h;
      onHeight(Math.min(h + 2, 20000));
    }
  };
  const schedule = () => {
    if (!queued) queued = requestAnimationFrame(post);
  };
  const update = () => {
    fit();
    schedule();
  };

  update();
  // The body resizing (images, fonts) only needs a new height; the frame
  // changing width needs the message re-fitted.
  const bodyObserver = new ResizeObserver(schedule);
  bodyObserver.observe(doc.body);
  let frameWidth = frame.clientWidth;
  const frameObserver = new ResizeObserver(() => {
    if (frame.clientWidth === frameWidth) return;
    frameWidth = frame.clientWidth;
    update();
  });
  frameObserver.observe(frame);
  doc.addEventListener('load', update, true);
  doc.fonts?.ready.then(update);
  const timers = [setTimeout(update, 300), setTimeout(update, 1200)];

  return () => {
    bodyObserver.disconnect();
    frameObserver.disconnect();
    doc.removeEventListener('load', update, true);
    timers.forEach(clearTimeout);
    if (queued) cancelAnimationFrame(queued);
  };
}
