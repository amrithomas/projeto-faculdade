# Pokédex — Projeto de Faculdade

Projeto full stack: **React + TypeScript** (front), **Laravel** (back), **MySQL** (banco), tudo orquestrado com **Docker**.

Funcionalidade implementada até aqui: **Pokédex pública** (sem login) — lista, busca por nome, filtro por tipo, paginação e página de detalhe de cada pokémon, com os dados sincronizados da [PokéAPI](https://pokeapi.co) para o nosso próprio banco MySQL.

Próximas funcionalidades planejadas: login/cadastro de usuário (Sanctum) e montador de time (Team Builder).

## Arquitetura

```
projeto-faculdade/
├── back/                  # API Laravel
│   ├── app/Services/PokeApiService.php     # consome a PokéAPI
│   ├── app/Console/Commands/SyncPokedex.php # sincroniza PokéAPI -> MySQL
│   ├── app/Http/Controllers/Api/PokemonController.php
│   └── ...
├── front/                 # React + TypeScript + Tailwind
│   └── src/
│       ├── api/           # cliente axios + chamadas à API do back
│       ├── pages/          # Pokedex, PokemonDetail
│       └── components/
├── docker/
│   └── nginx/default.conf
├── docker-compose.yml
└── .env / .env.example     # variáveis do docker-compose (banco)
```

O front **nunca** chama a PokéAPI diretamente. Ele chama a nossa própria API Laravel (`/api/pokemons`), que lê do MySQL. Quem fala com a PokéAPI é só o backend, através do comando de sincronização (`pokedex:sync`) — isso evita bater o rate limit da API externa toda vez que alguém acessa a Pokédex, e é o motivo de existir uma tabela `pokemons` no nosso banco.

## Pré-requisitos

- Docker Desktop instalado e rodando (com virtualização habilitada no Windows/BIOS).

Não precisa ter PHP, Composer, Node nem MySQL instalados na máquina — tudo roda dentro dos containers.

## Como rodar

1. Na raiz do projeto, confirme que existe o arquivo `.env` (se não existir, copie `.env.example` para `.env` — ele só tem as credenciais do MySQL usadas pelo docker-compose).

2. Dentro de `back/`, confirme que existe o arquivo `.env` (se não existir, copie `back/.env.example` para `back/.env`). Gere uma `APP_KEY` nova se for zerar o projeto:
   ```
   docker compose run --rm app php artisan key:generate
   ```

3. Suba os containers (a primeira vez demora um pouco: baixa as imagens, instala as dependências do PHP e do Node):
   ```
   docker compose up --build
   ```

   Isso sobe:
   - `app` — PHP-FPM rodando o Laravel
   - `nginx` — serve a API em **http://localhost:8000**
   - `mysql` — banco de dados na porta 3306
   - `front` — servidor de desenvolvimento do Vite em **http://localhost:5173**
   - `phpmyadmin` — interface web pro banco em **http://localhost:8080** (login: `root` / senha definida em `.env`)

   As migrations rodam automaticamente toda vez que o container `app` sobe.

4. Popule a Pokédex (só precisa rodar uma vez; demora ~1 min para os 151 pokémons da geração 1, porque bate na PokéAPI um por um):
   ```
   docker compose exec app php artisan pokedex:sync
   ```
   Para sincronizar mais pokémons: `docker compose exec app php artisan pokedex:sync --limit=251` (vai até a geração 2), etc.

5. Acesse **http://localhost:5173** — a Pokédex já deve estar funcionando.

## Comandos úteis

```
docker compose down                          # para os containers
docker compose exec app php artisan migrate  # roda migrations manualmente
docker compose exec app bash                 # abre um shell no container do Laravel
docker compose logs -f app                    # acompanha os logs do backend
```

## API

| Método | Rota                  | Descrição                                      |
|--------|-----------------------|--------------------------------------------------|
| GET    | `/api/pokemons`       | Lista paginada. Query params: `search`, `type`, `page` |
| GET    | `/api/pokemons/{id}`  | Detalhe de um pokémon                            |
| GET    | `/api/types`          | Tipos distintos disponíveis (para o filtro)      |

## Stack

- **Front:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Axios
- **Back:** Laravel 12, PHP 8.3
- **Banco:** MySQL 8.4
- **Infra:** Docker + docker-compose (nginx como servidor web na frente do PHP-FPM)
