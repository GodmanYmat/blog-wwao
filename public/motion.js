(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Map();
  const ease = value => value < 0.5
    ? 16 * value ** 5
    : 1 - (-2 * value + 2) ** 5 / 2;

  const cancel = target => animations.get(target)?.cancel();
  const cancelAll = () => [...animations.values()].forEach(animation => animation.cancel());

  const scroll = (target, options = {}) => {
    cancel(target);
    const isWindow = target === window;
    const element = isWindow ? document.documentElement : target;
    const startLeft = isWindow ? scrollX : target.scrollLeft;
    const startTop = isWindow ? scrollY : target.scrollTop;
    const maxLeft = Math.max(0, element.scrollWidth - (isWindow ? innerWidth : element.clientWidth));
    const maxTop = Math.max(0, element.scrollHeight - (isWindow ? innerHeight : element.clientHeight));
    const endLeft = Math.min(maxLeft, Math.max(0, options.left ?? startLeft));
    const endTop = Math.min(maxTop, Math.max(0, options.top ?? startTop));
    const distance = Math.hypot(endLeft - startLeft, endTop - startTop);
    const duration = reducedMotion.matches ? 0 : (options.duration ?? Math.min(1000, 620 + distance * 0.14));
    const previousBehavior = element.style.scrollBehavior;
    const previousSnap = element.style.scrollSnapType;
    let frame = 0;
    let finished = false;
    let started;

    // Ease only button/anchor navigation. Wheel and touch scrolling stay native.
    element.style.scrollBehavior = 'auto';
    if (!isWindow) element.style.scrollSnapType = 'none';

    const finish = cancelled => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      animations.delete(target);
      element.style.scrollBehavior = previousBehavior;
      element.style.scrollSnapType = previousSnap;
      options.onComplete?.({ cancelled });
    };
    const animation = { cancel: () => finish(true) };
    animations.set(target, animation);

    const move = (left, top) => target.scrollTo({ left, top, behavior: 'instant' });
    if (!duration || distance < 1) {
      move(endLeft, endTop);
      finish(false);
      return animation.cancel;
    }

    const tick = timestamp => {
      if (finished) return;
      started ??= timestamp;
      const progress = Math.min(1, (timestamp - started) / duration);
      const value = ease(progress);
      move(startLeft + (endLeft - startLeft) * value, startTop + (endTop - startTop) * value);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish(false);
    };
    frame = requestAnimationFrame(tick);
    return animation.cancel;
  };

  // Capture interrupts before a keyboard/button handler starts a new animation.
  addEventListener('wheel', cancelAll, { passive: true, capture: true });
  addEventListener('pointerdown', cancelAll, { passive: true, capture: true });
  addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape', 'Tab'].includes(event.key)) cancelAll();
  }, { capture: true });
  addEventListener('resize', cancelAll, { passive: true });
  reducedMotion.addEventListener('change', cancelAll);

  window.blogMotion = { scroll, cancel, isAnimating: target => animations.has(target) };
})();
