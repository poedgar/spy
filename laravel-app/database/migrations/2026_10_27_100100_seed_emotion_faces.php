<?php

use App\Support\FaceData;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The faces Name the Emotion starts with (see FaceData). Images ship in
     * public/emotions.
     */
    public function up(): void
    {
        $now = now();

        foreach (array_chunk(FaceData::FACES, 200) as $chunk) {
            DB::table('faces')->insert(array_map(fn (array $face) => [
                'image' => $face[0],
                'emotion' => $face[1],
                'variant' => $face[2],
                'base_level' => $face[3],
                'active' => $face[4],
                'created_at' => $now,
                'updated_at' => $now,
            ], $chunk));
        }
    }

    public function down(): void
    {
        DB::table('faces')->whereIn('image', array_column(FaceData::FACES, 0))->delete();
    }
};
