(() => {
  "use strict";
  const BASE = "/3dXess/";
  const routes = {
    "pt-BR": { home: "", about: "sobre/", learn: "aprender/", practice: "praticar/", challenges: "desafios/", rules: "regras/", play: "jogar/" },
    en: { home: "en/", about: "en/about/", learn: "en/learn/", practice: "en/practice/", challenges: "en/challenges/", rules: "en/rules/", play: "en/play/" },
    es: { home: "es/", about: "es/acerca/", learn: "es/aprender/", practice: "es/practica/", challenges: "es/desafios/", rules: "es/reglas/", play: "es/jugar/" },
    "zh-CN": { home: "zh-cn/", about: "zh-cn/about/", learn: "zh-cn/learn/", practice: "zh-cn/practice/", challenges: "zh-cn/challenges/", rules: "zh-cn/rules/", play: "zh-cn/play/" }
  };
  const lang = document.documentElement.lang || "pt-BR";
  const page = document.body.dataset.page || "home";
  const menu = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  if (menu && nav) {
    menu.addEventListener("click", () => {
      const open = menu.getAttribute("aria-expanded") !== "true";
      menu.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    });
    nav.addEventListener("click", event => {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        menu.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        menu.setAttribute("aria-expanded", "false");
        menu.focus();
      }
    });
  }
  const selector = document.querySelector("[data-language-switch]");
  if (selector) {
    selector.value = lang;
    selector.addEventListener("change", () => {
      const target = routes[selector.value] && routes[selector.value][page];
      if (target !== undefined) window.location.assign(BASE + target);
    });
  }
  document.querySelectorAll("[data-current-year]").forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });
  document.querySelectorAll("[data-play-link]").forEach(el => {
    el.setAttribute("href", BASE + routes[lang].play);
  });
})();