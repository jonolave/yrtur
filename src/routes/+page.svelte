<script>
  import "../app.css";

  // You can write your script here
  let message = "Welcome to my single-page SvelteKit app!";
</script>

<main class="flex flex-col items-center">
    <div class="flex max-w-[800] m-8 gap-8">
        <div>
            <h1 class="text-3xl font-bold">One</h1>
            <p class="text-l">This is the main content of your single page.</p>
        </div>
        <div>
            <h1 class="text-3xl font-bold">Two</h1>
            <p class="text-l">This is the main content of your single page.</p>
        </div>
    
    </div>
    
</main>

<style lang="postcss">
  :global(html) {
    background-color: theme(colors.gray.100);
  }
</style>
