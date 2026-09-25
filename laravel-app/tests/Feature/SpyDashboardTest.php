<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SpyDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('games.spy'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_spy_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.spy'));
        $response->assertOk();
    }

    public function test_spy_dashboard_lists_the_users_games()
    {
        $user = User::factory()->create();
        $game = Game::factory()->create(['host_id' => $user->id, 'title' => 'Operation Nightfall']);
        GamePlayer::factory()->create(['game_id' => $game->id, 'user_id' => $user->id, 'is_host' => true]);

        $this->actingAs($user);

        $response = $this->get(route('games.spy'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('games/Spy')
            ->has('games', 1)
            ->where('games.0.title', 'Operation Nightfall'));
    }

    public function test_spy_dashboard_lists_the_users_pending_invitations()
    {
        $user = User::factory()->create();
        $game = Game::factory()->create(['title' => 'Operation Schoolyard']);
        $inviter = User::factory()->create(['codename' => 'NIGHT_HAWK']);
        Invitation::factory()->create([
            'game_id' => $game->id,
            'from_user_id' => $inviter->id,
            'to_user_id' => $user->id,
            'status' => 'pending',
        ]);
        // A resolved invitation should NOT appear in the pending list.
        Invitation::factory()->create(['to_user_id' => $user->id, 'status' => 'declined']);

        $this->actingAs($user);

        $response = $this->get(route('games.spy'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('pendingInvitations', 1)
            ->where('pendingInvitations.0.game_title', 'Operation Schoolyard')
            ->where('pendingInvitations.0.from_codename', 'NIGHT_HAWK'));
    }
}
