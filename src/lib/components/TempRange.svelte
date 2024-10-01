<script>
  // Receive props passed to the component
  export let series;
  export let settings;
  export let tempScale;
  export let daytype;

  const colorWarm = "#E71804"
  const colorWarmAlpha = "#E7180444"
  const colorCold = "#884EF3";
  const colorColdAlpha = "#884EF355";
  
  $: dayWidth = daytype === "weekday" ? settings.weekDayWidth : settings.weekEndDayWidth;

  $: maxTemp = series.data.next_24_hours.details.air_temperature_max;
  $: minTemp = series.data.next_24_hours.details.air_temperature_min;

 // Determine the temperature range reactively
 $: tempRange = maxTemp > 0 
    ? (minTemp > 0 ? "positive" : "cross") 
    : (minTemp > 0 ? "cross" : "negative");

  // console.log("Range: ", minTemp, "-", maxTemp, ": ", tempRange);

</script>

<!-- Positive or negative temperature -->
{#if tempRange != "cross"}
  <!-- Temperature rectangle -->
  <rect
    x={series.xPixelStart + settings.svgLeftPadding}
    y={tempScale(maxTemp)}
    width={dayWidth}
    height={tempScale(minTemp) - tempScale(maxTemp)}
    fill={tempRange === "positive" ? colorWarmAlpha : colorColdAlpha}
  />

  <!-- Temperature max line -->
  <line
    x1={series.xPixelStart + settings.svgLeftPadding}
    y1={tempScale(maxTemp)}
    x2={series.xPixelStart + dayWidth + settings.svgLeftPadding}
    y2={tempScale(maxTemp)}
    stroke={maxTemp > 0 ? colorWarm : colorCold}
  />

  <!-- Temperature min line -->
  <line
    x1={series.xPixelStart + settings.svgLeftPadding}
    y1={tempScale(minTemp)}
    x2={series.xPixelStart + dayWidth + settings.svgLeftPadding}
    y2={tempScale(minTemp)}
    stroke={maxTemp > 0 ? colorWarm : colorCold}
  />

  {#if daytype === "weekend"}
    <!-- Max temp as text only for weekend -->
    <text
      x={series.xPixelStart + dayWidth / 2 + settings.svgLeftPadding}
      Y={tempScale(maxTemp) - 5}
      class="textOutline text-sm"
      text-anchor="middle"
      fill={tempRange === "positive" ? colorWarm : colorCold}
    >
      {Math.round(maxTemp)}°
    </text>
  {/if}
{:else if tempRange === "cross"}
  <!-- Temperature range crosses 0 -->

  <!-- Temperature rectangle positive -->
  <rect
    x={series.xPixelStart + settings.svgLeftPadding}
    y={tempScale(maxTemp)}
    width={dayWidth}
    height={tempScale(0) - tempScale(maxTemp)}
    fill={colorWarmAlpha}
  />

    <!-- Temperature rectangle negative -->
    <rect
    x={series.xPixelStart + settings.svgLeftPadding}
    y={tempScale(0)}
    width={dayWidth}
    height={tempScale(minTemp) - tempScale(0)}
    fill={colorColdAlpha}
  />

  <!-- Temperature max line -->
  <line
    x1={series.xPixelStart + settings.svgLeftPadding}
    y1={tempScale(maxTemp)}
    x2={series.xPixelStart + dayWidth + settings.svgLeftPadding}
    y2={tempScale(maxTemp)}
    stroke={maxTemp > 0 ? colorWarm : colorCold}
  />

  <!-- Temperature min line -->
  <line
    x1={series.xPixelStart + settings.svgLeftPadding}
    y1={tempScale(minTemp)}
    x2={series.xPixelStart + dayWidth + settings.svgLeftPadding}
    y2={tempScale(minTemp)}
    stroke={minTemp > 0 ? colorWarm : colorCold}
  />

  {#if daytype === "weekend"}
    <!-- Max temp as text only for weekend -->
    <text
      x={series.xPixelStart + dayWidth / 2 + settings.svgLeftPadding}
      Y={tempScale(maxTemp) - 5}
      class="textOutline text-sm"
      text-anchor="middle"
      fill={maxTemp > 0 ? colorWarm : colorCold}
    >
      {Math.round(maxTemp)}°
    </text>
  {/if}
{/if}

<style lang="postcss">
  .textOutline {
    text-shadow:
      1px 1px 0 #fff,
      -1px -1px 0 #fff,
      1px -1px 0 #fff,
      -1px 1px 0 #fff;
  }
</style>
