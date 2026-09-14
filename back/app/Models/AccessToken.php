<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AccessToken extends Model
{
    protected $fillable = ['user_id', 'token', 'last_used_at'];

    protected $casts = [
        'last_used_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Gera um novo token pra um usuário, salva só o hash no banco (assim
     * como o Sanctum faz) e devolve o valor em texto puro, que é enviado
     * uma única vez pro cliente — a partir daí só existe o hash.
     */
    public static function issueFor(User $user): string
    {
        $plainTextToken = Str::random(64);

        $user->accessTokens()->create([
            'token' => hash('sha256', $plainTextToken),
        ]);

        return $plainTextToken;
    }

    public static function resolveFromPlainText(string $plainTextToken): ?self
    {
        return static::where('token', hash('sha256', $plainTextToken))->first();
    }
}
