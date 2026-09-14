<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorite_pokemon', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pokemon_id')->constrained('pokemons')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'pokemon_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorite_pokemon');
    }
};
