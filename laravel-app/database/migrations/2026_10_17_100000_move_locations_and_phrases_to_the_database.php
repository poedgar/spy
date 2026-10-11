<?php

use App\Support\LocationData;
use App\Support\PhraseData;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Locations and phrases become editable (admin pages). They start as the
     * lists that shipped in code, keeping their ids: rounds store a location
     * id, and a phrase's language and number. Removed entries are only
     * hidden (soft-deleted), so past rounds still show them.
     */
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('en', 100);
            $table->string('uk', 100);
            $table->string('category', 32);
            $table->string('tier', 16);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('phrases', function (Blueprint $table) {
            $table->id();
            $table->string('language', 5);
            // The per-language number phrase_rounds store as phrase_id.
            $table->unsignedSmallInteger('number');
            $table->string('text', 255);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['language', 'number']);
        });

        // A round keeps the phrase it was dealt, so later edits can't change it.
        Schema::table('phrase_rounds', function (Blueprint $table) {
            $table->string('text', 255)->nullable()->after('phrase_id');
        });

        $now = now();

        foreach (array_chunk(LocationData::PLACES, 200) as $chunk) {
            DB::table('locations')->insert(array_map(fn (array $place) => [
                'id' => $place['id'],
                'en' => $place['en'],
                'uk' => $place['uk'],
                'category' => $place['category'],
                'tier' => $place['tier'],
                'created_at' => $now,
                'updated_at' => $now,
            ], $chunk));
        }

        foreach (PhraseData::PHRASES as $language => $phrases) {
            DB::table('phrases')->insert(array_map(fn (array $phrase) => [
                'language' => $language,
                'number' => $phrase['id'],
                'text' => $phrase['text'],
                'created_at' => $now,
                'updated_at' => $now,
            ], $phrases));

            foreach ($phrases as $phrase) {
                DB::table('phrase_rounds')
                    ->where('language', $language)
                    ->where('phrase_id', $phrase['id'])
                    ->update(['text' => $phrase['text']]);
            }
        }

        // Explicit ids don't move Postgres' sequence; new locations must not collide.
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("SELECT setval(pg_get_serial_sequence('locations', 'id'), (SELECT MAX(id) FROM locations))");
        }
    }

    public function down(): void
    {
        Schema::table('phrase_rounds', function (Blueprint $table) {
            $table->dropColumn('text');
        });
        Schema::dropIfExists('phrases');
        Schema::dropIfExists('locations');
    }
};
