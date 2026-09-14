<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AccessToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/auth/register
     * Cadastro simplificado: só usuário e senha.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'min:3', 'max:32', 'alpha_dash', 'unique:users,username'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::create([
            'username' => $data['username'],
            'name' => $data['username'],
            'password' => Hash::make($data['password']),
        ]);

        $token = AccessToken::issueFor($user);

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    /**
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', $data['username'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Usuário ou senha inválidos.'],
            ]);
        }

        $token = AccessToken::issueFor($user);

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    /**
     * POST /api/auth/logout
     * Revoga só o token usado nesse request (não desloga os outros dispositivos).
     */
    public function logout(Request $request): JsonResponse
    {
        $plainTextToken = $request->bearerToken();

        if ($plainTextToken) {
            AccessToken::resolveFromPlainText($plainTextToken)?->delete();
        }

        return response()->json(['message' => 'Sessão encerrada.']);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }
}
