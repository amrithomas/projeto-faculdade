<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\VgcTeamValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TeamController extends Controller
{
    private const RELATIONS = ['members.pokemon', 'members.ability', 'members.item', 'members.moves'];

    public function __construct(private readonly VgcTeamValidator $validator) {}

    /**
     * GET /api/teams
     * Times do usuário logado, mais recentes primeiro.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $teams = $request->user()->teams()
            ->with(self::RELATIONS)
            ->latest('updated_at')
            ->get();

        return TeamResource::collection($teams);
    }

    /**
     * GET /api/teams/{team}
     */
    public function show(Request $request, Team $team): TeamResource
    {
        $this->ensureOwner($request, $team);

        return new TeamResource($team->load(self::RELATIONS));
    }

    /**
     * POST /api/teams
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validateTeam($request);

        $team = DB::transaction(function () use ($request, $data) {
            $team = $request->user()->teams()->create(['name' => $data['name']]);
            $this->saveMembers($team, $data['members']);

            return $team;
        });

        return (new TeamResource($team->load(self::RELATIONS)))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * PUT /api/teams/{team}
     * Substitui o time inteiro (nome + membros) — o front sempre manda o
     * time completo, mais simples do que editar membro a membro.
     */
    public function update(Request $request, Team $team): TeamResource
    {
        $this->ensureOwner($request, $team);
        $data = $this->validateTeam($request);

        DB::transaction(function () use ($team, $data) {
            $team->update(['name' => $data['name']]);
            $team->touch();
            $this->saveMembers($team, $data['members']);
        });

        return new TeamResource($team->load(self::RELATIONS));
    }

    /**
     * DELETE /api/teams/{team}
     */
    public function destroy(Request $request, Team $team): JsonResponse
    {
        $this->ensureOwner($request, $team);
        $team->delete();

        return response()->json(['message' => 'Time excluído.']);
    }

    /**
     * Valida o formato do request e depois as regras do VGC.
     */
    private function validateTeam(Request $request): array
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

        $data = $request->validate($rules, [
            'members.required' => 'O time precisa ter pelo menos um pokémon.',
            'members.max' => 'O time pode ter no máximo :max pokémons.',
            'members.*.ability_id.required' => 'Escolha uma habilidade.',
            'members.*.nature.required' => 'Escolha uma natureza.',
            'members.*.nature.in' => 'Natureza inválida.',
            'members.*.move_ids.required' => 'Escolha pelo menos um golpe.',
            'members.*.move_ids.max' => 'Cada pokémon pode ter no máximo :max golpes.',
        ]);

        $data['members'] = array_values(array_map(fn (array $member) => [
            'pokemon_id' => (int) $member['pokemon_id'],
            'ability_id' => (int) $member['ability_id'],
            'item_id' => isset($member['item_id']) ? (int) $member['item_id'] : null,
            'nature' => $member['nature'],
            'stat_points' => collect($stats)
                ->mapWithKeys(fn ($stat) => [$stat => (int) $member['stat_points'][$stat]])
                ->all(),
            'move_ids' => array_map('intval', array_values($member['move_ids'])),
        ], $data['members']));

        $this->validator->validate($data['members']);

        return $data;
    }

    private function saveMembers(Team $team, array $members): void
    {
        TeamMember::where('team_id', $team->id)->delete();

        foreach ($members as $i => $memberData) {
            $member = $team->members()->create([
                'slot' => $i + 1,
                'pokemon_id' => $memberData['pokemon_id'],
                'ability_id' => $memberData['ability_id'],
                'item_id' => $memberData['item_id'],
                'nature' => $memberData['nature'],
                'stat_points' => $memberData['stat_points'],
            ]);

            $member->moves()->sync(
                collect($memberData['move_ids'])
                    ->mapWithKeys(fn ($moveId, $j) => [$moveId => ['slot' => $j + 1]])
                    ->all()
            );
        }
    }

    /**
     * Time de outro usuário responde 404 (e não 403) pra não revelar que o
     * id existe.
     */
    private function ensureOwner(Request $request, Team $team): void
    {
        abort_if((int) $team->user_id !== (int) $request->user()->id, 404);
    }
}
