<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Repassa as batalhas pro simulador (container "battle"), que não é exposto
 * fora do Docker. Aqui fica o que o simulador não sabe: quem é o usuário e
 * se os times são dele.
 */
class BattleController extends Controller
{
    private const TEAM_RELATIONS = ['members.pokemon', 'members.ability', 'members.item', 'members.moves'];

    /**
     * POST /api/battles  { team_id, opponent_team_id, difficulty }
     * opponent_team_id = "random" sorteia um time pronto da IA da dificuldade
     * (AiTeamSeeder); um id usa outro time do próprio usuário.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'team_id' => ['required', 'integer', 'exists:teams,id'],
            'opponent_team_id' => [
                'required',
                Rule::when(fn ($input) => $input->opponent_team_id !== 'random', ['integer', 'exists:teams,id']),
            ],
            'difficulty' => ['required', Rule::in(['easy', 'medium', 'hard'])],
        ]);

        $team = $this->completeTeam($data['team_id'], 'team_id');
        $opponentTeam = $data['opponent_team_id'] === 'random'
            ? $this->randomAiTeam($data['difficulty'])
            : $this->completeTeam((int) $data['opponent_team_id'], 'opponent_team_id');

        return $this->forward(fn (PendingRequest $http) => $http->post('/battles', [
            'owner_id' => $request->user()->id,
            'player_team' => (new TeamResource($team))->resolve($request),
            'opponent_team' => (new TeamResource($opponentTeam))->resolve($request),
            'difficulty' => $data['difficulty'],
        ]));
    }

    /**
     * GET /api/battles/{battle}
     */
    public function show(Request $request, string $battle): JsonResponse
    {
        return $this->forward(fn (PendingRequest $http) => $http->get("/battles/{$battle}", [
            'owner_id' => $request->user()->id,
        ]));
    }

    /**
     * POST /api/battles/{battle}/choice  { choice }
     * A escolha vai no formato do Showdown ("move 1 2, switch 3", "team 1234"...).
     */
    public function choice(Request $request, string $battle): JsonResponse
    {
        $data = $request->validate(['choice' => ['required', 'string', 'max:200']]);

        return $this->forward(fn (PendingRequest $http) => $http->post("/battles/{$battle}/choice", [
            'owner_id' => $request->user()->id,
            'choice' => $data['choice'],
        ]));
    }

    private function randomAiTeam(string $difficulty): Team
    {
        $team = Team::with(self::TEAM_RELATIONS)
            ->whereNull('user_id')
            ->where('difficulty', $difficulty)
            ->inRandomOrder()
            ->first();

        if (! $team) {
            throw ValidationException::withMessages([
                'opponent_team_id' => 'Nenhum time da IA cadastrado para essa dificuldade (rode o AiTeamSeeder).',
            ]);
        }

        return $team;
    }

    private function completeTeam(int $id, string $field): Team
    {
        $team = Team::with(self::TEAM_RELATIONS)->findOrFail($id);
        Gate::authorize('view', $team);

        if ($team->members->count() !== (int) config('vgc.team_size')) {
            throw ValidationException::withMessages([
                $field => 'Só times completos ('.config('vgc.team_size').' pokémons) podem batalhar.',
            ]);
        }

        return $team;
    }

    /**
     * Chama o simulador e devolve a resposta dele com o mesmo status.
     *
     * @param  callable(PendingRequest): Response  $call
     */
    private function forward(callable $call): JsonResponse
    {
        try {
            // Folga pro oponente com IA pensar: o próprio serviço corta a IA e
            // cai no plano B antes disso.
            $response = $call(Http::baseUrl(config('services.battle.url'))->acceptJson()->timeout(45));
        } catch (ConnectionException) {
            return response()->json(['message' => 'O simulador de batalha está fora do ar.'], 503);
        }

        return response()->json($response->json(), $response->status());
    }
}
