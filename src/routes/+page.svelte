<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { scaleLinear } from 'd3-scale';
  import { min, max } from 'd3-array';
  import PlaceSearch from '../lib/components/PlaceSearch.svelte';
  import ForecastViz from '../lib/components/ForecastViz.svelte';
  import Xaxis from '../lib/components/Xaxis.svelte';
  import Legend from '../lib/components/Legend.svelte';

  const settings = {
    weekDayWidth: 16,
    weekEndDayWidth: 60,
    dayHeight: 120,
    svgLeftPadding: 51, 
    pixelsAboveTemp: 24,
    tempShareOfHeight: 0.8,
    pixelsBelowRain: 6,
    rainShareOfHeight: 0.7,
    sameTempScale: false,
  };

  let locations = defaultLocations();

  let weatherData = [];
  let weatherDataFiltered = [];

  let weekendsOnly = false;
  let maxTemp;
  let minTemp;

  let container;
  let hasOverflow = false;

  function checkOverflow() {
    if (container) {
      requestAnimationFrame(() => {
        // Ensure the DOM is fully rendered before checking
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.getBoundingClientRect().width;
        hasOverflow = scrollWidth > clientWidth;
      });
    }
  }

  function saveToLocalStorage() {
    localStorage.setItem('yrturlocations', JSON.stringify(locations));
  }

  const handleAddPlace = (event) => {
    const newPlace = event.detail.position;

    // Check if the location is already in the list
    const isDuplicate = locations.some(
      (location) =>
        location.name === newPlace.name ||
        (location.lat === newPlace.lat && location.lon === newPlace.lon)
    );

    if (isDuplicate) {
      alert(`Du har allereie ${newPlace.name} i lista.`);
      return;
    }

    locations.unshift({
      name: newPlace.name,
      lat: newPlace.lat,
      lon: newPlace.lon,
    });

    fetchWeatherForAllLocations();
    filterWeatherData();
    saveToLocalStorage();
  };

  function defaultLocations() {
    return [
      { name: 'Oslo', lat: 59.92, lon: 10.75 },
      { name: 'Bergen', lat: 60.39, lon: 5.32 },
      { name: 'Trondheim', lat: 63.43, lon: 10.39 },
      { name: 'Tromsø', lat: 69.65, lon: 18.96 },
    ];
  }

  function exampleLocations(location) {
    switch (location) {
      case 'Sør-Norge':
        locations = [
          { name: 'Oslo', lat: 59.92, lon: 10.75 },
          { name: 'Bergen', lat: 60.39, lon: 5.32 },
          { name: 'Stavanger', lat: 58.97, lon: 5.73 },
          { name: 'Drammen', lat: 59.74, lon: 10.2 },
          { name: 'Kristiansand', lat: 58.15, lon: 7.99 },
        ];
        console.log('Loading Sør-Norge..');
        break;
      case 'Nord-Norge':
        locations = [
          { name: 'Tromsø', lat: 69.65, lon: 18.96 },
          { name: 'Bodø', lat: 67.28, lon: 14.41 },
          { name: 'Harstad', lat: 68.8, lon: 16.54 },
          { name: 'Narvik', lat: 68.44, lon: 17.43 },
          { name: 'Alta', lat: 69.97, lon: 23.27 },
        ];
        console.log('Loading Nord-Norge..');
        break;
      case 'skidestinasjoner':
        locations = [
          { name: 'Trysil', lat: 61.31, lon: 12.26 },
          { name: 'Hemsedal', lat: 60.87, lon: 8.55 },
          { name: 'Hafjell', lat: 61.24, lon: 10.44 },
          { name: 'Geilo', lat: 60.53, lon: 8.2 },
          { name: 'Kvitfjell', lat: 61.47, lon: 10.14 },
        ];
        console.log('Loading skidestinasjoner..');
        break;
      case 'Norden':
        locations = [
          { name: 'Stockholm', lat: 59.33, lon: 18.06 },
          { name: 'København', lat: 55.68, lon: 12.57 },
          { name: 'Helsingfors', lat: 60.17, lon: 24.94 },
          { name: 'Oslo', lat: 59.91, lon: 10.75 },
          { name: 'Göteborg', lat: 57.71, lon: 11.97 },
        ];
        console.log('Loading Norden..');
        break;
      default:
        locations = [{ name: 'Oslo', lat: 59.92, lon: 10.75 }];
    }

    fetchWeatherForAllLocations();
    filterWeatherData();
    updateScale();
  }

  // CSV for Yr symbols, not in use
  // let csvData = [];

  let weekDays = 0;
  let weekendDays = 0;

  let svgTotalWidth = 100; // value here doesn't really matter, will be updated later

  $: if (weatherDataFiltered[0]?.subseasonal) {
    if (weatherDataFiltered[0].subseasonal.properties.timeseries) {
      svgTotalWidth =
        weekDays * settings.weekDayWidth +
        weekendDays * settings.weekEndDayWidth;
    } else {
      svgTotalWidth = 10;
    }
  }

  async function fetchWeatherFromAPI(lat, lon, apiType) {
    // Choose correct URL for API
    let url;
    switch (apiType) {
      case 'nowcast':
        url = `./api/nowcast?lat=${lat}&lon=${lon}`;
        break;
      case 'subseasonal':
        url = `./api/subseasonal?lat=${lat}&lon=${lon}`;
        break;
      case 'locationforecast':
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

    weatherDataFiltered = weatherData.map((location) => {
      weekDays = 0;
      weekendDays = 0;
      xPixelStart = 0;
      currentWidth = 0;
      let maxTemp = -Infinity;
      let minTemp = Infinity;

      const filteredTimeseries = location.subseasonal.properties.timeseries
        // Filter if weekends only
        .filter((day) => {
          if (weekendsOnly) {
            const date = new Date(day.time);
            return date.getDay() === 6 || date.getDay() === 0;
          } else {
            return true;
          }
        })
        // calculations per day
        .map((day) => {
          const date = new Date(day.time);

          // Update min and max temperatures
          if (
            day.data.next_24_hours.details.air_temperature_max !== undefined &&
            day.data.next_24_hours.details.air_temperature_min !== undefined
          ) {
            if (day.data.next_24_hours.details.air_temperature_max > maxTemp)
              maxTemp = day.data.next_24_hours.details.air_temperature_max;
            if (day.data.next_24_hours.details.air_temperature_min < minTemp)
              minTemp = day.data.next_24_hours.details.air_temperature_min;
          }

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

      // Linear scale for location based on the min and max temp
      const tempScale = scaleLinear()
        .domain([minTemp, maxTemp])
        .range([settings.dayHeight * settings.tempShareOfHeight, settings.pixelsAboveTemp]);

      return {
        ...location,
        subseasonal: {
          ...location.subseasonal,
          properties: {
            ...location.subseasonal.properties,
            timeseries: filteredTimeseries,
            minTemp,
            maxTemp,
            tempScale,
          },
        },
      };
    });

    // console.log('Filtered weather data:', weatherDataFiltered);

    if (weatherDataFiltered[0]?.subseasonal) {
      svgTotalWidth =
        weekDays * settings.weekDayWidth +
        weekendDays * settings.weekEndDayWidth;
    }
  }

  async function fetchWeatherForAllLocations() {
    const promises = locations.map(async (loc) => {
      // const nowcast = fetchWeatherFromAPI(loc.lat, loc.lon, "nowcast");
      const subseasonal = fetchWeatherFromAPI(loc.lat, loc.lon, 'subseasonal');
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
    updateScale();
  }

  function formatDate(dateString, data = 'weekday') {
    const date = new Date(dateString);
    if (data === 'weekday') {
      const options = { weekday: 'short' };
      const formatter = new Intl.DateTimeFormat('no-NO', options);
      return formatter.format(date);
    } else if (data === 'date') {
      const options = { day: 'numeric' };
      const formatter = new Intl.DateTimeFormat('no-NO', options);
      return formatter.format(date);
    } else {
      const options = { weekday: 'short' };
      const formatter = new Intl.DateTimeFormat('no-NO', options);
      return formatter.format(date);
    }
  }

  let tempScaleGlobal; // currently not in use
  let rainScale;

  function updateScale() {

    // Flatten the nested structure to extract the max temperatures
    const allMaxTemperatures = weatherDataFiltered.flatMap((location) => {
      // Check if subseasonal and timeseries exist
      if (location.subseasonal && location.subseasonal.properties.timeseries) {
        return location.subseasonal.properties.timeseries
          .map((day) => {
            // Check if the next_24_hours and its details exist
            return day.data?.next_24_hours?.details?.air_temperature_max;
          })
          .filter((temp) => temp !== undefined);
      } else {
        return []; // Return empty array if no timeseries
      }
    });

    const allMinTemperatures = weatherDataFiltered.flatMap((location) => {
      if (location.subseasonal && location.subseasonal.properties.timeseries) {
        return location.subseasonal.properties.timeseries
          .map((day) => {
            return day.data?.next_24_hours?.details?.air_temperature_min;
          })
          .filter((temp) => temp !== undefined);
      } else {
        return [];
      }
    });

    // Check if there are temperatures to calculate min and max
    if (allMaxTemperatures.length > 0 && allMinTemperatures.length > 0) {
      const minValue = min(allMinTemperatures);
      const maxValue = max(allMaxTemperatures);

      maxTemp = maxValue;
      minTemp = minValue;

      // Create a linear scale based on the min and max values
      tempScaleGlobal = scaleLinear()
        .domain([minValue, maxValue])
        .range([settings.dayHeight * settings.tempShareOfHeight, settings.pixelsAboveTemp]);
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
            settings.dayHeight - settings.pixelsBelowRain,
            settings.dayHeight - settings.dayHeight * settings.rainShareOfHeight,
          ]);
      } else {
        rainScale = scaleLinear()
          .domain([0, 20])
          .range([
            settings.dayHeight - settings.pixelsBelowRain,
            settings.dayHeight - settings.dayHeight * settings.rainShareOfHeight,
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

  console.log(`              
       ___      
      (o o)     
  ooO--(_)--Ooo-

  Heisann!

`);

  onMount(() => {
    const yrturlocations = localStorage.getItem('yrturlocations');

    if (yrturlocations) {
      try {
        locations = JSON.parse(yrturlocations);
        console.log('Locations loaded from localStorage', locations);
      } catch (error) {
        console.error('Error parsing localStorage data', error);
      }
    }

    fetchWeatherForAllLocations();
    filterWeatherData();
    checkOverflow();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkOverflow);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkOverflow);
      }
    };
  });
</script>

<main class="w-full min-h-screen overflow-x-hidden relative">
  <div class="relative w-full h-full">
    <img
      src="sky.png"
      alt=""
      class="absolute top-0 right-0 max-h-[230px] max-w-full w-auto animate-moveRightLeft"
    />
  </div>

  <!-- Top -->
  <section class="w-full flex-col justify-start items-center">
    <div class="w-full max-w-[950px] mx-auto px-5 pb-4 mb-3 mt-[180px]">
      <!-- Heading info -->
      <h1 class="text-4xl text-white mb-1 merriweather-font">
        Helge&shy;vêret
      </h1>

      <h2 class="text-xl text-white mt-1 mb-10 font-light">
        Samanlikn vêrmeldinga for dine favorittstadar og planlegg neste tur
      </h2>

      <!-- Ekssempel -->
      <div class="flex flex-wrap justify-start items-start gap-2 my-5">
        <!-- Sør-Noreg -->
        <button
          class="predefinedButton"
          on:click={() => exampleLocations('Sør-Norge')}>Sør-Noreg</button
        >
        <!-- Nord-Noreg -->
        <button
          class="predefinedButton"
          on:click={() => exampleLocations('Nord-Norge')}>Nord-Noreg</button
        >
        <!-- Skianlegg -->
        <button
          class="predefinedButton"
          on:click={() => exampleLocations('skidestinasjoner')}
          >Skianlegg</button
        >
        <!-- Norden -->
        <button
          class="predefinedButton"
          on:click={() => exampleLocations('Norden')}>Norden</button
        >
      </div>

      <!-- Add location -->
      <div class="max-w-md pb-4">
        <PlaceSearch on:addPlace={handleAddPlace} />
      </div>
    </div>
  </section>

  <!-- Locations with weather -->
  <section class="max-w-[950px] mx-auto" style="overflow-x: auto; ">
    <div
      class="pl-4 py-4 ml-5 {hasOverflow ? 'rounded-l-xl' : 'rounded-xl'}"
      style="background-color: rgba(255, 255, 255, 0.9);"
    >
      <!-- Checkbox -->
      <div class="mb-4 ml-2">
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
          Vis berre helger
        </label>
      </div>
      <!-- Data for all locations -->
      <div class="relative w-full overflow-hidden mt-2">
        <div
          class="flex overflow-x-auto min-w-0"
          id="scrollContainer"
          bind:this={container}
        >
          <div class="flex-shrink-0 w-full">
            {#if weatherDataFiltered && weatherDataFiltered.length > 0}
              <!-- X-axis with days -->
              <Xaxis
                {svgTotalWidth}
                {settings}
                {weatherDataFiltered}
                {formatDate}
              />
              <!-- Weather for each location -->
              {#each weatherDataFiltered as data, index (data.location.name)}
                <!-- weather data for each day -->
                <div
                  class="mb-4"
                  style="height: {settings.dayHeight}px;"
                  key={data.location.name}
                  transition:slide={{
                    delay: 250,
                    duration: 300,
                    easing: quintOut,
                    axis: 'y',
                  }}
                >
                  <!-- Fixed left area per location -->
                  <div
                    class="w-[55px] absolute left-0 overflow-hidden flex items-center"
                    style="height: {settings.dayHeight}px;"
                  >
                    <div
                      class="w-[44px] flex justify-center items-center h-full"
                    >
                      <!-- Name of location -->
                      <div
                        class="w-[32px] bg-white pl-1 h-full flex justify-center items-center"
                      >
                        <h3
                          class="transform -rotate-90 origin-center whitespace-nowrap text-l font-medium"
                        >
                          {data.location.name.length > 12
                            ? data.location.name.substring(0, 10) + '..'
                            : data.location.name}
                        </h3>
                      </div>
                      <!-- Y axis -->
                      <div
                        class="w-[20px] bg-white h-full shadow-[0_0_5px_2px_rgba(255,255,255,1.0)]"
                      >
                        <svg width="25" height={settings.dayHeight}>
                          {#if data.subseasonal.properties.minTemp < 0 && data.subseasonal.properties.maxTemp > 0}
                            <!-- 0 degrees -->
                            <line
                              x1="18"
                              y1={ data.subseasonal.properties.tempScale(0) }
                              x2="25"
                              y2={ data.subseasonal.properties.tempScale(0) }
                              stroke="#222"
                            />
                            {#if data.subseasonal.properties.tempScale(data.subseasonal.properties.minTemp) - data.subseasonal.properties.tempScale(0) > 8 && data.subseasonal.properties.tempScale(0) - data.subseasonal.properties.tempScale(data.subseasonal.properties.maxTemp) > 8}
                              <text
                                x="18"
                                fill="#222"
                                Y={data.subseasonal.properties.tempScale(0) + 3}
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
                            y1={data.subseasonal.properties.tempScale(data.subseasonal.properties.maxTemp)}
                            x2="25"
                            y2={data.subseasonal.properties.tempScale(data.subseasonal.properties.maxTemp)}
                            stroke="#222"
                          />
                          <text
                            x="18"
                            fill="#222"
                            Y={data.subseasonal.properties.tempScale(data.subseasonal.properties.maxTemp) + 3}
                            font-size="12px"
                            text-anchor="end"
                            font-weight="normal"
                          >
                            {Math.round(data.subseasonal.properties.maxTemp)}°
                          </text>
                          <!-- Min tem -->
                          <line
                            x1="18"
                            y1={data.subseasonal.properties.tempScale(data.subseasonal.properties.minTemp)}
                            x2="25"
                            y2={data.subseasonal.properties.tempScale(data.subseasonal.properties.minTemp)}
                            stroke="#222"
                          />
                          <text
                            x="18"
                            fill="#222"
                            Y={data.subseasonal.properties.tempScale(data.subseasonal.properties.minTemp) + 3}
                            font-size="12px"
                            text-anchor="end"
                            font-weight="normal"
                          >
                            {Math.round(data.subseasonal.properties.minTemp)}°
                          </text>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <!-- SVG per location-->
                  <div
                    class="flex items-center overflow-hidden"
                    style="width: {svgTotalWidth +
                      settings.svgLeftPadding +
                      64}px;"
                  >
                    <ForecastViz
                      {svgTotalWidth}
                      {settings}
                      minTemp = {data.subseasonal.properties.minTemp}
                      maxTemp = {data.subseasonal.properties.maxTemp}
                      tempScale={data.subseasonal.properties.tempScale}
                      {rainScale}
                      {data}
                    />
                    <div class="ml-2">
                      <button
                        on:click={() => {
                          locations.splice(index, 1); // Remove one element at the index
                          fetchWeatherForAllLocations();
                          filterWeatherData();
                          saveToLocalStorage();
                        }}
                        class="h-7 w-7 bg-white hover:bg-[#115183] text-blue-700 font-semibold hover:text-white border border-[#115183] hover:border-transparent rounded-full shrink-0 flex items-center justify-center"
                      >
                        <svg
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          class="h-4 w-4"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>
      <!-- Legend -->
      <div class="flex px-4 pb-8 gap-6"><Legend {maxTemp} {minTemp} /></div>
    </div>
  </section>

  <footer class="w-full flex-col justify-start items-center">
    <div class="w-full max-w-[950px] mx-auto px-5 pb-12 pt-8 mb-3">
      <p class="text-blue-100">
        21-dagarsvarselet er henta frå <a
          class="text-blue-100 underline"
          href="https://hjelp.yr.no/hc/no/articles/12329349662492-Nytt-21-dagersvarsel-p%C3%A5-Yr"
        >
          Yr / Meteorologisk institutt</a
        >, og dekkjer deler av Norden. Det er stor usikkerheit i
        langtidsvarselet. Her visast berre medianverdiar, altså den midterste
        verdien blant alle prognosane.
      </p>
    </div>
  </footer>
</main>

<style lang="postcss">
  @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');

  :global(html, body) {
    background-image: linear-gradient(to bottom right, #1a548e, #0a7cbe);
    font-family: 'Leto', sans-serif;
    overflow-x: hidden;
  }

  .merriweather-font {
    font-family: 'Merriweather', serif;
    line-height: normal;
    font-weight: 400;
  }

  .predefinedButton {
    background-color: #1563a0;
    color: #fff;
    border: 1px solid #fff;
    border-radius: 24px;
    padding: 8px 16px;
    font-size: 16px;
    cursor: pointer;
  }

  .predefinedButton:hover {
    background-color: #115183;
  }

  @keyframes moveRightLeft {
    0% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(200px);
    }
    100% {
      transform: translateX(0);
    }
  }

  .animate-moveRightLeft {
    animation: moveRightLeft 50s ease-in-out infinite;
  }

  .clip-container {
    clip-path: inset(0px 0px 0px 0px);
  }
</style>
