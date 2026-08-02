/* ==========================================================================
   area-cliente.js — Seleção de perfil (Pedro / Glícia)
   Personalização client-side via localStorage (não é autenticação segura,
   apenas conveniência de navegação pessoal entre os dois usuários).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var profileCards = document.querySelectorAll('.profile-card');
  var welcomeBanner = document.getElementById('welcomeBanner');
  var welcomeName = document.getElementById('welcomeName');
  var STORAGE_KEY = 'pg_perfil_ativo';

  function applyStoredProfile() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      profileCards.forEach(function (card) {
        var isActive = card.getAttribute('data-profile') === stored;
        card.classList.toggle('is-active', isActive);
        card.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      if (welcomeBanner && welcomeName) {
        welcomeName.textContent = stored;
        welcomeBanner.classList.add('is-visible');
      }
    }
  }

  profileCards.forEach(function (card) {
    card.addEventListener('click', function () {
      var profile = card.getAttribute('data-profile');
      localStorage.setItem(STORAGE_KEY, profile);

      profileCards.forEach(function (c) {
        c.classList.remove('is-active');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('is-active');
      card.setAttribute('aria-pressed', 'true');

      if (welcomeBanner && welcomeName) {
        welcomeName.textContent = profile;
        welcomeBanner.classList.add('is-visible');
      }
    });

    // Acessibilidade: permitir seleção via teclado (Enter/Espaço já nativos em <button>)
  });

  applyStoredProfile();
});
