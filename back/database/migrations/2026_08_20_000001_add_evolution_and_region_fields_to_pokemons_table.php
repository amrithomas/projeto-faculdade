<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pokemons', function (Blueprint $table) {
            $table->unsignedTinyInteger('generation')->nullable()->after('pokedex_number');
            $table->string('region')->nullable()->after('generation');
            $table->unsignedSmallInteger('regional_dex_number')->nullable()->after('region');
            $table->unsignedSmallInteger('evolves_from_pokedex_number')->nullable()->after('regional_dex_number');

            // Substituído pela relação many-to-many com a tabela `abilities`
            // (agora guardamos descrição de cada habilidade, não dá mais pra
            // manter isso como uma lista solta de strings).
            $table->dropColumn('abilities');
        });
    }

    public function down(): void
    {
        Schema::table('pokemons', function (Blueprint $table) {
            $table->dropColumn(['generation', 'region', 'regional_dex_number', 'evolves_from_pokedex_number']);
            $table->json('abilities')->nullable();
        });
    }
};
