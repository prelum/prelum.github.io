// Copy buttons: "copy" crossfades to "copied" for 1.5 s. Both words sit in the
// same grid cell (see .is-swap in styles.css), so the button never changes width.
for (const button of document.querySelectorAll('[data-copy]')) {
  const idle = document.createElement('span');
  const done = document.createElement('span');
  idle.textContent = button.textContent;
  done.textContent = button.dataset.done;
  done.setAttribute('aria-hidden', 'true');
  button.replaceChildren(idle, done);
  button.classList.add('is-swap');

  const show = (copied) => {
    button.classList.toggle('is-copied', copied);
    idle.toggleAttribute('aria-hidden', copied);
    done.toggleAttribute('aria-hidden', !copied);
  };

  let timer;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      show(true);
      clearTimeout(timer); // a second click restarts the 1.5 s instead of cutting it short
      timer = setTimeout(() => show(false), 1500);
    } catch {
      // Clipboard blocked (e.g. no HTTPS): the command stays visible to select by hand.
    }
  });
}

// Motion. Every animation here is either seen once (hero, reveals) or explains
// the product (the before/after wipe, the terminal). Nothing frequent animates.
// With reduced motion, things fade instead of moving. Without GSAP, the page is static.
if (!window.gsap || !window.ScrollTrigger || !window.CustomEase) {
  document.documentElement.classList.remove('js');
} else {
  gsap.registerPlugin(ScrollTrigger, CustomEase);

  // The same two curves as --ease-out and --ease-in-out in styles.css.
  CustomEase.create('ease-out', '0.23, 1, 0.32, 1');
  CustomEase.create('ease-in-out', '0.77, 0, 0.175, 1');

  // The terminal output becomes one span per line, so each can appear on its own.
  // Done for everyone: it changes nothing visually.
  const terminal = document.querySelector('.terminal code');
  if (terminal) {
    terminal.innerHTML = terminal.innerHTML
      .split('\n')
      .map((line) => `<span class="line">${line}</span>`)
      .join('\n');
  }

  const hero = document.querySelector('.hero');

  // Terminal: the output prints at roughly the pace of the real CLI. Opacity
  // (and, with motion, a 4px rise) only: the block never changes size.
  const playTerminal = (y) => {
    const lines = gsap.utils.toArray('.terminal .line').filter((line) => line.textContent.trim());
    if (lines.length < 3) return;
    const [, header, ...rest] = lines;
    const result = rest.pop();
    gsap
      .timeline({
        defaults: { duration: 0.3, ease: 'ease-out' },
        scrollTrigger: { trigger: '.terminal', start: 'top 75%', once: true },
      })
      .from(header, { autoAlpha: 0, y }, 0.35)
      .from(rest, { autoAlpha: 0, y, stagger: 0.16 }, 0.7)
      .from(result, { autoAlpha: 0, y }, '+=0.35');
  };

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Hero: first visit, the delight budget. The title rises line by line from
    // its masks; the rest follows with short, uneven gaps so it reads as one motion.
    gsap.set(hero.children, { visibility: 'visible' });
    gsap
      .timeline({ defaults: { ease: 'ease-out' } })
      .from(hero.querySelector('.label'), { autoAlpha: 0, y: 8, duration: 0.6 })
      .from(hero.querySelectorAll('h1 .line > span'), { yPercent: 105, duration: 1.1, stagger: 0.09 }, 0.08)
      .from(hero.querySelector('p'), { autoAlpha: 0, y: 12, duration: 0.8 }, 0.42)
      .from(hero.querySelector('.actions'), { autoAlpha: 0, y: 12, duration: 0.8 }, 0.52);

    // Features: the four columns come in together, slightly staggered, once.
    gsap.set('.features li', { autoAlpha: 0, y: 16 });
    ScrollTrigger.batch('.features li', {
      start: 'top 85%',
      once: true,
      onEnter: (items) => gsap.to(items, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'ease-out', stagger: 0.06 }),
    });

    // Themes: the cover arrives, then the inner page slides out from behind it,
    // like pulling the second sheet off the stack.
    for (const pages of document.querySelectorAll('.theme .pages')) {
      const [cover, inner] = pages.querySelectorAll('figure');
      gsap.set(cover, { position: 'relative', zIndex: 1 });
      gsap
        .timeline({ scrollTrigger: { trigger: pages, start: 'top 75%', once: true } })
        .from(cover, { autoAlpha: 0, y: 24, duration: 0.8, ease: 'ease-out' })
        .from(
          inner,
          { x: () => -(inner.offsetLeft - cover.offsetLeft), rotation: -2, duration: 0.9, ease: 'ease-in-out' },
          0.3,
        );
    }

    playTerminal(4);
  });

  // Reduced motion: fewer and gentler, not zero. The same moments, as plain
  // fades with no movement; the comparison stays side by side.
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(hero.children, { visibility: 'visible' });
    gsap.from(hero.children, { autoAlpha: 0, duration: 0.5, ease: 'ease-out', stagger: 0.08 });
    gsap.set('.features li, .theme .pages', { autoAlpha: 0 });
    ScrollTrigger.batch('.features li, .theme .pages', {
      start: 'top 85%',
      once: true,
      onEnter: (items) => gsap.to(items, { autoAlpha: 1, duration: 0.5, ease: 'ease-out', stagger: 0.06 }),
    });
    playTerminal(0);
  });

  // Before and after, wide screens only. The scroll wipes prelum's page over
  // GitHub's and stops at the middle (the lead's "left / right" stays true).
  // Then a handle appears and the line is the reader's: drag it, click
  // anywhere on the page, or use the arrow keys. On small screens the two
  // pages stay side by side.
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 900px)', () => {
    const compare = document.querySelector('.compare');
    const after = compare.querySelector('figure + figure');
    const img = after.querySelector('img');

    const wipe = document.createElement('span');
    wipe.className = 'wipe';
    const handle = document.createElement('span');
    handle.className = 'wipe-handle';
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', compare.dataset.sliderLabel);
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.innerHTML =
      '<svg viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 5 2.5 9l4 4M11.5 5l4 4-4 4"/></svg>';
    wipe.append(handle);
    after.append(wipe);
    compare.classList.add('is-wipe');

    // pos: where the line is, in % from the left. 100 = all GitHub, 0 = all prelum.
    // Set the clip and the transform directly: one element each, no CSS variable.
    const draw = (pos) => {
      img.style.clipPath = `inset(0% 0% 0% ${pos}%)`;
      wipe.style.transform = `translateX(${pos}%)`;
      handle.setAttribute('aria-valuenow', String(Math.round(pos)));
      handle.setAttribute('aria-valuetext', `${Math.round(100 - pos)}% prelum`);
    };

    const scrubbed = { pos: 100 }; // driven by the scroll
    const manual = { pos: 50 }; // driven by the reader
    let owned = false; // once the reader moves the line, the scroll stops moving it
    let ready = false;

    const setReady = (value) => {
      if (ready === value) return;
      ready = value;
      compare.classList.toggle('is-ready', value);
      handle.tabIndex = value ? 0 : -1;
    };
    setReady(false);
    draw(100);

    const tl = gsap.timeline({
      // Ready a hair before the end: stopping 2px short must not hide the handle.
      onUpdate: () => setReady(owned || tl.progress() > 0.97),
      scrollTrigger: {
        trigger: compare,
        start: 'center center',
        end: '+=120%',
        pin: true,
        scrub: 0.6,
        // Scrolled back above the section: hand the line back to the scroll,
        // easing it home instead of letting it jump.
        onLeaveBack: () => {
          if (!owned) return;
          gsap.to(manual, {
            pos: 100,
            duration: 0.5,
            ease: 'ease-in-out',
            overwrite: true,
            onUpdate: () => draw(manual.pos),
            onComplete: () => {
              owned = false;
              setReady(false);
            },
          });
        },
      },
    });
    tl.fromTo(
      scrubbed,
      { pos: 100 },
      { pos: 50, ease: 'ease-in-out', onUpdate: () => owned || draw(scrubbed.pos) },
      0,
    ).from(after.querySelector('figcaption'), { autoAlpha: 0, duration: 0.3 }, 0.1);

    const take = () => {
      if (!owned) manual.pos = scrubbed.pos;
      owned = true;
    };
    const posAt = (clientX) => {
      const rect = img.getBoundingClientRect();
      return gsap.utils.clamp(0, 100, ((clientX - rect.left) / rect.width) * 100);
    };

    // Pointer: one pointer at a time, captured so the drag survives leaving the image.
    const ac = new AbortController();
    const { signal } = ac;
    let dragging = null;

    compare.addEventListener(
      'pointerdown',
      (event) => {
        if (!ready || dragging !== null || event.button !== 0) return;
        event.preventDefault();
        take();
        dragging = event.pointerId;
        compare.setPointerCapture(event.pointerId);
        handle.focus({ preventScroll: true });
        if (event.target.closest('.wipe-handle')) return;
        // A click away from the line glides it there; it never teleports.
        gsap.to(manual, {
          pos: posAt(event.clientX),
          duration: 0.25,
          ease: 'ease-out',
          overwrite: true,
          onUpdate: () => draw(manual.pos),
        });
      },
      { signal },
    );
    compare.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerId !== dragging) return;
        gsap.killTweensOf(manual); // the finger wins over the glide
        manual.pos = posAt(event.clientX);
        draw(manual.pos);
      },
      { signal },
    );
    const release = (event) => {
      if (event.pointerId === dragging) dragging = null;
    };
    compare.addEventListener('pointerup', release, { signal });
    compare.addEventListener('pointercancel', release, { signal });

    // Keyboard: instant, never animated.
    handle.addEventListener(
      'keydown',
      (event) => {
        const step = event.shiftKey ? 20 : 5;
        const keys = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
        let pos;
        if (event.key in keys) pos = (owned ? manual.pos : scrubbed.pos) + keys[event.key];
        else if (event.key === 'Home') pos = 0;
        else if (event.key === 'End') pos = 100;
        else return;
        event.preventDefault();
        take();
        gsap.killTweensOf(manual);
        manual.pos = gsap.utils.clamp(0, 100, pos);
        draw(manual.pos);
      },
      { signal },
    );

    // matchMedia reverts the tweens; the rest is ours to undo.
    return () => {
      ac.abort();
      gsap.killTweensOf(manual);
      compare.classList.remove('is-wipe', 'is-ready');
      img.style.clipPath = '';
      wipe.remove();
    };
  });

  // Webfonts change line heights: recompute the trigger positions once they load.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
