<script>
  import "../app.css";
  import { onMount } from "svelte";
  import Papa from "papaparse"; // for csv parsing
  import { scaleLinear } from "d3-scale";
  import { min, max } from "d3-array";

  let weatherData = [];
  let weatherDataFiltered = [];
  let locations = [
    { name: "Oslo", lat: 59.92, lon: 10.75 },
    { name: "Eikern", lat: 59.62, lon: 10.0 },
    { name: "Filefjell", lat: 61.17, lon: 8.2 },
    { name: "Leikanger", lat: 61.18, lon: 6.8 },
    { name: "Hestenesøyra", lat: 61.84, lon: 6.0 },
    { name: "Finse", lat: 60.6, lon: 7.5 },
  ];
  let weekendsOnly = false;

  function exampleLocations(location) {
    switch (location) {
      case "Sør-Norge":
        locations = [
          { name: "Oslo", lat: 59.92, lon: 10.75 },
          { name: "Bergen", lat: 60.39, lon: 5.32 },
          { name: "Stavanger", lat: 58.97, lon: 5.73 },
          { name: "Drammen", lat: 59.74, lon: 10.2 },
          { name: "Kristiansand", lat: 58.15, lon: 7.99 },
        ];
        console.log("Loading Sør-Norge..");
        break;
      case "skidestinasjoner":
        locations = [
          { name: "Trysil", lat: 61.31, lon: 12.26 },
          { name: "Hemsedal", lat: 60.87, lon: 8.55 },
          { name: "Hafjell", lat: 61.24, lon: 10.44 },
          { name: "Geilo", lat: 60.53, lon: 8.2 },
          { name: "Kvitfjell", lat: 61.45, lon: 10.14 },
        ];
        console.log("Loading skidestinasjoner..");
        break;
      case "Norden":
        locations = [
          { name: "Stockholm", lat: 59.33, lon: 18.06 },
          { name: "København", lat: 55.68, lon: 12.57 },
          { name: "Helsingfors", lat: 60.17, lon: 24.94 },
          { name: "Oslo", lat: 59.91, lon: 10.75 },
          { name: "Göteborg", lat: 57.71, lon: 11.97 },
        ];
        console.log("Loading Norden..");
        break;
      default:
        locations = [{ name: "Oslo", lat: 59.92, lon: 10.75 }];
    }

    fetchWeatherForAllLocations();
    filterWeatherData();
  }

  // CSV for Yr symbols
  let csvData = [];

  const dayWidth = 60;
  const dayHeight = 140;
  const rainBarWidth = 18;
  const svgLeftPadding = 70;
  let scrollDistance = 0;

  let svgTotalWidth = 100; // value here doesn't really matter, will be updated later
  // $: console.log("SVG width changed: ", svgTotalWidth);

  // Reactive block for weekendsOnly
  $: if (weatherDataFiltered[0]?.subseasonal) {
    // console.log("we have data");
    if (weatherDataFiltered[0].subseasonal.properties.timeseries) {
      svgTotalWidth =
        weatherDataFiltered[0].subseasonal.properties.timeseries.length *
        dayWidth;
    } else {
      svgTotalWidth = 10;
    }
  }

  async function loadCSV() {
    const response = await fetch("weather.csv");
    const csvText = await response.text();
    parseCSV(csvText);
  }

  function parseCSV(csvText) {
    Papa.parse(csvText, {
      header: true,
      complete: function (results) {
        csvData = results.data;
        // console.log("Parsed CSV data:", csvData); // Log parsed data
      },
    });
  }

  function searchBySymbolCode(symbolCode) {
    // console.log("Searching for symbol code:", symbolCode);
    const result = csvData.find(
      (row) =>
        row.dayName === symbolCode ||
        row.nightName === symbolCode ||
        row.midnightName === symbolCode
    );
    // console.log("Result:", result);
    if (result) {
      // console.log("Found result for", symbolCode);
      return {
        id:
          result.dayName === symbolCode
            ? result.dayId
            : result.nightName === symbolCode
              ? result.nightId
              : result.midnightName === symbolCode
                ? result.midnightID
                : null,
        title_en: result.en,
        title_nb: result.nb,
        title_nn: result.nn,
      };
    } else {
      console.log("No result found for symbol code:", symbolCode);
      return null;
    }
  }

  async function fetchWeatherFromAPI(lat, lon, apiType) {
    // Choose correct URL for API
    let url;
    switch (apiType) {
      case "nowcast":
        url = `./api/nowcast?lat=${lat}&lon=${lon}`;
        break;
      case "subseasonal":
        url = `./api/subseasonal?lat=${lat}&lon=${lon}`;
        break;
      case "locationforecast":
        url = `./api/location-forecast-complete?lat=${lat}&lon=${lon}`;
        break;
      default:
        return null;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `Failed to fetch weather data for (${lat}, ${lon}):`,
          response.status
        );
        return null;
      }
      // console.log(`Weather data fetched successfully for (${lat}, ${lon})`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching weather data for (${lat}, ${lon}):`, error);
      return null;
    }
  }

  function filterWeatherData() {
    if (weekendsOnly) {
      // filter weekends
      weatherDataFiltered = weatherData.map((location) => {
        const filteredTimeseries = location.subseasonal.properties.timeseries
          .filter((day) => {
            const date = new Date(day.time);
            return date.getDay() === 6 || date.getDay() === 0;
          })
          .map((day) => {
            const date = new Date(day.time);
            return {
              ...day,
              dayNumber: date.getDay(),
            };
          });
        return {
          ...location,
          subseasonal: {
            ...location.subseasonal,
            properties: {
              ...location.subseasonal.properties,
              timeseries: filteredTimeseries,
            },
          },
        };
      });
    } else {
      weatherDataFiltered = weatherData.map((location) => {
        const timeseriesWithDayNumber =
          location.subseasonal.properties.timeseries.map((day) => {
            const date = new Date(day.time);
            return {
              ...day,
              dayNumber: date.getDay(),
            };
          });
        return {
          ...location,
          subseasonal: {
            ...location.subseasonal,
            properties: {
              ...location.subseasonal.properties,
              timeseries: timeseriesWithDayNumber,
            },
          },
        };
      });
    }

    if (weatherDataFiltered[0]?.subseasonal) {
      svgTotalWidth =
        weatherDataFiltered[0].subseasonal.properties.timeseries.length *
        dayWidth;
    }
  }

  async function fetchWeatherForAllLocations() {
    const promises = locations.map(async (loc) => {
      // const nowcast = fetchWeatherFromAPI(loc.lat, loc.lon, "nowcast");
      const subseasonal = fetchWeatherFromAPI(loc.lat, loc.lon, "subseasonal");
      // const locationforecast = fetchWeatherFromAPI(loc.lat, loc.lon,"locationforecast");

      const [subseasonalData] = await Promise.all([subseasonal]);

      if (subseasonalData) {
        return {
          location: loc,
          // nowcast: nowcastData,
          subseasonal: subseasonalData,
          // locationforecast: locationforecastData,
        };
      } else {
        return null; // Filter out any incomplete data
      }
    });

    const results = await Promise.all(promises);
    weatherData = results.filter((data) => data !== null); // Filter out any null responses
    weatherDataFiltered = weatherData;
    filterWeatherData();

    console.log(
      "Filtered weather data for all locations:",
      weatherDataFiltered
    );

    updateScale();
  }

  function formatDate(dateString, data = "weekday") {
    const date = new Date(dateString);
    if (data === "weekday") {
      const options = { weekday: "short" };
      const formatter = new Intl.DateTimeFormat("no-NO", options);
      return formatter.format(date);
    } else if (data === "date") {
      const options = { day: "numeric" };
      const formatter = new Intl.DateTimeFormat("no-NO", options);
      return formatter.format(date);
    } else {
      const options = { weekday: "short" };
      const formatter = new Intl.DateTimeFormat("no-NO", options);
      return formatter.format(date);
    }
  }

  let tempScale;
  let rainScale;

  function updateScale() {
    // Flatten the nested structure to extract the max temperatures, safely checking if the data exists
    const allMaxTemperatures = weatherDataFiltered.flatMap((location) => {
      // Check if subseasonal and timeseries exist
      if (location.subseasonal && location.subseasonal.properties.timeseries) {
        return location.subseasonal.properties.timeseries
          .map((day) => {
            // Check if the next_24_hours and its details exist
            return day.data?.next_24_hours?.details?.air_temperature_max;
          })
          .filter((temp) => temp !== undefined); // Filter out undefined temperatures
      } else {
        return []; // Return empty array if no timeseries
      }
    });

    const allMinTemperatures = weatherDataFiltered.flatMap((location) => {
      // Check if subseasonal and timeseries exist
      if (location.subseasonal && location.subseasonal.properties.timeseries) {
        return location.subseasonal.properties.timeseries
          .map((day) => {
            // Check if the next_24_hours and its details exist
            return day.data?.next_24_hours?.details?.air_temperature_min;
          })
          .filter((temp) => temp !== undefined); // Filter out undefined temperatures
      } else {
        return []; // Return empty array if no timeseries
      }
    });

    // Check if there are temperatures to calculate min and max
    if (allMaxTemperatures.length > 0 && allMinTemperatures.length > 0) {
      const minValue = min(allMinTemperatures);
      const maxValue = max(allMaxTemperatures);

      console.log("Min temperature:", minValue);
      console.log("Max temperature:", maxValue);

      // Create a linear scale based on the min and max values
      tempScale = scaleLinear()
        .domain([minValue - 2, maxValue + 2])
        .range([(dayHeight / 3) * 2, 10]);
    } else {
      // console.error("No valid temperature data found");
    }

    const allMaxRain = weatherDataFiltered.flatMap((location) => {
      // Check if subseasonal and timeseries exist
      if (location.subseasonal && location.subseasonal.properties.timeseries) {
        return location.subseasonal.properties.timeseries
          .map((day) => {
            // Check if the next_24_hours and its details exist
            return day.data?.next_24_hours?.details?.precipitation_amount;
          })
          .filter((rain) => rain !== undefined); // Filter out undefined temperatures
      } else {
        return []; // Return empty array if no timeseries
      }
    });

    // Check if there are rain to min and max
    if (allMaxRain.length > 0) {
      const maxValue = max(allMaxRain);

      console.log("Max rain:", maxValue);

      if (maxValue > 20) {
        rainScale = scaleLinear()
          .domain([0, maxValue])
          .range([dayHeight - 5, dayHeight / 2 - 5]);
      } else {
        rainScale = scaleLinear()
          .domain([0, 20])
          .range([dayHeight - 5, dayHeight / 2 - 5]);
      }
    } else {
      // console.error("No valid rain data found");
    }
  }

  // SVG precipitation
  const svgWidth = 190;
  const svgHeight = 50;
  const barWidth = 3;

  function generateTemperaturePolygon(timeseries) {
    const dayWidth = 60; // Assuming this is the width per day
    let points = [];

    // 1. Iterate forward through the timeseries for max temperatures
    timeseries.forEach((series, day) => {
      const maxTemp = series.data.next_24_hours.details.air_temperature_max;
      points.push(`${day * dayWidth + dayWidth / 2},${tempScale(maxTemp)}`);
    });

    // 2. Iterate backward through the timeseries for min temperatures
    for (let day = timeseries.length - 1; day >= 0; day--) {
      const minTemp =
        timeseries[day].data.next_24_hours.details.air_temperature_min;
      points.push(`${day * dayWidth + dayWidth / 2},${tempScale(minTemp)}`);
    }

    return points.join(" ");
  }

  $: filterWeatherData();

  // Reactive block for weekendsOnly
  $: if (weekendsOnly !== undefined) {
    filterWeatherData();
    updateScale();
  }

  onMount(() => {
    loadCSV();
    fetchWeatherForAllLocations();
    filterWeatherData();

    const scrollContainer = document.getElementById("scrollContainer");
    if (scrollContainer) {
      // Add the scroll event listener
      scrollContainer.addEventListener("scroll", () => {
        scrollDistance = scrollContainer.scrollLeft;
      });
    } else {
      console.error("Scroll container not found");
    }
  });
