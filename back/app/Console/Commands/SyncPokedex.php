<?php

namespace App\Console\Commands;

use App\Models\Ability;
use App\Models\Move;
use App\Models\Pokemon;
use App\Models\Type;
use App\Services\PokeApiService;
use Illuminate\Console\Command;

class SyncPokedex extends Command
{
    /**
     * php artisan pokedex:sync                        -> sincroniza os 151 primeiros (Gen 1)
     * php artisan pokedex:sync --from=1 --limit=898    -> sincroniza da Gen 1 até a Gen 8
     * php artisan pokedex:sync --from=152 --limit=100  -> só a Gen 2
     */
    protected $signature = 'pokedex:sync {--from=1} {--limit=151}';

    protected $description = 'Sincroniza pokémons (com evoluções, habilidades, golpes e tipos) da PokeAPI para o banco local';

    /**
     * Faixa de números da dex nacional e a dex regional "canônica" usada
     * pra cada geração. Regiões com mais de uma sub-dex regional na PokeAPI
     * (caso do Kalos, dividido em central/costa/montanha) têm uma lista.
     *
     * Como um pokémon pode existir em mais de uma dex regional ao longo dos
     * jogos, aqui só guardamos o número dele na dex regional da sua própria
     * geração (a "casa" original dele) — não em todas as dexes onde ele
     * aparece.
     */
    private const REGIONS = [
        1 => ['name' => 'Kanto', 'dex' => 'kanto', 'range' => [1, 151]],
        2 => ['name' => 'Johto', 'dex' => 'updated-johto', 'range' => [152, 251]],
        3 => ['name' => 'Hoenn', 'dex' => 'hoenn', 'range' => [252, 386]],
        4 => ['name' => 'Sinnoh', 'dex' => 'extended-sinnoh', 'range' => [387, 493]],
        5 => ['name' => 'Unova', 'dex' => 'updated-unova', 'range' => [494, 649]],
        6 => ['name' => 'Kalos', 'dex' => ['kalos-central', 'kalos-coastal', 'kalos-mountain'], 'range' => [650, 721]],
        7 => ['name' => 'Alola', 'dex' => 'updated-alola', 'range' => [722, 809]],
        8 => ['name' => 'Galar', 'dex' => 'galar', 'range' => [810, 898]],
    ];

    /** @var array<int, Ability> */
    private array $abilityCache = [];

    /** @var array<int, Move> */
    private array $moveCache = [];

