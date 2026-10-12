<?php

use App\Support\PromptData;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Finish the Phrase" (Продовж фразу): everyone gets the same beginning,
     * writes an ending, then votes for the best one, without names.
     */
    public function up(): void
    {
        // Beginnings, editable on the admin pages; removing one only hides it.
        Schema::create('prompts', function (Blueprint $table) {
            $table->id();
            $table->string('language', 5);
            $table->string('text', 255);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('finish_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('number');
            $table->unsignedBigInteger('prompt_id');
            // The beginning as dealt, so later edits can't change a round.
            $table->string('text', 255);
            // {author user id: ending}
            $table->json('answers')->nullable();
            // Authors in the order their endings are shown for voting.
            $table->json('answer_order')->nullable();
            // {voter user id: author user id}
            $table->json('votes')->nullable();
            $table->json('winner_user_ids')->nullable();
            $table->string('ending')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('voting_started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->unique(['game_id', 'number']);
        });

        $now = now();

        foreach (PromptData::PROMPTS as $language => $prompts) {
            DB::table('prompts')->insert(array_map(fn (string $text) => [
                'language' => $language,
                'text' => $text,
                'created_at' => $now,
                'updated_at' => $now,
            ], $prompts));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('finish_rounds');
        Schema::dropIfExists('prompts');
    }
};
