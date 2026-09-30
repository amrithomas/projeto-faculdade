<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Espera que o controller já tenha feito eager load de
 * members.pokemon, members.ability, members.item e members.moves.
 *
 * @mixin \App\Models\Team
 */
class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            // Pra registrar o time num torneio precisa ter os 6; com menos
            // dá pra salvar como rascunho.
            'is_complete' => $this->members->count() === (int) config('vgc.team_size'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'members' => $this->members->map(fn ($member) => [
                'id' => $member->id,
                'slot' => $member->slot,
                'pokemon' => [
                    'id' => $member->pokemon->id,
                    'pokedex_number' => $member->pokemon->pokedex_number,
                    'name' => $member->pokemon->name,
                    'types' => $member->pokemon->types,
                    'sprite_url' => $member->pokemon->sprite_url,
                    'stats' => $member->pokemon->stats,
                ],
                'ability' => $member->ability ? [
                    'id' => $member->ability->id,
                    'name' => $member->ability->name,
                    'description' => $member->ability->description,
                ] : null,
                'item' => $member->item ? new ItemResource($member->item) : null,
                'nature' => $member->nature,
                'stat_points' => $member->stat_points,
                'moves' => $member->moves->map(fn ($move) => [
                    'id' => $move->id,
                    'name' => $move->name,
                    'type' => $move->type,
                    'damage_class' => $move->damage_class,
                    'power' => $move->power,
                    'accuracy' => $move->accuracy,
                    'pp' => $move->pp,
                ])->values(),
            ])->values(),
        ];
    }
}
