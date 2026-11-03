# To Hold a Mountain

Static website, served by Render from `public/` (no build step).

- `public/index.html`, `style.css`, `main.js` — homepage: logo over the sky photo (`sky.webp`), the storm clouds (`clouds.webp`, a seamless sideways tile drifting steadily with the wind; held (CSS sticky) over the top third of the video while it plays, lifting away as it zooms into the lake, made from the storm photo by `tools/clouds.py`: a top edge shaped by the cloud forms, softened toward the film's overcast sky lower down, the thick middle extended, the bottom faded) scroll up over it carrying the logline and two press quotes (Screen Daily, then Variety; logos `press-*.png`), each cross-fading into the next and fade onto the film clip (`bg2.mp4`: 1920×1072, H.264, a full frame every 10 frames so scrolling can jump around in it quickly, no audio), which plays as you scroll and, in its second half, zooms and blurs into the lake; as the lake blurs out, the poster (`poster.webp`), the synopsis and a button to About the film come into focus in place, on the lake's colour (`--lake`), and the page ends there. A loading screen (blurred sky, small bar) holds the page until fonts, images and the clip are loaded; then the logo comes into focus
- `public/site.css`, `menu.js` — shared styles and the menu: Homepage, Screenings & Awards, Press, About the film, Community, Soundtrack (listed at the top of `menu.js`)
- `public/about.html`, `about.css` — directors' statement, the directors' photo (`directors.jpg`), their bios, credits and additional information
- `public/screenings.html`, `screenings.css` — festivals table (Date, Location, Selection, Type)
- `public/press.html` — empty page for now
- `public/community.html`, `community.css`, `community.js` — placeholder text and a looping stack of prints (click on computers; tap or swipe either way on phones) (`gallery/01.jpg` … `21.jpg`; to add photos, add the next numbers and raise `data-count` in the page)
- `public/soundtrack.html`, `soundtrack.css`, `soundtrack.js` — one-track player ("The Last Ones (Outro)", Drasko Adzic, `soundtrack.mp3`) with a soundwave, over `bg3.mp4` (grass in the wind, a seamless 3.2 s loop)

New track: replace `public/soundtrack.mp3`, then regenerate the soundwave:

```bash
ffmpeg -v error -i public/soundtrack.mp3 -ac 1 -ar 8000 -f s16le - | python3 -c "import sys,array,json; a=array.array('h',sys.stdin.buffer.read()); n=len(a)//200; p=[max(abs(x) for x in a[i*n:(i+1)*n]) for i in range(200)]; m=max(p); json.dump([round(x/m,3) for x in p],open('public/soundtrack-peaks.json','w'))"
```

Run locally:

```bash
npx serve public
```

Every push to `main` deploys automatically.
