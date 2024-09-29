<script>
  // Component to render a weather symbol from Yr.no

  import Papa from "papaparse"; // for csv parsing

  async function loadCSV() {
    const response = await fetch("weather.csv");
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
    // console.log("Searching for symbol code:", symbolCode);
    const result = csvData.find(
      (row) =>
        row.dayName === symbolCode ||
        row.nightName === symbolCode ||
        row.midnightName === symbolCode
    );
    // console.log("Result:", result);
    if (result) {
      // console.log("Found result for", symbolCode);
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

  loadCSV();
</script>
