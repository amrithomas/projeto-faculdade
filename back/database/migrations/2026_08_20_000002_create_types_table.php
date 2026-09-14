<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cache local dos 18 tipos de Pokémon e suas relações de dano
     * (usado pra calcular fraquezas/resistências de cada pokémon).
     */
    public function up(): void
    {
        Schema::create('types', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('pokeapi_id')->unique();
            $table->string('name')->unique();
            $table->json('damage_relations');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('types');
    }
};
