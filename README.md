# To Hold a Mountain

Static website, served by Render from `public/` (no build step).

- `public/index.html`, `style.css`, `main.js` — homepage: logo over the sky photo (`sky.webp`), the storm clouds (`clouds.webp`, made from the storm photo by `tools/clouds.py`: a top edge shaped by the cloud forms, softened toward the film's overcast sky lower down, the thick middle extended, the bottom faded) scroll up over it carrying the text and fade onto the film clip, which plays as you scroll. A loading screen (blurred sky, small bar) holds the page until fonts, images and the clip are loaded; then the logo comes into focus
- `public/site.css`, `menu.js` — shared styles and the menu (its items are listed at the top of `menu.js`)
- `public/screenings.html`, `press.html`, `about.html` — empty pages for now
- `public/soundtrack.html`, `soundtrack.css`, `soundtrack.js` — one-track player with a soundwave

New track: replace `public/soundtrack.mp3`, then regenerate the soundwave:

```bash
ffmpeg -v error -i public/soundtrack.mp3 -ac 1 -ar 8000 -f s16le - | python3 -c "import sys,array,json; a=array.array('h',sys.stdin.buffer.read()); n=len(a)//200; p=[max(abs(x) for x in a[i*n:(i+1)*n]) for i in range(200)]; m=max(p); json.dump([round(x/m,3) for x in p],open('public/soundtrack-peaks.json','w'))"
```

Run locally:

```bash
npx serve public
```

Every push to `main` deploys automatically.
