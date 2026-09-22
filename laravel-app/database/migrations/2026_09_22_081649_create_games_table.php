<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('title');
            $table->string('game_mode');
            $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('max_players');
            $table->text('mission_briefing');
            $table->string('secret_location');
            $table->string('status')->default('recruiting');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
