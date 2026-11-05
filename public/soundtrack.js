// One-track player. The plain <audio> element plays the file; this draws the
// soundwave (from peaks computed ahead of time, so nothing heavy runs on the
// phone) and lets people tap or drag on it to jump. Written in plain older
// JavaScript so it also runs on older iPhones and Android phones.
(function () {
  // The background video fades in once a frame of it is actually on screen ("playing"
  // can come a moment before that).
  var bgVideo = document.querySelector(".bg-video");
  function videoReady() { document.documentElement.classList.add("video-ready"); }
  function onFrame() {
    if (bgVideo.requestVideoFrameCallback) bgVideo.requestVideoFrameCallback(videoReady);
    // (and in any case once it has played a little, should that never come)
    bgVideo.addEventListener("timeupdate", function tick() {
      if (bgVideo.currentTime > 0.4) { bgVideo.removeEventListener("timeupdate", tick); videoReady(); }
    });
  }
  if (!bgVideo.paused && bgVideo.readyState >= 3) onFrame();
  else bgVideo.addEventListener("playing", onFrame, { once: true });

  var page = document.body;
  var audio = document.querySelector("audio");
  var playButton = document.querySelector(".play");
  var wave = document.querySelector(".wave");
  var canvas = wave.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var currentEl = document.querySelector(".current");
  var durationEl = document.querySelector(".duration");
  var peaks = [];
  for (var i = 0; i < 120; i++) peaks.push(0.35); // flat line until the real shape loads

  function format(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function progress() {
    return audio.duration ? audio.currentTime / audio.duration : 0;
  }

  function draw() {
    var ratio = window.devicePixelRatio || 1;
    var w = wave.clientWidth;
    var h = wave.clientHeight;
    if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // As many bars as fit, each one the loudest of the peaks it covers.
    var bar = w < 500 ? 2 : 3;
    var gap = bar;
    var count = Math.max(1, Math.floor((w + gap) / (bar + gap)));
    var played = progress() * w;
    for (var b = 0; b < count; b++) {
      var from = Math.floor((b / count) * peaks.length);
      var to = Math.max(from + 1, Math.floor(((b + 1) / count) * peaks.length));
      var p = 0;
      for (var k = from; k < to; k++) if (peaks[k] > p) p = peaks[k];
      var barH = Math.max(2, p * h);
      var x = b * (bar + gap);
      ctx.fillStyle = x < played ? "#f3e3d3" : "rgba(246, 239, 230, 0.32)";
      ctx.fillRect(x, (h - barH) / 2, bar, barH);
    }
  }

  function updateTimes() {
    currentEl.textContent = format(audio.currentTime);
    durationEl.textContent = format(audio.duration);
    wave.setAttribute("aria-valuenow", String(Math.round(progress() * 100)));
    wave.setAttribute("aria-valuetext", format(audio.currentTime) + " of " + format(audio.duration));
  }

  // Redraw every frame while playing, so the played part moves smoothly.
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 50); };
  function loop() {
    draw();
    updateTimes();
    if (!audio.paused) raf(loop);
  }

  function setPlaying(on) {
    if (on) page.classList.add("playing");
    else page.classList.remove("playing");
    playButton.setAttribute("aria-label", on ? "Pause" : "Play");
  }

  playButton.addEventListener("click", function () {
    if (audio.paused) {
      var result = audio.play();
      if (result && result.catch) result.catch(function () { setPlaying(false); });
    } else {
      audio.pause();
    }
  });
  audio.addEventListener("play", function () { setPlaying(true); loop(); });
  audio.addEventListener("pause", function () { setPlaying(false); loop(); });
  audio.addEventListener("ended", function () { setPlaying(false); audio.currentTime = 0; loop(); });
  audio.addEventListener("loadedmetadata", loop);
  audio.addEventListener("durationchange", loop);
  audio.addEventListener("timeupdate", function () { if (audio.paused) loop(); });

  // Seeking: tap, click or drag on the soundwave (mouse and touch both).
  function seekTo(clientX) {
    var rect = wave.getBoundingClientRect();
    var f = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (audio.duration) {
      audio.currentTime = f * audio.duration;
    } else {
      // Some phones only load the file once playback starts: start, then jump.
      audio.addEventListener("loadedmetadata", function once() {
        audio.removeEventListener("loadedmetadata", once);
        audio.currentTime = f * audio.duration;
      });
      audio.load();
    }
    loop();
  }

  var dragging = false;
  wave.addEventListener("mousedown", function (e) { dragging = true; seekTo(e.clientX); e.preventDefault(); });
  window.addEventListener("mousemove", function (e) { if (dragging) seekTo(e.clientX); });
  window.addEventListener("mouseup", function () { dragging = false; });
  wave.addEventListener("touchstart", function (e) { dragging = true; seekTo(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
  wave.addEventListener("touchmove", function (e) { if (dragging) seekTo(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
  wave.addEventListener("touchend", function () { dragging = false; });

  // Keyboard: arrows jump 5 seconds, space / enter play and pause.
  wave.addEventListener("keydown", function (e) {
    var key = e.key || "";
    if (key === "ArrowRight" || key === "ArrowLeft") {
      if (audio.duration) {
        audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + (key === "ArrowRight" ? 5 : -5)));
      }
      loop();
      e.preventDefault();
    } else if (key === " " || key === "Enter") {
      playButton.click();
      e.preventDefault();
    }
  });

  window.addEventListener("resize", draw);

  // The real shape of the track, computed ahead of time (soundtrack-peaks.json).
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "soundtrack-peaks.json");
  xhr.onload = function () {
    try {
      var data = JSON.parse(xhr.responseText);
      if (data && data.length) peaks = data;
    } catch (err) { /* keep the flat line */ }
    draw();
  };
  xhr.send();

  draw();
  updateTimes();
})();
