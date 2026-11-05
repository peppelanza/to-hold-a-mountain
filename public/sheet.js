// Screenings & Awards come from a Google Sheet, published to the web (File → Share →
// Publish to web, entire document). The page reads it as CSV when it opens and fills
// its table, one row per line of the Sheet, in the Sheet's order. Columns are found by
// their heading (any case), so new ones can be added; lines above the headings (a note)
// and empty lines are skipped. Google passes edits on within a few minutes. The
// headings are in the page; until the rows arrive, grey bars stand in for them (a
// skeleton), then the rows fade in.
(function () {
  var SHEET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTgvW1CmsaEPwPY1yOxKLhln5JXk4Vgo4pfgCxR32tNTMMGPxot-Qw3WeVy8EcTN46OJf4NfaCrZo3/pub";
  var GID = "0"; // the Screenings & Awards tab
  var COLUMNS = ["date", "location", "selection"];

  var table = document.querySelector(".listing");
  if (!table) return;

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
      var body = document.createElement("tbody");
      rows.forEach(function (row) {
        if (!row.some(function (cell) { return cell.trim(); })) return;
        var tr = document.createElement("tr");
        COLUMNS.forEach(function (name) {
          var td = document.createElement("td");
          td.className = name;
          td.textContent = at[name] !== undefined ? (row[at[name]] || "").trim() : "";
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      body.className = "filled";
      table.replaceChild(body, table.tBodies[0]);
    })
    .catch(function () { table.tBodies[0].textContent = ""; });
})();
