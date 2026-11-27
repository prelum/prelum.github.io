// Copy buttons: "copy" becomes "copied" for 1.5 s.
for (const button of document.querySelectorAll('[data-copy]')) {
  const label = button.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = button.dataset.done;
      setTimeout(() => {
        button.textContent = label;
      }, 1500);
    } catch {
      // Clipboard blocked (e.g. no HTTPS): the command stays visible to select by hand.
    }
  });
}

// Motion. Every animation here is either seen once (hero, reveals) or explains
// the product (the before/after wipe, the terminal). Nothing frequent animates.
// Without GSAP, or with reduced motion, the page stays static and fully visible.
if (!window.gsap || !window.ScrollTrigger) {
  document.documentElement.classList.remove('js');
} else {
  gsap.registerPlugin(ScrollTrigger);

  // The terminal output becomes one span per line, so each can appear on its own.
  // Done for everyone: it changes nothing visually.
  const terminal = document.querySelector('.terminal code');
  if (terminal) {
    terminal.innerHTML = terminal.innerHTML
      .split('\n')
      .map((line) => `<span class="line">${line}</span>`)
      .join('\n');
  }

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Hero: first visit, the delight budget. The title rises line by line from
    // its masks; the rest follows with short, uneven gaps so it reads as one motion.
    const hero = document.querySelector('.hero');
    gsap.set(hero.children, { visibility: 'visible' });
    gsap
      .timeline({ defaults: { ease: 'power4.out' } })
      .from(hero.querySelector('.label'), { autoAlpha: 0, y: 8, duration: 0.6 })
      .from(hero.querySelectorAll('h1 .line > span'), { yPercent: 105, duration: 1.1, stagger: 0.09 }, 0.08)
      .from(hero.querySelector('p'), { autoAlpha: 0, y: 12, duration: 0.8 }, 0.42)
      .from(hero.querySelector('.actions'), { autoAlpha: 0, y: 12, duration: 0.8 }, 0.52);

    // Features: the four columns come in together, slightly staggered, once.
    gsap.set('.features li', { autoAlpha: 0, y: 16 });
    ScrollTrigger.batch('.features li', {
      start: 'top 85%',
      once: true,
      onEnter: (items) =>
        gsap.to(items, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06 }),
    });

    // Themes: the cover arrives, then the inner page slides out from behind it,
    // like pulling the second sheet off the stack.
    for (const pages of document.querySelectorAll('.theme .pages')) {
      const [cover, inner] = pages.querySelectorAll('figure');
      gsap.set(cover, { position: 'relative', zIndex: 1 });
      gsap
        .timeline({ scrollTrigger: { trigger: pages, start: 'top 75%', once: true } })
        .from(cover, { autoAlpha: 0, y: 24, duration: 0.8, ease: 'power4.out' })
        .from(
          inner,
          {
            x: () => -(inner.offsetLeft - cover.offsetLeft),
            rotation: -2,
            duration: 0.9,
            ease: 'power3.inOut',
          },
          0.3,
        );
    }

    // Terminal: the output prints at roughly the pace of the real CLI.
    // Only opacity and a 4px rise: the block never changes size.
    const lines = gsap.utils.toArray('.terminal .line').filter((line) => line.textContent.trim());
    if (lines.length > 2) {
      const [, header, ...rest] = lines;
      const result = rest.pop();
      gsap
        .timeline({
          defaults: { duration: 0.3, ease: 'power2.out' },
          scrollTrigger: { trigger: '.terminal', start: 'top 75%', once: true },
        })
        .from(header, { autoAlpha: 0, y: 4 }, 0.35)
        .from(rest, { autoAlpha: 0, y: 4, stagger: 0.16 }, 0.7)
        .from(result, { autoAlpha: 0, y: 4 }, '+=0.35');
    }
  });

  // Before and after, wide screens only: pin the comparison and let the scroll
  // wipe prelum's page over GitHub's. It stops at the middle, which keeps the
  // lead's "left / right" true. On small screens they stay side by side.
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 900px)', () => {
    const compare = document.querySelector('.compare');
    const after = compare.querySelector('figure + figure');
    const wipe = document.createElement('span');
    wipe.className = 'wipe';
    wipe.setAttribute('aria-hidden', 'true');
    after.append(wipe);
    compare.classList.add('is-wipe');

    gsap
      .timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: compare,
          start: 'center center',
          end: '+=120%',
          pin: true,
          scrub: 0.6,
        },
      })
      .fromTo(after.querySelector('img'), { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 50%)' }, 0)
      .fromTo(wipe, { xPercent: 100 }, { xPercent: 50 }, 0)
      .from(after.querySelector('figcaption'), { autoAlpha: 0, duration: 0.3 }, 0.1);

    // matchMedia reverts the tweens; the layout class and the line are ours to undo.
    return () => {
      compare.classList.remove('is-wipe');
      wipe.remove();
    };
  });

  // Webfonts change line heights: recompute the trigger positions once they load.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
