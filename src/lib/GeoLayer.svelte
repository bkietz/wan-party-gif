<script lang="ts">
  import { Layer } from "svelte-canvas";
  import type { Feature } from "geojson";
  import { geoPath } from "d3-geo";
  import type { DynGeometry } from "./geometry.js";

  export let geometries: DynGeometry[];
  export let projection: any;
  export let time: number;

  $: render = ({context}) => {
    const drawFeature = geoPath(projection, context);
    for (let { style, geometry } of geometries) {
      let feature: Feature = {
        type: "Feature",
        properties: {},
        geometry: typeof geometry === "function" ? geometry(time) : geometry,
      };

      for (let [name, value] of Object.entries(style)) {
        context[name] = value;
      }

      context.beginPath();
      drawFeature(feature);
      context.fill();
      context.stroke();
    }
  };
</script>

<Layer {render} />
