<script>
  export let minTemp;
  export let maxTemp;
  const legendBoxSize = 18;
  const legendBoxPadding = 2;

  const colorWarm = "#E71804";
  const colorWarmAlpha = "#E7180444";
  const colorCold = "#884EF3";
  const colorColdAlpha = "#884EF355";
  const colorRain = "#0077CC";
  const colorRainAlpha = "#0077CCBD";

  // Determine the temperature range reactively
  $: tempRange =
    maxTemp > 0
      ? minTemp > 0
        ? "positive"
        : "cross"
      : minTemp > 0
        ? "cross"
        : "negative";

  // $: console.log("Range: ", minTemp, "-", maxTemp, ": ", tempRange);
</script>

<div class="flex items-center gap-1">
  <div class="bg-white rounded-[2px]">
    <svg height={legendBoxSize} width={legendBoxSize}>
      {#if tempRange === "cross"}
        <!-- 0 degree line -->
        <line
          x1={legendBoxPadding}
          y1={legendBoxSize / 2}
          x2={legendBoxSize - legendBoxPadding}
          y2={legendBoxSize / 2}
          stroke="#222"
        />
        <!-- Positive fill -->
        <rect
          x={legendBoxPadding}
          y={legendBoxPadding}
          width={legendBoxSize - legendBoxPadding * 2}
          height={legendBoxSize / 2 - legendBoxPadding}
          fill={colorWarmAlpha}
        />
        <!-- Negative fill -->
        <rect
          x={legendBoxPadding}
          y={legendBoxSize / 2}
          width={legendBoxSize - legendBoxPadding * 2}
          height={legendBoxSize / 2 - legendBoxPadding}
          fill={colorColdAlpha}
        />
        <!-- Positive line -->
        <line
          x1={legendBoxPadding}
          y1={legendBoxPadding}
          x2={legendBoxSize - legendBoxPadding}
          y2={legendBoxPadding}
          stroke={colorWarm}
        />
        <!-- Negative line -->
        <line
          x1={legendBoxPadding}
          y1={legendBoxSize - legendBoxPadding}
          x2={legendBoxSize - legendBoxPadding}
          y2={legendBoxSize - legendBoxPadding}
          stroke={colorCold}
        />
      {:else}
        <!-- Fill -->
        <rect
          x={legendBoxPadding}
          y={legendBoxPadding}
          width={legendBoxSize - legendBoxPadding * 2}
          height={legendBoxSize - legendBoxPadding * 2}
          fill={tempRange === "positive" ? colorWarmAlpha : colorColdAlpha}
        />
        <!-- Top line -->
        <line
          x1={legendBoxPadding}
          y1={legendBoxPadding}
          x2={legendBoxSize - legendBoxPadding}
          y2={legendBoxPadding}
          stroke={tempRange === "positive" ? colorWarm : colorCold}
        />
        <!-- Lower line -->
        <line
          x1={legendBoxPadding}
          y1={legendBoxSize - legendBoxPadding}
          x2={legendBoxSize - legendBoxPadding}
          y2={legendBoxSize - legendBoxPadding}
          stroke={tempRange === "positive" ? colorWarm : colorCold}
        />
      {/if}
    </svg>
  </div>
  <div>Temperatur, min-max</div>
</div>

<div class="flex items-center gap-1">
  <div class="bg-white rounded-[2px]">
    <svg height={legendBoxSize} width={legendBoxSize}>
      <!-- Blue rain -->
      <rect
        x={legendBoxPadding}
        y={legendBoxPadding}
        width={legendBoxSize - legendBoxPadding * 2}
        height={legendBoxSize - legendBoxPadding * 2}
        fill={colorRainAlpha}
      />
    </svg>
  </div>
  <div>Regn</div>
</div>
