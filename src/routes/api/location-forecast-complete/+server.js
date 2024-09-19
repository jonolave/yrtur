import { json } from '@sveltejs/kit';
import fetch from 'node-fetch';

const sitename = 'YrTurTest (jonolav.eikenes@gmail.com)';
const apiUrl = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';
// Example own API: http://localhost:5173/api/location-forecast-complete?lat=60.1&lon=9.58
// Documentation at https://api.met.no/weatherapi/locationforecast/2.0/documentation
// Datamodel: https://docs.api.met.no/doc/locationforecast/datamodel
// Example at: https://docs.google.com/spreadsheets/d/1H8TS_eymRtk_oridPHOtUqVuF7h8Ps_0D1xbQYBbNKI/edit?gid=886762158#gid=886762158

// For medium range forecasts (2–10 days) the 51 member ensemble forecast from ECMWF is used. 
// It it updated twice pr day. Horizontal resolution is approximately 18 km.
// Some time period aggregations will not always be present if there are insufficient model data.
// "next_1_hours" is only available in the short range forecast
let cache = new Map();

export async function GET({ url }) {
  console.log('Weather endpoint accessed'); // Add this line for debugging
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  if (!lat || !lon) {
    console.log('Latitude and longitude are required');
    return json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  const currentTime = new Date();
  const cacheKey = `${lat},${lon}`;

  if (cache.has(cacheKey)) {
    const { data, expires, lastModified } = cache.get(cacheKey);
    if (currentTime < expires) {
      console.log(`Using cached data for (${lat}, ${lon})`);
      return json(data);
    }
  }

  const headers = {
    'User-Agent': sitename,
  };

  let lastModified = null;
  if (cache.has(cacheKey)) {
    lastModified = cache.get(cacheKey).lastModified;
  }

  if (lastModified) {
    headers['If-Modified-Since'] = lastModified;
  }

  try {
    console.log(`Fetching data for (${lat}, ${lon})`);
    const response = await fetch(`${apiUrl}?lat=${lat}&lon=${lon}`, { headers });

    console.log(`Response status: ${response.status}`);
    // console.log(`Response headers: ${JSON.stringify(response.headers.raw())}`);

    if (response.status === 304) {
      console.log(`Data not modified, using cached data for (${lat}, ${lon})`);
      return json(cache.get(cacheKey).data);
    } else if (response.status === 200) {
      console.log(`Data fetched successfully for (${lat}, ${lon})`);
      const data = await response.json();
      const expires = new Date(response.headers.get('expires'));
      const lastModified = response.headers.get('last-modified');
      cache.set(cacheKey, { data, expires, lastModified });
      return json(data);
    } else {
      console.log(`Failed to fetch weather data for (${lat}, ${lon})`, response.status);
      return json({ error: 'Failed to fetch weather data' }, { status: response.status });
    }
  } catch (error) {
    console.log(`Error fetching weather data for (${lat}, ${lon})`, error);
    return json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
