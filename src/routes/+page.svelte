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
  let weekendsOnly = true;

  // CSV for Yr symbols
  let csvData = [];

  const dayWidth = 60;
  const rainBarWidth = 18;
  const dayHeight = 100;

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
        const filteredTimeseries =
          location.subseasonal.properties.timeseries.filter((day) => {
            const date = new Date(day.time);
            return (
              date.getDay() === 6 || date.getDay() === 0
            );
          }).map((day) => {
          const date = new Date(day.time);
          return {
            ...day,
            dayNumber: date.getDay()
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
      const timeseriesWithDayNumber = location.subseasonal.properties.timeseries.map((day) => {
        const date = new Date(day.time);
        return {
          ...day,
          dayNumber: date.getDay()
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
  }

  async function fetchWeatherForAllLocations() {
    const promises = locations.map(async (loc) => {
      const nowcast = fetchWeatherFromAPI(loc.lat, loc.lon, "nowcast");
      const subseasonal = fetchWeatherFromAPI(loc.lat, loc.lon, "subseasonal");
      const locationforecast = fetchWeatherFromAPI(
        loc.lat,
        loc.lon,
        "locationforecast"
      );

      const [nowcastData, subseasonalData, locationforecastData] =
        await Promise.all([nowcast, subseasonal, locationforecast]);

      if (nowcastData && subseasonalData && locationforecastData) {
        return {
          location: loc,
          nowcast: nowcastData,
          subseasonal: subseasonalData,
          locationforecast: locationforecastData,
        };
      } else {
        return null; // Filter out any incomplete data
      }
    });

    const results = await Promise.all(promises);
    weatherData = results.filter((data) => data !== null); // Filter out any null responses
    weatherDataFiltered = weatherData;
    filterWeatherData();

    console.log("Filtered weather data for all locations:", weatherDataFiltered);

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

  rainScale = scaleLinear().domain([0, 25]).range([dayHeight, 0]);

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
        .range([dayHeight, 0]);
    } else {
      console.error("No valid temperature data found");
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
  }

  onMount(() => {
    loadCSV();
    fetchWeatherForAllLocations();
    filterWeatherData();
  });
</script>

<!-- svelte-ignore non-top-level-reactive-declaration -->
<main class="flex flex-col items-center">
  <!-- Heading -->
  <h1 class="text-3xl font-bold my-8">Helgeplanlegger</h1>

  <label>
    <input type="checkbox" bind:checked={weekendsOnly} onclick="{filterWeatherData}"/>
    Vis kun helger
  </label>

  <!-- Data for all locations -->
  <div class="relative w-full overflow-hidden my-8">
    <div class="w-[150%] overflow-x-auto">
      <div class="inline-block w-full">
        {#if weatherDataFiltered && weatherDataFiltered.length > 0}
          <!-- For each location -->
          {#each weatherDataFiltered as data, index}
            <!-- x axis days above first location-->
            {#if index === 0}
              <div class="pl-6 pb-4">
                <svg width={1910} height="40">
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
                        font-weight="{series.dayNumber === 6 || series.dayNumber === 0 ? "bold" : "normal"}" 
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
            <div class="mb-4">
              <!-- Name of location -->
              <h3 class="text-xl font-bold absolute left-8 mb-2">
                {data.location.name}
              </h3>

              <!-- SVG per location-->
              <div class="pt-6 pl-6">
                <svg width={1910} height={dayHeight}>
                  <!-- Background rectangle full width -->
                  <!--
                  <rect
                    x="0"
                    y="0"
                    width={26 * dayWidth}
                    height={dayHeight}
                    fill="white"
                  />
                  -->

                  <!-- 0 degree temp line -->
                  <line
                    x1="0"
                    y1={tempScale(0) - 1}
                    x2={26 * dayWidth}
                    y2={tempScale(0) - 1}
                    stroke="#ff000044"
                  />
                  <line
                    x1="0"
                    y1={tempScale(0) + 1}
                    x2={26 * dayWidth}
                    y2={tempScale(0) + 1}
                    stroke="#0000ff44"
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
                      <!-- Background rectangle for weekend-->
                      {#if series.dayNumber === 6 || series.dayNumber === 0}
                        <rect
                          x={day * dayWidth}
                          y="0"
                          width={dayWidth}
                          height={dayHeight}
                          fill="white"
                        />
                      {/if}

                      <!-- Temperature rectangle -->
                      <rect
                        x={day * dayWidth + 4}
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
                        x1={day * dayWidth + 4}
                        y1={tempScale(
                          series.data.next_24_hours.details.air_temperature_max
                        )}
                        x2={day * dayWidth + dayWidth - 4}
                        y2={tempScale(
                          series.data.next_24_hours.details.air_temperature_max
                        )}
                        stroke="#ff0000"
                      />
                      <!-- Temperature min line -->
                      <line
                        x1={day * dayWidth + 4}
                        y1={tempScale(
                          series.data.next_24_hours.details.air_temperature_min
                        )}
                        x2={day * dayWidth + dayWidth - 4}
                        y2={tempScale(
                          series.data.next_24_hours.details.air_temperature_min
                        )}
                        stroke="#ff0000"
                      />

                      <!-- Rain rectangle -->
                      <rect
                        x={day * dayWidth + dayWidth / 2 - rainBarWidth / 2}
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
                          x={day * dayWidth + dayWidth / 2}
                          Y={rainScale(series.data.next_24_hours.details
                              .precipitation_amount)-5
                            }
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
    background-color: theme(colors.gray.100);
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
      /* bottom-right */ -1px -1px 0 theme(colors.gray.100),
      /* top-left */ 1px -1px 0 theme(colors.gray.100),
      /* top-right */ -1px 1px 0 theme(colors.gray.100); /* bottom-left */
  }
</style>
