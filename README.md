# To Hold a Mountain

Static website, served by Render from `public/` (no build step).

- `public/index.html`, `style.css`, `main.js` — homepage: sky photo, logo, cloud bank carrying the film clip up as you scroll
- `public/site.css`, `menu.js` — shared styles and the menu (its items are listed at the top of `menu.js`)
- `public/screenings.html`, `press.html`, `about.html` — empty pages for now
- `public/soundtrack.html`, `soundtrack.css`, `soundtrack.js` — one-track player with a soundwave
- `tools/clouds.py` — generates `cloud-1/2/3.webp` (needs numpy and Pillow)

New track: replace `public/soundtrack.mp3`, then regenerate the soundwave:

```bash
ffmpeg -v error -i public/soundtrack.mp3 -ac 1 -ar 8000 -f s16le - | python3 -c "import sys,array,json; a=array.array('h',sys.stdin.buffer.read()); n=len(a)//200; p=[max(abs(x) for x in a[i*n:(i+1)*n]) for i in range(200)]; m=max(p); json.dump([round(x/m,3) for x in p],open('public/soundtrack-peaks.json','w'))"
```

Run locally:

```bash
npx serve public
```

Every push to `main` deploys automatically.
