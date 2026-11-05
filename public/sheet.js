// Screenings & Awards and Press come from one Google Sheet, published to the web
// (File → Share → Publish to web, entire document): one tab per page. Each page reads
// its tab as CSV when it opens and fills its table, one row per line of the tab, in
// the tab's order. Columns are found by their heading (any case), so new ones can be
// added; lines above the headings (a note) and empty lines are skipped. Google passes
// edits on within a few minutes. The headings are in the page; until the rows arrive,
// grey bars stand in for them (a skeleton), then the rows fade in.
(function () {
  var SHEET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTgvW1CmsaEPwPY1yOxKLhln5JXk4Vgo4pfgCxR32tNTMMGPxot-Qw3WeVy8EcTN46OJf4NfaCrZo3/pub";
  var TABS = {
    screenings: { gid: "0", columns: ["date", "location", "selection", "type"] },
    press: { gid: "459324254", columns: ["date", "publisher", "title", "type"], link: "title" }
  };

  var table = document.querySelector("[data-sheet]");
  if (!table) return;
  var tab = TABS[table.getAttribute("data-sheet")];

  // The skeleton: a few rows of bars, one per column.
  for (var i = 0; i < 8; i++) {
    var tr = table.tBodies[0].insertRow();
    tr.className = "skeleton";
    tab.columns.forEach(function (name) {
      var td = tr.insertCell();
      td.className = name;
      td.appendChild(document.createElement("span"));
    });
  }

  // CSV as Google writes it: commas, quotes around cells with commas, quotes or line breaks.
  function parse(text) {
    var rows = [], row = [], cell = "", quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    row.push(cell); rows.push(row);
    return rows;
  }

  // A new address each minute, so browsers don't keep an old copy for 5 minutes.
  fetch(SHEET + "?gid=" + tab.gid + "&single=true&output=csv&t=" + Math.floor(Date.now() / 60000))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (text) {
      var rows = parse(text);
      // The headings are the first line that has one of the page's columns.
      var lower = function (h) { return h.trim().toLowerCase(); };
      while (rows.length && !rows[0].map(lower).some(function (h) { return tab.columns.indexOf(h) !== -1; })) rows.shift();
      if (!rows.length) return;
      var head = rows.shift().map(lower);
      var at = {};
      head.forEach(function (h, i) { at[h] = i; });
      // A LINK (or URL) column makes the whole row a link to the article (the title is
      // the link itself, for the keyboard and screen readers).
      var link = at.link !== undefined ? at.link : at.url;
      var body = document.createElement("tbody");
      rows.forEach(function (row) {
        if (!row.some(function (cell) { return cell.trim(); })) return;
        var tr = document.createElement("tr");
        var href = link !== undefined ? (row[link] || "").trim() : "";
        if (/^[^\s\/:]+\.[^\s]+$/.test(href)) href = "https://" + href; // "www.variety.com/…"
        if (!tab.link || !/^https?:\/\/\S+$/.test(href)) href = "";
        tab.columns.forEach(function (name) {
          var td = document.createElement("td");
          td.className = name;
          var text = at[name] !== undefined ? (row[at[name]] || "").trim() : "";
          if (href && name === tab.link) {
            var a = document.createElement("a");
            a.href = href;
            a.target = "_blank";
            a.rel = "noopener";
            a.textContent = text || href;
            td.appendChild(a);
          } else td.textContent = text;
          tr.appendChild(td);
        });
        if (href) {
          tr.className = "linked";
          tr.addEventListener("click", function (e) {
            if (e.target.closest("a") || String(getSelection())) return; // the link itself, or selecting text
            window.open(href, "_blank", "noopener");
          });
        }
        body.appendChild(tr);
      });
      body.className = "filled";
      table.replaceChild(body, table.tBodies[0]);
    })
    .catch(function () { table.tBodies[0].textContent = ""; });
})();
