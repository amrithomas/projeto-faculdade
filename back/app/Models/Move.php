<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Move extends Model
{
    protected $fillable = [
        'pokeapi_id',
        'name',
        'type',
        'damage_class',
        'power',
        'accuracy',
        'pp',
        'description',
    ];

    public function pokemons(): BelongsToMany
    {
        return $this->belongsToMany(Pokemon::class, 'move_pokemon')
            ->withPivot(['level', 'learn_method']);
    }
}
