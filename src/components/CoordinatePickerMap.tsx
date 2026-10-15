import React, { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

type Point = { x: number; y: number };
type Coordinate = { latitude: number; longitude: number };
type DragState = { mode: 'map' | 'marker'; x: number; y: number; center: Point; moved: boolean };
const TILE_SIZE = 256;
const DELICIAS: Coordinate = { latitude: 28.195, longitude: -105.469 };
const INITIAL_ZOOM = 15;

function project({ latitude, longitude }: Coordinate, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(-85.0511, Math.min(85.0511, latitude));
  return {
    x: ((longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * scale,
  };
}

function unproject({ x, y }: Point, zoom: number): Coordinate {
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    longitude: (x / scale) * 360 - 180,
    latitude: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI,
  };
}

export function CoordinatePickerMap({ latitude, longitude, onChange }: {
  latitude: number | null; longitude: number | null; onChange: (coordinate: Coordinate) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [center, setCenter] = useState<Coordinate>(() => latitude != null && longitude != null ? { latitude, longitude } : DELICIAS);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const selected = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
  const marker = selected ? { latitude: latitude!, longitude: longitude! } : center;

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

  useEffect(() => {
    if (!selected || dragRef.current?.mode === 'marker') return;
    setCenter({ latitude: latitude!, longitude: longitude! });
  }, [latitude, longitude, selected]);

  const centerWorld = project(center, zoom);
  const origin = { x: centerWorld.x - size.width / 2, y: centerWorld.y - size.height / 2 };
  const tileGrid = useMemo(() => {
    if (!size.width || !size.height) return [];
    const firstX = Math.floor(origin.x / TILE_SIZE);
    const lastX = Math.floor((origin.x + size.width) / TILE_SIZE);
    const firstY = Math.floor(origin.y / TILE_SIZE);
    const lastY = Math.floor((origin.y + size.height) / TILE_SIZE);
    const visible = [] as { key: string; url: string; left: number; top: number }[];
    for (let x = firstX; x <= lastX; x += 1) for (let y = Math.max(0, firstY); y <= Math.min(2 ** zoom - 1, lastY); y += 1) {
      const wrappedX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
      visible.push({ key: `${zoom}/${wrappedX}/${y}`, url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`, left: x * TILE_SIZE - origin.x, top: y * TILE_SIZE - origin.y });
    }
    return visible;
  }, [origin.x, origin.y, size.width, size.height, zoom]);

  const markerWorld = project(marker, zoom);
  let markerDx = markerWorld.x - centerWorld.x;
  const worldWidth = TILE_SIZE * 2 ** zoom;
  if (markerDx > worldWidth / 2) markerDx -= worldWidth;
  if (markerDx < -worldWidth / 2) markerDx += worldWidth;
  const markerLeft = size.width / 2 + markerDx;
  const markerTop = size.height / 2 + markerWorld.y - centerWorld.y;

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.mode === 'map') {
      setCenter(unproject({ x: drag.center.x - dx, y: drag.center.y - dy }, zoom));
      return;
    }
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    onChange(unproject({ x: event.clientX - rect.left + origin.x, y: event.clientY - rect.top + origin.y }, zoom));
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved && drag.mode === 'map') {
      const rect = mapRef.current?.getBoundingClientRect();
      if (rect) onChange(unproject({ x: event.clientX - rect.left + origin.x, y: event.clientY - rect.top + origin.y }, zoom));
    }
    dragRef.current = null;
  };

  return <div
    ref={mapRef}
    className="osm-picker-map"
    role="application"
    aria-label="Mapa para elegir la ubicación del espacio"
    onPointerDown={event => {
      if ((event.target as HTMLElement).closest('button, a')) return;
      dragRef.current = { mode: 'map', x: event.clientX, y: event.clientY, center: centerWorld, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={updateFromPointer}
    onPointerUp={finishPointer}
    onPointerCancel={() => { dragRef.current = null; }}
  >
    <div className="osm-picker-tiles" aria-hidden="true">{tileGrid.map(tile => <img key={tile.key} src={tile.url} alt="" draggable={false} className="osm-picker-tile" style={{ left: tile.left, top: tile.top }} />)}</div>
    <button
      type="button"
      className="osm-location-marker"
      style={{ left: markerLeft, top: markerTop }}
      aria-label="Arrastrar el marcador a la ubicación del espacio"
      title="Arrastra el pin para ajustar la ubicación"
      onPointerDown={event => {
        event.preventDefault();
        event.stopPropagation();
        dragRef.current = { mode: 'marker', x: event.clientX, y: event.clientY, center: centerWorld, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange(marker);
      }}
      onPointerMove={event => updateFromPointer(event as unknown as PointerEvent<HTMLDivElement>)}
      onPointerUp={event => finishPointer(event as unknown as PointerEvent<HTMLDivElement>)}
      onPointerCancel={() => { dragRef.current = null; }}
    >
      <span aria-hidden="true">●</span>
    </button>
    <div className="osm-picker-controls">
      <button type="button" aria-label="Acercar mapa" onClick={() => setZoom(value => Math.min(19, value + 1))}>+</button>
      <button type="button" aria-label="Alejar mapa" onClick={() => setZoom(value => Math.max(10, value - 1))}>−</button>
      <button type="button" aria-label="Centrar el mapa en Delicias" onClick={() => setCenter(DELICIAS)}>⌖</button>
    </div>
    <a className="osm-picker-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
  </div>;
}
