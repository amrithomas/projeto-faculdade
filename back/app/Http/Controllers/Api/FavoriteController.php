<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PokemonResource;
use App\Models\Pokemon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FavoriteController extends Controller
{
    /**
     * GET /api/favorites
     * Lista paginada dos pokémons favoritados pelo usuário logado, mais
     * recentes primeiro — é o que a tela de perfil exibe.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $perPage = (int) $request->query('per_page', 48);
        $perPage = max(12, min(200, $perPage));

        $pokemons = $user->favoritePokemons()
            ->with(['favoritedBy' => fn ($q) => $q->where('users.id', $user->id)])
            ->orderByPivot('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return PokemonResource::collection($pokemons);
    }

    /**
     * POST /api/pokemons/{pokemon}/favorite
     * Alterna o favorito (favorita se não tava, desfavorita se já tava) e
     * devolve o novo estado — mais simples pro front do que dois endpoints.
     */
    public function toggle(Request $request, Pokemon $pokemon): JsonResponse
    {
        $user = $request->user();

        $alreadyFavorited = $user->favoritePokemons()
            ->where('pokemon_id', $pokemon->id)
            ->exists();

        if ($alreadyFavorited) {
            $user->favoritePokemons()->detach($pokemon->id);
        } else {
            $user->favoritePokemons()->syncWithoutDetaching([$pokemon->id]);
        }

        return response()->json(['is_favorited' => ! $alreadyFavorited]);
    }
}
