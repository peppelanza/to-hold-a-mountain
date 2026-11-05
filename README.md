# To Hold a Mountain

Static website, served by Render from `public/` (no build step).

- `public/laurels*.webp` — festival laurels at the top of the homepage (one row beside the menu button; on phones the same strip in one row above the logo, drifting right to left for ever and draggable (main.js))
- `public/index.html`, `style.css`, `main.js` — homepage: logo over the sky photo (`sky.webp`), the storm clouds (`clouds.webp`, a seamless sideways tile drifting steadily with the wind; arriving over the top third of the video and scrolling on away as it zooms in, made from the storm photo by `tools/clouds.py`: a top edge shaped by the cloud forms, softened toward the film's overcast sky lower down, the thick middle extended, the bottom faded) scroll up over it carrying the logline and two press quotes (Screen Daily, then Variety; logos `press-*.png`), each cross-fading into the next and fade onto the film clip (`bg2.mp4`: 12 s, 1920×1072, H.264, no audio; `bg2-poster.webp`, its first frame, shows until it plays), which plays and loops on its own while on screen (on phones it starts 2 s in the first time, then loops whole; `bg2-poster-mobile.webp` is that frame); scrolling on zooms it straight in and blurs it (not fully); as it blurs, the poster (`poster.webp`), the synopsis and the About the film and trailer buttons come into focus in place, over the blurred video, still playing (on phones stacked: poster full width, heading, synopsis, buttons, footer, moved up by main.js over the pinned video as you scroll on), and the page ends there. A loading screen (blurred sky, small bar) holds the page until fonts, images and the clip are loaded; then the logo comes into focus
- `public/gate.js` — password screen on every page (remembered in the browser once entered). Keeps casual visitors out only: the files themselves stay reachable. To change the password, put its hash (see `hash()` in the file) in `HASH`
- `public/trailer.js` — "Watch the trailer" buttons (under the logo and beside About the film) open the YouTube trailer in a player over the darkened page
- `public/site.css`, `menu.js` — shared styles and the menu: Home, About the film, Screenings & Awards, Press, Soundtrack, Community (listed at the top of `menu.js`; the page you are on in italics), and the footer on every page (credits, designer, Instagram, Facebook, IMDb, TMDB; on the homepage at the bottom of the synopsis screen)
- `public/about.html`, `about.css` — directors' statement, the directors' photo (`directors.jpg`), their bios, credits, additional information and contacts
- `public/screenings.html`, `press.html`, `listings.css`, `sheet.js` — Screenings & Awards (Date, Location, Selection, Type) and Press (Date, Publisher, Title, Type; an optional LINK column makes the whole row a link to the article) tables, filled when the page opens from one Google Sheet published to the web as CSV, one tab per page (the tab ids are at the top of `sheet.js`); edits show within a few minutes (Google's servers can send an old copy for a while after an edit); the headings are in the page, grey skeleton bars stand in for the rows until the tab has been read, then the rows fade in
- `public/community.html`, `community.css`, `community.js` — placeholder text and a looping stack of prints (click on computers; tap or swipe either way on phones) (`gallery/01.jpg` … `21.jpg`; to add photos, add the next numbers and raise `data-count` in the page)
- `public/soundtrack.html`, `soundtrack.css`, `soundtrack.js` — one-track player ("The Last Ones (Outro)", Drasko Adzic, `soundtrack.mp3`) with a soundwave, over `bg3.mp4` (grass in the wind, a seamless 3.2 s loop; a plain #7d6f4c until it plays, then it fades in)

New track: replace `public/soundtrack.mp3`, then regenerate the soundwave:

```bash
ffmpeg -v error -i public/soundtrack.mp3 -ac 1 -ar 8000 -f s16le - | python3 -c "import sys,array,json; a=array.array('h',sys.stdin.buffer.read()); n=len(a)//200; p=[max(abs(x) for x in a[i*n:(i+1)*n]) for i in range(200)]; m=max(p); json.dump([round(x/m,3) for x in p],open('public/soundtrack-peaks.json','w'))"
```

Run locally:

```bash
npx serve public
```

Every push to `main` deploys automatically.

- `tools/logo-plain.png` — the logo without glow (the homepage uses `logo-glow.webp`, with a very faint 14% glow baked in; on phones `logo-mobile-glow.webp`, the stacked title from `tools/logo-mobile-plain.png` with the same glow)
