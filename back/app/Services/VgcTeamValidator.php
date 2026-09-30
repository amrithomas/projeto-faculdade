<?php

namespace App\Services;

use App\Models\Pokemon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Aplica as regras de montagem de time do VGC (ver config/vgc.php) sobre
 * os membros de um time, depois que o formato básico do request já foi
 * validado pelo controller.
 *
 * Os erros saem no mesmo formato da validação do Laravel (422 com
 * "errors" por campo), apontando pro membro/campo exato — ex:
 * "members.2.item_id" — pra o front conseguir mostrar do lado do campo.
 */
class VgcTeamValidator
{
    /**
     * @param  array<int, array{pokemon_id:int, ability_id:?int, item_id:?int, nature:string, stat_points:array<string,int>, move_ids:int[]}>  $members
     *
     * @throws ValidationException
     */
    public function validate(array $members): void
    {
        $errors = [];

        /** @var Collection<int, Pokemon> $pokemons */
        $pokemons = Pokemon::query()
            ->whereIn('id', array_column($members, 'pokemon_id'))
            ->get()
            ->keyBy('id');

        $this->checkSpeciesClause($members, $pokemons, $errors);
        $this->checkItemClause($members, $errors);
        $this->checkLegendaries($members, $pokemons, $errors);

        foreach ($members as $i => $member) {
            $pokemon = $pokemons->get($member['pokemon_id']);

            $this->checkAbility($i, $member, $pokemon, $errors);
            $this->checkMoves($i, $member, $pokemon, $errors);
            $this->checkStatPoints($i, $member, $errors);
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Species Clause: dois membros não podem ter o mesmo número na dex
     * nacional (vale também pra formas diferentes da mesma espécie).
     */
    private function checkSpeciesClause(array $members, Collection $pokemons, array &$errors): void
    {
        $seen = [];

        foreach ($members as $i => $member) {
            $number = $pokemons->get($member['pokemon_id'])?->pokedex_number;

            if ($number === null) {
                continue;
            }

            if (isset($seen[$number])) {
                $errors["members.{$i}.pokemon_id"][] = 'Species Clause: este pokémon já está no time.';
            }

            $seen[$number] = true;
        }
    }

    /**
     * Item Clause: nenhum item pode se repetir (membros sem item não contam).
     */
    private function checkItemClause(array $members, array &$errors): void
    {
        $seen = [];

        foreach ($members as $i => $member) {
            $itemId = $member['item_id'] ?? null;

            if ($itemId === null) {
                continue;
            }

            if (isset($seen[$itemId])) {
                $errors["members.{$i}.item_id"][] = 'Item Clause: este item já está sendo usado por outro membro do time.';
            }

            $seen[$itemId] = true;
        }
    }

    private function checkLegendaries(array $members, Collection $pokemons, array &$errors): void
    {
        $maxRestricted = (int) config('vgc.max_restricted');
        $restrictedCount = 0;

        foreach ($members as $i => $member) {
            $pokemon = $pokemons->get($member['pokemon_id']);

            if ($pokemon === null) {
                continue;
            }

            $field = "members.{$i}.pokemon_id";

            if (in_array($pokemon->pokedex_number, config('vgc.banned'), true)) {
                $errors[$field][] = 'Este pokémon é banido na regulation atual.';
            } elseif ($pokemon->isRestricted()) {
                $restrictedCount++;

                if ($restrictedCount > $maxRestricted) {
                    $errors[$field][] = $maxRestricted === 0
                        ? 'Pokémons restritos não são permitidos na regulation atual.'
                        : "No máximo {$maxRestricted} pokémon(s) restrito(s) por time.";
                }
            } elseif ($pokemon->is_mythical && ! config('vgc.allow_mythical')) {
                $errors[$field][] = 'Pokémons míticos não são permitidos na regulation atual.';
            }
        }
    }

    private function checkAbility(int $i, array $member, ?Pokemon $pokemon, array &$errors): void
    {
        if ($pokemon === null || empty($member['ability_id'])) {
            return;
        }

        $hasAbility = $pokemon->abilities()->where('abilities.id', $member['ability_id'])->exists();

        if (! $hasAbility) {
            $errors["members.{$i}.ability_id"][] = 'Este pokémon não pode ter essa habilidade.';
        }
    }

    private function checkMoves(int $i, array $member, ?Pokemon $pokemon, array &$errors): void
    {
        $moveIds = $member['move_ids'];

        if (count($moveIds) !== count(array_unique($moveIds))) {
            $errors["members.{$i}.move_ids"][] = 'Não é permitido repetir o mesmo golpe.';
        }

        if ($pokemon === null) {
            return;
        }

        $learnable = DB::table('move_pokemon')
            ->where('pokemon_id', $pokemon->id)
            ->whereIn('move_id', $moveIds)
            ->pluck('move_id')
            ->all();

        if (array_diff($moveIds, $learnable) !== []) {
            $errors["members.{$i}.move_ids"][] = 'Este pokémon não aprende um ou mais dos golpes escolhidos.';
        }
    }

    /**
     * Stat Points (Pokémon Champions): no máximo X por stat e Y no total.
     */
    private function checkStatPoints(int $i, array $member, array &$errors): void
    {
        $perStat = (int) config('vgc.stat_points.per_stat');
        $total = (int) config('vgc.stat_points.total');
        $points = $member['stat_points'];

        foreach ($points as $stat => $value) {
            if ($value > $perStat) {
                $errors["members.{$i}.stat_points.{$stat}"][] = "Máximo de {$perStat} stat points por atributo.";
            }
        }

        if (array_sum($points) > $total) {
            $errors["members.{$i}.stat_points"][] = "Máximo de {$total} stat points no total (usados: ".array_sum($points).').';
        }
    }
}
