<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TeamRequest;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use App\Models\TeamMember;
use App\Services\VgcTeamValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

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
    public function show(Team $team): TeamResource
    {
        Gate::authorize('view', $team);

        return new TeamResource($team->load(self::RELATIONS));
    }

    /**
     * POST /api/teams
     */
    public function store(TeamRequest $request): JsonResponse
    {
        $members = $request->members();
        $this->validator->validate($members);

        $team = DB::transaction(function () use ($request, $members) {
            $team = $request->user()->teams()->create(['name' => $request->validated('name')]);
            $this->saveMembers($team, $members);

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
    public function update(TeamRequest $request, Team $team): TeamResource
    {
        $members = $request->members();
        $this->validator->validate($members);

        DB::transaction(function () use ($request, $team, $members) {
            $team->update(['name' => $request->validated('name')]);
            $team->touch();
            $this->saveMembers($team, $members);
        });

        return new TeamResource($team->load(self::RELATIONS));
    }

    /**
     * DELETE /api/teams/{team}
     */
    public function destroy(Team $team): JsonResponse
    {
        Gate::authorize('delete', $team);
        $team->delete();

        return response()->json(['message' => 'Time excluído.']);
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
}
