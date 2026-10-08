<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Só o dono mexe no time. Time de outro usuário responde 404 (e não 403)
 * pra não revelar que o id existe.
 */
class TeamPolicy
{
    public function view(User $user, Team $team): Response
    {
        return (int) $team->user_id === (int) $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function update(User $user, Team $team): Response
    {
        return $this->view($user, $team);
    }

    public function delete(User $user, Team $team): Response
    {
        return $this->view($user, $team);
    }
}
