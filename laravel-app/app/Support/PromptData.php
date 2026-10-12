<?php

namespace App\Support;

/**
 * The Finish the Phrase beginnings the game started with: halves of sayings
 * to give a new ending, and open prompts. They live in the `prompts` table
 * (editable on the admin pages); this list only seeds it.
 */
class PromptData
{
    public const PROMPTS = [
        'en' => [
            // Halves of sayings: invent a better ending.
            'Better late than…',
            'An apple a day keeps…',
            "Don't count your chickens before…",
            'The early bird…',
            'Actions speak louder than…',
            'When life gives you lemons…',
            'Every cloud has…',
            "You can't teach an old dog…",
            'Home is where…',
            'All that glitters is not…',
            'Curiosity killed…',
            'Two heads are better than…',
            'Practice makes…',
            'Where there is a will, there is…',
            'Laughter is the best…',
            // Open prompts: there is no right answer.
            'The worst thing to say on a first date is…',
            'My superpower would be useless because…',
            'If cats could talk, the first thing they would say is…',
            'The secret ingredient in my grandmother’s soup is…',
            'Aliens finally landed, and the first thing they asked was…',
            'I was late to work today because…',
            'The best excuse for not doing your homework is…',
            'If I were invisible for one day, I would…',
            'The most useless invention of all time is…',
            'My autobiography would be called…',
            'A new law everyone must follow from tomorrow:',
            'The real reason dinosaurs disappeared is…',
            'What my dog does when I leave home is…',
            'Never trust a person who…',
            'The perfect name for a pet goldfish is…',
            'My teacher would be surprised to know that…',
            'In the year 3000, people will…',
        ],
        'uk' => [
            // Половинки приказок: вигадайте нове закінчення.
            'Не кажи «гоп», поки…',
            'Без праці не витягнеш…',
            'Краще пізно, ніж…',
            'Тиха вода…',
            'Хто рано встає, тому…',
            'Не май сто гривень, а…',
            'Яблуко від яблуні…',
            'Вовків боятися —…',
            'Сім разів відміряй —…',
            'Що посієш, те…',
            'Дружба дружбою, а…',
            'Апетит приходить…',
            'Не все те золото, що…',
            'Говори менше —…',
            'Риба шукає, де глибше, а людина…',
            // Відкриті початки: правильної відповіді немає.
            'Найгірше, що можна сказати на першому побаченні, —…',
            'Моя суперсила була б марною, бо…',
            'Якби коти вміли говорити, вони першим ділом сказали б…',
            'Секретний інгредієнт бабусиного борщу —…',
            'Прибульці нарешті приземлилися й одразу спитали…',
            'Запізнення на роботу сьогодні — бо…',
            'Найкраща відмовка, чому не зроблено домашнє завдання, —…',
            'Якби на один день можна було стати невидимкою, я б…',
            'Найбезглуздіший винахід усіх часів —…',
            'Моя автобіографія називалася б…',
            'Новий закон, який з завтрашнього дня мають виконувати всі:',
            'Справжня причина, чому зникли динозаври, —…',
            'Коли мене немає вдома, мій пес…',
            'Ніколи не довіряйте людині, яка…',
            'Ідеальне імʼя для золотої рибки —…',
            'Учителі здивувалися б, якби дізналися, що…',
            'У 3000 році люди будуть…',
        ],
    ];
}
