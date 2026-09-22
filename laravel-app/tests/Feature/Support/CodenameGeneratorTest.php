<?php

use App\Support\CodenameGenerator;

test('assigns the same codename for the same name every time', function () {
    expect(CodenameGenerator::forName('Agent_007'))
        ->toBe(CodenameGenerator::forName('Agent_007'));
});

test('assigns a codename from the known wordlist', function () {
    $wordlist = ['SHADOW_FOX', 'NIGHT_HAWK', 'CIPHER_NINE', 'GHOST_PROTOCOL', 'VIPER_ONE', 'COVERT_RAVEN'];

    expect($wordlist)->toContain(CodenameGenerator::forName('Some Random Name'));
});
