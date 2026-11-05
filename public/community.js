// Photo stack: a pile of prints. On a computer, click it; on a phone, tap or swipe it
// (either way). The top print slides off (to the right, or the way it was swiped) and
// fades, showing the one beneath; it then goes back under the pile, so the photos loop.
// Scrolling over it just scrolls the page. Plain older JavaScript for older phones.
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
    if (i === 1) {
      // The first photo: a plain colour until it has loaded, then it fades in.
      fig.className += " first";
      img.onload = function () { this.classList.add("loaded"); };
    }
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
      // Load photos just before they come near the top.
      if (p < VISIBLE + 2) {
        var im = el.firstChild;
        if (!im.getAttribute("src")) im.setAttribute("src", im.getAttribute("data-src"));
      }
    }
    countEl.textContent = pad(order[0].number) + " / " + pad(total);
  }

  // Sends the top print away ("right" or "left") and shows the next one.
  var busy = false;
  function next(direction) {
    if (busy) return;
    busy = true;
    var leaving = direction === "left" ? "leaving-left" : "leaving";
    var top = order.shift();
    order.push(top);
    render(); // the next photo is now on top
    tilt(order[0], true);
    // The old top stays above everything while it slides away and fades.
    top.style.zIndex = String(total + 1);
    top.style.opacity = "";
    top.classList.add(leaving);
    setTimeout(function () {
      // Back under the pile, without animating the way there.
      top.classList.add("no-transition");
      top.classList.remove(leaving);
      tilt(top, false);
      render();
      top.offsetWidth; // apply before transitions return
      top.classList.remove("no-transition");
      busy = false;
    }, LEAVE_MS);
  }

  // Click (computer) or tap (phone).
  var swipedAt = 0;
  stack.addEventListener("click", function () {
    if (Date.now() - swipedAt < 600) return; // the click a phone adds after a swipe
    next("right");
  });
  stack.addEventListener("keydown", function (e) {
    var k = e.key || "";
    if (k === "ArrowRight" || k === "Enter" || k === " ") { next("right"); e.preventDefault(); }
    else if (k === "ArrowLeft") { next("left"); e.preventDefault(); }
  });

  // Swipe either way on a phone: the photo goes the way it was swiped.
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
      swipedAt = Date.now();
      next(dx > 0 ? "right" : "left");
    }
  });

  render();
})();
