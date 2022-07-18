<script lang="ts">
  import { Canvas, Layer, t } from "svelte-canvas";
  import GeoLayer from "./lib/GeoLayer.svelte";
  import FrameExtractor from "./lib/FrameExtractor.svelte";
  import { geoGraticule10, geoOrthographic } from "d3-geo";
  import { Style } from "./lib/style.js";
  import { geometries } from "./lib/surface.js";
  import { sin, cos } from "./lib/geometry.js";
  import {
    absoluteRotation,
    surfaceRotation,
    simulationRepeatTime,
    orbitsPerDay,
  } from "./lib/rotation.js";

  geometries.push({
    geometry: geoGraticule10(),
    style: Style.from({ strokeStyle: "#ccc0" }),
  });

  const size = 256;
  const border = size / 32;

  const projection = geoOrthographic();
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

  $: if (!paused) {
    time =
      extractor?.getTime() ?? (0.02 * ($t - elapsedWhilePaused)) / 1000 + 0.45;

    projection.rotate([
      surfaceRotation(time),
      // add a slight inclination to the orbital plane
      10 * sin(absoluteRotation(time)),
      5 * cos(absoluteRotation(time)),
    ]);
  }

  let stars: [number, number][] = [];
  for (let i = 0; i < 100; ++i) {
    stars.push([Math.random() * size, Math.random() * size]);
  }

  let canvas: Canvas;
  let extractor: FrameExtractor;

  // GIF expresses delay between frames in hundredths of a
  // second, so using 60 frames per second requires GIF
  // creation tools to mix frames or jitter delays and degrade
  // animation quality. Using 50 frames per second means we get
  // simple GIF::delay of 2.
  const extractedFramesPerSecond = 50;

  const extractedSecondsPerOrbit = 5;
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

<Canvas bind:this={canvas} pixelRatio="1" height={size} width={size}>
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

<hr />

<FrameExtractor
  bind:this={extractor}
  {canvas}
  totalTime={simulationRepeatTime}
  totalFrames={extractedFramesPerSecond *
    extractedSecondsPerOrbit *
    orbitsPerDay *
    simulationRepeatTime}
/>
