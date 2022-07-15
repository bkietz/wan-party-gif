import { geoDistance, geoBounds, geoCentroid, geoCircle } from "d3-geo";
import { Style } from "./style.js";
import type {
  Position,
  MultiLineString,
  Polygon,
} from "geojson";

import {
  DynGeometry,
  rect,
  grid,
  arc,
  rotate,
  line,
  translate,
  scale,
  inset,
  adjacentPairs,
  DEG,
} from "./geometry.js";

import { surfaceRotation, absoluteRotation } from "./rotation.js";

export const geometries: DynGeometry[] = [];

function multiLineString(...coordinates: Position[][]): MultiLineString {
  return { type: "MultiLineString", coordinates };
}

function polygon(...coordinates: Position[][]): Polygon {
  // confusingly, a Polygon's coordinates are *multiple* arrays of Positions;
  // the actual shape is considered the union of the individual "rings",
  // which are contiguous areas whose borders are a string of Positions.
  return { type: "Polygon", coordinates };
}

const land0: Style = Style.from({ fillStyle: "#143f27" });
const land1: Style = Style.from({ fillStyle: "#2e8b57" });

// incrementally-built feature for evoking lights on the night side of the planet
const nightLines: [Position, Position][] = [];

function pushNightLines(...points: Position[]) {
  nightLines.push(...adjacentPairs(points));
}

function pushNightCrossHatching(spacing: number, ...points: Position[]) {
  let [[x0, y0], [x1, y1]] = geoBounds({ type: "Polygon", coordinates: [points] });
  let [dx, dy] = [x1 - x0, y1 - y0];
  let [cx, cy] = [x0 + dx / 2, y0 + dy / 2];

  const nx = Math.floor(dx / 2 / spacing);
  for (let i = -nx; i <= nx; ++i) {
    const x = cx + i * spacing + Math.random() * spacing;
    if (x <= x0 || x >= x1) {
      //--i;
      continue;
    }
    // vertical lines
    pushNightLines(...line(
      x,
      y0 + Math.random() * dy / 3 + spacing,
      x,
      y1 - Math.random() * dy / 3 - spacing
    ));
  }

  const ny = Math.floor(dy / 2 / spacing);
  for (let i = -ny; i <= ny; ++i) {
    const y = cy + i * spacing + Math.random() * spacing;
    if (y <= y0 || y >= y1) {
      //--i;
      continue;
    }
    // horizontal lines
    pushNightLines(...line(
      x0 + Math.random() * dx / 3 + spacing,
      y,
      x1 - Math.random() * dx / 3 - spacing,
      y
    ));
  }
}

// ocean
geometries.push({
  geometry: polygon([...line(0, 89, 360, 89)]),
  style: Style.from({ fillStyle: "darkblue" }),
});

// ice caps
geometries.push({
  geometry: geoCircle()
    .center([0, 90,])
    .radius(20)
    (),
  style: Style.from({ fillStyle: "white" }),
});
geometries.push({
  geometry: geoCircle()
    .center([0, -90,])
    .radius(30)
    (),
  style: Style.from({ fillStyle: "white" }),
});

function mouse(points: Iterable<Position>): Iterable<Position> {
  return translate(160, -40, points);
}

// mouse
geometries.push({
  geometry: polygon([...mouse(rect(0, 0, 30, 50, 10))]),
  style: land0
});
for (let [x, y] of grid(2, 2)) {
  pushNightCrossHatching(5, ...mouse(rect(x * 15, y * 15, 15, 15)));
}

// mouse buttons
for (let x of [4, 16]) {
  const points = [...mouse(rect(x, 30, 10, 15, 2))];
  geometries.push({
    geometry: polygon(points),
    style: Style.from({
      fillStyle: land1.fillStyle + (x == 4 ? 'ff' : '99'),
    }),
  });

  pushNightLines(...inset(-0.5, points));
  pushNightCrossHatching(3, ...points);
}

// mouse cord (only visible at night)
pushNightLines(...translate(-15, 30, mouse([
  ...arc(0, 40, 10, 185, 0),
  ...arc(20, 40, 10, 180, 270),
  ...arc(20, 20, 10, 90, -20),
])));

function keeb(points: Iterable<Position>): Iterable<Position> {
  return translate(0, -45, scale(0, 0, 1.5, points));
}

// keyboard
geometries.push({
  geometry: polygon([...keeb(rect(0, 0, 95, 50, 5))]),
  style: land0,
});

