<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Name the Emotion" (Вгадай емоцію): everyone sees the same face and
     * secretly picks the emotion it shows. Faces come with a level from how
     * they were made; the answers players give then measure how
     * recognisable each face really is.
     */
    public function up(): void
    {
        Schema::create('faces', function (Blueprint $table) {
            $table->id();
            // Image under public/, e.g. emotions/u07-joy-laughter.jpg
            $table->string('image', 150)->unique();
            // One of the six basic emotions, or neutral.
            $table->string('emotion', 20);
            // The dataset's name for this expression, e.g. "Laughter".
            $table->string('variant', 60);
            // Where the face starts: 1 easy, 2 medium, 3 hard.
            $table->unsignedTinyInteger('base_level');
            // What players answered, for measuring recognisability.
            $table->unsignedInteger('shown_count')->default(0);
            $table->unsignedInteger('correct_count')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['active', 'emotion']);
        });

        Schema::table('games', function (Blueprint $table) {
            // Name the Emotion only: 1 easy, 2 medium, 3 hard.
            $table->unsignedTinyInteger('emotion_level')->nullable()->after('phrase_language');
        });

        Schema::create('emotion_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('number');
            $table->foreignId('face_id')->constrained()->restrictOnDelete();
            $table->unsignedTinyInteger('level');
            // The emotions offered, in the order shown.
            $table->json('options');
            // {user id: chosen emotion}
            $table->json('answers')->nullable();
            $table->string('ending')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->unique(['game_id', 'number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emotion_rounds');

        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('emotion_level');
        });

        Schema::dropIfExists('faces');
    }
};