    public function handle(PokeApiService $service): int
    {
        $this->syncTypes($service);
        $regionalNumbers = $this->syncRegionalDexes($service);

        $from = max(1, (int) $this->option('from'));
        $limit = max(1, (int) $this->option('limit'));

        $this->info("Sincronizando {$limit} pokémons a partir do #{$from}...");
        $bar = $this->output->createProgressBar($limit);
        $bar->start();

        $synced = 0;
        $skipped = 0;

        for ($id = $from; $id < $from + $limit; $id++) {
            $data = $service->fetchPokemon($id);

            if ($data === null) {
                $skipped++;
                $bar->advance();

                continue;
            }

            [$generation, $region] = $this->generationAndRegionFor($id);
            $species = $service->fetchSpecies($id);

            $pokemon = Pokemon::updateOrCreate(
                ['pokedex_number' => $data['pokedex_number']],
                [
                    'name' => $data['name'],
                    'types' => $data['types'],
                    'sprite_url' => $data['sprite_url'],
                    'description' => $species['description'] ?? null,
                    'genus' => $species['genus'] ?? null,
                    'gender_rate' => $species['gender_rate'] ?? null,
                    'height' => $data['height'],
                    'weight' => $data['weight'],
                    'stats' => $data['stats'],
                    'generation' => $generation,
                    'region' => $region,
                    'regional_dex_number' => $regionalNumbers[$id] ?? null,
                    'evolves_from_pokedex_number' => $species['evolves_from_pokedex_number'] ?? null,
                ],
            );

            $this->syncAbilities($service, $pokemon, $data['abilities']);
            $this->syncMoves($service, $pokemon, $data['moves']);

            $synced++;
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Concluído: {$synced} sincronizados, {$skipped} pulados.");

        return self::SUCCESS;
    }

    private function generationAndRegionFor(int $pokedexNumber): array
    {
        foreach (self::REGIONS as $generation => $info) {
            [$min, $max] = $info['range'];

            if ($pokedexNumber >= $min && $pokedexNumber <= $max) {
                return [$generation, $info['name']];
            }
        }

        return [null, null];
    }

    private function syncTypes(PokeApiService $service): void
    {
        if (Type::count() >= 18) {
            return;
        }

        $this->info('Sincronizando tabela de tipos (fraquezas/resistências)...');

        // Os tipos vão de 1 a 18 na PokeAPI (ids acima disso são tipos
        // internos especiais como "unknown"/"shadow", que ignoramos).
        for ($id = 1; $id <= 18; $id++) {
            $type = $service->fetchType((string) $id);

            if ($type === null) {
                continue;
            }

            Type::updateOrCreate(['pokeapi_id' => $type['pokeapi_id']], $type);
        }
    }

    /**
     * Busca as dex regionais de cada geração e monta um mapa
     * [número da dex nacional => número na dex regional].
     */
    private function syncRegionalDexes(PokeApiService $service): array
    {
        $this->info('Sincronizando números das dex regionais...');
        $map = [];

        foreach (self::REGIONS as $info) {
            $dexes = (array) $info['dex'];
            [$min, $max] = $info['range'];

            foreach ($dexes as $dexName) {
                $entries = $service->fetchPokedex($dexName);

                if ($entries === null) {
                    continue;
                }

                foreach ($entries as $entry) {
                    $speciesId = $entry['species_id'];

                    if ($speciesId >= $min && $speciesId <= $max && ! isset($map[$speciesId])) {
                        $map[$speciesId] = $entry['entry_number'];
                    }
                }
            }
        }

        return $map;
    }

    private function syncAbilities(PokeApiService $service, Pokemon $pokemon, array $abilities): void
    {
        $sync = [];

        foreach ($abilities as $abilityData) {
            $pokeapiId = $this->idFromUrl($abilityData['url']);

            if ($pokeapiId === null) {
                continue;
            }

            if (! isset($this->abilityCache[$pokeapiId])) {
                $fetched = $service->fetchAbility($abilityData['name']);

                if ($fetched === null) {
                    continue;
                }

                $this->abilityCache[$pokeapiId] = Ability::updateOrCreate(
                    ['pokeapi_id' => $fetched['pokeapi_id']],
                    ['name' => $fetched['name'], 'description' => $fetched['description']],
                );
            }

            $ability = $this->abilityCache[$pokeapiId];
            $sync[$ability->id] = [
                'is_hidden' => $abilityData['is_hidden'],
                'slot' => $abilityData['slot'],
            ];
        }

        $pokemon->abilities()->sync($sync);
    }

    private function syncMoves(PokeApiService $service, Pokemon $pokemon, array $moves): void
    {
        $sync = [];

        foreach ($moves as $moveData) {
            $pokeapiId = $this->idFromUrl($moveData['url']);

            if ($pokeapiId === null) {
                continue;
            }

            if (! isset($this->moveCache[$pokeapiId])) {
                $fetched = $service->fetchMove($moveData['name']);

                if ($fetched === null) {
                    continue;
                }

                $this->moveCache[$pokeapiId] = Move::updateOrCreate(
                    ['pokeapi_id' => $fetched['pokeapi_id']],
                    [
                        'name' => $fetched['name'],
                        'type' => $fetched['type'],
                        'damage_class' => $fetched['damage_class'],
                        'power' => $fetched['power'],
                        'accuracy' => $fetched['accuracy'],
                        'pp' => $fetched['pp'],
                        'description' => $fetched['description'],
                    ],
                );
            }

            $move = $this->moveCache[$pokeapiId];
            $sync[$move->id] = [
                'level' => $moveData['level'],
                'learn_method' => 'level-up',
            ];
        }

        $pokemon->moves()->sync($sync);
    }

    private function idFromUrl(string $url): ?int
    {
        if (preg_match('#/(\d+)/?$#', $url, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }
}
