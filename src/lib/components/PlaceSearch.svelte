<script>
  import { createEventDispatcher } from "svelte";
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
      dispatch('addPlace', { position });
    }
  };
</script>

<!-- Søkefelt og søkeknapp -->
<div class="search-container">
  <input
    type="text"
    placeholder="Skriv inn et sted..."
    bind:value={place}
    on:keydown={handleKeyDown}
    class="border p-2 rounded"
  />

  <!-- Søkeknapp -->
  <button
    on:click={handleSearch}
    class="bg-blue-500 hover:bg-blue-700 text-white font-bold px-4 rounded"
  >
    Søk
  </button>
</div>

<!-- Viser det innsendte stedet -->
{#if submittedPlace}
  <p>Du har søkt på: {submittedPlace}</p>
  <p>Treff: {position.display_name}</p>
  <button on:click={addPlace} 
    class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
  >
    Legg til
  </button>
{/if}

<style>
  .search-container {
    display: flex;
    gap: 10px;
  }

  input {
    flex: 1;
  }
</style>
