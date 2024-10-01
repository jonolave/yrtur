<script>
  import TempRange from "./TempRange.svelte";

  // Receive props passed to the component
  export let svgTotalWidth;
  export let settings;
  export let minTemp;
  export let maxTemp;
  export let tempScale;
  export let rainScale;
  export let data;

  const colorRain = "#0077CC";
  const colorRainAlpha = "#0077CCBD";

  let daytype = "weekday";
</script>

<svg
  width={svgTotalWidth + settings.svgLeftPadding + 16}
  height={settings.dayHeight}
>
  <!-- Background rectangle full width -->
  <rect
    x="0"
    y="0"
    rx="4"
    ry="4"
    width={svgTotalWidth + settings.svgLeftPadding + 16}
    height={settings.dayHeight}
    fill="white"
  />

  <!-- 0 degree temp line -->
  {#if minTemp < 0 && maxTemp > 0}
    <line
      x1={settings.svgLeftPadding}
      y1={tempScale(0)}
      x2={svgTotalWidth + settings.svgLeftPadding}
      y2={tempScale(0)}
      stroke="#888"
    />
  {/if}

  <!-- draw day by day -->
  {#each data.subseasonal.properties.timeseries as series, day (series.time)}
    {#if series.data.next_24_hours}
      <!-- Draw weekend data -->
      {#if series.dayNumber === 6 || series.dayNumber === 0}
        <TempRange {series} {settings} {tempScale} daytype="weekend"/>

        <!-- Rain rectangle -->
        <rect
          x={series.xPixelStart + settings.svgLeftPadding}
          y={rainScale(series.data.next_24_hours.details.precipitation_amount)}
          width={settings.weekEndDayWidth}
          height={rainScale(0) -
            rainScale(series.data.next_24_hours.details.precipitation_amount)}
          fill={colorRainAlpha}
        />

        <!-- Rain as text -->
        {#if series.data.next_24_hours.details.precipitation_amount != 0}
          <text
            x={series.xPixelStart +
              settings.weekEndDayWidth / 2 +
              settings.svgLeftPadding}
            Y={rainScale(
              series.data.next_24_hours.details.precipitation_amount
            ) - 5}
            class="svgRainText text-sm textOutline"
            text-anchor="middle"
            fill={colorRain}
          >
            {series.data.next_24_hours.details.precipitation_amount}
          </text>
        {/if}

        <!-- Draw weekday data -->
      {:else}
        <!-- Background -->
        <rect
          x={series.xPixelStart + settings.svgLeftPadding}
          y="6"
          width={settings.weekDayWidth}
          height={settings.dayHeight - 12}
          fill="#33415511"
        />

        <TempRange {series} {settings} {tempScale} daytype="weekday"/>

        <!-- Rain rectangle -->
        <rect
          x={series.xPixelStart + settings.svgLeftPadding}
          y={rainScale(series.data.next_24_hours.details.precipitation_amount)}
          width={settings.weekDayWidth}
          height={rainScale(0) -
            rainScale(series.data.next_24_hours.details.precipitation_amount)}
          fill={colorRainAlpha}
        />
      {/if}
    {/if}
  {/each}
</svg>

<style lang="postcss">
  .textOutline {
    text-shadow:
      1px 1px 0 #fff,
      -1px -1px 0 #fff,
      1px -1px 0 #fff,
      -1px 1px 0 #fff;
  }
</style>
