<script>
  import "../app.css";
  import { onMount, tick } from "svelte";
  import { scaleLinear } from "d3-scale";
  import { min, max } from "d3-array";
  import PlaceSearch from "../lib/components/PlaceSearch.svelte";

  let weatherData = [];
  let weatherDataFiltered = [];
  let locations = [
    { name: "Oslo", lat: 59.92, lon: 10.75 },
    { name: "Eikern", lat: 59.62, lon: 10.0 },
    { name: "Filefjell", lat: 61.17, lon: 8.2 },
    // { name: "Leikanger", lat: 61.18, lon: 6.8 },
    { name: "Hestenesøyra", lat: 61.84, lon: 6.0 },
    // { name: "Finse", lat: 60.6, lon: 7.5 },
  ];
  let weekendsOnly = false;
  let maxTemp;
  let minTemp;

  const handleAddPlace = (event) => {
    const newPlace = event.detail.position;

    console.log("Adding ", newPlace.display_name);

    locations.push({
      name: newPlace.name,
      lat: newPlace.lat,
      lon: newPlace.lon,
    });

    fetchWeatherForAllLocations();
    filterWeatherData();
  };

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

  const settings = {
    weekDayWidth: 16,
    weekEndDayWidth: 60,
    dayHeight: 100,
    svgLeftPadding: 70,
  };

  // CSV for Yr symbols
  let csvData = [];

  let weekDays = 0;
  let weekendDays = 0;
  let scrollDistance = 0;

  let svgTotalWidth = 100; // value here doesn't really matter, will be updated later
  // $: console.log("SVG width changed: ", svgTotalWidth);

  // Reactive block for weekendsOnly
  $: if (weatherDataFiltered[0]?.subseasonal) {
    // console.log("we have data");
    if (weatherDataFiltered[0].subseasonal.properties.timeseries) {
      svgTotalWidth =
        weekDays * settings.weekDayWidth +
        weekendDays * settings.weekEndDayWidth;

      // weatherDataFiltered[0].subseasonal.properties.timeseries.length *
      // settings.weekDayWidth;
    } else {
      svgTotalWidth = 10;
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
    let xPixelStart = 0;
    let currentWidth = 0;

    if (weekendsOnly) {
      // filter weekends
      weatherDataFiltered = weatherData.map((location) => {
        weekDays = 0;
        weekendDays = 0;
        xPixelStart = 0;
        currentWidth = 0;

        const filteredTimeseries = location.subseasonal.properties.timeseries
          .filter((day) => {
            const date = new Date(day.time);
            return date.getDay() === 6 || date.getDay() === 0;
          })
          .map((day) => {
            const date = new Date(day.time);
            if (date.getDay() === 0 || date.getDay() === 6) {
              weekendDays += 1;
              currentWidth = settings.weekEndDayWidth;
              xPixelStart += currentWidth;
            } else {
              weekDays += 1;
              currentWidth = settings.weekDayWidth;
              xPixelStart += currentWidth;
            }
            return {
              ...day,
              dayNumber: date.getDay(),
              xPixelStart: xPixelStart - currentWidth,
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
        weekDays = 0;
        weekendDays = 0;
        xPixelStart = 0;
        currentWidth = 0;

        const timeseriesWithDayNumber =
          location.subseasonal.properties.timeseries.map((day) => {
            const date = new Date(day.time);
            if (date.getDay() === 0 || date.getDay() === 6) {
              weekendDays += 1;
              currentWidth = settings.weekEndDayWidth;
              xPixelStart += currentWidth;
            } else {
              weekDays += 1;
              currentWidth = settings.weekDayWidth;
              xPixelStart += currentWidth;
            }
            return {
              ...day,
              dayNumber: date.getDay(),
              xPixelStart: xPixelStart - currentWidth,
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
        weekDays * settings.weekDayWidth +
        weekendDays * settings.weekEndDayWidth;

      // weatherDataFiltered[0].subseasonal.properties.timeseries.length *
      // settings.weekDayWidth;
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

    console.log("Filtered weather data for all locations:");
    console.log(weatherDataFiltered);

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
    const pixelsAboveTemp = 24;
    const tempShareOfHeight = 0.8;
    const pixelsBelowRain = 6;
    const rainShareOfHeight = 0.7;

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

      maxTemp = maxValue;
      minTemp = minValue;

      console.log("Min temperature:", minValue);
      console.log("Max temperature:", maxValue);

      // Create a linear scale based on the min and max values
      tempScale = scaleLinear()
        .domain([minValue, maxValue])
        .range([settings.dayHeight * tempShareOfHeight, pixelsAboveTemp]);
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

      // console.log("Max rain:", maxValue);

      if (maxValue > 20) {
        rainScale = scaleLinear()
          .domain([0, maxValue])
          .range([
            settings.dayHeight - pixelsBelowRain,
            settings.dayHeight - settings.dayHeight * rainShareOfHeight,
          ]);
      } else {
        rainScale = scaleLinear()
          .domain([0, 20])
          .range([
            settings.dayHeight - pixelsBelowRain,
            settings.dayHeight - settings.dayHeight * rainShareOfHeight,
          ]);
      }
    } else {
      // console.error("No valid rain data found");
    }
  }

  $: filterWeatherData();

  // Reactive block for weekendsOnly
  $: if (weekendsOnly !== undefined) {
    filterWeatherData();
    updateScale();
  }

  let showStickyAxis = false;
  let scrollContainer; // Scroll container reference
  let xAxis; // Reference to the original x-axis

  onMount(() => {
    fetchWeatherForAllLocations();
    filterWeatherData();
  });
</script>

<main class="">
  <!-- Top info area -->
  <div class="px-5 py-8 mb-4 bg-slate-700">
    <!-- Heading -->
    <h1 class="text-3xl text-orange-400 mb-1 merriweather-font">
      Helge&shy;været
    </h1>
    <h2 class="text-xl text-white mb-5">
      Sammenlign langtidsvarsel for steder i Norden
    </h2>

    <p class="text-white">Du kan for eksempel sjekke:</p>
    <ul class="pl-1">
      <li>
        👉🏻
        <a
          href="#"
          on:click={() => exampleLocations("Sør-Norge")}
          class="text-orange-400 underline decoration-dotted"
          role="button"
        >
          Byer i Sør-Norge
        </a>
      </li>
      <li>
        👉🏻 <a
          href="#"
          on:click={() => exampleLocations("skidestinasjoner")}
          class="text-orange-400 underline decoration-dotted"
          role="button"
        >
          Skidestinasjoner i Norge
        </a>
      </li>
      <li>
        👉🏻 <a
          href="#"
          on:click={() => exampleLocations("Norden")}
          class="text-orange-400 underline decoration-dotted"
          role="button"
        >
          Byer i Norden
        </a>
      </li>
    </ul>

    <p class="my-2 text-white">
      ...eller søk opp dine egne favoritter nederst på siden!
    </p>
  </div>

  <div class="pl-4 mb-8">
    <label>
      <input
        type="checkbox"
        bind:checked={weekendsOnly}
        onclick={() => {
          filterWeatherData();
          updateScale();
          svgTotalWidth =
            weekDays * settings.weekDayWidth +
            weekendDays * settings.weekEndDayWidth;

          // weatherDataFiltered[0].subseasonal.properties.timeseries.length *
          // settings.weekDayWidth;
        }}
      />
      Vis kun helger
    </label>
  </div>

  <!-- Data for all locations -->
  <div class="relative w-full overflow-hidden mt-2 mb-2">
    <div class="flex overflow-x-auto min-w-0" id="scrollContainer">
      <div class="flex-shrink-0 w-full">
        {#if weatherDataFiltered && weatherDataFiltered.length > 0}
          <!-- X-axis with days -->
          <div
            class="bg-white pl-[42px] mb-2 h-[48px] ml-4 rounded-[4px]"
            style="width: {svgTotalWidth + settings.svgLeftPadding + 8}px"
          >
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
                        font-weight={series.dayNumber === 6 ||
                        series.dayNumber === 0
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
                    {:else if series.dayNumber === 3}
                      <text
                        x={series.xPixelStart + settings.weekDayWidth / 2}
                        Y="20"
                        font-size="16px"
                        text-anchor="middle"
                        font-weight="normal"
                      >
                        man - fre
                      </text>
                    {/if}
                  {/if}
                {/each}
              {/if}
            </svg>
          </div>

          <!-- Weather for each location -->
          {#each weatherDataFiltered as data, index}
            <!-- weather data for each day -->
            <div class="mb-4" style="height: {settings.dayHeight}px;">
              <!-- Fixed left area per location -->
              <div
                class="w-[75px] absolute left-0 overflow-hidden flex items-center"
                style="height: {settings.dayHeight}px;"
              >
                <div
                  class="w-[50px] flex justify-center bg-slate-200 items-center h-full"
                >
                  <!-- Name of location -->
                  <div
                    class="w-[30px] ml-8 bg-white rounded-l-[4px] h-full flex justify-center items-center"
                  >
                    <h3
                      class="transform -rotate-90 origin-center whitespace-nowrap text-l font-medium"
                    >
                      {data.location.name.length > 9
                        ? data.location.name.substring(0, 7) + ".."
                        : data.location.name}
                    </h3>
                  </div>

                  <!-- Y axis -->
                  <div
                    class="w-[20px] bg-white h-full shadow-[0_0_5px_2px_rgba(255,255,255,1.0)]"
                  >
                    <svg width="25" height={settings.dayHeight}>
                      {#if minTemp < 0 && maxTemp > 0}
                        <!-- 0 degrees -->
                        <line
                          x1="18"
                          y1={tempScale(0)}
                          x2="25"
                          y2={tempScale(0)}
                          stroke="#222"
                        />

                        {#if maxTemp > 2 && minTemp < -2}
                          <text
                            x="18"
                            fill="#222"
                            Y={tempScale(0) + 2}
                            font-size="12px"
                            text-anchor="end"
                            font-weight="normal"
                          >
                            0°
                          </text>
                        {/if}
                      {/if}

                      <!-- Max tem -->
                      <line
                        x1="18"
                        y1={tempScale(maxTemp)}
                        x2="25"
                        y2={tempScale(maxTemp)}
                        stroke="#222"
                      />
                      <text
                        x="18"
                        fill="#222"
                        Y={tempScale(maxTemp) + 2}
                        font-size="12px"
                        text-anchor="end"
                        font-weight="normal"
                      >
                        {Math.round(maxTemp)}°
                      </text>

                      <!-- Min tem -->
                      <line
                        x1="18"
                        y1={tempScale(minTemp)}
                        x2="25"
                        y2={tempScale(minTemp)}
                        stroke="#222"
                      />
                      <text
                        x="18"
                        fill="#222"
                        Y={tempScale(minTemp) + 2}
                        font-size="12px"
                        text-anchor="end"
                        font-weight="normal"
                      >
                        {Math.round(minTemp)}°
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- SVG per location-->
              <div
                class="flex items-center"
                style="width: {svgTotalWidth +
                  settings.svgLeftPadding +
                  240}px;"
              >
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
                      <!-- Draw weekend data -->
                      {#if series.dayNumber === 6 || series.dayNumber === 0}
                        <!-- Temperature rectangle -->
                        <rect
                          x={series.xPixelStart + settings.svgLeftPadding}
                          y={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          )}
                          width={settings.weekEndDayWidth}
                          height={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_min
                          ) -
                            tempScale(
                              series.data.next_24_hours.details
                                .air_temperature_max
                            )}
                          fill="#ff000033"
                        />

                        <!-- Max temp as text -->
                        <text
                          x={series.xPixelStart +
                            settings.weekEndDayWidth / 2 +
                            settings.svgLeftPadding}
                          Y={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          ) - 5}
                          class="svgTempText textOutline text-sm"
                          text-anchor="middle"
                        >
                          {Math.round(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          )}°
                        </text>

                        <!-- Temperature max line -->
                        <line
                          x1={series.xPixelStart + settings.svgLeftPadding}
                          y1={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          )}
                          x2={series.xPixelStart +
                            settings.weekEndDayWidth +
                            settings.svgLeftPadding}
                          y2={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          )}
                          stroke="#ff0000"
                        />

                        <!-- Temperature min line -->
                        <line
                          x1={series.xPixelStart + settings.svgLeftPadding}
                          y1={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_min
                          )}
                          x2={series.xPixelStart +
                            settings.weekEndDayWidth +
                            settings.svgLeftPadding}
                          y2={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_min
                          )}
                          stroke="#ff0000"
                        />

                        <!-- Rain rectangle -->
                        <rect
                          x={series.xPixelStart + settings.svgLeftPadding}
                          y={rainScale(
                            series.data.next_24_hours.details
                              .precipitation_amount
                          )}
                          width={settings.weekEndDayWidth}
                          height={rainScale(0) -
                            rainScale(
                              series.data.next_24_hours.details
                                .precipitation_amount
                            )}
                          fill="#0000ffcc"
                        />

                        <!-- Rain as text -->
                        {#if series.data.next_24_hours.details.precipitation_amount != 0}
                          <text
                            x={series.xPixelStart +
                              settings.weekEndDayWidth / 2 +
                              settings.svgLeftPadding}
                            Y={rainScale(
                              series.data.next_24_hours.details
                                .precipitation_amount
                            ) - 5}
                            class="svgRainText text-sm textOutline"
                            text-anchor="middle"
                          >
                            {series.data.next_24_hours.details
                              .precipitation_amount}
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

                        <!-- Temperature rectangle -->
                        <rect
                          x={series.xPixelStart + settings.svgLeftPadding}
                          y={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          )}
                          width={settings.weekDayWidth}
                          height={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_min
                          ) -
                            tempScale(
                              series.data.next_24_hours.details
                                .air_temperature_max
                            )}
                          fill="#ff000033"
                        />

                        <!-- Temperature max line -->
                        <line
                          x1={series.xPixelStart + settings.svgLeftPadding}
                          y1={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          )}
                          x2={series.xPixelStart +
                            settings.weekDayWidth +
                            settings.svgLeftPadding}
                          y2={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_max
                          )}
                          stroke="#ff0000"
                        />

                        <!-- Temperature min line -->
                        <line
                          x1={series.xPixelStart + settings.svgLeftPadding}
                          y1={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_min
                          )}
                          x2={series.xPixelStart +
                            settings.weekDayWidth +
                            settings.svgLeftPadding}
                          y2={tempScale(
                            series.data.next_24_hours.details
                              .air_temperature_min
                          )}
                          stroke="#ff0000"
                        />

                        <!-- Rain rectangle -->
                        <rect
                          x={series.xPixelStart + settings.svgLeftPadding}
                          y={rainScale(
                            series.data.next_24_hours.details
                              .precipitation_amount
                          )}
                          width={settings.weekDayWidth}
                          height={rainScale(0) -
                            rainScale(
                              series.data.next_24_hours.details
                                .precipitation_amount
                            )}
                          fill="#0000ffcc"
                        />
                      {/if}
                    {/if}
                  {/each}
                </svg>

                <button
                  on:click={() => {
                    locations.splice(index, 1); // Remove one element at the index
                    fetchWeatherForAllLocations();
                    filterWeatherData(); // Call the filter function
                  }}
                  class="h-[42px] ml-4 bg-white hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
                >
                  Ta bort {data.location.name.length > 9
                    ? data.location.name.substring(0, 8) + ".."
                    : data.location.name}
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>

  <!-- Add location -->
  <div class="max-w-md p-4">
    <h2 class="text-xl merriweather-font mb-2">Legg til sted</h2>
    <PlaceSearch on:addPlace={handleAddPlace} />
  </div>
</main>

<style lang="postcss">
  @import url("https://fonts.googleapis.com/css2?family=Merriweather:wght@400&display=swap");

  :global(html) {
    background-color: theme(colors.slate.200);
  }

  .merriweather-font {
    font-family: "Merriweather", serif;
    line-height: normal;
    font-weight: 400;
  }

  #sticky-axis {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }

  #sticky-axis::-webkit-scrollbar {
    display: none;
  }

  .svgRainText {
    fill: theme(colors.blue.500);
  }

  .svgTempText {
    fill: theme(colors.red.500);
  }

  .textOutline {
    text-shadow:
      1px 1px 0 theme(colors.gray.100),
      -1px -1px 0 theme(colors.gray.100),
      1px -1px 0 theme(colors.gray.100),
      -1px 1px 0 theme(colors.gray.100);
  }
</style>
