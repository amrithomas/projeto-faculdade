<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Flags vindas de /pokemon-species/{id} na PokeAPI, usadas pelas regras
     * de montagem de time do VGC (lendários/míticos costumam ser banidos ou
     * limitados, dependendo da regulation). Quem é "restrito" não vem da
     * PokeAPI: é uma lista fixa em config/vgc.php.
     */
    public function up(): void
    {
        Schema::table('pokemons', function (Blueprint $table) {
            $table->boolean('is_legendary')->default(false)->after('gender_rate');
            $table->boolean('is_mythical')->default(false)->after('is_legendary');
        });
    }

    public function down(): void
    {
        Schema::table('pokemons', function (Blueprint $table) {
            $table->dropColumn(['is_legendary', 'is_mythical']);
        });
    }
};
