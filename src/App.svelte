<script lang="ts">
  import { Canvas, Layer, t } from "svelte-canvas";
  import GeoLayer from "./lib/GeoLayer.svelte";
  import { geoGraticule10, geoOrthographic } from "d3-geo";
  import { Style } from "./lib/style.js";
  import { geometries } from "./lib/surface.js";
  import { sin, cos } from "./lib/geometry.js";
  import { absoluteRotation, surfaceRotation } from "./lib/rotation.js";
  //import { GIF } from "gif.js";

  geometries.push({
    geometry: geoGraticule10(),
    style: Style.from({ strokeStyle: "#ccc0" }),
  });

  const size = 512,
    border = 16;

  let projection = geoOrthographic();
  projection.fitExtent(
    [
      [border, border],
      [size - border, size - border],
    ],
    { type: "Sphere" }
  );

  let time: number = 0;
  let lastPauseTime: number = 0;
  let elapsedWhilePaused: number = 0;

  let paused = false;
  $: {
    if (!paused) {
      time = (0.035 * ($t - elapsedWhilePaused)) / 1000;
    }

    projection.rotate([
      surfaceRotation(time),
      // add a slight deflection to the orbital plane
      6 * sin(absoluteRotation(time)),
      3 * cos(absoluteRotation(time)),
    ]);
  }

  let stars: [number, number][] = [];
  for (let i = 0; i < 100; ++i) {
    stars.push([Math.random() * size, Math.random() * size]);
  }
</script>

<input
  type="button"
  value={paused ? "Resume" : "Pause"}
  on:click={() => {
    paused = !paused;
    if (paused) {
      lastPauseTime = $t;
    } else {
      elapsedWhilePaused += $t - lastPauseTime;
    }
  }}
/>

<p>Simulation time: {time.toPrecision(3)} days</p>

<br />

<Canvas height={size} width={size}>
  <Layer
    render={({ context }) => {
      context.fillStyle = "black";
      context.fillRect(0, 0, size, size);

      context.fillStyle = "white";
      for (let [x, y] of stars) {
        context.fillRect(x, y, 1, 1);
      }
    }}
  />
  <GeoLayer {geometries} {time} {projection} />
</Canvas>
