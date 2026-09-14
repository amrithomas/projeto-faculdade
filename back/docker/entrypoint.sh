#!/bin/sh
set -e

# Se o vendor/ ainda não existir no volume nomeado (primeira vez), instala.
if [ ! -f vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist --optimize-autoloader
fi

# No bind mount do Windows/WSL2 a dono/permissão dos arquivos pode não bater
# com o usuário que o php-fpm usa pra atender as requisições (www-data), o
# que quebra a escrita em storage/logs e bootstrap/cache. Reforça aqui a
# cada subida do container pra evitar "Permission denied" nesses diretórios.
chmod -R ugo+rwX storage bootstrap/cache

# O healthcheck do docker-compose pode dar "healthy" cedo demais (o MySQL
# sobe um servidor temporário só pra rodar os scripts de init, e o healthcheck
# às vezes responde nesse servidor temporário, não no definitivo). Por isso
# esperamos aqui, via TCP, até a conexão com o usuário/banco reais funcionar
# de verdade antes de rodar as migrations.
echo "Aguardando conexão com o MySQL (${DB_HOST:-mysql}:${DB_PORT:-3306})..."
attempt=0
max_attempts=60
until mysqladmin ping -h"${DB_HOST:-mysql}" -P"${DB_PORT:-3306}" --protocol=tcp -u"${DB_USERNAME}" -p"${DB_PASSWORD}" --silent >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "MySQL não respondeu após $max_attempts tentativas. Abortando."
        exit 1
    fi
    sleep 2
done
echo "MySQL disponível."

# Roda as migrations automaticamente a cada subida do container (idempotente).
php artisan migrate --force

exec "$@"
