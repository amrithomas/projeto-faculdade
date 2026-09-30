<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $fillable = [
        'pokeapi_id',
        'name',
        'category',
        'sprite_url',
        'description',
    ];
}
