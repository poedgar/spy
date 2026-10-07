<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('locale', 5)->default('en')->after('codename');
        });

        Schema::table('invitations', function (Blueprint $table) {
            $table->index(['to_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropIndex(['to_user_id', 'status']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('locale');
        });
    }
};
