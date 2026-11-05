// Press: each review fades up as it comes into view (press.css). Plain older JavaScript
// for older phones; without IntersectionObserver they're simply shown.
(function () {
  var reviews = document.querySelectorAll(".review");
  if (!("IntersectionObserver" in window)) {
    for (var i = 0; i < reviews.length; i++) reviews[i].classList.add("in");
    return;
  }
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); }
    });
  }, { threshold: 0.2 });
  for (var j = 0; j < reviews.length; j++) seen.observe(reviews[j]);
})();
