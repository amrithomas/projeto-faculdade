<?php

namespace App\Console\Commands;

use App\Models\Item;
use App\Services\PokeApiService;
use Illuminate\Console\Command;

class SyncItems extends Command
{
    /**
     * php artisan pokedex:sync-items
     */
    protected $signature = 'pokedex:sync-items';

    protected $description = 'Sincroniza da PokeAPI os itens seguráveis em batalha (usados no montador de times)';

    /**
     * Categorias da PokeAPI com itens que fazem sentido segurar num time
     * competitivo. Ficam de fora itens de cura/pokébolas/TMs e também as
     * mega stones e z-crystals, já que a base local não tem as formas
     * mega/alternativas dos pokémons.
     */
    private const CATEGORIES = [
        'held-items',        // Leftovers, Focus Sash, Life Orb...
        'choice',            // Choice Band/Specs/Scarf
        'type-enhancement',  // Charcoal, Mystic Water...
        'bad-held-items',    // Flame Orb, Toxic Orb, Iron Ball...
        'plates',
        'species-specific',  // Light Ball, Thick Club...
        'medicine',          // Sitrus Berry, Lum Berry...
        'in-a-pinch',        // Liechi Berry, Salac Berry...
        'picky-healing',     // Figy Berry, Wiki Berry...
        'type-protection',   // Occa Berry, Yache Berry...
    ];

    public function handle(PokeApiService $service): int
    {
        $synced = 0;
        $skipped = 0;

        foreach (self::CATEGORIES as $category) {
            $names = $service->fetchItemCategory($category);

            if ($names === null) {
                $this->warn("Categoria {$category} não encontrada, pulando.");

                continue;
            }

            $this->info("Sincronizando {$category} (".count($names).' itens)...');

            foreach ($names as $name) {
                $item = $service->fetchItem($name);

                if ($item === null) {
                    $skipped++;

                    continue;
                }

                Item::updateOrCreate(['pokeapi_id' => $item['pokeapi_id']], $item);
                $synced++;
            }
        }

        $this->newLine();
        $this->info("Concluído: {$synced} itens sincronizados, {$skipped} pulados.");

        return self::SUCCESS;
    }
}
