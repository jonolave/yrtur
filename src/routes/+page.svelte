<script>
  import "../app.css";
  import { onMount } from "svelte";
  import Papa from "papaparse"; // for csv parsing
  import { scaleLinear } from "d3-scale";
  import { min, max } from "d3-array";

  let weatherData = [];
  let locations = [
    { name: "Oslo", lat: 59.92, lon: 10.75 },
    { name: "Eikern", lat: 59.62, lon: 10.0 },
    { name: "Filefjell", lat: 61.17, lon: 8.2 },
    { name: "Leikanger", lat: 61.18, lon: 6.8 },
    { name: "Hestenesøyra", lat: 61.84, lon: 6.0 },
    { name: "Finse", lat: 60.6, lon: 7.5 },
  ];

  // CSV for Yr symbols
  let csvData = [];

  const dayWidth = 60;
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
    console.log("Weather data for all locations:", weatherData);
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

  let xScale;

  function updateScale() {
    // Flatten the nested structure to extract the max temperatures, safely checking if the data exists
    const allMaxTemperatures = weatherData.flatMap(location => {
      // Check if subseasonal and timeseries exist
      if (location.subseasonal && location.subseasonal.properties.timeseries) {
        return location.subseasonal.properties.timeseries.map(day => {
          // Check if the next_24_hours and its details exist
          return day.data?.next_24_hours?.details?.air_temperature_max;
        }).filter(temp => temp !== undefined); // Filter out undefined temperatures
      } else {
        return []; // Return empty array if no timeseries
      }
    });

    const allMinTemperatures = weatherData.flatMap(location => {
      // Check if subseasonal and timeseries exist
      if (location.subseasonal && location.subseasonal.properties.timeseries) {
        return location.subseasonal.properties.timeseries.map(day => {
          // Check if the next_24_hours and its details exist
          return day.data?.next_24_hours?.details?.air_temperature_min;
        }).filter(temp => temp !== undefined); // Filter out undefined temperatures
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
      xScale = scaleLinear()
        .domain([minValue, maxValue])
        .range([0, 500]);
    } else {
      console.error("No valid temperature data found");
    }
  }

  // SVG precipitation
  const svgWidth = 190;
  const svgHeight = 50;
  const barWidth = 3;

  onMount(() => {
    loadCSV();
    fetchWeatherForAllLocations();
  });
</script>

<main class="flex flex-col items-center">
  <!-- Heading -->
  <h1 class="text-3xl font-bold my-8">YrTur</h1>

  <!-- Data for all locations -->
  <div class="relative w-full overflow-hidden my-8">
    <div class="w-[150%] overflow-x-auto whitespace-nowrap">
      <div class="inline-block w-full">
        {#if weatherData && weatherData.length > 0}
          <!-- For each location -->
          {#each weatherData as data, index}
            <!-- x axis days above first location-->
            {#if index === 0}
              <div class="pl-6 pb-4">
                <svg width={1910} height="40">
                  <!-- Background rectangle -->
                  <rect
                    x="0"
                    y="0"
                    width={26 * dayWidth}
                    height="40"
                    fill="white"
                  />
                  <!-- For each day -->
                  {#each data.subseasonal.properties.timeseries as series, day (series.time)}
                    {#if series.data.next_24_hours}
                      <!-- Day in text -->
                      <text
                        x={day * dayWidth}
                        Y="20"
                        class=""
                        text-anchor="start"
                      >
                        {formatDate(series.time, "day")}
                      </text>

                      <text
                        x={day * dayWidth}
                        Y="40"
                        class=""
                        text-anchor="start"
                      >
                        {formatDate(series.time, "date")}
                      </text>
                    {/if}
                  {/each}
                </svg>
              </div>
            {/if}

            <div class="mb-4">
              <!-- Name of location -->
              <h3 class="text-xl font-bold absolute left-8 mb-2">
                {data.location.name}
              </h3>

              <!-- SVG -->
              <div class="pt-0 pl-6">
                <svg width={1910} height={dayHeight}>
                  <!-- Background rectangle -->
                  <rect
                    x="0"
                    y="0"
                    width={26 * dayWidth}
                    height={dayHeight}
                    fill="white"
                  />
                  <!-- Percipation -->
                  {#each data.subseasonal.properties.timeseries as series, day (series.time)}
                    {#if series.data.next_24_hours}
                      <!-- Rainy rectangle -->
                      <rect
                        x={day * dayWidth}
                        y={dayHeight -
                          series.data.next_24_hours.details
                            .precipitation_amount *
                            5}
                        width={dayWidth}
                        height={series.data.next_24_hours.details
                          .precipitation_amount * 5}
                        fill="#0000ff77"
                      />

                      <!-- Rain in text -->
                      <text
                        x={day * dayWidth + dayWidth}
                        Y={dayHeight -
                          series.data.next_24_hours.details
                            .precipitation_amount *
                            5 -
                          5}
                        class="svgText"
                        text-anchor="end"
                      >
                        {series.data.next_24_hours.details.precipitation_amount}
                      </text>

                      <!-- Temp rectangle -->
                      <rect
                        x={day * dayWidth}
                        y={dayHeight -
                          series.data.next_24_hours.details
                            .air_temperature_max *
                            3}
                        width="4"
                        height={(series.data.next_24_hours.details
                          .air_temperature_max -
                          series.data.next_24_hours.details
                            .air_temperature_min) *
                          3}
                        fill="#ff000077"
                      />
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
  <div class="flex flex-col mt-8 w-full max-w-[800px] items-start grow">
    <h1 class="text-3xl font-bold">YrTur info</h1>
    <p>
      <a
        href="https://api.met.no/weatherapi/locationforecast/2.0/documentation"
      >
        MET Location Forecast
      </a>
    </p>
    <p class="mt-4">Example Location Forecast Complete:</p>
    <a
      class="text-purple-600"
      href="./api/location-forecast-complete?lat=60.1&lon=9.58"
    >
      ./api/location-forecast-complete?lat=60.1&lon=9.58
    </a>

    <p class="mt-4">Example Subseasonal:</p>
    <a class="text-purple-600" href="./api/subseasonal?lat=60.1&lon=9.58">
      ./api/subseasonal?lat=60.1&lon=9.58
    </a>

    <p class="mt-4">Example Nowcast:</p>
    <a class="text-purple-600" href="./api/nowcast?lat=60.1&lon=9.58">
      ./api/nowcast?lat=60.1&lon=9.58
    </a>

    <p class="mt-4">
      Example data transformed in a <a
        class="text-purple-600"
        href="https://docs.google.com/spreadsheets/d/1H8TS_eymRtk_oridPHOtUqVuF7h8Ps_0D1xbQYBbNKI/edit?gid=0#gid=0"
      >
        Google sheet
      </a>
      .
    </p>
  </div>
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
</style>
