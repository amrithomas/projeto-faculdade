<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Guardamos um único método de aprendizado por golpe (level-up tem
     * prioridade, ver PokeApiService::fetchPokemon()), por isso a chave
     * única é só pokemon+move — não há mais de uma linha por golpe.
     */
    public function up(): void
    {
        Schema::create('move_pokemon', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pokemon_id')->constrained('pokemons')->cascadeOnDelete();
            $table->foreignId('move_id')->constrained('moves')->cascadeOnDelete();
            $table->unsignedTinyInteger('level')->nullable();
            $table->string('learn_method')->default('level-up');
            $table->timestamps();

            $table->unique(['pokemon_id', 'move_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('move_pokemon');
    }
};
