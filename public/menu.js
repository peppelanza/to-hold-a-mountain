// Site menu, shared by every page: a big round button that opens a full-screen
// frosted panel (the page blurred behind it); the links slide in one after another.
(function () {
  var items = [
    ["Homepage", "./"],
    ["Screenings & Awards", "screenings.html"],
    ["Press", "press.html"],
    ["About the film", "about.html"],
    ["Community", "community.html"],
    ["Soundtrack", "soundtrack.html"]
  ];
  var here = location.pathname.split("/").pop() || "index.html";

  // The page you are on is left out of the menu.
  var links = items.filter(function (item) {
    return (item[1] === "./" ? "index.html" : item[1]) !== here;
  }).map(function (item, i) {
    return '<li style="--i:' + i + '"><a href="' + item[1] + '">' + item[0] + "</a></li>";
  }).join("");

  var html =
    (here === "index.html" ? "" : '<a class="home-link" href="./">To Hold a Mountain</a>') +
    '<button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Open menu">' +
    "<span></span><span></span><span></span></button>" +
    '<nav class="menu" id="site-menu" aria-label="Site"><ul>' + links + "</ul></nav>";
  document.body.insertAdjacentHTML("afterbegin", html);

  var button = document.querySelector(".menu-button");
  var menu = document.getElementById("site-menu");

  function setOpen(open) {
    document.documentElement.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) menu.querySelector("a").focus({ preventScroll: true });
  }

  button.addEventListener("click", function () {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      button.focus();
    }
  });
})();
