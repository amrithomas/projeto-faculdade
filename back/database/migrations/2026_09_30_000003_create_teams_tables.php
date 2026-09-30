<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Times no formato VGC: até 6 membros por time, cada um com habilidade,
     * item, natureza, stat points e até 4 golpes.
     *
     * As regras mais simples (mesmo pokémon/item repetido no time) também
     * viram índice único aqui, como segunda barreira. A validação completa
     * (Species Clause por número da dex, stat points, golpes aprendíveis,
     * restritos...) fica em App\Services\VgcTeamValidator.
     */
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->unsignedTinyInteger('slot');
            $table->foreignId('pokemon_id')->constrained('pokemons')->cascadeOnDelete();
            $table->foreignId('ability_id')->nullable()->constrained('abilities')->nullOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->string('nature');
            // {"hp": 2, "attack": 32, ...} — ver config('vgc.stat_points').
            $table->json('stat_points');
            $table->timestamps();

            $table->unique(['team_id', 'slot']);
            $table->unique(['team_id', 'pokemon_id']);
            // MySQL aceita vários NULL num índice único, então membros sem
            // item não conflitam entre si (Item Clause só vale pra item real).
            $table->unique(['team_id', 'item_id']);
        });

        Schema::create('move_team_member', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_member_id')->constrained('team_members')->cascadeOnDelete();
            $table->foreignId('move_id')->constrained('moves')->cascadeOnDelete();
            $table->unsignedTinyInteger('slot');

            $table->unique(['team_member_id', 'slot']);
            $table->unique(['team_member_id', 'move_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('move_team_member');
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
    }
};
