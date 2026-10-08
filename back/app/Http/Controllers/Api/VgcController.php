<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\Type;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class VgcController extends Controller
{
    /**
     * GET /api/vgc/rules
     * As regras de config/vgc.php, pro front montar a tela (limites de stat
     * points, naturezas, tamanho do time...) sem duplicar nada. Inclui a
     * tabela de tipos pra cobertura defensiva do time.
     */
    public function rules(): JsonResponse
    {
        return response()->json(['data' => [
            ...config('vgc'),
            'type_chart' => Type::orderBy('pokeapi_id')->pluck('damage_relations', 'name'),
        ]]);
    }

    /**
     * GET /api/items
     * Todos os itens seguráveis (são ~200, cabem numa resposta só e o front
     * filtra localmente no autocomplete).
     */
    public function items(): AnonymousResourceCollection
    {
        return ItemResource::collection(Item::orderBy('name')->get());
    }
}
