<script>
  import { createEventDispatcher } from 'svelte';
  import { onMount, tick } from 'svelte';
  let place = ''; // Brukerens søkeinput
  let submittedPlace = ''; // Stedet som er sendt inn
  let position = [];
  const dispatch = createEventDispatcher();

  let validPlace = false;

  // Funksjon som håndterer innsending av søket
  const handleSearch = () => {
    if (place.trim() !== '') {
      submittedPlace = place;
      // console.log(`Søker etter: ${place}`);
      getPosition(place);
      // place= "";
    }
  };

  // Funksjon som håndterer 'Enter'-tasten
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSearch(); // Trigger søket når brukeren trykker Enter
    }
  };

  function getPosition(searchString) {
    const url = `https://nominatim.openstreetmap.org/search?q=${searchString}&format=json&viewbox=2,73,32,53&bounded=1&accept-language=no`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data && data.length > 0) {
          position = data[0];
          validPlace = true;
        } else {
          position = { display_name: 'Ingen treff, dessverre.' }; // Provide a fallback
          validPlace = false;
        }
      })
      .catch((error) => {
        console.error(error);
        position = { display_name: 'Oisann, noko gjekk gale!' };
        validPlace = false;
      });
  }

  // Funksjon som sender sted til hovedkomponenten
  const addPlace = () => {
    if (place.trim() !== '') {
      dispatch('addPlace', { position });
      placeSearchInput.value = '';
      submittedPlace = '';
      // console.log(`Legger til: ${position.display_name}`);
    }
  };

  onMount(() => {
    const placeSearchInput = document.getElementById('placeSearchInput');
  });
</script>

<div class="flex flex-col gap-4">
  <!-- Søkefelt og søkeknapp -->
  <div class="flex flex-col gap-2">
    <label for="placeSearchInput" class="text-white">Søk etter stad:</label>
    <div class="relative flex gap-2">
      <div class="relative">
        <input
          id="placeSearchInput"
          type="text"
          placeholder=""
          bind:value={place}
          on:keydown={handleKeyDown}
          class="border p-2 rounded-full flex-1 pr-10 pl-4"
        />
        {#if place}
          <!-- Clear 'x' button (inside the input field) -->
          <button
            on:click={() => ((place = ''), (submittedPlace = ''))}
            class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label="Clear input"
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
        {/if}
      </div>

      <!-- Søkeknapp -->
      <button
        on:click={handleSearch}
        class="bg-[#092A44] hover:bg-[#000] text-white px-6 rounded-full shrink-0"
      >
        Søk
      </button>
    </div>
  </div>

  <!-- Resultat -->
  {#if submittedPlace}
    <div class="bg-white rounded-xl shadow-sm hover:shadow-lg p-4">
      <!-- <h3 class="text-l mb-2">Søkeresultat:</h3> -->
      <div class=" flex gap-4 items-center">
        {#if position.display_name != undefined}
          <p class="flex-1 font-bold">{position.display_name}</p>

          {#if validPlace}
            <button
              on:click={addPlace}
              class="bg-[#092A44] hover:bg-[#000] text-white px-6 rounded-full h-[42px]"
            >
              Legg til
            </button>
          {/if}
        {:else}
          <p class="flex-1">Laster...</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
