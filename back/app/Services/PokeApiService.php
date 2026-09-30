<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Encapsula toda a comunicação com a PokeAPI (https://pokeapi.co).
 *
 * Nenhuma outra parte da aplicação deve chamar a PokeAPI diretamente:
 * tudo passa por aqui, e o resultado é normalizado pro formato que
 * guardamos nas nossas tabelas locais (pokemons, types, abilities, moves).
 */
class PokeApiService
{
    private const BASE_URL = 'https://pokeapi.co/api/v2';

    /**
     * Busca um pokémon pelo número da pokedex nacional. Devolve os campos
     * básicos já normalizados, além das listas cruas de habilidades e dos
     * golpes aprendidos por level-up, pra quem chamar processar à parte.
     */
    public function fetchPokemon(int $pokedexNumber): ?array
    {
        $response = $this->get("/pokemon/{$pokedexNumber}");

        if ($response === null) {
            return null;
        }

        return [
            'pokedex_number' => $response['id'],
            'name' => $response['name'],
            'types' => collect($response['types'])->pluck('type.name')->values()->all(),
            'sprite_url' => $response['sprites']['other']['official-artwork']['front_default']
                ?? $response['sprites']['front_default']
                ?? null,
            'height' => $response['height'] / 10, // decímetros -> metros
            'weight' => $response['weight'] / 10, // hectogramas -> quilos
            'stats' => collect($response['stats'])
                ->map(fn (array $stat) => [
                    'name' => $stat['stat']['name'],
                    'base_value' => $stat['base_stat'],
                ])
                ->values()
                ->all(),
            'abilities' => collect($response['abilities'])
                ->map(fn (array $a) => [
                    'name' => $a['ability']['name'],
                    'url' => $a['ability']['url'],
                    'is_hidden' => $a['is_hidden'],
                    'slot' => $a['slot'],
                ])
                ->values()
                ->all(),
            // Todos os golpes que o pokémon consegue aprender (level-up, TM,
            // tutor, egg move...) — o montador de times precisa da lista
            // completa. Guardamos um método só por golpe: level-up tem
            // prioridade (é o que a tela de detalhes mostra, com o nível);
            // senão fica o primeiro método que aparecer. Quando o mesmo
            // golpe aparece em vários jogos com níveis diferentes, ficamos
            // com a primeira ocorrência — simplificação razoável pra esse
            // projeto.
            'moves' => collect($response['moves'])
                ->map(function (array $m) {
                    $details = collect($m['version_group_details']);

                    $levelUp = $details->first(fn (array $vgd) => $vgd['move_learn_method']['name'] === 'level-up'
                        && $vgd['level_learned_at'] > 0);

                    if ($levelUp !== null) {
                        return [
                            'name' => $m['move']['name'],
                            'url' => $m['move']['url'],
                            'level' => $levelUp['level_learned_at'],
                            'learn_method' => 'level-up',
                        ];
                    }

                    // Level-up com nível 0 = golpe aprendido ao evoluir /
                    // pelo move reminder; não tem nível pra mostrar.
                    $method = $details->first()['move_learn_method']['name'] ?? 'other';

                    return [
                        'name' => $m['move']['name'],
                        'url' => $m['move']['url'],
                        'level' => null,
                        'learn_method' => $method === 'level-up' ? 'reminder' : $method,
                    ];
                })
                ->values()
                ->all(),
        ];
    }

    /**
     * Busca a espécie de um pokémon: pré-evolução, descrição (flavor text),
     * categoria (ex: "Seed Pokémon") e taxa de gênero — tudo usado na tela
     * de detalhes.
     */
    public function fetchSpecies(int $pokedexNumber): ?array
    {
        $response = $this->get("/pokemon-species/{$pokedexNumber}");

        if ($response === null) {
            return null;
        }

        $evolvesFromUrl = $response['evolves_from_species']['url'] ?? null;

        $flavor = collect($response['flavor_text_entries'] ?? [])
            ->first(fn (array $f) => $f['language']['name'] === 'en');
        $description = $flavor['flavor_text'] ?? null;

        if ($description) {
            // Flavor text da PokeAPI vem com quebras de linha/form-feed e às
            // vezes hífen suave no meio de palavras quebradas.
            $description = trim(preg_replace('/[\n\f\r\x{00AD}]+/u', ' ', $description));
        }

        $genusEntry = collect($response['genera'] ?? [])
            ->first(fn (array $g) => $g['language']['name'] === 'en');

        return [
            'evolves_from_pokedex_number' => $evolvesFromUrl ? $this->idFromUrl($evolvesFromUrl) : null,
            'description' => $description,
            'genus' => $genusEntry['genus'] ?? null,
            'gender_rate' => $response['gender_rate'] ?? null,
            'is_legendary' => (bool) ($response['is_legendary'] ?? false),
            'is_mythical' => (bool) ($response['is_mythical'] ?? false),
        ];
    }

    /**
     * Lista os nomes dos itens de uma categoria (ex: "choice", "held-items").
     *
     * @return string[]|null
     */
    public function fetchItemCategory(string $name): ?array
    {
        $response = $this->get("/item-category/{$name}");

        if ($response === null) {
            return null;
        }

        return collect($response['items'] ?? [])->pluck('name')->values()->all();
    }

    public function fetchItem(string $name): ?array
    {
        $response = $this->get("/item/{$name}");

        if ($response === null) {
            return null;
        }

        $entry = collect($response['effect_entries'] ?? [])
            ->first(fn (array $e) => $e['language']['name'] === 'en');

        $description = $entry['short_effect'] ?? $entry['effect'] ?? null;

        if ($description) {
            $description = trim(preg_replace('/[\n\f\r]+/', ' ', $description));
        }

        return [
            'pokeapi_id' => $response['id'],
            'name' => $response['name'],
            'category' => $response['category']['name'] ?? 'other',
            'sprite_url' => $response['sprites']['default'] ?? null,
            'description' => $description,
        ];
    }

    public function fetchAbility(string $name): ?array
    {
        $response = $this->get("/ability/{$name}");

        if ($response === null) {
            return null;
        }

        $entry = collect($response['effect_entries'] ?? [])
            ->first(fn (array $e) => $e['language']['name'] === 'en');

        $description = $entry['short_effect'] ?? $entry['effect'] ?? null;

        return [
            'pokeapi_id' => $response['id'],
            'name' => $response['name'],
            'description' => $description ? trim($description) : null,
        ];
    }

    public function fetchMove(string $name): ?array
    {
        $response = $this->get("/move/{$name}");

        if ($response === null) {
            return null;
        }

        $entry = collect($response['effect_entries'] ?? [])
            ->first(fn (array $e) => $e['language']['name'] === 'en');

        $description = $entry['short_effect'] ?? $entry['effect'] ?? null;

        if (! $description) {
            $flavor = collect($response['flavor_text_entries'] ?? [])
                ->first(fn (array $f) => $f['language']['name'] === 'en');
            $description = $flavor['flavor_text'] ?? null;
        }

        if ($description) {
            $description = trim(preg_replace('/[\n\f\r]+/', ' ', $description));
        }

        return [
            'pokeapi_id' => $response['id'],
            'name' => $response['name'],
            'type' => $response['type']['name'] ?? null,
            'damage_class' => $response['damage_class']['name'] ?? null,
            'power' => $response['power'],
            'accuracy' => $response['accuracy'],
            'pp' => $response['pp'],
            'description' => $description,
        ];
    }

    public function fetchType(string $nameOrId): ?array
    {
        $response = $this->get("/type/{$nameOrId}");

        if ($response === null) {
            return null;
        }

        $relations = $response['damage_relations'] ?? [];
        $names = fn (string $key) => collect($relations[$key] ?? [])->pluck('name')->values()->all();

        return [
            'pokeapi_id' => $response['id'],
            'name' => $response['name'],
            'damage_relations' => [
                'double_damage_from' => $names('double_damage_from'),
                'half_damage_from' => $names('half_damage_from'),
                'no_damage_from' => $names('no_damage_from'),
                'double_damage_to' => $names('double_damage_to'),
                'half_damage_to' => $names('half_damage_to'),
                'no_damage_to' => $names('no_damage_to'),
            ],
        ];
    }

    /**
     * Busca uma dex regional e devolve a lista de [species_id, entry_number].
     */
    public function fetchPokedex(string $name): ?array
    {
        $response = $this->get("/pokedex/{$name}");

        if ($response === null) {
            return null;
        }

        return collect($response['pokemon_entries'] ?? [])
            ->map(function (array $entry) {
                $speciesId = $this->idFromUrl($entry['pokemon_species']['url']);

                if ($speciesId === null) {
                    return null;
                }

                return [
                    'species_id' => $speciesId,
                    'entry_number' => $entry['entry_number'],
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    private function get(string $path): ?array
    {
        $response = Http::retry(2, 200)
            ->timeout(10)
            ->get(self::BASE_URL.$path);

        if ($response->failed()) {
            Log::warning("PokeApiService: falha ao buscar {$path}", [
                'status' => $response->status(),
            ]);

            return null;
        }

        return $response->json();
    }

    private function idFromUrl(string $url): ?int
    {
        if (preg_match('#/(\d+)/?$#', $url, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }
}
