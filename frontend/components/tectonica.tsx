"use client";

import { useEffect, useMemo, useState } from "react";

import { getEarthquakeFeed, getGlobeData } from "../lib/api";
import type { Boundary, BoundaryType, Earthquake, EarthquakeFeed, MapLayers, Plate, Selection } from "../lib/types";
import { Globe } from "./globe";

const boundaryCopy = {
  convergent: "plates meet",
  divergent: "plates separate",
  transform: "plates slide past",
};

const explanationSteps: Record<BoundaryType, string[]> = {
  convergent: ["Plates move toward one another.", "The crust compresses, folds, or one plate subducts.", "Mountains, volcanoes, and earthquakes develop along the boundary."],
  divergent: ["Plates pull away from one another.", "Hot mantle material rises and melts as pressure drops.", "Magma cools into fresh crust, widening the gap."],
  transform: ["Plates attempt to slide sideways past each other.", "Friction temporarily locks parts of the fault.", "Built-up stress releases suddenly as an earthquake."],
};

function Toggle({ pressed, children, onClick }: { pressed: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-semibold tracking-wide transition ${pressed ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100" : "border-slate-600/70 bg-slate-950/40 text-slate-400 hover:border-slate-400"}`}
    >
      {children}
    </button>
  );
}

function InfoPanel({ selection, plates, onExplain }: { selection: Selection; plates: Plate[]; onExplain: (boundary: Boundary) => void }) {
  if (!selection) {
    return (
      <section className="rounded-2xl border border-slate-700/70 bg-slate-950/60 p-5 shadow-2xl backdrop-blur-md sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Explore a living Earth</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-white sm:text-4xl">Every boundary tells a story.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">Rotate the globe, then select a luminous boundary or a plate outline to uncover the forces shaping Earth’s surface.</p>
        <div className="mt-6 space-y-2 border-t border-slate-700/70 pt-4 text-xs text-slate-400">
          <p><span className="mr-2 text-rose-400">━</span>Convergent · plates meet</p>
          <p><span className="mr-2 text-teal-300">━</span>Divergent · plates separate</p>
          <p><span className="mr-2 text-amber-300">━</span>Transform · plates slide past</p>
        </div>
      </section>
    );
  }

  if (selection.kind === "plate") {
    const plate = selection.item;
    const neighbors = plate.neighbors.map((id) => plates.find((candidate) => candidate.id === id)?.name).filter(Boolean).join(" · ");
    return (
      <section className="rounded-2xl border border-slate-700/70 bg-slate-950/75 p-5 shadow-2xl backdrop-blur-md sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: plate.color }}>Selected plate</p>
        <h2 className="mt-2 text-3xl text-white">{plate.name}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{plate.summary}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-700/70 py-4 text-sm">
          <div><p className="text-xs uppercase tracking-wider text-slate-500">Motion</p><p className="mt-1 text-white">≈ {plate.velocity.magnitude} cm/year</p></div>
          <div><p className="text-xs uppercase tracking-wider text-slate-500">Direction</p><p className="mt-1 text-white">{plate.velocity.direction}</p></div>
        </div>
        <p className="mt-4 text-xs uppercase tracking-wider text-slate-500">Neighboring plates</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{neighbors}</p>
      </section>
    );
  }

  if (selection.kind === "boundary") {
    const boundary = selection.item;
    return (
      <section className="rounded-2xl border border-slate-700/70 bg-slate-950/75 p-5 shadow-2xl backdrop-blur-md sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">{boundary.type} boundary · {boundaryCopy[boundary.type]}</p>
        <h2 className="mt-2 text-3xl text-white">{boundary.name}</h2>
        <p className="mt-4 text-sm leading-6 text-slate-300">{boundary.description}</p>
        <button type="button" onClick={() => onExplain(boundary)} className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">Why is this happening? →</button>
      </section>
    );
  }

  const event = selection.item;
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-950/75 p-5 shadow-2xl backdrop-blur-md sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Earthquake</p>
      <h2 className="mt-2 text-3xl text-white">M {event.magnitude.toFixed(1)}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{event.place}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-700/70 pt-4 text-sm"><div><p className="text-xs uppercase text-slate-500">Depth</p><p className="mt-1 text-white">{event.depthKm} km</p></div><div><p className="text-xs uppercase text-slate-500">Date</p><p className="mt-1 text-white">{event.date}</p></div></div>
      <p className="mt-4 text-xs uppercase tracking-wider text-cyan-200">{event.source === "usgs" ? "Live event · USGS" : "Curated fallback event"}</p>
    </section>
  );
}

