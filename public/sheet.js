// The Festivals and Theatrical Release tables come from a Google Sheet, published to
// the web (File → Share → Publish to web, entire document), one tab each. The page reads
// its tab as CSV when it opens and fills its table, one row per line of the tab, sorted
// by date (whatever order they're typed in). The table says which tab (data-gid) and
// which columns (data-columns, found by their heading, any case); with data-link, that
// column's address links the whole row. Lines above the headings (a note) and empty
// lines are skipped. Google passes edits on within a few minutes. The headings are in
// the page; until the rows arrive, grey bars stand in for them (a skeleton), then the
// rows fade in.
(function () {
  var SHEET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTgvW1CmsaEPwPY1yOxKLhln5JXk4Vgo4pfgCxR32tNTMMGPxot-Qw3WeVy8EcTN46OJf4NfaCrZo3/pub";

  var table = document.querySelector(".listing");
  if (!table) return;
  var GID = table.dataset.gid;
  var COLUMNS = table.dataset.columns.split(" ");
  var LINK = table.dataset.link;

  // The skeleton: a few rows of bars, one per column.
  for (var i = 0; i < 8; i++) {
    var tr = table.tBodies[0].insertRow();
    tr.className = "skeleton";
    COLUMNS.forEach(function (name) {
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

  // A date as written in the Sheet ("Sept 17 - 20 (2026)", "Wed, Dec 16 – 7:50 PM"),
  // as a number to sort by: its first month and day, the year if given, the time if
  // given. Without a year, January to June come after July to December (a season that
  // starts in the second half of the year). Dates it can't read go last.
  var MONTHS = "janfebmaraprmayjunjulaugsepoctnovdec";
  function when(text) {
    var m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i.exec(text);
    if (!m) return Infinity;
    var month = MONTHS.indexOf(m[1].toLowerCase()) / 3;
    var year = /\b(\d{4})\b/.exec(text);
    var y = year ? +year[1] : (month < 6 ? 1 : 0);
    var time = /(\d{1,2}):(\d{2})\s*([ap])\.?m/i.exec(text);
    var minutes = time ? (+time[1] % 12 + (time[3].toLowerCase() === "p" ? 12 : 0)) * 60 + +time[2] : 0;
    return ((y * 12 + month) * 32 + +m[2]) * 1440 + minutes;
  }

  // A new address each minute, so browsers don't keep an old copy for 5 minutes.
  fetch(SHEET + "?gid=" + GID + "&single=true&output=csv&t=" + Math.floor(Date.now() / 60000))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (text) {
      var rows = parse(text);
      // The headings are the first line that has one of the columns.
      var lower = function (h) { return h.trim().toLowerCase(); };
      while (rows.length && !rows[0].map(lower).some(function (h) { return COLUMNS.indexOf(h) !== -1; })) rows.shift();
      if (!rows.length) return;
      var at = {};
      rows.shift().map(lower).forEach(function (h, i) { at[h] = i; });
      var cell = function (row, name) { return at[name] !== undefined ? (row[at[name]] || "").trim() : ""; };
      rows = rows.filter(function (row) { return row.some(function (c) { return c.trim(); }); });
      rows = rows.map(function (row, i) { return { row: row, key: when(cell(row, "date")), i: i }; })
        .sort(function (a, b) { return a.key - b.key || a.i - b.i; })
        .map(function (r) { return r.row; });
      var body = document.createElement("tbody");
      rows.forEach(function (row) {
        var tr = document.createElement("tr");
        var href = LINK ? cell(row, LINK) : "";
        COLUMNS.forEach(function (name, i) {
          var td = document.createElement("td");
          td.className = name;
          var inner = td;
          if (/^https?:\/\//.test(href)) {
            // the whole row is the link: each cell holds it (one stop for the keyboard)
            inner = document.createElement("a");
            inner.href = href;
            inner.target = "_blank";
            inner.rel = "noopener";
            if (i) inner.tabIndex = -1;
            td.appendChild(inner);
            tr.className = "linked";
          }
          inner.textContent = cell(row, name);
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      body.className = "filled";
      table.replaceChild(body, table.tBodies[0]);
    })
    .catch(function () { table.tBodies[0].textContent = ""; });
})();