// keyboard's keys
for (let [x, y] of grid(8, 4)) {
  const spacing = 11,
    size = 8,
    rounding = 2;

  let isSpacebarOccluded = (y == 0 && x > 3 && x <= 6);
  if (isSpacebarOccluded) continue;

  let isSpacebar = (y == 0 && x == 3);


  let isWasd = (y == 1 && (x == 0 || x == 1 || x == 2)) || (y == 2 && x == 1);

  const s = (x + y) / (10 + 4);
  const alpha = Math.floor(255 * s).toString(16);

  const points = [...keeb(rect(
    size / 2 + spacing * x,
    size / 2 + spacing * y,
    size + (isSpacebar ? spacing * 3 : 0),
    size,
    rounding
  ))];

  geometries.push({
    geometry: polygon(points),
    style: Style.from({
      fillStyle: land1.fillStyle + (isWasd || isSpacebar ? "ff" : alpha),
    }),
  });

  pushNightLines(...inset(-0.5, points));
  pushNightCrossHatching(isWasd || isSpacebar ? 1 : 4, ...points);
}

function gamepad(points: Iterable<Position>): Iterable<Position> {
  return translate(235, 30, scale(0, 90, 1.3, points));
}

geometries.push({
  geometry: polygon([...gamepad(rect(0, 0, 80, 40, 5))]),
  style: land0,
});

const handleCentroids: Position[] = [];
for (let [x, y, theta] of [
  [-10, -10, -20],
  [70, -17, 20],
]) {
  const points = [...gamepad(
    translate(x, y,
      rotate(0, 0, theta,
        rect(0, 0, 20, 35, 10)
      )))];

  const geometry = polygon(points);
  handleCentroids.push(geoCentroid(geometry));

  geometries.push({ geometry, style: land0 });
}

// gamepad's dpad
let dpadCentroid: Position;
for (let [width, length] of [[5, 15], [15, 5]]) {
  let points = [...gamepad(rect(17 - length / 2, 25 - width / 2, length, width, 1))];
  const geometry = polygon(points)
  dpadCentroid = geoCentroid(geometry);
  geometries.push({ geometry, style: land1 });
  pushNightCrossHatching(1, ...points);
}


// gamepad's buttons
let buttonCentroids: Position[] = [];
for (let [x, y] of grid(2, 2)) {
  const spacing = 6;

  const geometry = geoCircle()
    .center([
      55 + spacing * (x + y),
      25 + spacing * (x - y),
    ])
    .radius(3)
    ();

  geometry.coordinates[0] = [...gamepad(geometry.coordinates[0])];

  //const geometry = polygon(points);
  buttonCentroids.push(geoCentroid(geometry));

  geometries.push({
    geometry,
    style: Style.from({
      fillStyle: `#2e8b57${x == 0 ? "ff" : "88"}`
    }),
  });

  pushNightLines(...inset(-0.5, geometry.coordinates[0]));
  pushNightCrossHatching(x == 0 ? 1 : 1.5, ...geometry.coordinates[0]);
}

let thumbstickCentroids: Position[] = [];
for (let x of [28, 47]) {
  const geometry = geoCircle()
    .center([x, 11])
    .radius(4.5)
    ();
  geometry.coordinates[0] = [...gamepad(geometry.coordinates[0])];

  thumbstickCentroids.push(geoCentroid(geometry));

  geometries.push({ geometry, style: land1 });
  pushNightLines(...inset(-0.5, geometry.coordinates[0]));
  pushNightCrossHatching(1, ...geometry.coordinates[0]);
}

let mainCentroid: Position = [dpadCentroid[0] + 20, dpadCentroid[1]];

pushNightLines(
  handleCentroids[0],
  dpadCentroid,
  mainCentroid,
  thumbstickCentroids[0],
  thumbstickCentroids[1],
  buttonCentroids[0],
  buttonCentroids[3],
  handleCentroids[1],
);

// night-time features
function nightCenter(t: number): Position {
  // since we're painting this with all the surface features,
  // subtract the surface features' rotation which will be added later
  return [absoluteRotation(t) - surfaceRotation(t), 0];
}

geometries.push({
  geometry: (t) => {
    function* filtered() {
      const center = nightCenter(t);

      for (let [p0, p1] of nightLines) {
        type LatLong = [number, number];

        if (geoDistance(p0 as LatLong, center as LatLong) > 83 * DEG) {
          continue;
        }

        if (geoDistance(p1 as LatLong, center as LatLong) > 83 * DEG) {
          continue;
        }

        yield [p0, p1];
      }
    }

    return multiLineString(...filtered());
  },
  style: Style.from({ strokeStyle: "yellow" }),
});

geometries.push({
  geometry: (t: number) => geoCircle()
    .center(nightCenter(t) as [number, number])
    .radius(87)
    (),
  style: Style.from({ fillStyle: "#000a" }),
});
