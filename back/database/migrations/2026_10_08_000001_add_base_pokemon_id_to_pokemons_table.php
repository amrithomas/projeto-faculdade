<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Megaevoluções viram linhas próprias em `pokemons` (stats, tipos e
     * habilidade mudam), apontando pra forma base. Por isso o número da dex
     * deixa de ser único: Charizard e Mega Charizard X dividem o 6.
     */
    public function up(): void
    {
        Schema::table('pokemons', function (Blueprint $table) {
            $table->dropUnique(['pokedex_number']);
            $table->index('pokedex_number');
            $table->foreignId('base_pokemon_id')->nullable()->after('pokedex_number')
                ->constrained('pokemons')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pokemons', function (Blueprint $table) {
            $table->dropConstrainedForeignId('base_pokemon_id');
            $table->dropIndex(['pokedex_number']);
            $table->unique('pokedex_number');
        });
    }
};
