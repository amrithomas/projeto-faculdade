<?php

namespace App\Http\Middleware;

use App\Models\AccessToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware "silencioso": se vier um Bearer token válido no header
 * Authorization, autentica o usuário pro resto do request. Se não vier
 * nenhum (ou for inválido), simplesmente segue como visitante anônimo —
 * quem exige login de fato é o middleware RequireAuth. Fica na pilha da
 * API inteira porque rotas públicas (como /pokemons) também precisam
 * saber se tem um usuário logado, pra marcar is_favorited corretamente.
 */
class ResolveTokenUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $plainTextToken = $request->bearerToken();

        if ($plainTextToken) {
            $accessToken = AccessToken::resolveFromPlainText($plainTextToken);

            if ($accessToken) {
                Auth::setUser($accessToken->user);
                $accessToken->forceFill(['last_used_at' => now()])->save();
            }
        }

        return $next($request);
    }
}