</script>

<main class="">
  <!-- Top info area -->
  <div class="mx-3 mt-4">
    <!-- Heading -->
    <h1 class="text-3xl font-bold mb-1">Helge&shy;planlegger'n</h1>
    <h2 class="text-xl mb-5">Sammenlign langtidsvarsel for steder i Norden</h2>

    <p class="mb-3">
      Sammenlig <a
        href="#"
        on:click={() => exampleLocations("Sør-Norge")}
        class="text-pink-600 underline decoration-dotted"
        role="button"
      >
        byer i Sør-Norge
      </a>
      ,
      <a
        href="#"
        on:click={() => exampleLocations("skidestinasjoner")}
        class="text-pink-600 underline decoration-dotted"
        role="button"
      >
        skidestinasjoner i Norge
      </a>
      ,
      <a
        href="#"
        on:click={() => exampleLocations("Norden")}
        class="text-pink-600 underline decoration-dotted"
        role="button"
      >
        byer i Norden
      </a>
      , eller søk opp dine egne favoritter!
    </p>

    <label>
      <input
        type="checkbox"
        bind:checked={weekendsOnly}
        onclick={() => {
          filterWeatherData();
          updateScale();
          svgTotalWidth =
            weatherDataFiltered[0].subseasonal.properties.timeseries.length *
            dayWidth;
        }}
      />
      Vis kun helger
    </label>

    <p>Showing day number {Math.round(scrollDistance / dayWidth)}</p>
  </div>

  <!-- Data for all locations -->
  <div class="relative w-full overflow-hidden my-8">
    <div class="flex overflow-x-auto min-w-0" id="scrollContainer">
      <div class="flex-shrink-0 w-full">
        {#if weatherDataFiltered && weatherDataFiltered.length > 0}
          <!-- For each location -->
          {#each weatherDataFiltered as data, index}
            <!-- x axis days above first location-->
            {#if index === 0}
              <div class="pl-[70px] pb-4">
                <svg width={svgTotalWidth} height="40">
                  <!-- Background rectangle -->
                  <!-- 
                  <rect
                    x="0"
                    y="0"
                    width={26 * dayWidth}
                    height="40"
                    fill="white"
                  />
                  -->
                  <!-- For each day -->
                  {#each data.subseasonal.properties.timeseries as series, day (series.time)}
                    {#if series.data.next_24_hours}
                      <!-- Day in text -->
                      <text
                        x={day * dayWidth + dayWidth / 2}
                        Y="20"
                        font-size="16px"
                        text-anchor="middle"
                        font-weight={series.dayNumber === 6 ||
                        series.dayNumber === 0
                          ? "bold"
                          : "normal"}
                      >
                        {formatDate(series.time, "day")}
                      </text>

                      <text
                        x={day * dayWidth + dayWidth / 2}
                        Y="40"
                        font-size="14px"
                        text-anchor="middle"
                      >
                        {formatDate(series.time, "date")}
                      </text>
                    {/if}
                  {/each}
                </svg>
              </div>
            {/if}

            <!-- weather data for each day -->
            <div class="mb-4" style="height: {dayHeight}px;">
              <!-- Fixed left area per location -->
              <div
                class="w-[75px] absolute left-0 overflow-hidden flex items-center"
                style="width: 80px; height: {dayHeight}px;"
              >
                <div
                  class="w-[60px] flex justify-center bg-slate-200 items-center h-full"
                >
                  <!-- Name of location -->
                  <div
                    class="w-[40px] ml-4 bg-white rounded-l-[4px] h-full flex justify-center items-center"
                  >
                    <h3
                      class="transform -rotate-90 origin-center whitespace-nowrap text-xl font-medium"
                    >
                      {data.location.name}
                    </h3>
                  </div>

                  <!-- Y axis -->
                  <div
                    class="w-[20px] bg-white h-full shadow-[0_0_8px_2px_rgba(255,255,255,1.0)]"
                  >
                    <svg width="20" height="20">
                      <!-- <circle cx="10" cy="10" r="10" fill="red" /> -->
                    </svg>
                  </div>
                </div>
              </div>

              <!-- SVG per location-->
              <div
                class=""
                style="width: {svgTotalWidth + svgLeftPadding + 32}px;"
              >
                <svg width={svgTotalWidth + svgLeftPadding + 16} height={dayHeight}>
                  <!-- Background rectangle full width -->
                  <rect
                    x="0"
                    y="0"
                    rx="4"
                    ry="4"
                    width={svgTotalWidth + svgLeftPadding + 16}
                    height={dayHeight}
                    fill="white"
                  />

                  <!-- 0 degree temp line -->
                  <line
                    x1="{svgLeftPadding}"
                    y1={tempScale(0)}
                    x2={svgTotalWidth + svgLeftPadding}
                    y2={tempScale(0)}
                    stroke="#00000044"
                  />

                  <!-- Temperature polygon between min and max polygon -->
                  <!--
                  <polygon
                    points="{generateTemperaturePolygon(data.subseasonal.properties.timeseries)}"
                    fill="#ff000044"        
                    stroke="#ff0000"         
                    stroke-width="2"         
                    stroke-opacity="0.6"    
                    opacity="0.8"     
                  />
                   -->

                  <!-- draw day by day -->
                  {#each data.subseasonal.properties.timeseries as series, day (series.time)}
                    {#if series.data.next_24_hours}
                      <!-- Line on the side of sunday -->
                      {#if series.dayNumber === 0}
                        <line
                          x1={day * dayWidth + dayWidth + svgLeftPadding}
                          y1=""
                          x2={day * dayWidth + dayWidth + svgLeftPadding}
                          y2={dayHeight}
                          stroke="#00000055"
                        />
                      {/if}

                      <!-- Temperature rectangle -->
                      <rect
                        x={day * dayWidth + 4 + svgLeftPadding}
                        y={tempScale(
                          series.data.next_24_hours.details.air_temperature_max
                        )}
                        width={dayWidth - 8}
                        height={tempScale(
                          series.data.next_24_hours.details.air_temperature_min
                        ) -
                          tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          )}
                        fill="#ff000033"
                      />
                      <!-- Temperature max line -->
                      <line
                        x1={day * dayWidth + 4 + svgLeftPadding}
                        y1={tempScale(
                          series.data.next_24_hours.details.air_temperature_max
                        )}
                        x2={day * dayWidth + dayWidth - 4 + svgLeftPadding}
                        y2={tempScale(
                          series.data.next_24_hours.details.air_temperature_max
                        )}
                        stroke="#ff0000"
                      />
                      <!-- Temperature min line -->
                      <line
                        x1={day * dayWidth + 4 + svgLeftPadding}
                        y1={tempScale(
                          series.data.next_24_hours.details.air_temperature_min
                        )}
                        x2={day * dayWidth + dayWidth - 4 + svgLeftPadding}
                        y2={tempScale(
                          series.data.next_24_hours.details.air_temperature_min
                        )}
                        stroke="#ff0000"
                      />

                      <!-- Rain rectangle -->
                      <rect
                        x={day * dayWidth + dayWidth / 2 - rainBarWidth / 2 + svgLeftPadding}
                        y={rainScale(
                          series.data.next_24_hours.details.precipitation_amount
                        )}
                        width={rainBarWidth}
                        height={rainScale(0) -
                          rainScale(
                            series.data.next_24_hours.details
                              .precipitation_amount
                          )}
                        fill="#0000ffcc"
                      />

                      {#if series.data.next_24_hours.details.precipitation_amount != 0}
                        <!-- Rain as text -->
                        <text
                          x={day * dayWidth + dayWidth / 2 + svgLeftPadding}
                          Y={rainScale(
                            series.data.next_24_hours.details
                              .precipitation_amount
                          ) - 5}
                          class="svgText textOutline"
                          text-anchor="middle"
                        >
                          {series.data.next_24_hours.details
                            .precipitation_amount}
                        </text>
                      {/if}
                    {/if}
                  {/each}
                </svg>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>

  <!-- Info -->
</main>

<style lang="postcss">
  :global(html) {
    background-color: theme(colors.slate.200);
  }

  html,
  body {
    height: 100%;
    margin: 0;
  }

  .svgText {
    font: regular 8px sans-serif;
    fill: blue;
  }

  .textOutline {
    text-shadow:
      1px 1px 0 theme(colors.gray.100),
      -1px -1px 0 theme(colors.gray.100),
      1px -1px 0 theme(colors.gray.100),
      -1px 1px 0 theme(colors.gray.100);
  }
</style>
