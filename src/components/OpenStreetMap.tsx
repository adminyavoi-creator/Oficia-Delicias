import React, { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Space, formatMoney } from '../data';

type Point = { x: number; y: number };
type Center = { latitude: number; longitude: number };
const TILE_SIZE = 256;
const INITIAL_CENTER: Center = { latitude: 28.195, longitude: -105.469 };
const INITIAL_ZOOM = 12;

function project({ latitude, longitude }: Center, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(-85.0511, Math.min(85.0511, latitude));
  return {
    x: ((longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * scale,
  };
}

function unproject({ x, y }: Point, zoom: number): Center {
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    longitude: (x / scale) * 360 - 180,
    latitude: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI,
  };
}

export function OpenStreetMap({ spaces, onSelect }: { spaces: Space[]; onSelect: (space: Space) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; center: Point; moved: boolean } | null>(null);
  const suppressMarkerClick = useRef(false);
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const locations = useMemo(() => spaces.filter(space => Number.isFinite(space.latitude) && Number.isFinite(space.longitude)), [spaces]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const updateSize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    updateSize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateSize);
    observer?.observe(element);
    window.addEventListener('resize', updateSize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateSize); };
  }, []);

  const centerWorld = project(center, zoom);
  const origin = { x: centerWorld.x - size.width / 2, y: centerWorld.y - size.height / 2 };
  const tileGrid = useMemo(() => {
    if (!size.width || !size.height) return [];
    const firstX = Math.floor(origin.x / TILE_SIZE);
    const lastX = Math.floor((origin.x + size.width) / TILE_SIZE);
    const firstY = Math.floor(origin.y / TILE_SIZE);
    const lastY = Math.floor((origin.y + size.height) / TILE_SIZE);
    const tileCount = 2 ** zoom;
    const visible = [] as { key: string; url: string; left: number; top: number }[];
    for (let x = firstX; x <= lastX; x += 1) {
      for (let y = Math.max(0, firstY); y <= Math.min(tileCount - 1, lastY); y += 1) {
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        visible.push({
          key: `${zoom}/${wrappedX}/${y}`,
          url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          left: x * TILE_SIZE - origin.x,
          top: y * TILE_SIZE - origin.y,
        });
      }
    }
    return visible;
  }, [origin.x, origin.y, size.width, size.height, zoom]);

  const moveCenter = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    setCenter(unproject({ x: drag.center.x - dx, y: drag.center.y - dy }, zoom));
  };

  const markers = locations.map(space => {
    const point = project({ latitude: space.latitude!, longitude: space.longitude! }, zoom);
    const worldWidth = TILE_SIZE * 2 ** zoom;
    let dx = point.x - centerWorld.x;
    if (dx > worldWidth / 2) dx -= worldWidth;
    if (dx < -worldWidth / 2) dx += worldWidth;
    const left = size.width / 2 + dx;
    const top = size.height / 2 + point.y - centerWorld.y;
    return { space, left, top };
  }).filter(marker => marker.left > -100 && marker.left < size.width + 100 && marker.top > -60 && marker.top < size.height + 50);

  return <div
    ref={mapRef}
    className="osm-map"
    role="application"
    aria-label="Mapa de espacios de Oficia"
    onPointerDown={event => {
      if ((event.target as HTMLElement).closest('button, a')) return;
      dragRef.current = { x: event.clientX, y: event.clientY, center: centerWorld, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={moveCenter}
    onPointerUp={() => { suppressMarkerClick.current = Boolean(dragRef.current?.moved); dragRef.current = null; window.setTimeout(() => { suppressMarkerClick.current = false; }, 0); }}
    onPointerCancel={() => { dragRef.current = null; }}
  >
    <div className="osm-map-tiles" aria-hidden="true">
      {tileGrid.map(tile => <img key={tile.key} src={tile.url} alt="" draggable={false} className="osm-map-tile" style={{ left: tile.left, top: tile.top }} />)}
    </div>
    {markers.map(({ space, left, top }) => <button
      key={space.id}
      type="button"
      className="osm-price-marker"
      style={{ left, top }}
      aria-label={`${space.name}, ${formatMoney(space.rate.Hora)} por hora${space.isDemo ? ', ubicación y precio de muestra' : ''}`}
      onClick={() => { if (suppressMarkerClick.current) { suppressMarkerClick.current = false; return; } onSelect(space); }}
    >
      <strong>{formatMoney(space.rate.Hora)}<small>/h</small></strong>
      {space.isDemo ? <span>Muestra</span> : null}
    </button>)}
    <div className="osm-map-controls">
      <button type="button" aria-label="Acercar mapa" onClick={() => setZoom(value => Math.min(17, value + 1))}>+</button>
      <button type="button" aria-label="Alejar mapa" onClick={() => setZoom(value => Math.max(9, value - 1))}>−</button>
      <button type="button" aria-label="Centrar mapa en Delicias" onClick={() => { setCenter(INITIAL_CENTER); setZoom(INITIAL_ZOOM); }}>⌖</button>
    </div>
    <a className="osm-map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    {!locations.length ? <div className="osm-map-empty">Aún no hay espacios con ubicación</div> : null}
  </div>;
}
