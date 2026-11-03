// Photo stack: a pile of prints. Click, scroll down over it, swipe right or press the
// right arrow and the top print slides away to the right, showing the one beneath; it
// then goes back under the pile, so the photos loop. Scrolling up, swiping left or the
// left arrow bring the previous print back in from the right. Plain older JavaScript.
(function () {
  var stack = document.querySelector(".stack");
  var countEl = document.querySelector(".stack-count");
  var total = parseInt(stack.getAttribute("data-count"), 10);
  var VISIBLE = 4; // prints you can see in the pile
  var LEAVE_MS = 750;

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function tilt(el, onTop) {
    var r = (Math.random() * 2 - 1) * (onTop ? 2 : 5);
    var x = (Math.random() * 2 - 1) * 1.2;
    var y = (Math.random() * 2 - 1) * 1.2;
    el.style.setProperty("--r", r.toFixed(2) + "deg");
    el.style.setProperty("--x", x.toFixed(2) + "%");
    el.style.setProperty("--y", y.toFixed(2) + "%");
  }

  // order[0] is the print on top.
  var order = [];
  for (var i = 1; i <= total; i++) {
    var fig = document.createElement("figure");
    fig.className = "print";
    var img = document.createElement("img");
    img.alt = "Photo " + i + " of " + total + " from the community";
    img.setAttribute("data-src", "gallery/" + pad(i) + ".jpg");
    img.decoding = "async";
    fig.appendChild(img);
    fig.number = i;
    tilt(fig, i === 1);
    stack.appendChild(fig);
    order.push(fig);
  }

  function render() {
    for (var p = 0; p < order.length; p++) {
      var el = order[p];
      el.style.zIndex = String(order.length - p);
      el.style.opacity = p < VISIBLE ? "1" : "0";
      // Load photos just before they come near the top, either way: the next ones down
      // the pile, and the last ones (which going back brings in).
      if (p < VISIBLE + 2 || p >= order.length - 2) {
        var im = el.firstChild;
        if (!im.getAttribute("src")) im.setAttribute("src", im.getAttribute("data-src"));
      }
    }
    countEl.textContent = pad(order[0].number) + " / " + pad(total);
  }

  var busy = false;
  function next() {
    if (busy) return;
    busy = true;
    var top = order.shift();
    order.push(top);
    render(); // the next photo is now on top
    tilt(order[0], true);
    // The old top stays above everything while it slides away and fades.
    top.style.zIndex = String(total + 1);
    top.style.opacity = "";
    top.classList.add("leaving");
    setTimeout(function () {
      // Back under the pile, without animating the way there.
      top.classList.add("no-transition");
      top.classList.remove("leaving");
      tilt(top, false);
      render();
      top.offsetWidth; // apply before transitions return
      top.classList.remove("no-transition");
      busy = false;
    }, LEAVE_MS);
  }

  // The print at the bottom of the pile comes back in from the right, onto the top.
  function previous() {
    if (busy) return;
    busy = true;
    var back = order.pop();
    order.unshift(back);
    // Start it where a leaving print ends (off to the right, faded), without animating.
    back.classList.add("no-transition", "leaving");
    back.style.zIndex = String(total + 1);
    back.style.opacity = "";
    tilt(back, true);
    var im = back.firstChild;
    if (!im.getAttribute("src")) im.setAttribute("src", im.getAttribute("data-src"));
    back.offsetWidth;
    back.classList.remove("no-transition");
    back.classList.remove("leaving"); // slides in to the top of the pile
    setTimeout(function () {
      render();
      busy = false;
    }, LEAVE_MS);
    countEl.textContent = pad(back.number) + " / " + pad(total);
  }

  stack.addEventListener("click", next);
  stack.addEventListener("keydown", function (e) {
    var k = e.key || "";
    if (k === "ArrowRight" || k === "Enter" || k === " ") { next(); e.preventDefault(); }
    else if (k === "ArrowLeft") { previous(); e.preventDefault(); }
  });

  // Scrolling over the pile turns the photos (one per gesture) instead of moving the
  // page: down for the next, up for the previous.
  var lastWheel = 0;
  stack.addEventListener("wheel", function (e) {
    e.preventDefault();
    var now = Date.now();
    if (Math.abs(e.deltaY) < 4 || now - lastWheel < 900) return;
    lastWheel = now;
    if (e.deltaY > 0) next();
    else previous();
  }, { passive: false });

  // Swiping sideways on phones.
  var startX = null, startY = null;
  stack.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  stack.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) next();      // swipe right: the photo goes to the right
      else previous();         // swipe left: the previous one comes back
    }
  });

  render();
})();
