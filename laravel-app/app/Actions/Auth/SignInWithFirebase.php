<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Support\CodenameGenerator;
use App\Support\FirebaseIdToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Finds or creates the account behind a Google sign-in (via Firebase):
 * the same Google user, else an account with the same verified email
 * (linked from now on), else a new account. Google has confirmed the
 * address, so it counts as verified.
 */
class SignInWithFirebase
{
    /**
     * @throws ValidationException
     */
    public function handle(string $idToken): User
    {
        $google = FirebaseIdToken::verify($idToken);

        if (! $google['email_verified']) {
            throw ValidationException::withMessages(['id_token' => [__('Your Google account email is not verified.')]]);
        }

        return DB::transaction(function () use ($google): User {
            $user = User::where('firebase_uid', $google['uid'])->first()
                ?? User::where('email', $google['email'])->first();

            if ($user) {
                $user->forceFill(['firebase_uid' => $google['uid']])->save();

                if (! $user->hasVerifiedEmail()) {
                    $user->markEmailAsVerified();
                }

                return $user;
            }

            $user = User::create([
                'name' => $google['name'] ?: Str::before($google['email'], '@'),
                'email' => $google['email'],
                // Never used to log in; "Forgot password" can set a real one.
                'password' => Str::password(40),
                'codename' => CodenameGenerator::unique(),
            ]);
            $user->forceFill(['firebase_uid' => $google['uid'], 'email_verified_at' => now()])->save();

            return $user;
        });
    }
}
