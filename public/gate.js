// Password screen for the whole site. Loaded in each page's <head>: until the right
// password has been entered once in this browser, the page is hidden behind a screen
// asking for it; then it's remembered, so every page opens straight away.
// Note: this only keeps casual visitors out. The files themselves stay reachable.
(function () {
  var KEY = "thm-access";
  var HASH = 2653764176; // scrambled form of the password (see hash below)

  function hash(text) {
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
    return h;
  }
  function remembered() {
    try { if (localStorage.getItem(KEY) === String(HASH)) return true; } catch (e) {}
    return document.cookie.indexOf(KEY + "=" + HASH) !== -1;
  }
  function remember() {
    try { localStorage.setItem(KEY, String(HASH)); } catch (e) {}
    document.cookie = KEY + "=" + HASH + "; max-age=31536000; path=/; SameSite=Lax";
  }

  if (remembered()) return;
  var root = document.documentElement;
  root.classList.add("locked");

  function show() {
    var gate = document.createElement("form");
    gate.className = "gate";
    gate.setAttribute("autocomplete", "off");
    gate.innerHTML =
      '<p class="gate-title">To Hold a Mountain</p>' +
      '<label class="gate-label" for="gate-password">Password</label>' +
      '<input class="gate-input" id="gate-password" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false">' +
      '<button class="button gate-button" type="submit">Enter</button>' +
      '<p class="gate-error" role="alert" aria-live="polite"></p>';
    document.body.appendChild(gate);
    var input = gate.querySelector("input");
    var error = gate.querySelector(".gate-error");
    input.focus();
    gate.addEventListener("submit", function (e) {
      e.preventDefault();
      if (hash(input.value.trim().toLowerCase()) === HASH) {
        remember();
        gate.classList.add("leaving");
        root.classList.remove("locked");
        setTimeout(function () { gate.parentNode && gate.parentNode.removeChild(gate); }, 600);
      } else {
        error.textContent = "That's not the password.";
        gate.classList.remove("shake");
        gate.offsetWidth;
        gate.classList.add("shake");
        input.select();
      }
    });
  }
  if (document.body) show();
  else document.addEventListener("DOMContentLoaded", show);
})();
