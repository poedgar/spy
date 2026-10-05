<?php

namespace App\Http\Controllers\Api;

use App\Actions\DeleteUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MeController extends Controller
{
    public function show(Request $request): UserResource
    {
        return UserResource::make($request->user());
    }

    public function update(ProfileUpdateRequest $request): UserResource
    {
        $user = $request->user();
        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return UserResource::make($user);
    }

    public function updatePassword(PasswordUpdateRequest $request): Response
    {
        $request->user()->update(['password' => $request->validated('password')]);

        return response()->noContent();
    }

    public function destroy(ProfileDeleteRequest $request, DeleteUser $deleteUser): Response
    {
        $deleteUser->handle($request->user());

        return response()->noContent();
    }
}
