import { json } from '@sveltejs/kit';
import fetch from 'node-fetch';

const sitename = 'YrTurTest (jonolav.eikenes@gmail.com)';
const apiUrl = 'https://api.met.no/weatherapi/nowcast/2.0/complete';
// Example own API: http://localhost:5173/api/nowcast?lat=60.1&lon=9.58
// Documentation at https://api.met.no/weatherapi/nowcast/2.0/documentation
// About 2 hours forecast for a location. High resolution, best quality
// Example: https://api.met.no/weatherapi/nowcast/2.0/complete?lat=59.9333&lon=10.7166


let cachedData = null;
let expires = null;
let lastModified = null;

export async function GET({ url }) {
  console.log('Weather endpoint accessed'); // Add this line for debugging
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  if (!lat || !lon) {
    console.log('Latitude and longitude are required');
    return json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  const currentTime = new Date();
  console.log(`Current time: ${currentTime}`);

  if (cachedData && expires && currentTime < expires) {
    console.log('Using cached data');
    return json(cachedData);
  }

  const headers = {
    'User-Agent': sitename,
  };

  if (lastModified) {
    headers['If-Modified-Since'] = lastModified;
  }

  try {
    console.log('Fetching data from Yr API');
    const response = await fetch(`${apiUrl}?lat=${lat}&lon=${lon}`, { headers });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers: ${JSON.stringify(response.headers.raw())}`);

    if (response.status === 304) {
      console.log('Data not modified, using cached data');
      return json(cachedData);
    } else if (response.status === 200) {
      console.log('Data fetched successfully');
      const data = await response.json();
      cachedData = data;
      expires = new Date(response.headers.get('expires'));
      lastModified = response.headers.get('last-modified');
      return json(data);
    } else {
      console.log('Failed to fetch weather data', response.status);
      return json({ error: 'Failed to fetch weather data' }, { status: response.status });
    }
  } catch (error) {
    console.log('Error fetching weather data', error);
    return json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
