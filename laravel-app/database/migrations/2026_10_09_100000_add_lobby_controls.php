<?php

use App\Support\CodenameGenerator;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->boolean('requires_approval')->default(false)->after('status');
        });

        Schema::create('join_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->unique(['game_id', 'user_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_notifications')->default(true)->after('locale');
        });

        // The old generator had six codenames, so many accounts share one.
        // Keep the first holder of each and give everyone else a fresh one
        // before codenames become unique.
        $taken = [];
        foreach (DB::table('users')->orderBy('id')->get(['id', 'codename']) as $user) {
            if (! isset($taken[$user->codename])) {
                $taken[$user->codename] = true;

                continue;
            }

            do {
                $codename = CodenameGenerator::random().'_'.random_int(10, 9999);
            } while (isset($taken[$codename]));

            $taken[$codename] = true;
            DB::table('users')->where('id', $user->id)->update(['codename' => $codename]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('codename');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['codename']);
            $table->dropColumn('email_notifications');
        });

        Schema::dropIfExists('join_requests');

        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('requires_approval');
        });
    }
};
