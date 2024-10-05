<script>
  import { createEventDispatcher } from "svelte";
  import { onMount, tick } from "svelte";
  let place = ""; // Brukerens søkeinput
  let submittedPlace = ""; // Stedet som er sendt inn
  let position = [];
  const dispatch = createEventDispatcher();

  // Funksjon som håndterer innsending av søket
  const handleSearch = () => {
    if (place.trim() !== "") {
      submittedPlace = place;
      console.log(`Søker etter: ${place}`);
      getPosition(place);
      place= "";
    }
  };

  // Funksjon som håndterer 'Enter'-tasten
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch(); // Trigger søket når brukeren trykker Enter
    }
  };

  function getPosition(searchString) {
    const url = `https://nominatim.openstreetmap.org/search?q=${searchString}&format=json&viewbox=2,73,32,53&bounded=1&accept-language=no`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        position = data[0];
        console.log(position);
      })
      .catch((error) => {
        console.error(error);
        position.display_name = "Fant ingen treff";
      });
  }

  // Funksjon som sender sted til hovedkomponenten
  const addPlace = () => {
    if (place.trim() !== "") {
      dispatch("addPlace", { position });
      placeSearchInput.value = "";
      submittedPlace = "";
    }
  };

  onMount(() => {
    const placeSearchInput = document.getElementById("placeSearchInput");
  });
</script>

<div class="flex flex-col gap-4">
  <!-- Søkefelt og søkeknapp -->
  <div class="flex flex-col gap-2">
    <label for="placeSearchInput" class="text-white">Søk etter sted:</label>
    <div class="flex gap-2"> 
      <input
        id="placeSearchInput"
        type="text"
        placeholder=""
        bind:value={place}
        on:keydown={handleKeyDown}
        class="border p-2 rounded-full flex-1"
      />
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
    <div>
      <h3 class="text-l mb-2 text-white">Treff:</h3>
      <div
        class="bg-white rounded-[4px] shadow-sm hover:shadow-lg flex gap-4 p-4 items-center"
      >
        <p class="flex-1 font-bold">{position.display_name}</p>
        <button
          on:click={addPlace}
          class="bg-[#092A44] hover:bg-[#000] text-white px-6 rounded-full h-[42px]"
        >
          Legg til
        </button>
      </div>
    </div>
  {/if}
</div>
