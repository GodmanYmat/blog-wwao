(() => {
  const reel = document.querySelector('[data-reel]');
  if (!reel) return;

  const viewport = reel.querySelector('.reel-viewport');
  const track = reel.querySelector('.reel-track');
  const slides = [...reel.querySelectorAll('.reel-slide')];
  const dots = [...reel.querySelectorAll('.reel-dot')];
  const previous = reel.querySelector('.reel-previous');
  const next = reel.querySelector('.reel-next');
  const current = reel.querySelector('[data-reel-current]');
  const status = reel.querySelector('[data-reel-status]');
  const progressBar = reel.querySelector('.reel-progress > span');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const delay = 6000;
  const offset = slides.length > 1 ? 1 : 0;
  let inView = false;
  let pointerDown = false;
  let focusPaused = false;
  let active = -1;
  let width = 1;
  let frame = 0;
  let timer = 0;
  let settleTimer = 0;

  // Hidden end copies let the last page slide forward into the first page.
  // Remove IDs so they never collide with the real headings or fragment links.
  const makeClone = (slide) => {
    const clone = slide.cloneNode(true);
    clone.classList.add('reel-clone');
    clone.removeAttribute('id');
    clone.removeAttribute('aria-labelledby');
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    return clone;
  };
  if (offset) {
    track.prepend(makeClone(slides.at(-1)));
    track.append(makeClone(slides[0]));
  }

  const restartAutoplay = () => {
    clearTimeout(timer);
    if (
      reducedMotion.matches ||
      !inView ||
      document.hidden ||
      pointerDown ||
      focusPaused ||
      slides.length < 2
    )
      return;
    timer = setTimeout(() => goTo(active + 1, false), delay);
  };

  const render = () => {
    frame = 0;
    const rect = reel.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
    const visible = visibleHeight >= Math.min(rect.height, innerHeight) / 2;
    if (visible !== inView) {
      inView = visible;
      restartAutoplay();
    }

    const position = Math.round(viewport.scrollLeft / width) - offset;
    const index = ((position % slides.length) + slides.length) % slides.length;
    progressBar.style.transform = `scaleX(${slides.length > 1 ? index / (slides.length - 1) : 0})`;
    if (index === active) return;

    if (active >= 0 && slides[active].contains(document.activeElement)) {
      viewport.focus({ preventScroll: true });
    }
    active = index;
    current.textContent = String(index + 1).padStart(2, '0');
    previous.disabled = next.disabled = slides.length < 2;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('active', dotIndex === index);
      if (dotIndex === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    slides.forEach((slide, slideIndex) => {
      slide.inert = slideIndex !== index;
    });
    status.textContent = `第 ${index + 1} 页，共 ${slides.length} 页：${slides[index].dataset.reelTitle}`;
  };

  const scheduleRender = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  const settle = () => {
    clearTimeout(settleTimer);
    if (offset) {
      const position = Math.round(viewport.scrollLeft / width);
      // The matching real page looks identical, so this reset is invisible.
      if (position === 0) viewport.scrollTo({ left: slides.length * width, behavior: 'instant' });
      else if (position === slides.length + 1)
        viewport.scrollTo({ left: width, behavior: 'instant' });
    }
    render();
  };

  const goTo = (index, manual = true) => {
    settle();
    status.setAttribute('aria-live', manual ? 'polite' : 'off');
    viewport.scrollTo({
      left: (index + offset) * width,
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });
    restartAutoplay();
  };

  const configure = () => {
    clearTimeout(settleTimer);
    width = Math.max(1, viewport.clientWidth);
    viewport.scrollTo({ left: (Math.max(0, active) + offset) * width, behavior: 'instant' });
    reel.classList.add('is-ready');
    render();
    restartAutoplay();
  };

  reel.querySelectorAll('[data-reel-go]').forEach((button) => {
    button.addEventListener('click', () => goTo(Number(button.dataset.reelGo)));
  });
  previous.addEventListener('click', () => goTo(active - 1));
  next.addEventListener('click', () => goTo(active + 1));
  viewport.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const destinations = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: slides.length - 1,
    };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    goTo(destinations[event.key]);
  });
  viewport.addEventListener(
    'scroll',
    () => {
      scheduleRender();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 160);
      restartAutoplay();
    },
    { passive: true },
  );
  viewport.addEventListener('scrollend', settle);
  reel.addEventListener(
    'pointerdown',
    () => {
      pointerDown = true;
      restartAutoplay();
    },
    { passive: true },
  );
  const releasePointer = () => {
    if (!pointerDown) return;
    pointerDown = false;
    restartAutoplay();
  };
  window.addEventListener('pointerup', releasePointer, { passive: true });
  window.addEventListener('pointercancel', releasePointer, { passive: true });
  const updateFocus = () => {
    // Reading or tabbing through a slide must not make its links move away.
    focusPaused =
      document.activeElement === viewport ||
      slides.some((slide) => slide.contains(document.activeElement));
    restartAutoplay();
  };
  reel.addEventListener('focusin', updateFocus);
  reel.addEventListener('focusout', () => queueMicrotask(updateFocus));
  document.addEventListener('visibilitychange', restartAutoplay);
  window.addEventListener('scroll', scheduleRender, { passive: true });
  window.addEventListener('resize', configure);
  reducedMotion.addEventListener('change', restartAutoplay);
  configure();
})();
