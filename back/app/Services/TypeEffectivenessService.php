<?php

namespace App\Services;

use App\Models\Type;

/**
 * Calcula fraquezas, resistências e imunidades de um pokémon a partir dos
 * seus tipos, usando a tabela `types` (sincronizada da PokeAPI). Quando o
 * pokémon tem dois tipos, os multiplicadores de cada tipo contra um mesmo
 * tipo atacante são multiplicados entre si (ex: um pokémon grama+voador
 * recebe x2 x2 = x4 de dano de gelo).
 */
class TypeEffectivenessService
{
    /**
     * @param  string[]  $pokemonTypes  Tipos do pokémon (ex: ['grass', 'poison'])
     * @return array{weak_against: array<string, float>, resistant_to: array<string, float>, immune_to: string[]}
     */
    public function calculate(array $pokemonTypes): array
    {
        $allTypes = Type::query()->get()->pluck('damage_relations', 'name');

        $multipliers = [];
        foreach ($allTypes->keys() as $attackingType) {
            $multipliers[$attackingType] = 1.0;
        }

        foreach ($pokemonTypes as $defendingType) {
            $relations = $allTypes->get($defendingType);

            if (! $relations) {
                continue;
            }

            foreach ($relations['double_damage_from'] ?? [] as $t) {
                $multipliers[$t] = ($multipliers[$t] ?? 1.0) * 2;
            }

            foreach ($relations['half_damage_from'] ?? [] as $t) {
                $multipliers[$t] = ($multipliers[$t] ?? 1.0) * 0.5;
            }

            foreach ($relations['no_damage_from'] ?? [] as $t) {
                $multipliers[$t] = ($multipliers[$t] ?? 1.0) * 0;
            }
        }

        $weakAgainst = [];
        $resistantTo = [];
        $immuneTo = [];

        foreach ($multipliers as $type => $multiplier) {
            if ($multiplier == 0.0) {
                $immuneTo[] = $type;
            } elseif ($multiplier > 1.0) {
                $weakAgainst[$type] = $multiplier;
            } elseif ($multiplier < 1.0) {
                $resistantTo[$type] = $multiplier;
            }
        }

        arsort($weakAgainst);
        asort($resistantTo);

        return [
            'weak_against' => $weakAgainst,
            'resistant_to' => $resistantTo,
            'immune_to' => $immuneTo,
        ];
    }
}
