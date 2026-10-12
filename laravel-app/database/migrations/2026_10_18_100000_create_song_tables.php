<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Sing It Out" (Доспівай): everyone hears the same short clip, takes a
     * turn singing how it goes on, then votes for the best.
     */
    public function up(): void
    {
        // Clips are stretches of YouTube videos, added on the admin pages;
        // removing one only hides it.
        Schema::create('songs', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->string('artist', 150)->nullable();
            $table->string('youtube_id', 20);
            $table->unsignedInteger('start_seconds')->default(0);
            $table->unsignedInteger('end_seconds')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('song_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('number');
            $table->unsignedBigInteger('song_id');
            // Who sings when, and how far along the table is.
            $table->json('turn_order');
            $table->unsignedInteger('turn_index')->default(0);
            // {voter user id: chosen singer user id}
            $table->json('votes')->nullable();
            $table->json('winner_user_ids')->nullable();
            $table->string('ending')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('voting_started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->unique(['game_id', 'number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('song_rounds');
        Schema::dropIfExists('songs');
    }
};
