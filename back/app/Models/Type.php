<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Um dos 18 tipos de Pokémon, com suas relações de dano (o que causa
 * dano dobrado/reduzido/nulo nele, e o que ele causa nos outros).
 * Usado pelo TypeEffectivenessService pra calcular fraquezas/resistências.
 */
class Type extends Model
{
    protected $fillable = ['pokeapi_id', 'name', 'damage_relations'];

    protected $casts = [
        'damage_relations' => 'array',
    ];
}
