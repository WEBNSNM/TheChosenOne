(() => {
  'use strict';
  const canvas = document.getElementById('fluid');
  const status = document.getElementById('status');
  const burst = document.getElementById('burst');
  const pause = document.getElementById('pause');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set();
  const timers = new Set();
  let engine;
  let paused = motion.matches;

  function endPointers() {
    active.forEach(id => engine?.end(id));
    active.clear();
  }

  function stopTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
  }

  function updateState() {
    endPointers();
    stopTimers();
    engine.setPaused(paused || document.hidden);
    pause.textContent = paused ? '继续动画' : '暂停动画';
    pause.setAttribute('aria-pressed', String(paused));
    burst.disabled = paused;
    status.textContent = paused ? '动画已暂停' : 'welcome';
  }

  function blossom() {
    if (paused || document.hidden) return;
    const bounds = document.querySelector('main').getBoundingClientRect();
    const count = innerWidth < 600 ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (paused || document.hidden) return;
        const x = bounds.left + bounds.width * (.15 + .7 * (i + Math.random()) / count);
        const y = bounds.top + bounds.height * (.18 + Math.random() * .6);
        engine.start('intro', x, y);
        engine.end('intro');
      }, i * 240);
      timers.add(timer);
    }
  }

  try {
    engine = window.createGX404Fluid(canvas);
    canvas.dataset.renderer = 'webgl';
  } catch (error) {
    status.textContent = 'WebGL 不可用，请开启浏览器硬件加速';
    burst.disabled = pause.disabled = true;
    console.error(error);
    return;
  }

  window.addEventListener('pointerdown', event => {
    if (paused || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (event.target.closest('a, button, input, textarea, select')) return;
    stopTimers();
    active.add(event.pointerId);
    engine.start(event.pointerId, event.clientX, event.clientY);
  }, { passive: true });
  window.addEventListener('pointermove', event => {
    if (active.has(event.pointerId)) engine.move(event.pointerId, event.clientX, event.clientY);
  }, { passive: true });
  function end(event) {
    active.delete(event.pointerId);
    engine.end(event.pointerId);
  }
  window.addEventListener('pointerup', end, { passive: true });
  window.addEventListener('pointercancel', end, { passive: true });
  window.addEventListener('blur', endPointers);
  window.addEventListener('resize', () => engine.resize(), { passive: true });
  document.addEventListener('visibilitychange', updateState);
  window.addEventListener('pagehide', () => { endPointers(); stopTimers(); engine.setPaused(true); });
  window.addEventListener('pageshow', () => {
    updateState();
    blossom();
  });
  motion.addEventListener('change', () => { paused = motion.matches; updateState(); });
  burst.addEventListener('click', () => { stopTimers(); blossom(); });
  pause.addEventListener('click', () => { paused = !paused; updateState(); if (!paused) blossom(); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stopTimers(); endPointers(); engine.setPaused(true);
    status.textContent = '图形上下文已丢失，请刷新页面';
    burst.disabled = pause.disabled = true;
  });
  updateState();
})();
