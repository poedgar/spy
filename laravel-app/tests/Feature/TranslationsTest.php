<?php

use Illuminate\Support\Facades\File;

/**
 * Every English string the app shows must have a Ukrainian line, or a
 * Ukrainian player sees English. English strings are their own keys, so a
 * missing key fails silently at runtime — this test makes it loud.
 *
 * @return list<string>
 */
function translationKeysUsedIn(string $directory, array $extensions, string $callPattern): array
{
    $keys = [];

    foreach (File::allFiles($directory) as $file) {
        if (! in_array($file->getExtension(), $extensions, true) || str_contains($file->getPathname(), '/components/ui/')) {
            continue;
        }

        preg_match_all($callPattern, $file->getContents(), $matches);

        foreach ($matches['key'] as $key) {
            $keys[] = stripcslashes($key);
        }
    }

    return array_values(array_unique($keys));
}

$ukrainian = fn (): array => json_decode(File::get(lang_path('uk.json')), true);

test('every string the web app translates has a Ukrainian line', function () use ($ukrainian) {
    $keys = translationKeysUsedIn(resource_path('js'), ['vue', 'ts'], "/\\bt\\(\\s*(['\"])(?<key>(?:(?!\\1)[^\\\\]|\\\\.)+)\\1/");

    expect(array_values(array_diff($keys, array_keys($ukrainian()))))->toBe([]);
});

test('every string the server translates has a Ukrainian line', function () use ($ukrainian) {
    $keys = translationKeysUsedIn(app_path(), ['php'], "/(?:__|\\\$t)\\(\\s*(['\"])(?<key>(?:(?!\\1)[^\\\\]|\\\\.)+)\\1/");
    // Keys that live in lang/uk/*.php groups rather than uk.json.
    $keys = array_filter($keys, fn (string $key) => ! preg_match('/^(auth|validation|passwords|pagination)\./', $key));

    expect(array_values(array_diff($keys, array_keys($ukrainian()))))->toBe([]);
});

test('the Ukrainian lines keep every placeholder of the English key', function () use ($ukrainian) {
    $broken = [];

    foreach ($ukrainian() as $english => $line) {
        preg_match_all('/:([a-zA-Z_]+)/', $english, $expected);
        preg_match_all('/:([a-zA-Z_]+)/', $line, $actual);

        if (array_diff($expected[1], $actual[1]) !== []) {
            $broken[] = $english;
        }
    }

    expect($broken)->toBe([]);
});
