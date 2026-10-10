<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Time de usuário (user_id preenchido) ou time pronto da IA (sem dono, com
 * difficulty easy/medium/hard).
 */
class Team extends Model
{
    protected $fillable = ['name', 'difficulty'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(TeamMember::class)->orderBy('slot');
    }

    /**
     * Troca todos os membros do time. Espera membros já validados pelo
     * VgcTeamValidator, no formato de TeamRequest::members().
     */
    public function replaceMembers(array $members): void
    {
        TeamMember::where('team_id', $this->id)->delete();

        foreach ($members as $i => $memberData) {
            $member = $this->members()->create([
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
