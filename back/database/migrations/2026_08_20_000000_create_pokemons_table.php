<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Esta tabela é o cache local dos dados vindos da PokeAPI: o comando
     * `php artisan pokedex:sync` popula ela, e a nossa própria API lê daqui
     * (nunca direto da PokeAPI na hora da requisição do usuário).
     */
    public function up(): void
    {
        Schema::create('pokemons', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('pokedex_number')->unique();
            $table->string('name')->index();
            $table->json('types');
            $table->string('sprite_url')->nullable();
            $table->decimal('height', 5, 2)->nullable();
            $table->decimal('weight', 6, 2)->nullable();
            $table->json('abilities');
            $table->json('stats');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pokemons');
    }
};
