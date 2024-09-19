<!-- Nowcast Card -->

<div class="flex-shrink-0 border p-4 w-56">
  <p class="font-semibold">Neste time</p>

  <!-- Now -->
  {#if data.nowcast.properties.timeseries.length > 0}
    <img
      src={`./yr-symbols-lightmode/svg/${searchBySymbolCode(data.nowcast.properties.timeseries[0].data.next_1_hours.summary.symbol_code).id}.svg`}
      alt=""
      width="50"
    />
    <p>
      {searchBySymbolCode(
        data.nowcast.properties.timeseries[0].data.next_1_hours.summary
          .symbol_code
      ).title_nn}
    </p>
    <p>
      {data.nowcast.properties.timeseries[0].data.instant.details
        .air_temperature}°C, {data.nowcast.properties.timeseries[0].data
        .next_1_hours.details.precipitation_amount} mm, {data.nowcast.properties
        .timeseries[0].data.instant.details.wind_speed} m/s
    </p>
  {/if}
  <!-- Dersom 5 min nedbør data -->
  {#if data.nowcast.properties.timeseries.length > 1}
    <p class="mt-2">Nedbør neste 2 timar:</p>
    <svg width={svgWidth} height={svgHeight}>
      <rect x="0" y="0" width={svgWidth} height={svgHeight} fill="white" />
      {#each data.nowcast.properties.timeseries as series, index (series.time)}
        {#if series.data.instant.details}
          <rect
            x={index * (barWidth + 5)}
            y={svgHeight -
              (series.data.instant.details.precipitation_rate / 20) * svgHeight}
            width={barWidth}
            height={(series.data.instant.details.precipitation_rate / 20) *
              svgHeight}
            fill="blue"
          />
          <!-- Text above the bar -->
          <text
            x={index * (barWidth + 5) + barWidth / 2 + 5}
            y={svgHeight -
              (series.data.instant.details.precipitation_rate / 20) *
                svgHeight -
              5}
            text-anchor="middle"
            font-size="10"
            fill="black"
          >
            {series.data.instant.details.precipitation_rate}
          </text>
        {/if}
      {/each}
    </svg>
  {/if}
</div>

<!-- Location forecast card -->
<div class="flex-shrink-0 border p-4 w-56">
  {#each data.locationforecast.properties.timeseries.slice(0, 5) as series (series.time)}
    {#if series.data.next_1_hours}
      <p class="font-semibold">{formatDate(series.time)}</p>
    {/if}
  {/each}
</div>


  <!-- Temp spenn -->
  <rect
  x={100 -
    series.data.next_24_hours.details
      .air_temperature_max *
      3}
  y={100 -
    series.data.next_24_hours.details
      .air_temperature_max *
      3}
  width={series.data.next_24_hours.details
    .air_temperature_max *
    3 -
    series.data.next_24_hours.details
      .air_temperature_min *
      3}
  height={series.data.next_24_hours.details
    .air_temperature_max *
    3 -
    series.data.next_24_hours.details
      .air_temperature_min *
      3}
  fill="red"
/>


  <!-- Subseasonal langtidsvarsel -->
  {#each data.subseasonal.properties.timeseries as series (series.time)}
  {#if series.data.next_24_hours}
    <div class="flex-shrink-0 border p-4 w-24">
      <p class="font-semibold">{formatDate(series.time)}</p>
      <p>
        <span class="font-semibold">
          {series.data.next_24_hours.details
            .air_temperature_min}
        </span>
        –
        <span class="font-semibold">
          {series.data.next_24_hours.details
            .air_temperature_max}
        </span>
        °C
      </p>

      <div>
        <svg width="50" height="100">
          <!-- Background rectangle -->
          <rect
            x="0"
            y="0"
            width="50"
            height="100"
            fill="white"
          />

          <!-- Rainy rectangle -->
          <rect
            x="0"
            y={100 -
              series.data.next_24_hours.details
                .precipitation_amount *
                5}
            width="50"
            height={series.data.next_24_hours.details
              .precipitation_amount * 5}
            fill="blue"
          />

          <!-- Rain in text -->
          <text
            x="50"
            Y={100 -
              series.data.next_24_hours.details
                .precipitation_amount *
                5 -
              5}
            class="svgText"
            text-anchor="end"
          >
            {series.data.next_24_hours.details
              .precipitation_amount}
          </text>

          <!-- Temp rectangle -->
          <rect
            x="0"
            y={100 -
              series.data.next_24_hours.details
                .air_temperature_max *
                3}
            width="4"
            height={(series.data.next_24_hours.details
              .air_temperature_max -
              series.data.next_24_hours.details
                .air_temperature_min) *
              3}
            fill="red"
          />
        </svg>
      </div>
    </div>
  {/if}
{/each}