<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The location is now drawn per round (game_rounds.location_id), so the
     * game-level secret_location is gone.
     */
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->string('age_tier')->default('adults')->after('game_mode');
            $table->index('status');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('secret_location');
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->string('secret_location')->default('');
        });

        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn('age_tier');
        });
    }
};
