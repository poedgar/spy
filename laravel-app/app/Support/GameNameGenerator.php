<?php

namespace App\Support;

use App\Enums\GameType;
use Illuminate\Support\Arr;

/**
 * Random game names, in the player's language: "Operation Silent Falcon",
 * "Операція «Тихий Сокіл»". Ukrainian adjectives and nouns are all
 * masculine, so any pair agrees.
 */
class GameNameGenerator
{
    private const WORDS = [
        'en' => [
            'adjectives' => ['Silent', 'Golden', 'Midnight', 'Crimson', 'Hidden', 'Swift', 'Clever', 'Lucky', 'Frozen', 'Velvet', 'Electric', 'Wild', 'Secret', 'Brave', 'Silver', 'Cosmic', 'Shadow', 'Bright', 'Fiery', 'Northern'],
            'nouns' => ['Falcon', 'Fox', 'Raven', 'Tiger', 'Compass', 'Anchor', 'Lantern', 'Wolf', 'Phoenix', 'Badger', 'Cipher', 'Thunder', 'Moon', 'Wind', 'Lighthouse', 'Owl', 'Whale', 'Leopard', 'Cedar', 'Hedgehog'],
        ],
        'uk' => [
            'adjectives' => ['Тихий', 'Золотий', 'Опівнічний', 'Багряний', 'Прихований', 'Швидкий', 'Хитрий', 'Щасливий', 'Крижаний', 'Оксамитовий', 'Блискавичний', 'Дикий', 'Таємний', 'Хоробрий', 'Срібний', 'Космічний', 'Тіньовий', 'Ясний', 'Вогняний', 'Північний'],
            'nouns' => ['Сокіл', 'Лис', 'Ворон', 'Тигр', 'Компас', 'Якір', 'Ліхтар', 'Вовк', 'Фенікс', 'Борсук', 'Шифр', 'Грім', 'Місяць', 'Вітер', 'Маяк', 'Пугач', 'Кит', 'Барс', 'Кедр', 'Їжак'],
        ],
    ];

    public static function for(GameType $type, ?string $locale = null): string
    {
        $language = ($locale ?? app()->getLocale()) === 'uk' ? 'uk' : 'en';
        $words = self::WORDS[$language];
        $name = Arr::random($words['adjectives']).' '.Arr::random($words['nouns']);

        return match ([$type, $language]) {
            [GameType::Spy, 'en'] => "Operation {$name}",
            [GameType::Spy, 'uk'] => "Операція «{$name}»",
            [GameType::Phrase, 'en'] => "Phrase Club: {$name}",
            [GameType::Phrase, 'uk'] => "Клуб фраз «{$name}»",
        };
    }
}
