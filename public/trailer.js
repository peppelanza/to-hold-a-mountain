// Trailer: any element with data-trailer opens the YouTube trailer in a player over a
// darkened page. Closes with the X, a click on the dark area, or Esc; closing removes
// the player, which stops the video. Plain older JavaScript for older phones.
(function () {
  var VIDEO = "SKabqo5MiE8";
  var overlay = null;
  var opener = null;

  function close() {
    if (!overlay) return;
    var el = overlay;
    overlay = null;
    el.classList.remove("open");
    document.documentElement.classList.remove("trailer-open");
    setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 400);
    if (opener) opener.focus();
  }

  function open(e) {
    e.preventDefault();
    if (overlay) return;
    opener = e.currentTarget;
    overlay = document.createElement("div");
    overlay.className = "trailer";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Trailer");
    overlay.innerHTML =
      '<button class="trailer-close" type="button" aria-label="Close the trailer"><span></span><span></span></button>' +
      '<div class="trailer-frame"><iframe src="https://www.youtube-nocookie.com/embed/' + VIDEO +
      '?autoplay=1&rel=0&playsinline=1&modestbranding=1" title="To Hold a Mountain — trailer" ' +
      'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>';
    document.body.appendChild(overlay);
    document.documentElement.classList.add("trailer-open");
    overlay.offsetWidth; // start the fade-in from transparent
    overlay.classList.add("open");
    var closeButton = overlay.querySelector(".trailer-close");
    closeButton.addEventListener("click", close);
    overlay.addEventListener("click", function (ev) { if (ev.target === overlay) close(); });
    closeButton.focus();
  }

  var buttons = document.querySelectorAll("[data-trailer]");
  for (var i = 0; i < buttons.length; i++) buttons[i].addEventListener("click", open);
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && overlay) close();
  });
})();
