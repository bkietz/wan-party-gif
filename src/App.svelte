<script lang="ts">
  import { onMount } from "svelte";
  import { Canvas, Layer, t } from "svelte-canvas";
  import GeoLayer from "./lib/GeoLayer.svelte";
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
  import Tar from "tar-js";

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

  $: if (!paused) {
    time = (0.035 * ($t - elapsedWhilePaused)) / 1000;

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

  type Frame = {
    time: number;
    blob: Blob;
    url: string;
  };

  let tarUrl: string = "";
  let canvas: Canvas;
  let frames: Frame[] = [];

  let extractingFrames = false;
  const extractedFramesPerSecond = 60;
  const extractedSecondsPerOrbit = 4;
  const framesPerDay =
    extractedFramesPerSecond *
    extractedSecondsPerOrbit *
    orbitsPerDay *
    simulationRepeatTime;

  onMount(() => {
    // Unfortunately, Canvas.redraw just sets a flag; it doesn't
    // force an immediate re-render. This means we can't guarantee
    // that the state of the canvas will reflect the geometries
    // just by assigning to `time` and calling redraw. However, we
    // *do* know that requrestAnimationFrame is going to get called
    // immediately after rendering finally does happen, so we can
    // intercept that as a signal that a frame is ready to extract.
    function monkeyPatch() {
      if (extractingFrames) {
        monkeyPatch.doExtraction();
      }
      return monkeyPatch.original.apply(window, arguments);
    }
    monkeyPatch.doExtraction = () => {
      if (frames.length != 0) {
        const { time: mostRecent } = frames[frames.length - 1];
        if (time - mostRecent < 1 / framesPerDay) {
          // the animation is producing frames faster than we care
          // to extract them; ignore this one.
          return;
        }

        const { time: first } = frames[0];
        if (time - first >= simulationRepeatTime) {
          // we're done extracting frames, roll them into a tar
          extractingFrames = false;
          const tar = new Tar();
          let tarBuf: Uint8Array;

          let bufs = [];
          for (let { time, blob } of frames) {
            bufs.push(blob.arrayBuffer().then((buf) => ({ time, buf })));
          }

          Promise.all(bufs).then((bufs) => {
            let i = 0;
            for (let { time, buf } of bufs) {
              tarBuf = tar.append(
                `frames/${(i++).toString().padStart(4, "0")}_${time}.png`,
                new Uint8Array(buf)
              );
            }
            tarUrl = URL.createObjectURL(new Blob([tarBuf]));
          });

          return;
        }
      }

      // make a copy of `time` to avoid the callback catching
      // a future mutation
      const timeExtracted = time;
      canvas.getCanvas().toBlob((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        frames = [...frames, { time: timeExtracted, blob, url }];
      });
      canvas.redraw();
    };
    monkeyPatch.original = window.requestAnimationFrame;
    window.requestAnimationFrame = monkeyPatch;
  });
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

<input
  type="button"
  value={extractingFrames ? "Stop extracting" : "Extract frames"}
  on:click={() => {
    extractingFrames = !extractingFrames;

    if (!extractingFrames) return;

    for (let { url } of frames) {
      URL.revokeObjectURL(url);
    }
    frames = [];

    if (tarUrl !== "") {
      URL.revokeObjectURL(tarUrl);
      tarUrl = "";
    }
  }}
/>

{#if tarUrl != ""}
  <a href={tarUrl} download="wan-party-gif-frames.tar">
    wan-party-gif-frames.tar
  </a>
{/if}

{#if frames.length != 0}
  <p>
    {frames.length} frames extracted,
    {(
      ((frames[frames.length - 1].time - frames[0].time) /
        simulationRepeatTime) *
      100
    ).toPrecision(3)} % complete
  </p>
{/if}

<hr />

{#each frames as frame, i}
  <img
    title="frame#{i} for time={frame.time}"
    alt="frame#{i} for time={frame.time}"
    src={frame.url}
  />
{/each}
