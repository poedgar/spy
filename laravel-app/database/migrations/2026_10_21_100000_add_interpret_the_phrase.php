<?php

use App\Support\PromptData;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Interpret the Phrase" (Розтлумач фразу) plays like Finish the Phrase,
     * on the same rounds table: everyone explains the same idiom, then votes.
     * Its phrases share the prompts table, told apart by game type, and may
     * carry what they really mean, shown after the vote.
     */
    public function up(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            $table->string('game_type', 20)->default('finish')->after('id');
            $table->string('meaning', 255)->nullable()->after('text');
        });

        // A round keeps the meaning it was dealt, like its text.
        Schema::table('finish_rounds', function (Blueprint $table) {
            $table->string('meaning', 255)->nullable()->after('text');
        });

        $now = now();

        foreach (PromptData::MEANINGS as $language => $phrases) {
            DB::table('prompts')->insert(array_map(fn (array $phrase) => [
                'game_type' => 'meaning',
                'language' => $language,
                'text' => $phrase['text'],
                'meaning' => $phrase['meaning'],
                'created_at' => $now,
                'updated_at' => $now,
            ], $phrases));
        }
    }

    public function down(): void
    {
        DB::table('prompts')->where('game_type', 'meaning')->delete();

        Schema::table('finish_rounds', function (Blueprint $table) {
            $table->dropColumn('meaning');
        });

        Schema::table('prompts', function (Blueprint $table) {
            $table->dropColumn(['game_type', 'meaning']);
        });
    }
};
