"use client";

import { useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

type RGB = [number, number, number];
type Game = { size: number; cells: number[]; colours: string[]; totals: number[] };
type Level = { name: string; sub: string; size: number; colours: number; icon: string };

const LEVELS: Level[] = [
  { name: "Big pixels", sub: "Easiest", size: 16, colours: 7, icon: "🟨" },
  { name: "Medium pixels", sub: "Just right", size: 24, colours: 10, icon: "✨" },
  { name: "Small pixels", sub: "A challenge", size: 32, colours: 14, icon: "🔍" },
];

const ROCKET = [
  ".....11.....", "....1221....", "....2332....", "...233332...",
  "...234432...", "...234432...", "...233332...", "....2332....",
  "...22..22...", "..3......3..", "............", "............",
];
const ROCKET_COLOURS = ["#ffd83d", "#ff9f1c", "#ff5f58", "#48c8ff"];

function distance(a: RGB, b: RGB) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function hex(rgb: RGB) {
  return `#${rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}

function reduceColours(raw: RGB[], wanted: number) {
  const bins = new Map<string, { rgb: RGB; count: number }>();
  raw.forEach(([r, g, b]) => {
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const item = bins.get(key);
    if (item) {
      item.rgb[0] += r; item.rgb[1] += g; item.rgb[2] += b; item.count += 1;
    } else bins.set(key, { rgb: [r, g, b], count: 1 });
  });
  const samples = [...bins.values()].map((x) => ({
    rgb: x.rgb.map((n) => n / x.count) as RGB, count: x.count,
  })).sort((a, b) => b.count - a.count);

  const palette: RGB[] = [[...(samples[0]?.rgb ?? [255, 255, 255])] as RGB];
  while (palette.length < Math.min(wanted, samples.length)) {
    let pick = samples[0]; let best = -1;
    samples.forEach((sample) => {
      const score = Math.min(...palette.map((p) => distance(sample.rgb, p))) * Math.sqrt(sample.count);
      if (score > best) { best = score; pick = sample; }
    });
    palette.push([...pick.rgb] as RGB);
  }
  for (let pass = 0; pass < 6; pass += 1) {
    const sums = palette.map(() => [0, 0, 0, 0]);
    raw.forEach((pixel) => {
      let nearest = 0;
      palette.forEach((p, i) => { if (distance(pixel, p) < distance(pixel, palette[nearest])) nearest = i; });
      sums[nearest][0] += pixel[0]; sums[nearest][1] += pixel[1]; sums[nearest][2] += pixel[2]; sums[nearest][3] += 1;
    });
    sums.forEach((sum, i) => { if (sum[3]) palette[i] = [sum[0] / sum[3], sum[1] / sum[3], sum[2] / sum[3]]; });
  }
  const order = palette.map((p, i) => ({ i, light: p[0] * .3 + p[1] * .59 + p[2] * .11 })).sort((a, b) => b.light - a.light);
  const remap = new Map(order.map((x, i) => [x.i, i]));
  const cells = raw.map((pixel) => {
    let nearest = 0;
    palette.forEach((p, i) => { if (distance(pixel, p) < distance(pixel, palette[nearest])) nearest = i; });
    return remap.get(nearest) ?? 0;
  });
  return { cells, colours: order.map((x) => hex(palette[x.i])) };
}

async function photoToGame(file: File, level: Level): Promise<Game> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = level.size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  const crop = Math.min(bitmap.width, bitmap.height);
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, level.size, level.size);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - crop) / 2, (bitmap.height - crop) / 2, crop, crop, 0, 0, level.size, level.size);
  bitmap.close();
  const bytes = ctx.getImageData(0, 0, level.size, level.size).data;
  const raw: RGB[] = [];
  for (let i = 0; i < bytes.length; i += 4) raw.push([bytes[i], bytes[i + 1], bytes[i + 2]]);
  const result = reduceColours(raw, level.colours);
  return { ...result, size: level.size, totals: result.colours.map((_, i) => result.cells.filter((x) => x === i).length) };
}

function Logo() {
  return <span className="logo" aria-hidden="true"><i>★</i></span>;
}

export default function Home() {
  const camera = useRef<HTMLInputElement>(null);
  const photos = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const lastCell = useRef(-1);
  const [game, setGame] = useState<Game | null>(null);
  const [filled, setFilled] = useState<boolean[]>([]);
  const [selected, setSelected] = useState(0);
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [wrong, setWrong] = useState(-1);
  const [zoom, setZoom] = useState(1);

  const done = useMemo(() => filled.filter(Boolean).length, [filled]);
  const progress = game ? Math.round(done / game.cells.length * 100) : 0;
  const remaining = useMemo(() => {
    if (!game) return [];
    const left = [...game.totals];
    filled.forEach((yes, i) => { if (yes) left[game.cells[i]] -= 1; });
    return left;
  }, [filled, game]);

  function acceptPhoto(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    if (preview) URL.revokeObjectURL(preview);
    setPending(file); setPreview(URL.createObjectURL(file));
  }

  async function begin(level: Level) {
    if (!pending) return;
    setLoading(true);
    try {
      const next = await photoToGame(pending, level);
      setGame(next); setFilled(Array(next.cells.length).fill(false)); setSelected(0); setZoom(1);
      URL.revokeObjectURL(preview); setPreview(""); setPending(null);
    } finally { setLoading(false); }
  }

  function colourCell(index: number) {
    if (!game || filled[index] || index === lastCell.current) return;
    lastCell.current = index;
    if (game.cells[index] !== selected) {
      setWrong(index); window.setTimeout(() => setWrong(-1), 220); return;
    }
    setFilled((current) => {
      if (current[index]) return current;
      const next = [...current]; next[index] = true;
      if (game.cells.every((c, i) => c !== selected || next[i])) {
        const nextColour = game.colours.findIndex((_, c) => game.cells.some((x, i) => x === c && !next[i]));
        if (nextColour >= 0) setSelected(nextColour);
      }
      if (next.every(Boolean)) window.setTimeout(() => setCelebrate(true), 180);
      return next;
    });
  }

  function pointToCell(event: ReactPointerEvent<HTMLDivElement>) {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-pixel]");
    const index = Number(target?.dataset.pixel);
    if (Number.isInteger(index)) colourCell(index);
  }

  function newPicture() {
    setGame(null); setFilled([]); setCelebrate(false); setPending(null); setPreview("");
  }

  function savePicture() {
    if (!game) return;
    const canvas = document.createElement("canvas"); const px = Math.floor(1024 / game.size);
    canvas.width = canvas.height = px * game.size;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    game.cells.forEach((c, i) => { ctx.fillStyle = game.colours[c]; ctx.fillRect(i % game.size * px, Math.floor(i / game.size) * px, px, px); });
    const link = document.createElement("a"); link.download = "my-pixel-picture.png"; link.href = canvas.toDataURL(); link.click();
  }

  return <main>
    <input ref={camera} className="hidden-input" type="file" accept="image/*" capture="environment" onChange={(e) => acceptPhoto(e.target.files?.[0])} />
    <input ref={photos} className="hidden-input" type="file" accept="image/*" onChange={(e) => acceptPhoto(e.target.files?.[0])} />

    {!game ? <div className="home">
      <header>
        <div className="brand"><Logo/><h1>Pixel <span>Colour</span> Fun</h1></div>
        <button className="privacy" onClick={() => setPrivacy(true)}><b>🛡️</b><span><strong>Private &amp; safe</strong><small>Photos stay on this iPad</small></span></button>
      </header>
      <section className="hero">
        <div className="intro">
          <p className="eyebrow">Make your own pixel magic</p>
          <h2>Turn a photo into pixel art!</h2>
          <p>Snap something you love, then colour it by number.</p>
          <button className="take" onClick={() => camera.current?.click()}>📷 <span>Take a Photo</span></button>
          <button className="choose" onClick={() => photos.current?.click()}>🖼️ <span>Choose a Photo</span></button>
        </div>
        <div className="demo">
          <h3>Your picture becomes pixel art!</h3>
          <div className="sparkles">✦　★　✧　✦</div>
          <div className="demo-grid">
            {ROCKET.join("").split("").map((v, i) => {
              const n = Number(v); const numbered = n > 0 && i % 12 > 6;
              return <i key={i} className={n === 0 ? "blank" : numbered ? "numbered" : ""} style={!n || numbered ? {} : { background: ROCKET_COLOURS[n - 1] }}>{numbered ? n : ""}</i>;
            })}
          </div>
        </div>
      </section>
      <section className="steps">
        <article><b>1</b><i>📷</i><div><h3>Take a photo</h3><p>Anything you like!</p></div></article>
        <article><b>2</b><i>🔢</i><div><h3>Pick a size</h3><p>Big or small pixels</p></div></article>
        <article><b>3</b><i>🖍️</i><div><h3>Colour it in</h3><p>Match the numbers</p></div></article>
      </section>
    </div> : <div className="game">
      <header className="game-head">
        <button className="back" onClick={newPicture} aria-label="Back">‹</button>
        <div className="mini-brand"><Logo/><strong>Pixel Colour Fun</strong></div>
        <div className="progress"><span><b>{progress}%</b> {progress === 100 ? "Amazing!" : "Keep colouring!"}</span><i><b style={{ width: `${progress}%` }}/></i></div>
        <button className="new" onClick={() => camera.current?.click()}>📷 <span>New photo</span></button>
      </header>
      <section className="play">
        <aside>
          <h2>Pick a colour</h2>
          <div className="palette">{game.colours.map((colour, i) => <button key={colour + i} className={`${selected === i ? "selected" : ""} ${remaining[i] === 0 ? "finished" : ""}`} style={{ "--swatch": colour } as CSSProperties} onClick={() => remaining[i] && setSelected(i)}><b>{remaining[i] ? i + 1 : "✓"}</b><span>{remaining[i] ? `${remaining[i]} left` : "Done!"}</span></button>)}</div>
        </aside>
        <div className="board">
          <div className="board-top"><p>Colour every <b>{selected + 1}</b></p><div><button disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - .25))}>−</button><span>{Math.round(zoom * 100)}%</span><button disabled={zoom >= 2} onClick={() => setZoom((z) => Math.min(2, z + .25))}>+</button></div></div>
          <div className="grid-scroll"><div className="pixel-grid" style={{ "--size": game.size, "--zoom": zoom } as CSSProperties}
            onPointerDown={(e) => { drawing.current = true; lastCell.current = -1; e.currentTarget.setPointerCapture(e.pointerId); pointToCell(e); }}
            onPointerMove={(e) => { if (drawing.current) pointToCell(e); }}
            onPointerUp={() => { drawing.current = false; lastCell.current = -1; }}
            onPointerCancel={() => { drawing.current = false; lastCell.current = -1; }}>
            {game.cells.map((colour, i) => <button key={i} data-pixel={i} className={`${filled[i] ? "filled" : ""} ${!filled[i] && colour === selected ? "target" : ""} ${wrong === i ? "wrong" : ""}`} style={{ "--cell": game.colours[colour] } as CSSProperties} onClick={() => colourCell(i)} aria-label={`Pixel number ${colour + 1}`}>{filled[i] ? "" : colour + 1}</button>)}
          </div></div>
        </div>
      </section>
    </div>}

    {pending && preview && <div className="overlay"><section className="size-modal">
      <button className="close" onClick={() => { URL.revokeObjectURL(preview); setPending(null); setPreview(""); }}>×</button>
      <div className="preview"><img src={preview} alt="Chosen photo" /></div>
      <div className="levels"><p className="eyebrow">One more step</p><h2>Choose your pixel size</h2><p>Big pixels are best for your first picture.</p>
        {LEVELS.map((level, i) => <button key={level.size} className={i === 0 ? "recommended" : ""} disabled={loading} onClick={() => begin(level)}><i>{level.icon}</i><span><b>{level.name}</b><small>{level.sub}</small></span>{i === 0 && <em>BEST TO START</em>}<strong>›</strong></button>)}
        {loading && <div className="loading"><i/> Making pixel magic…</div>}
      </div>
    </section></div>}

    {privacy && <div className="overlay"><section className="info"><i>🛡️</i><h2>Made to be safe</h2><p>Photos are changed into pixel art right here on this iPad. They are not uploaded or shared.</p><div><span>✓ No accounts</span><span>✓ No ads</span><span>✓ No public gallery</span></div><button onClick={() => setPrivacy(false)}>Got it!</button></section></div>}

    {celebrate && game && <div className="overlay celebration"><div className="confetti">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties}/>)}</div><section className="complete"><i>⭐</i><p className="eyebrow">Pixel perfect!</p><h2>You made amazing art!</h2><div className="mini-grid" style={{ "--size": game.size } as CSSProperties}>{game.cells.map((c, i) => <i key={i} style={{ background: game.colours[c] }}/>)}</div><div><button onClick={savePicture}>⬇️ Save Picture</button><button onClick={newPicture}>📷 Make Another</button></div></section></div>}
  </main>;
}
