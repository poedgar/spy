<?php

namespace App\Enums;

enum PlayerStatus: string
{
    case Ready = 'ready';
    case Pending = 'pending';

    public function toggled(): self
    {
        return $this === self::Ready ? self::Pending : self::Ready;
    }
}
