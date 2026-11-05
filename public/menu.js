// Site menu and footer, shared by every page. The menu is a page of its own (menu.html),
// so it has its own colour from the moment it opens (iPhone Safari colours the bands
// around its address bar once, as a page opens). MENU opens it; there, the links slide
// in one after another, and the X (or Escape) goes back to the page you came from.
// Then the footer.
(function () {
  var items = [
    ["Home", "./"],
    ["About the film", "about.html"],
    ["Trailer", "https://www.youtube.com/watch?v=SKabqo5MiE8", "trailer"], // opens the player (trailer.js)
    ["Screenings & Awards", "screenings.html"],
    ["Press", "press.html"],
    ["Soundtrack", "soundtrack.html"],
    // ["Community", "community.html"], (hidden for now; the page is still there)
    ["Contact", "contact.html"]
  ];
  var file = function (path) { return path.split("/").pop() || "index.html"; };
  var here = file(location.pathname);
  var onMenu = here === "menu.html";
  var icon = '<span class="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>' +
    '<span class="menu-label" aria-hidden="true">Menu</span>';

  if (!onMenu) {
    document.body.insertAdjacentHTML("afterbegin",
      (here === "index.html" ? "" : '<a class="home-link" href="./">To Hold a Mountain</a>') +
      '<a class="menu-button" href="menu.html" aria-label="Menu">' + icon + "</a>");
  } else {
    // The page you came from (this site's), marked as the current one; back to it on close.
    var from = "";
    try {
      var ref = new URL(document.referrer);
      if (ref.origin === location.origin && file(ref.pathname) !== "menu.html") from = file(ref.pathname);
    } catch (e) {}
    var links = items.map(function (item, i) {
      var current = (item[1] === "./" ? "index.html" : item[1]) === from;
      return '<li style="--i:' + i + '"><a href="' + item[1] + '"' +
        (item[2] === "trailer" ? " data-trailer" : "") +
        (current ? ' aria-current="page"' : "") + ">" + item[0] + "</a></li>";
    }).join("");
    document.body.insertAdjacentHTML("afterbegin",
      '<a class="home-link" href="./">To Hold a Mountain</a>' +
      '<a class="menu-button" href="' + (from === "index.html" || !from ? "./" : from) + '" aria-label="Close menu">' + icon + "</a>" +
      '<nav class="menu" aria-label="Site"><ul>' + links + "</ul></nav>");
    var close = document.querySelector(".menu-button");
    var back = function (e) {
      // Back in history when we came from a page here, so it's where it was (scrolled).
      if (from && history.length > 1) { if (e) e.preventDefault(); history.back(); }
      else if (!e) location.href = close.getAttribute("href");
    };
    close.addEventListener("click", back);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") back(); });
    // The panel fades in and the links slide in, just after it opens.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.add("menu-open");
        document.querySelector(".menu a").focus({ preventScroll: true });
      });
    });
    return; // no footer here
  }

  // Footer, on every page: credits on the left, the film's pages on the right. On the
  // homepage it sits at the bottom of the synopsis screen (the page ends there).
  var icons = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z"/></svg>',
    imdb: '<svg viewBox="0 0 40 24" aria-hidden="true"><rect x="1" y="4" width="38" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="20" y="16.3" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="currentColor">IMDb</text></svg>',
    tmdb: '<svg viewBox="0 0 40 24" aria-hidden="true"><rect x="1" y="4" width="38" height="16" rx="8" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="20" y="16.3" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9.5" font-weight="700" fill="currentColor">TMDB</text></svg>'
  };
  var socials = [
    ["Instagram", "https://www.instagram.com/toholdamountain", icons.instagram],
    ["Facebook", "https://www.facebook.com/toholdamountain", icons.facebook],
    ["IMDb", "https://www.imdb.com/title/tt39150043", icons.imdb],
    ["The Movie Database", "https://www.themoviedb.org/movie/1596276", icons.tmdb]
  ];
  var footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML =
    '<p>© 2026 Wake Up Films, Les Film de L’œil Sauvage, Ardor Films, Cvinger Film, Kinematograf, RTV Slovenja — ' +
    'Website designed by <a class="plain" href="mailto:g.lanzafame@me.com">Lanzafame</a>.</p>' +
    '<ul class="socials">' + socials.map(function (s) {
      return '<li><a href="' + s[1] + '" target="_blank" rel="noopener" aria-label="' + s[0] + '" title="' + s[0] + '">' + s[2] + "</a></li>";
    }).join("") + "</ul>";
  (document.querySelector(".film-story") || document.body).appendChild(footer);

})();
