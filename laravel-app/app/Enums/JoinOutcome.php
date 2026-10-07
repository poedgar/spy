<?php

namespace App\Enums;

enum JoinOutcome: string
{
    case Joined = 'joined';
    case Requested = 'requested';
}
