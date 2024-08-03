<script>
  import "../app.css";
  import { onMount } from "svelte";
  import Papa from "papaparse"; // for csv parsing

  let weatherData = [];
  let locations = [
    { name: "Oslo", lat: 59.92, lon: 10.75 },
    { name: "Eikern", lat: 59.62, lon: 10.0 },
    { name: "Filefjell", lat: 61.17, lon: 8.2 },
    { name: "Leikanger", lat: 61.18, lon: 6.8 },
    { name: "Hestenesøyra", lat: 61.84, lon: 6.0 },
    { name: "Finse", lat: 60.6, lon: 7.5 },
  ];

  let lat = 60.1; // Default latitude
  let lon = 9.58; // Default longitude

  // CSV for Yr symbols
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
      console.log(`Weather data fetched successfully for (${lat}, ${lon})`);
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
  <div class="relative w-full overflow-hidden my-8">
    <div class="w-[150%] overflow-x-auto whitespace-nowrap">
      <div class="inline-block w-full">
        <!-- Cards for each day -->
        {#if weatherData && weatherData.length > 0}
          <!-- For each location -->
          {#each weatherData as data, index}
            <div class="mb-8">
              <!-- Name -->
              <h3 class="text-xl font-bold absolute left-8 mb-2">
                {data.location.name}
              </h3>

              <div class="flex space-x-4 pt-8">
                <!-- Nowcast Card -->
                <div class="flex-shrink-0 border p-4 w-56">
                  <p class="pt-8 font-semibold">Neste time (Nowcast):</p>

                  {#if data.nowcast.properties.timeseries.length > 0}
                    <p>
                      {searchBySymbolCode(
                        data.nowcast.properties.timeseries[0].data.next_1_hours
                          .summary.symbol_code
                      ).title_nn}
                    </p>
                    <p>Id: {searchBySymbolCode(data.nowcast.properties.timeseries[0].data.next_1_hours.summary.symbol_code).id}</p>
                    <img
                      src={`./yr-symbols-lightmode/svg/${searchBySymbolCode(data.nowcast.properties.timeseries[0].data.next_1_hours.summary.symbol_code).id}.svg`}
                      alt=""
                    />

                    <p>
                      Temp: {data.nowcast.properties.timeseries[0].data
                        .instant.details.air_temperature}°C
                    </p>
                    <p>
                      Regn: {data.nowcast.properties.timeseries[0].data
                        .next_1_hours.details.precipitation_amount} mm
                    </p>
                    <p>
                      Vind: {data.nowcast.properties.timeseries[0].data
                        .instant.details.wind_speed} m/s
                    </p>
                  {/if}
                </div>

                <!-- Location forecast card 
                <div class="flex-shrink-0 border p-4 w-56">
                  {#if data.nowcast.properties.timeseries.length > 0}{/if}
                </div> -->

                <!-- Subseasonal langtidsvarsel -->
                {#each data.subseasonal.properties.timeseries as series (series.time)}
                  {#if series.data.next_24_hours}
                    <div class="flex-shrink-0 border p-4 w-56">
                      <p class="font-semibold">{formatDate(series.time)}</p>
                      <p>
                        Temp:
                        <span class="font-semibold"
                          >{series.data.next_24_hours.details
                            .air_temperature_min}</span
                        >–
                        <span class="font-semibold"
                          >{series.data.next_24_hours.details
                            .air_temperature_max}</span
                        >°C
                      </p>
                      <p>
                        Nedbør: <span class="font-semibold"
                          >{series.data.next_24_hours.details
                            .precipitation_amount}</span
                        > mm
                      </p>
                      <div>
                        <svg width="100" height="100">
                          <!-- Background rectangle -->
                          <rect
                            x="0"
                            y="0"
                            width="100"
                            height="100"
                            fill="white"
                          />
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
                        </svg>
                      </div>
                    </div>
                  {/if}
                {/each}
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
      <a href="https://api.met.no/weatherapi/locationforecast/2.0/documentation"
        >MET Location Forecast</a
      >
    </p>
    <p class="mt-4">Example Location Forecast Complete:</p>
    <a
      class="text-purple-600"
      href="./api/location-forecast-complete?lat=60.1&lon=9.58"
      >./api/location-forecast-complete?lat=60.1&lon=9.58</a
    >

    <p class="mt-4">Example Subseasonal:</p>
    <a class="text-purple-600" href="./api/subseasonal?lat=60.1&lon=9.58"
      >./api/subseasonal?lat=60.1&lon=9.58</a
    >

    <p class="mt-4">Example Nowcast:</p>
    <a class="text-purple-600" href="./api/nowcast?lat=60.1&lon=9.58"
      >./api/nowcast?lat=60.1&lon=9.58</a
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

  html,
  body {
    height: 100%;
    margin: 0;
  }
</style>
