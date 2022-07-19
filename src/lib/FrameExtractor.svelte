<script lang="ts">
  import { onMount } from "svelte";
  import type { Canvas } from "svelte-canvas";
  import Tar from "tar-js";

  export let canvas: Canvas;
  export let totalFrames: number;
  export let totalTime: number;

  let frameIndex: number;

  export function getTime(): number {
    if (!extractingFrames) {
      return null;
    }
    return (frameIndex / totalFrames) * totalTime;
  }

  let frames: Promise<{
    blob: Blob;
    url: string;
  }>[] = [];
  let tarUrl: string = "";
  let extractingFrames = false;

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

    monkeyPatch.original = window.requestAnimationFrame;
    window.requestAnimationFrame = monkeyPatch;

    monkeyPatch.doExtraction = async () => {
      // 1. getTime() is invoked, returning the time for the
      //    next frame to render
      // 2. projection and time are mutated which will eventually
      //    cause GeoLayer to rerender
      // 3. GeoLayer rerenders, invoking requestAnimationFrame
      // 4. monkeyPatch intercepts, grabbing the pixels for the
      //    current frame and incrementing frameIndex
      if (frameIndex == null) {
        // drop the first frame, which is probably junk
        frameIndex = 0;
        return;
      }

      if (frameIndex != frames.length) {
        // Duplicate frame; might be rerending before time has updated
        return;
      }

      if (frameIndex == totalFrames) {
        // We're done extracting frames.
        extractingFrames = false;
        return await monkeyPatch.finishExtraction();
      }

      frames = [
        ...frames,
        new Promise((resolve, _reject) => {
          canvas.getCanvas().toBlob((blob: Blob) => {
            const url = URL.createObjectURL(blob);
            resolve({
              blob,
              url,
            });
          });
        }),
      ];

      canvas.redraw();
      ++frameIndex;
    };

    monkeyPatch.finishExtraction = async () => {
      // roll extracted frames into a tar for easy download
      const tar = new Tar();
      let tarBuf: Uint8Array;

      let i = 0;
      for (let frame of frames) {
        const index = (i++).toString().padStart(4, "0");
        const filename = `wan-party-gif-frames/frame_${index}.png`;

        const { blob } = await frame;
        const buf = new Uint8Array(await blob.arrayBuffer());

        tarBuf = tar.append(filename, buf);
      }

      tarUrl = URL.createObjectURL(new Blob([tarBuf]));
    };
  });
</script>

<input
  type="button"
  value={extractingFrames ? "Stop extracting" : "Extract frames"}
  on:click={async () => {
    extractingFrames = !extractingFrames;

    if (!extractingFrames) return;

    for (let frame of frames) {
      const { url } = await frame;
      URL.revokeObjectURL(url);
    }
    frames = [];
    frameIndex = null;

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

<p>
  {frames.length}/{totalFrames} frames extracted,
  {(((frameIndex ?? 0) / totalFrames) * 100).toPrecision(3)}% complete
</p>

<hr />

{#each frames as frame, i}
  {#if true}
    {#await frame}
      <p>frame#{i}</p>
    {:then { url }}
      <img
        title="frame#{i}, time={(i / totalFrames) * totalTime}"
        alt="frame#{i}"
        src={url}
      />
    {:catch error}
      <p style="color: red">{error.message}</p>
    {/await}
  {/if}
{/each}
