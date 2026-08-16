"use client";

import { Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useState } from "react";
import * as THREE from "three";

import type { Boundary, Earthquake, MapLayers, Plate, Selection } from "../lib/types";

const RADIUS = 1.92;
const boundaryColors: Record<Boundary["type"], string> = {
  convergent: "#fb7185",
  divergent: "#5eead4",
  transform: "#fbbf24",
};

function latLngToVector(lat: number, lng: number, radius = RADIUS): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function stop(event: Pick<ThreeEvent<MouseEvent>, "stopPropagation">) {
  event.stopPropagation();
}

function Coastlines({ land }: { land: MapLayers["land"] }) {
  return (
    <group>
      {land.map((coastline, index) => (
        <Line
          key={`land-${index}`}
          points={coastline.map(([lat, lng]) => latLngToVector(lat, lng, RADIUS + 0.018))}
          color="#8fe1cc"
          lineWidth={0.7}
          transparent
          opacity={0.7}
        />
      ))}
    </group>
  );
}

function PlateBoundaryNetwork({ boundaries }: { boundaries: MapLayers["plateBoundaries"] }) {
  return (
    <group>
      {boundaries.map((boundary) => (
        <Line
          key={boundary.id}
          points={boundary.coordinates.map(([lat, lng]) => latLngToVector(lat, lng, RADIUS + 0.035))}
          color={boundary.type === "subduction" ? "#f97316" : "#5eead4"}
          lineWidth={boundary.type === "subduction" ? 0.95 : 0.55}
          transparent
          opacity={boundary.type === "subduction" ? 0.8 : 0.45}
        />
      ))}
    </group>
  );
}

function PlateLine({ plate, selected, onSelect }: { plate: Plate; selected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const points = useMemo(() => plate.polygon.map(([lat, lng]) => latLngToVector(lat, lng, RADIUS + 0.025)), [plate]);
  const markerPosition = useMemo(
    () => latLngToVector(plate.centroid.lat, plate.centroid.lng, RADIUS + 0.05),
    [plate.centroid],
  );
  const arrow = useMemo(() => {
    const normal = markerPosition.clone().normalize();
    const bearing = THREE.MathUtils.degToRad(plate.velocity.bearing);
    const north = new THREE.Vector3(0, 1, 0);
    const east = new THREE.Vector3().crossVectors(north, normal).normalize();
    const localNorth = new THREE.Vector3().crossVectors(normal, east).normalize();
    return localNorth.multiplyScalar(Math.cos(bearing)).add(east.multiplyScalar(Math.sin(bearing))).normalize();
  }, [markerPosition, plate.velocity.bearing]);
  const active = selected || hovered;

  return (
    <group>
      <Line
        points={points}
        color={active ? "#ffffff" : plate.color}
        lineWidth={active ? 2.6 : 1.15}
        transparent
        opacity={active ? 1 : 0.7}
        onPointerOver={(event) => { stop(event); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
        onClick={(event) => { stop(event); onSelect(); }}
      />
      {(active || selected) && (
        <arrowHelper args={[arrow, markerPosition, 0.32, plate.color, 0.12, 0.08]} />
      )}
      <mesh
        position={markerPosition}
        onPointerOver={(event) => { stop(event); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
        onClick={(event) => { stop(event); onSelect(); }}
      >
        <sphereGeometry args={[active ? 0.055 : 0.03, 16, 16]} />
        <meshBasicMaterial color={plate.color} transparent opacity={active ? 1 : 0.6} />
      </mesh>
    </group>
  );
}

function BoundaryLine({ boundary, selected, onSelect }: { boundary: Boundary; selected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const points = useMemo(
    () => boundary.coordinates.map(([lat, lng]) => latLngToVector(lat, lng, RADIUS + 0.045)),
    [boundary],
  );
  const active = selected || hovered;
  return (
    <Line
      points={points}
      color={active ? "#ffffff" : boundaryColors[boundary.type]}
      lineWidth={active ? 3 : 1.8}
      transparent
      opacity={active ? 1 : 0.9}
      onPointerOver={(event) => { stop(event); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      onClick={(event) => { stop(event); onSelect(); }}
    />
  );
}

function EarthquakeMarker({ event, onSelect }: { event: Earthquake; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const position = useMemo(
    () => latLngToVector(event.coordinates[0], event.coordinates[1], RADIUS + 0.07),
    [event.coordinates],
  );
  const size = 0.02 + event.magnitude * 0.015;
  return (
    <mesh
      position={position}
      onPointerOver={(event) => { stop(event); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      onClick={(event) => { stop(event); onSelect(); }}
    >
      <sphereGeometry args={[hovered ? size * 1.35 : size, 16, 16]} />
      <meshBasicMaterial color="#f8fafc" />
    </mesh>
  );
}

function Earth({ plates, boundaries, earthquakes, mapLayers, showMap, showPlates, showBoundaries, showEarthquakes, selection, setSelection }: GlobeProps) {
  return (
    <>
      <color attach="background" args={["#030914"]} />
      <fog attach="fog" args={["#030914", 6, 12]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 3, 4]} intensity={2.2} color="#c7e2ff" />
      <pointLight position={[-4, -2, -3]} intensity={1.4} color="#075985" />
      <Stars radius={70} depth={30} count={1200} factor={3} saturation={0} fade speed={0.4} />
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 96]} />
        <meshStandardMaterial color="#0c3654" roughness={0.78} metalness={0.05} />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.055} side={THREE.BackSide} />
      </mesh>
      {showMap && <Coastlines land={mapLayers.land} />}
      {showMap && showBoundaries && <PlateBoundaryNetwork boundaries={mapLayers.plateBoundaries} />}
      {showPlates && plates.map((plate) => (
        <PlateLine key={plate.id} plate={plate} selected={selection?.kind === "plate" && selection.item.id === plate.id} onSelect={() => setSelection({ kind: "plate", item: plate })} />
      ))}
      {showBoundaries && boundaries.map((boundary) => (
        <BoundaryLine key={boundary.id} boundary={boundary} selected={selection?.kind === "boundary" && selection.item.id === boundary.id} onSelect={() => setSelection({ kind: "boundary", item: boundary })} />
      ))}
      {showEarthquakes && earthquakes.map((event) => <EarthquakeMarker key={event.id} event={event} onSelect={() => setSelection({ kind: "earthquake", item: event })} />)}
      <OrbitControls enablePan={false} minDistance={2.7} maxDistance={6.5} rotateSpeed={0.55} zoomSpeed={0.7} />
    </>
  );
}

type GlobeProps = {
  plates: Plate[];
  boundaries: Boundary[];
  earthquakes: Earthquake[];
  mapLayers: MapLayers;
  showMap: boolean;
  showPlates: boolean;
  showBoundaries: boolean;
  showEarthquakes: boolean;
  selection: Selection;
  setSelection: (selection: Selection) => void;
};

export function Globe(props: GlobeProps) {
  return (
    <Canvas camera={{ position: [0, 0.3, 5.4], fov: 42 }} dpr={[1, 2]}>
      <Earth {...props} />
    </Canvas>
  );
}
