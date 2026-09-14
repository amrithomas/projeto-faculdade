<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Campos vindos de /pokemon-species/{id} na PokeAPI, usados na tela de
     * detalhes pra deixar o layout mais parecido com uma pokédex de
     * verdade: texto descritivo (flavor text), categoria (ex: "Seed
     * Pokémon") e taxa de gênero.
     */
    public function up(): void
    {
        Schema::table('pokemons', function (Blueprint $table) {
            $table->text('description')->nullable()->after('sprite_url');
            $table->string('genus')->nullable()->after('description');
            // -1 = sem gênero, 0 = só macho, 8 = só fêmea, 1-7 = pode ser os
            // dois (fração em oitavos de chance de ser fêmea).
            $table->tinyInteger('gender_rate')->nullable()->after('genus');
        });
    }

    public function down(): void
    {
        Schema::table('pokemons', function (Blueprint $table) {
            $table->dropColumn(['description', 'genus', 'gender_rate']);
        });
    }
};
