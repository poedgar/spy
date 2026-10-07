<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('number');
            $table->unsignedSmallInteger('location_id');
            $table->json('spy_user_ids');
            $table->timestamp('started_at');
            $table->timestamp('voting_started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->string('ending')->nullable();
            $table->string('winning_team')->nullable();
            $table->foreignId('accused_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('guessed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('guessed_location_id')->nullable();
            $table->timestamps();

            $table->unique(['game_id', 'number']);
        });

        Schema::create('round_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_round_id')->constrained()->cascadeOnDelete();
            $table->foreignId('voter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('suspect_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['game_round_id', 'voter_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('round_votes');
        Schema::dropIfExists('game_rounds');
    }
};
