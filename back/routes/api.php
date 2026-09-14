<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\PokemonController;
use Illuminate\Support\Facades\Route;

Route::get('/pokemons', [PokemonController::class, 'index']);
Route::get('/pokemons/{pokemon}', [PokemonController::class, 'show']);
Route::get('/types', [PokemonController::class, 'types']);
Route::get('/regions', [PokemonController::class, 'regions']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth.required')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/pokemons/{pokemon}/favorite', [FavoriteController::class, 'toggle']);
});
