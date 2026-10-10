<?php

namespace Database\Seeders;

use App\Models\Ability;
use App\Models\Item;
use App\Models\Move;
use App\Models\Pokemon;
use App\Models\Team;
use App\Services\VgcTeamValidator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Times prontos da IA (database/data/ai_teams.json), sorteados na opção
 * "Aleatório" da batalha conforme a dificuldade.
 *
 *   php artisan db:seed --class=AiTeamSeeder
 *
 * Cada time passa pelo mesmo VgcTeamValidator dos times de usuário. Se algum
 * estiver inválido, nada é gravado e todos os erros são listados. Rodar de
 * novo substitui os times da IA (os dos usuários não são tocados).
 * Precisa da base de pokémons/golpes/itens populada (sync ou dump).
 */
class AiTeamSeeder extends Seeder
{
    public function run(VgcTeamValidator $validator): void
    {
        $data = json_decode(file_get_contents(database_path('data/ai_teams.json')), true, flags: JSON_THROW_ON_ERROR);
        $stats = config('vgc.stats');
        $teams = [];
        $errors = [];

        foreach ($data as $difficulty => $difficultyTeams) {
            foreach ($difficultyTeams as $team) {
                $label = "[{$difficulty}] {$team['name']}";
                try {
                    $members = array_map(fn (array $m) => $this->resolveMember($m, $stats), $team['members']);
                    $validator->validate($members);
                    $teams[] = ['difficulty' => $difficulty, 'name' => $team['name'], 'members' => $members];
                } catch (ValidationException $e) {
                    foreach ($e->errors() as $field => $messages) {
                        // "members.2.item_id" → nome do pokémon na posição 2
                        $position = (int) explode('.', $field)[1];
                        $errors[] = "{$label} / {$team['members'][$position]['pokemon']}: ".implode(' ', $messages);
                    }
                } catch (RuntimeException $e) {
                    $errors[] = "{$label}: {$e->getMessage()}";
                }
            }
        }

        if ($errors !== []) {
            throw new RuntimeException("Times da IA inválidos:\n".implode("\n", $errors));
        }

        DB::transaction(function () use ($teams) {
            Team::whereNull('user_id')->whereNotNull('difficulty')->delete();
            foreach ($teams as $team) {
                Team::create(['name' => $team['name'], 'difficulty' => $team['difficulty']])
                    ->replaceMembers($team['members']);
            }
        });

        $this->command?->info(count($teams).' times da IA gravados.');
    }

    /**
     * Membro por nomes (como na PokeAPI) → formato de TeamRequest::members().
     * stat_points vem como [hp, atk, def, spa, spd, spe].
     */
    private function resolveMember(array $member, array $stats): array
    {
        $find = function (string $model, ?string $name) {
            if ($name === null) {
                return null;
            }
            $id = $model::where('name', $name)->value('id');
            if ($id === null) {
                throw new RuntimeException(class_basename($model)." não encontrado: {$name}");
            }

            return $id;
        };

        // Natureza e formato dos stat points são checados no TeamRequest pros
        // times de usuário; aqui não passa por ele.
        if (! isset(config('vgc.natures')[$member['nature']])) {
            throw new RuntimeException("natureza inválida: {$member['nature']}");
        }
        if (count($member['stat_points']) !== count($stats)) {
            throw new RuntimeException("{$member['pokemon']}: stat_points precisa de ".count($stats).' valores');
        }

        return [
            'pokemon_id' => $find(Pokemon::class, $member['pokemon']),
            'ability_id' => $find(Ability::class, $member['ability']),
            'item_id' => $find(Item::class, $member['item'] ?? null),
            'nature' => $member['nature'],
            'stat_points' => array_combine($stats, $member['stat_points']),
            'move_ids' => array_map(fn ($move) => $find(Move::class, $move), $member['moves']),
        ];
    }
}
