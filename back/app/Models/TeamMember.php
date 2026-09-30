<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TeamMember extends Model
{
    protected $fillable = [
        'slot',
        'pokemon_id',
        'ability_id',
        'item_id',
        'nature',
        'stat_points',
    ];

    protected $casts = [
        'stat_points' => 'array',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function pokemon(): BelongsTo
    {
        return $this->belongsTo(Pokemon::class);
    }

    public function ability(): BelongsTo
    {
        return $this->belongsTo(Ability::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function moves(): BelongsToMany
    {
        return $this->belongsToMany(Move::class, 'move_team_member')
            ->withPivot('slot')
            ->orderByPivot('slot');
    }
}
