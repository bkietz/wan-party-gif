import type {
  Position,
  Geometry,
} from 'geojson';

import type { Style } from "./style.js";

export type DynGeometry = {
  geometry: Geometry | ((t: number) => Geometry);
  style: Style;
};

export const DEG = Math.PI / 180;

export function sin(theta: number): number {
  return Math.sin(theta * DEG);
}

export function cos(theta: number): number {
  return Math.cos(theta * DEG);
}

const FINENESS = 1 / 5;

export function* translate(dx, dy, points: Iterable<Position>): Iterable<Position> {
  for (let [x, y] of points) {
    yield [x + dx, y + dy];
  }
}

export function* rotate(cx, cy, theta, points: Iterable<Position>): Iterable<Position> {
  const [c, s] = [cos(theta), sin(theta)];
  for (let [x, y] of points) {
    let [dx, dy] = [x - cx, y - cy];
    [dx, dy] = [dx * c - dy * s, dy * c + dx * s];
    yield [cx + dx, cy + dy];
  }
}

export function* scale(cx, cy, factor, points: Iterable<Position>): Iterable<Position> {
  for (let [x, y] of points) {
    let [dx, dy] = [x - cx, y - cy];
    [dx, dy] = [dx * factor, dy * factor];
    yield [cx + dx, cy + dy];
  }
}

export function* adjacentPairs<T>(iter: Iterable<T>): Iterable<[T, T]> {
  let t0: T;
  for (let t1 of iter) {
    if (t0 !== undefined) {
      yield [t0, t1];
    }
    t0 = t1;
  }
}

export function* inset(dist: number, points: Iterable<Position>): Iterable<Position> {
  let p0: Position, p1: Position;

  for (let [[x0, y0], [x1, y1]] of adjacentPairs(points)) {
    let [dx, dy] = [x1 - x0, y1 - y0];
    [dx, dy] = [-dy, dx];
    let ds = (dx ** 2 + dy ** 2) ** 0.5 / -dist;
    [dx, dy] = [dx / ds, dy / ds];

    [p0, p1] = [p1, [x0 + dx, y0 + dy]];
    yield p1;
  }

  // if possible, extrapolate a bit to patch the hole we left
  if (p0 === undefined || p1 === undefined) return;
  let [[x0, y0], [x1, y1]] = [p0, p1];
  let [dx, dy] = [x1 - x0, y1 - y0];
  yield [x1 + 2 * dx, y1 + 2 * dy];
}

export function* line(x0, y0, x1, y1): Iterable<Position> {
  const n = ((x0 - x1) ** 2 + (y0 - y1) ** 2) ** 0.5;
  if (FINENESS / n > 1) {
    yield [x0, y0];
    yield [x1, y1];
    return;
  }
  for (let s = 0; s <= 1; s += FINENESS / n) {
    yield [x0 * (1 - s) + x1 * s, y0 * (1 - s) + y1 * s];
  }
}

export function* arc(x, y, r, startTheta, finishTheta): Iterable<Position> {
  const dtheta = Math.sign(finishTheta - startTheta) / FINENESS;
  for (
    let theta = startTheta;
    Math.abs(finishTheta - theta) > Math.abs(dtheta);
    theta += dtheta
  ) {
    yield [x + cos(theta) * r, y + sin(theta) * r];
  }
}

export function* rect(x, y, width, height, r = 0): Iterable<Position> {
  yield* arc(x + r, y + r, r, 270, 180);
  yield* line(x, y + r, x, y + height - r);
  yield* arc(x + r, y + height - r, r, 180, 90);
  yield* line(x + r, y + height, x + width - r, y + height);
  yield* arc(x + width - r, y + height - r, r, 90, 0);
  yield* line(x + width, y + height - r, x + width, y + r);
  yield* arc(x + width - r, y + r, r, 0, -90);
  yield* line(x + width - r, y, x + r, y);
}

export function* grid(nx, ny) {
  for (let x = 0; x < nx; ++x) {
    for (let y = 0; y < ny; ++y) {
      yield [x, y];
    }
  }
}