export function Tectonica() {
  const [plates, setPlates] = useState<Plate[]>([]);
  const [boundaries, setBoundaries] = useState<Boundary[]>([]);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [earthquakeFeed, setEarthquakeFeed] = useState<EarthquakeFeed | null>(null);
  const [mapLayers, setMapLayers] = useState<MapLayers>({ land: [], plateBoundaries: [] });
  const [selection, setSelection] = useState<Selection>(null);
  const [explaining, setExplaining] = useState<Boundary | null>(null);
  const [showPlates, setShowPlates] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showEarthquakes, setShowEarthquakes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGlobeData().then(([nextPlates, nextBoundaries, nextEarthquakeFeed, nextMapLayers]) => {
      setPlates(nextPlates); setBoundaries(nextBoundaries); setEarthquakes(nextEarthquakeFeed.events); setEarthquakeFeed(nextEarthquakeFeed); setMapLayers(nextMapLayers);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load geological data."));
  }, []);

  useEffect(() => {
    const refresh = () => getEarthquakeFeed().then((feed) => {
      setEarthquakes(feed.events); setEarthquakeFeed(feed);
    }).catch(() => undefined);
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const featured = useMemo(() => boundaries.filter((boundary) => ["himalayas", "andes", "san-andreas", "mid-atlantic", "east-african-rift"].includes(boundary.id)), [boundaries]);

  return (
    <main className="relative h-dvh min-h-[620px] overflow-hidden bg-ink">
      <div className="absolute inset-0"><Globe plates={plates} boundaries={boundaries} earthquakes={earthquakes} mapLayers={mapLayers} showMap={showMap} showPlates={showPlates} showBoundaries={showBoundaries} showEarthquakes={showEarthquakes} selection={selection} setSelection={setSelection} /></div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#030914]/90 to-transparent" />
      <header className="absolute left-5 right-5 top-5 z-10 flex items-start justify-between sm:left-8 sm:right-8 sm:top-8">
        <div><p className="text-lg font-semibold tracking-[0.22em] text-white">TECTONICA</p><p className="mt-1 text-xs tracking-wide text-slate-400">A living atlas of Earth</p></div>
        <button type="button" onClick={() => { setSelection(null); setExplaining(null); }} className="rounded-full border border-slate-600 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 backdrop-blur hover:bg-slate-800">Reset view</button>
      </header>
      <div className="absolute left-5 top-28 z-10 flex max-w-[calc(100%-2.5rem)] flex-wrap gap-2 sm:left-8 sm:top-32">
        <Toggle pressed={showMap} onClick={() => setShowMap(!showMap)}>Map</Toggle>
        <Toggle pressed={showPlates} onClick={() => setShowPlates(!showPlates)}>Plates</Toggle>
        <Toggle pressed={showBoundaries} onClick={() => setShowBoundaries(!showBoundaries)}>Boundaries</Toggle>
        <Toggle pressed={showEarthquakes} onClick={() => setShowEarthquakes(!showEarthquakes)}>Earthquakes {earthquakeFeed?.source === "usgs" ? "· Live" : ""}</Toggle>
      </div>
      <aside className="panel-scroll absolute bottom-5 left-5 z-10 max-h-[50dvh] w-[calc(100%-2.5rem)] overflow-y-auto sm:bottom-8 sm:left-8 sm:max-h-[calc(100dvh-12rem)] sm:w-[360px]">
        {error ? <section className="rounded-2xl border border-rose-400/40 bg-slate-950/85 p-5 text-sm text-slate-200">{error}<p className="mt-2 text-slate-400">The map expects <code>http://localhost:8000</code>. Check that address directly, then refresh.</p></section> : <InfoPanel selection={selection} plates={plates} onExplain={setExplaining} />}
        {earthquakeFeed && <p className="mt-3 px-1 text-xs text-slate-400">{earthquakeFeed.source === "usgs" ? "Live USGS feed · refreshed every minute" : "Using curated fallback events · USGS is temporarily unavailable"}</p>}
      </aside>
      <nav aria-label="Featured geological regions" className="absolute bottom-5 right-5 z-10 hidden max-w-[42rem] gap-2 sm:bottom-8 sm:right-8 sm:flex sm:flex-wrap sm:justify-end">
        {featured.map((boundary) => <button key={boundary.id} type="button" onClick={() => setSelection({ kind: "boundary", item: boundary })} className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300 backdrop-blur transition hover:border-cyan-300 hover:text-white">{boundary.name}</button>)}
      </nav>
      {!error && plates.length === 0 && <p className="absolute inset-x-0 bottom-7 z-10 text-center text-xs tracking-wide text-slate-400">Loading Earth’s moving surface…</p>}
      {explaining && <section role="dialog" aria-modal="true" aria-label={`Why ${explaining.name} exists`} className="absolute inset-x-5 top-1/2 z-20 mx-auto w-auto max-w-lg -translate-y-1/2 rounded-2xl border border-cyan-200/40 bg-slate-950/95 p-6 shadow-2xl backdrop-blur sm:inset-x-0">
        <button type="button" onClick={() => setExplaining(null)} className="absolute right-4 top-4 text-sm text-slate-400 hover:text-white" aria-label="Close explanation">Close</button>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Why this is happening</p>
        <h2 className="mt-2 pr-14 text-3xl text-white">{explaining.name}</h2>
        <ol className="mt-6 space-y-4">{explanationSteps[explaining.type].map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-slate-200"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-xs font-bold text-cyan-200">{index + 1}</span>{step}</li>)}</ol>
        <p className="mt-6 border-t border-slate-700 pt-4 text-sm leading-6 text-slate-300">{explaining.description}</p>
      </section>}
    </main>
  );
}
