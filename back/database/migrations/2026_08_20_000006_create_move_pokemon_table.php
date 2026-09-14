<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Por enquanto só sincronizamos golpes aprendidos por level-up (é o que
     * a tela de detalhes precisa), por isso a chave única é só
     * pokemon+move — não há mais de uma linha por golpe aprendido.
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
