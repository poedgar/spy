<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Listed games appear in everyone's "open games" while they recruit.
     */
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->boolean('is_listed')->default(true)->after('requires_approval');
            $table->index(['game_type', 'status', 'is_listed']);
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex(['game_type', 'status', 'is_listed']);
            $table->dropColumn('is_listed');
        });
    }
};
