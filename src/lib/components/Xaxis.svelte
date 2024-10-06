<script>
  export let svgTotalWidth;
  export let settings;
  export let weatherDataFiltered;
  export let formatDate;
</script>

<div
  class="bg-white pl-[34px] mb-4 h-[48px] ml-4 rounded-[4px]"
  style="width: {svgTotalWidth + settings.svgLeftPadding}px"
>
  <!-- Fixed left area per location -->
  <div class="w-[55px] absolute left-0 h-[48] overflow-hidden">
    <div class="w-[42px] h-[48]">
      <div class="w-[30px] flex rounded-l-[4px] h-[48]">
        <svg width="30" height="48"></svg>
        <div
          class="w-[45px] h-full bg-white shadow-[0_0_5px_2px_rgba(255,255,255,1.0)]"
        >
          <svg width="45" height="48" class=""></svg>
        </div>
      </div>
    </div>
  </div>
  <svg width={svgTotalWidth} height="40">
    <!-- For each day -->
    {#if weatherDataFiltered[0]?.subseasonal?.properties?.timeseries}
      {#each weatherDataFiltered[0].subseasonal.properties.timeseries as series, day (series.time)}
        {#if series.data.next_24_hours}
          {#if series.dayNumber === 6 || series.dayNumber === 0}
            <!-- Day in text -->
            <text
              x={series.xPixelStart + settings.weekEndDayWidth / 2}
              Y="20"
              font-size="16px"
              text-anchor="middle"
              font-weight={series.dayNumber === 6 || series.dayNumber === 0
                ? "bold"
                : "normal"}
            >
              {formatDate(series.time, "day")}
            </text>

            <text
              x={series.xPixelStart + settings.weekEndDayWidth / 2}
              Y="40"
              font-size="14px"
              text-anchor="middle"
            >
              {formatDate(series.time, "date")}
            </text>
          {:else if series.dayNumber === 1}
            <text
              x={series.xPixelStart + 3}
              Y="20"
              font-size="14px"
              text-anchor="start"
              font-weight="normal"
              fill="#444"
            >
              man
            </text>
          {:else if series.dayNumber === 3}
            <text
              x={series.xPixelStart + settings.weekDayWidth / 2 + 4}
              Y="20"
              font-size="14px"
              text-anchor="middle"
              font-weight="normal"
              fill="#444"
            >
              -
            </text>
          {:else if series.dayNumber === 5}
            <text
              x={series.xPixelStart + settings.weekDayWidth - 3}
              Y="20"
              font-size="14px"
              text-anchor="end"
              font-weight="normal"
              fill="#444"
            >
              fre
            </text>
          {/if}
        {/if}
      {/each}
    {/if}
  </svg>
</div>
