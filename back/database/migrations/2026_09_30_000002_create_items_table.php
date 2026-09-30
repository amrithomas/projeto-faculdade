<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Itens seguráveis em batalha (Choice Scarf, Leftovers, berries etc),
     * populados por `php artisan pokedex:sync-items`. Só entram as
     * categorias da PokeAPI que fazem sentido num time competitivo.
     */
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('pokeapi_id')->unique();
            $table->string('name')->index();
            $table->string('category');
            $table->string('sprite_url')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
