FROM php:8.3-fpm

RUN apt-get update && apt-get install -y \
        git \
        unzip \
        libzip-dev \
        libpng-dev \
        libonig-dev \
        default-mysql-client \
    && docker-php-ext-install pdo pdo_mysql mbstring zip gd \
    && rm -rf /var/lib/apt/lists/*

# Composer (imagem oficial, só copiamos o binário)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-interaction --prefer-dist --optimize-autoloader \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x docker/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["php-fpm"]
