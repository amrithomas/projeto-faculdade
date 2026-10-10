<?php

namespace Tests\Feature;

use App\Models\Ability;
use App\Models\Pokemon;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BattleApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::forceCreate(['username' => 'ash', 'password' => 'secret123']);
    }

    public function test_starts_battle_with_both_teams_and_owner(): void
    {
        Http::fake(['*/battles' => Http::response(['id' => 'abc', 'request' => ['teamPreview' => true]], 201)]);

        $team = $this->team($this->user, 6);
        $opponent = $this->team($this->user, 6);

        $this->actingAs($this->user)
            ->postJson('/api/battles', ['team_id' => $team->id, 'opponent_team_id' => $opponent->id, 'difficulty' => 'hard'])
            ->assertCreated()
            ->assertJsonPath('id', 'abc');

        Http::assertSent(fn (HttpRequest $request) => $request['owner_id'] === $this->user->id
            && count($request['player_team']['members']) === 6
            && $request['opponent_team']['id'] === $opponent->id
            && $request['difficulty'] === 'hard');
    }

    public function test_random_opponent_is_an_ai_team_of_the_chosen_difficulty(): void
    {
        Http::fake(['*/battles' => Http::response(['id' => 'abc'], 201)]);

        $hard = $this->team(null, 6, 'hard');
        $this->team(null, 6, 'easy');
        $userTeam = $this->team($this->user, 6);

        $this->actingAs($this->user)
            ->postJson('/api/battles', ['team_id' => $userTeam->id, 'opponent_team_id' => 'random', 'difficulty' => 'hard'])
            ->assertCreated();

        Http::assertSent(fn (HttpRequest $request) => $request['opponent_team']['id'] === $hard->id);
    }

    public function test_random_without_ai_teams_is_a_clear_error(): void
    {
        Http::fake();

        $this->actingAs($this->user)
            ->postJson('/api/battles', ['team_id' => $this->team($this->user, 6)->id, 'opponent_team_id' => 'random', 'difficulty' => 'medium'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('opponent_team_id');

        Http::assertNothingSent();
    }

    public function test_ai_teams_cannot_be_opened_or_picked_by_id(): void
    {
        Http::fake();
        $aiTeam = $this->team(null, 6, 'hard');

        $this->actingAs($this->user)->getJson("/api/teams/{$aiTeam->id}")->assertNotFound();
        $this->actingAs($this->user)
            ->postJson('/api/battles', ['team_id' => $this->team($this->user, 6)->id, 'opponent_team_id' => $aiTeam->id, 'difficulty' => 'hard'])
            ->assertNotFound();
        $this->actingAs($this->user)->getJson('/api/teams')->assertJsonCount(1, 'data');
    }

    public function test_rejects_unknown_difficulty(): void
    {
        Http::fake();

        $this->actingAs($this->user)
            ->postJson('/api/battles', [
                'team_id' => $this->team($this->user, 6)->id,
                'opponent_team_id' => $this->team($this->user, 6)->id,
                'difficulty' => 'impossivel',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('difficulty');

        Http::assertNothingSent();
    }

    public function test_rejects_incomplete_team(): void
    {
        Http::fake();

        $this->actingAs($this->user)
            ->postJson('/api/battles', [
                'team_id' => $this->team($this->user, 3)->id,
                'opponent_team_id' => $this->team($this->user, 6)->id,
                'difficulty' => 'easy',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('team_id');

        Http::assertNothingSent();
    }

    public function test_cannot_use_another_users_team(): void
    {
        Http::fake();
        $other = User::forceCreate(['username' => 'gary', 'password' => 'secret123']);

        $this->actingAs($this->user)
            ->postJson('/api/battles', [
                'team_id' => $this->team($this->user, 6)->id,
                'opponent_team_id' => $this->team($other, 6)->id,
                'difficulty' => 'easy',
            ])
            ->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_forwards_choice_and_simulator_errors(): void
    {
        Http::fake(['*/battles/abc/choice' => Http::response(['message' => 'Escolha inválida.'], 422)]);

        $this->actingAs($this->user)
            ->postJson('/api/battles/abc/choice', ['choice' => 'move 9'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Escolha inválida.');

        Http::assertSent(fn (HttpRequest $request) => $request['owner_id'] === $this->user->id
            && $request['choice'] === 'move 9');
    }

    public function test_simulator_down_returns_503(): void
    {
        Http::fake(fn () => throw new ConnectionException('down'));

        $this->actingAs($this->user)->getJson('/api/battles/abc')->assertStatus(503);
    }

    // Sem dono + difficulty = time pronto da IA.
    private function team(?User $owner, int $size, ?string $difficulty = null): Team
    {
        $team = Team::forceCreate(['user_id' => $owner?->id, 'name' => 'Time', 'difficulty' => $difficulty]);
        $ability = Ability::firstOrCreate(['pokeapi_id' => 1], ['name' => 'stench']);

        for ($slot = 1; $slot <= $size; $slot++) {
            $pokemon = Pokemon::forceCreate([
                'pokedex_number' => $slot,
                'name' => "pokemon-{$slot}",
                'types' => ['normal'],
                'stats' => [],
            ]);
            $team->members()->create([
                'slot' => $slot,
                'pokemon_id' => $pokemon->id,
                'ability_id' => $ability->id,
                'nature' => 'hardy',
                'stat_points' => array_fill_keys(config('vgc.stats'), 0),
            ]);
        }

        return $team;
    }
}
