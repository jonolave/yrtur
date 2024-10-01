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
      // Her kan du legge til API-kall eller annen logikk
      console.log(`Søker etter: ${place}`);
      getPosition(place);
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

<div class="h-[180px] flex flex-col gap-4">
  <!-- Søkefelt og søkeknapp -->
  <div class="flex gap-2">
    <input
    id="placeSearchInput"
      type="text"
      placeholder="Skriv inn et sted..."
      bind:value={place}
      on:keydown={handleKeyDown}
      class="border p-2 rounded flex-1"
    />

    <!-- Søkeknapp -->
    <button
      on:click={handleSearch}
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold px-4 rounded"
    >
      Søk
    </button>
  </div>

  <!-- Resultat -->
  {#if submittedPlace}
    <div>
      <h3 class="text-l mb-2">Treff:</h3>
      <div
        class="bg-white rounded-[4px] shadow-sm hover:shadow-lg flex gap-4 p-4 items-center"
      >
        <p class="flex-1 font-bold">{position.display_name}</p>
        <button
          on:click={addPlace}
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Legg til
        </button>
      </div>
    </div>
  {/if}
</div>
