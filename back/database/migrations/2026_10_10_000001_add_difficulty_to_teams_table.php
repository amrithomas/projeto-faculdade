<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Times prontos da IA: sem dono (user_id nulo) e com a dificuldade em que
     * são sorteados (easy/medium/hard). Times de usuário têm difficulty nula.
     */
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->string('difficulty', 10)->nullable()->after('user_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn('difficulty');
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
