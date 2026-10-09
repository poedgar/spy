<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * An optional per-game round length. When a round's time is up, a Spy
     * round moves to the vote and a Phrase deal is revealed.
     */
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->unsignedSmallInteger('round_seconds')->nullable()->after('max_players');
        });

        foreach (['game_rounds', 'phrase_rounds'] as $rounds) {
            Schema::table($rounds, function (Blueprint $table) {
                $table->timestamp('ends_at')->nullable()->after('started_at');
            });
        }
    }

    public function down(): void
    {
        foreach (['game_rounds', 'phrase_rounds'] as $rounds) {
            Schema::table($rounds, function (Blueprint $table) {
                $table->dropColumn('ends_at');
            });
        }

        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('round_seconds');
        });
    }
};
