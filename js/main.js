/* ==========================================================================
   main.js — Comportamentos compartilhados entre todas as páginas
   (menu mobile, scroll reveal, animações de entrada, swiper de depoimentos)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. Menu mobile (hambúrguer) — acessível via teclado (Enter/Escape)
     ------------------------------------------------------------------ */
  var navToggle = document.getElementById('navToggle');
  var navList = document.getElementById('navList');

  if (navToggle && navList) {
    navToggle.addEventListener('click', function () {
      var isOpen = navList.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Fecha o menu ao pressionar Escape (acessibilidade)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navList.classList.contains('is-open')) {
        navList.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });

    // Fecha o menu ao clicar em um link (mobile)
    navList.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navList.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------------
     2. Scroll Reveal — animações suaves ao rolar a página
     ------------------------------------------------------------------ */
  if (window.ScrollReveal && !prefersReducedMotion) {
    var sr = window.ScrollReveal({
      distance: '30px',
      duration: 700,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      opacity: 0,
      reset: false,
      viewFactor: 0.15
    });
    sr.reveal('[data-reveal]', { interval: 90 });
  }

  /* ------------------------------------------------------------------
     3. GSAP — animação de entrada do Hero
     ------------------------------------------------------------------ */
  if (window.gsap && !prefersReducedMotion) {
    var heroCopy = document.querySelector('.hero-copy');
    var heroVisual = document.querySelector('.hero-visual');
    if (heroCopy && heroVisual) {
      window.gsap.timeline()
        .from(heroCopy, { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' })
        .from(heroVisual, { y: 24, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
        .from('.float-card', { y: 12, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out' }, '-=0.3');
    }
  }

  /* ------------------------------------------------------------------
     4. Swiper — carrossel de depoimentos (Home)
     ------------------------------------------------------------------ */
  if (window.Swiper && document.querySelector('.testimonial-swiper')) {
    new window.Swiper('.testimonial-swiper', {
      loop: true,
      autoplay: prefersReducedMotion ? false : { delay: 5000, disableOnInteraction: false },
      spaceBetween: 24,
      slidesPerView: 1,
      pagination: { el: '.swiper-pagination', clickable: true },
      breakpoints: {
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 }
      }
    });
  }

  /* ------------------------------------------------------------------
     5. Header — leve sombra ao rolar a página
     ------------------------------------------------------------------ */
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 12) {
        header.style.boxShadow = '0 10px 30px -15px rgba(0,0,0,0.7)';
      } else {
        header.style.boxShadow = 'none';
      }
    });
  }
});
