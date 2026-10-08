<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Formato do POST/PUT /api/teams. As regras do VGC (Species Clause, pedras,
 * stat points...) ficam em App\Services\VgcTeamValidator.
 */
class TeamRequest extends FormRequest
{
    /**
     * No PUT, checa o dono antes de validar (time alheio dá 404, não 422).
     */
    public function authorize(): bool
    {
        if ($team = $this->route('team')) {
            Gate::authorize('update', $team);
        }

        return true;
    }

    public function rules(): array
    {
        $stats = config('vgc.stats');

        $rules = [
            'name' => ['required', 'string', 'max:50'],
            'members' => ['required', 'array', 'min:1', 'max:'.config('vgc.team_size')],
            'members.*.pokemon_id' => ['required', 'integer', 'exists:pokemons,id'],
            'members.*.ability_id' => ['required', 'integer', 'exists:abilities,id'],
            'members.*.item_id' => ['nullable', 'integer', 'exists:items,id'],
            'members.*.nature' => ['required', 'string', Rule::in(array_keys(config('vgc.natures')))],
            'members.*.stat_points' => ['required', 'array:'.implode(',', $stats)],
            'members.*.move_ids' => ['required', 'array', 'min:1', 'max:'.config('vgc.max_moves')],
            'members.*.move_ids.*' => ['integer', 'exists:moves,id'],
        ];

        foreach ($stats as $stat) {
            $rules["members.*.stat_points.{$stat}"] = ['required', 'integer', 'min:0'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'members.required' => 'O time precisa ter pelo menos um pokémon.',
            'members.max' => 'O time pode ter no máximo :max pokémons.',
            'members.*.ability_id.required' => 'Escolha uma habilidade.',
            'members.*.nature.required' => 'Escolha uma natureza.',
            'members.*.nature.in' => 'Natureza inválida.',
            'members.*.move_ids.required' => 'Escolha pelo menos um golpe.',
            'members.*.move_ids.max' => 'Cada pokémon pode ter no máximo :max golpes.',
        ];
    }

    /**
     * Membros validados, com ids convertidos pra int e stats na ordem do config.
     */
    public function members(): array
    {
        $stats = config('vgc.stats');

        return array_values(array_map(fn (array $member) => [
            'pokemon_id' => (int) $member['pokemon_id'],
            'ability_id' => (int) $member['ability_id'],
            'item_id' => isset($member['item_id']) ? (int) $member['item_id'] : null,
            'nature' => $member['nature'],
            'stat_points' => collect($stats)
                ->mapWithKeys(fn ($stat) => [$stat => (int) $member['stat_points'][$stat]])
                ->all(),
            'move_ids' => array_map('intval', array_values($member['move_ids'])),
        ], $this->validated('members')));
    }
}
