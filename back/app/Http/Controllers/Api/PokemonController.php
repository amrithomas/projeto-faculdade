<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PokemonDetailResource;
use App\Http\Resources\PokemonResource;
use App\Models\Pokemon;
use App\Models\Type;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PokemonController extends Controller
{
    /**
     * GET /api/pokemons?search=&type=&region=&generation=&per_page=&page=
     * Lista paginada, com busca por nome e filtros por tipo/região/geração.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Pokemon::query()->orderBy('pokedex_number');

        if ($user = $request->user()) {
            $query->with(['favoritedBy' => fn ($q) => $q->where('users.id', $user->id)]);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        if ($type = $request->query('type')) {
            $query->whereJsonContains('types', $type);
        }

        if ($region = $request->query('region')) {
            $query->where('region', $region);
        }

        if ($generation = $request->query('generation')) {
            $query->where('generation', $generation);
        }

        // Limitado a 200 pra não deixar alguém pedir a dex inteira numa
        // página só e pesar a resposta/lista sem necessidade.
        $perPage = (int) $request->query('per_page', 48);
        $perPage = max(12, min(200, $perPage));

        $pokemons = $query->paginate($perPage)->withQueryString();

        return PokemonResource::collection($pokemons);
    }

    /**
     * GET /api/pokemons/{pokemon}
     */
    public function show(Request $request, Pokemon $pokemon): PokemonDetailResource
    {
        // A linha evolutiva completa (Pokemon::evolutionFamily()) anda pela
        // relação preEvolution/evolutions sozinha, então só precisamos dar
        // eager load do que o resource acessa direto no próprio pokémon.
        $pokemon->load(['abilities', 'moves']);

        if ($user = $request->user()) {
            $pokemon->load(['favoritedBy' => fn ($q) => $q->where('users.id', $user->id)]);
        }

        return new PokemonDetailResource($pokemon);
    }

    /**
     * GET /api/types
     * Lista os 18 tipos, pro filtro do front.
     */
    public function types(): JsonResponse
    {
        return response()->json(['data' => Type::orderBy('name')->pluck('name')]);
    }

    /**
     * GET /api/regions
     * Lista as regiões (uma por geração) presentes na base local, na ordem
     * em que apareceram nos jogos — pro filtro/toggle de dex regional.
     */
    public function regions(): JsonResponse
    {
        $regions = Pokemon::query()
            ->selectRaw('region, generation')
            ->whereNotNull('region')
            ->groupBy('region', 'generation')
            ->orderBy('generation')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->region,
                'generation' => $row->generation,
            ]);

        return response()->json(['data' => $regions]);
    }
}
