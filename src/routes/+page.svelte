<script>
  import "../app.css";
  import { onMount } from "svelte";
  import Papa from "papaparse"; // for csv parsing

  let weatherData = [];
  let locations = [
    { name: "Finse", lat: 60.6, lon: 7.5 },
    { name: "Hestenesøyra", lat: 61.84, lon: 6.0 },
    { name: "Oslo", lat: 59.92, lon: 10.75 },
  ];

  let lat = 60.1; // Default latitude
  let lon = 9.58; // Default longitude

  // Variable and functions for CSV data for Yr symbols
  let csvData = [];

  async function loadCSV() {
    const response = await fetch("./src/assets/weather.csv");
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
    console.log("Searching for symbol code:", symbolCode);
    const result = csvData.find(
      (row) =>
        row.dayName === symbolCode ||
        row.nightName === symbolCode ||
        row.midnightName === symbolCode
    );
    // console.log("Result:", result);
    if (result) {
      console.log("Found result for", symbolCode);
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

  async function fetchWeather(lat, lon) {
    try {
      const response = await fetch(
        `./api/subseasonal?lat=${lat}&lon=${lon}`
      );
      if (!response.ok) {
        console.error(
          `Failed to fetch weather data for (${lat}, ${lon}):`,
          response.status
        );
        return null;
      }
      console.log(`Weather data fetched successfully for (${lat}, ${lon})`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching weather data for (${lat}, ${lon}):`, error);
      return null;
    }
  }

  async function fetchWeatherForAllLocations() {
    const promises = locations.map((loc) => fetchWeather(loc.lat, loc.lon));
    const results = await Promise.all(promises);
    weatherData = results.filter((data) => data !== null); // Filter out any null responses
    console.log("Weather data for all locations:", weatherData);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { weekday: "long", day: "numeric", month: "numeric" };
    const formatter = new Intl.DateTimeFormat("no-NO", options);
    return formatter.format(date);
  }

  onMount(() => {
    loadCSV();
    fetchWeatherForAllLocations();
  });
</script>

<main class="flex flex-col items-center">
  <!-- Heading -->
  <h1 class="text-3xl font-bold my-8">YrTur</h1>

  <!-- Data for all locations -->
  <div class="max-w-4xl mx-auto my-8 flex flex-col overflow-x-auto">
    {#if weatherData && weatherData.length > 0}
      {#each weatherData as data, index}
      <!-- For each location -->
        <div class="mb-8">
          <h3 class="text-xl font-bold mb-2 absolute left-8">
            {locations[index].name}
          </h3>
          <div class="flex space-x-4 pt-8">
            {#each data.properties.timeseries as series (series.time)}
              {#if series.data.next_24_hours}
                <div class="flex-shrink-0 border p-4 w-56">
                  <p class="font-semibold">{formatDate(series.time)}</p>
                  <p>
                    Temp: 
                    <span class="font-semibold">{series.data.next_24_hours.details.air_temperature_min}</span>–
                    <span class="font-semibold">{series.data.next_24_hours.details.air_temperature_max}</span>°C
                  </p>

                  <p>
                    Nedbør: <span class="font-semibold">{series.data.next_24_hours.details.precipitation_amount}</span> mm
                  </p>

                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Info -->
  <div class="flex flex-col mt-8 w-full max-w-[800px] items-start grow">
    <h1 class="text-3xl font-bold">YrTur info</h1>
    <p>
      <a href="https://api.met.no/weatherapi/locationforecast/2.0/documentation"
        >MET Location Forecast</a
      >
    </p>
    <p class="mt-4">Example Location Forecast Complete:</p>
    <a
      class="text-purple-600"
      href="http://localhost:5173/api/location-forecast-complete?lat=60.1&lon=9.58"
      >http://localhost:5173/api/location-forecast-complete?lat=60.1&lon=9.58</a
    >

    <p class="mt-4">Example Subseasonal:</p>
    <a
      class="text-purple-600"
      href="http://localhost:5173/api/subseasonal?lat=60.1&lon=9.58"
      >http://localhost:5173/api/subseasonal?lat=60.1&lon=9.58</a
    >

    <p class="mt-4">Example Nowcast:</p>
    <a
      class="text-purple-600"
      href="http://localhost:5173/api/nowcast?lat=60.1&lon=9.58"
      >http://localhost:5173/api/nowcast?lat=60.1&lon=9.58</a
    >

    <p class="mt-4">
      Example data transformed in a <a
        class="text-purple-600"
        href="https://docs.google.com/spreadsheets/d/1H8TS_eymRtk_oridPHOtUqVuF7h8Ps_0D1xbQYBbNKI/edit?gid=0#gid=0"
        >Google sheet</a
      >.
    </p>
  </div>
</main>

<style lang="postcss">
  :global(html) {
    background-color: theme(colors.gray.100);
  }
</style>
