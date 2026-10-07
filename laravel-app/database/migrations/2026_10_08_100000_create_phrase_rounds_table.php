<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Mode and briefing are Spy's; a Phrase game has a phrase language instead.
        Schema::table('games', function (Blueprint $table) {
            $table->string('game_mode')->nullable()->change();
            $table->text('mission_briefing')->nullable()->change();
            $table->string('phrase_language', 5)->nullable()->after('age_tier');
            $table->index('game_type');
        });

        // A wrong Phrase guess costs a point, so scores can go below zero.
        Schema::table('game_players', function (Blueprint $table) {
            $table->integer('score')->default(0)->change();
        });

        Schema::create('phrase_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('number');
            $table->string('language', 5);
            $table->unsignedSmallInteger('phrase_id');
            // {user_id: word position} for the dealt words, and the asking order.
            $table->json('assignments');
            $table->json('turn_order');
            $table->unsignedInteger('turn_index')->default(0);
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->string('ending')->nullable();
            $table->foreignId('winner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['game_id', 'number']);
        });

        Schema::create('phrase_guesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('phrase_round_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('guess', 500);
            $table->boolean('correct');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phrase_guesses');
        Schema::dropIfExists('phrase_rounds');

        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex(['game_type']);
            $table->dropColumn('phrase_language');
        });
    }
};
