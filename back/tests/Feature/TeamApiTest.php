<?php

namespace Tests\Feature;

use App\Models\Ability;
use App\Models\Item;
use App\Models\Move;
use App\Models\Pokemon;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Pokemon $charizard;

    private Pokemon $megaX;

    private Item $stone;

    private Item $leftovers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::forceCreate(['username' => 'ash', 'password' => 'secret123']);

        $ability = Ability::forceCreate(['pokeapi_id' => 66, 'name' => 'blaze']);
        $move = Move::forceCreate(['pokeapi_id' => 53, 'name' => 'flamethrower', 'type' => 'fire']);

        $this->charizard = $this->pokemon(['pokedex_number' => 6, 'name' => 'charizard']);
        $this->megaX = $this->pokemon(['pokedex_number' => 6, 'name' => 'charizard-mega-x', 'base_pokemon_id' => $this->charizard->id]);

        foreach ([$this->charizard, $this->megaX] as $pokemon) {
            $pokemon->abilities()->attach($ability->id, ['is_hidden' => false, 'slot' => 1]);
            $pokemon->moves()->attach($move->id, ['level' => 1, 'learn_method' => 'level-up']);
        }

        $this->stone = Item::forceCreate(['pokeapi_id' => 660, 'name' => 'charizardite-x', 'category' => 'mega-stones']);
        $this->leftovers = Item::forceCreate(['pokeapi_id' => 211, 'name' => 'leftovers', 'category' => 'held-items']);
    }

    public function test_mega_must_hold_its_stone(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/teams', $this->payload([$this->member($this->megaX, $this->leftovers)]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('members.0.item_id');

        $this->actingAs($this->user)
            ->postJson('/api/teams', $this->payload([$this->member($this->megaX, $this->stone)]))
            ->assertCreated();
    }

    public function test_base_form_can_hold_stone_or_other_item(): void
    {
        foreach ([$this->stone, $this->leftovers, null] as $item) {
            $this->actingAs($this->user)
                ->postJson('/api/teams', $this->payload([$this->member($this->charizard, $item)]))
                ->assertCreated();
        }
    }

    public function test_species_clause_blocks_base_and_mega_together(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/teams', $this->payload([
                $this->member($this->charizard, $this->leftovers),
                $this->member($this->megaX, $this->stone),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('members.1.pokemon_id');
    }

    public function test_other_users_team_is_not_found(): void
    {
        $other = User::forceCreate(['username' => 'gary', 'password' => 'secret123']);
        $team = Team::forceCreate(['user_id' => $other->id, 'name' => 'Rival']);

        $this->actingAs($this->user)->getJson("/api/teams/{$team->id}")->assertNotFound();
        $this->actingAs($this->user)->putJson("/api/teams/{$team->id}", [])->assertNotFound();
        $this->actingAs($this->user)->deleteJson("/api/teams/{$team->id}")->assertNotFound();
    }

    public function test_guest_cannot_create_team(): void
    {
        $this->postJson('/api/teams', [])->assertUnauthorized();
    }

    private function pokemon(array $attributes): Pokemon
    {
        return Pokemon::forceCreate([
            'types' => ['fire', 'flying'],
            'stats' => [['name' => 'hp', 'base_value' => 78]],
            ...$attributes,
        ]);
    }

    private function member(Pokemon $pokemon, ?Item $item): array
    {
        return [
            'pokemon_id' => $pokemon->id,
            'ability_id' => $pokemon->abilities()->value('abilities.id'),
            'item_id' => $item?->id,
            'nature' => 'hardy',
            'stat_points' => array_fill_keys(config('vgc.stats'), 0),
            'move_ids' => [$pokemon->moves()->value('moves.id')],
        ];
    }

    private function payload(array $members): array
    {
        return ['name' => 'Time teste', 'members' => $members];
    }
}
