<?php

use App\Support\MemeData;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Meme It" (Зроби мем) plays like the other written games, on the same
     * tables: everyone captions the same picture, then votes without names.
     * Its prompts are pictures (a path under public/ or a link), with the
     * credit their licence asks for; they have no language.
     */
    public function up(): void
    {
        Schema::table('prompts', function (Blueprint $table) {
            $table->string('language', 5)->nullable()->change();
            $table->string('image', 500)->nullable()->after('meaning');
            $table->string('credit', 255)->nullable()->after('image');
            $table->string('source_url', 500)->nullable()->after('credit');
        });

        // A round keeps the picture it was dealt.
        Schema::table('finish_rounds', function (Blueprint $table) {
            $table->string('image', 500)->nullable()->after('meaning');
        });

        $now = now();

        DB::table('prompts')->insert(array_map(fn (array $meme) => [
            'game_type' => 'meme',
            'language' => null,
            'image' => $meme[0],
            'text' => $meme[1],
            'credit' => $meme[2],
            'source_url' => $meme[3],
            'created_at' => $now,
            'updated_at' => $now,
        ], MemeData::MEMES));
    }

    public function down(): void
    {
        DB::table('prompts')->where('game_type', 'meme')->delete();

        Schema::table('finish_rounds', function (Blueprint $table) {
            $table->dropColumn('image');
        });

        Schema::table('prompts', function (Blueprint $table) {
            $table->dropColumn(['image', 'credit', 'source_url']);
            $table->string('language', 5)->nullable(false)->change();
        });
    }
};
