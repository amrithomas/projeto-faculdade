# Pokédex — Projeto Acadêmico

Aplicação full stack desenvolvida como projeto de faculdade, composta por front-end em **React/TypeScript**, back-end em **Laravel** e banco de dados **MySQL**, com toda a infraestrutura orquestrada via **Docker**.

## Tecnologias Utilizadas

### Front-end

| Tecnologia | Finalidade |
|---|---|
| React 19 + TypeScript | Biblioteca de interface e tipagem estática |
| Vite | Bundler e servidor de desenvolvimento |
| MUI (Material UI) v6 + Emotion | Biblioteca de componentes de interface |
| Zustand | Gerenciamento de estado global (sessão de autenticação) |
| React Router v7 | Roteamento client-side |
| Axios | Cliente HTTP |

### Back-end

| Tecnologia | Finalidade |
|---|---|
| Laravel 12 | Framework da API REST |
| PHP 8.3 | Linguagem de execução |
| Autenticação via token | Implementação própria, análoga ao Laravel Sanctum, sem dependência externa |

### Banco de Dados

| Tecnologia | Finalidade |
|---|---|
| MySQL 8.4 | Persistência dos dados da aplicação |

### Infraestrutura

| Tecnologia | Finalidade |
|---|---|
| Docker / Docker Compose | Containerização e orquestração dos serviços |
| Nginx | Servidor web front-end da API (proxy para PHP-FPM) |
| phpMyAdmin | Interface administrativa do banco de dados |

## Arquitetura

```
pokedex-projeto/
├── back/                 # API Laravel
├── front/                # React + TypeScript + MUI
├── docker/
│   └── nginx/default.conf
├── docker-compose.yml
└── .env / .env.example   # credenciais do banco utilizadas pelo docker-compose
```

O front-end não realiza chamadas diretas a APIs externas. Toda comunicação ocorre exclusivamente com a API Laravel (`/api/...`), que consulta o banco MySQL local.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução (no Windows, com virtualização e WSL2 habilitados).

Não é necessária a instalação local de PHP, Composer, Node.js ou MySQL — todas as dependências são resolvidas dentro dos containers.

## Instalação e Execução

### Primeira execução

1. Clonar o repositório e acessar o diretório raiz do projeto.

2. No diretório raiz, criar o arquivo `.env` a partir de `.env.example`, caso não exista. Este arquivo contém as credenciais do MySQL utilizadas pelo `docker-compose.yml`.

3. No diretório `back/`, criar o arquivo `.env` a partir de `back/.env.example`, mantendo as credenciais de banco consistentes com o `.env` da raiz.

4. No diretório `front/`, criar o arquivo `.env` a partir de `front/.env.example`.

5. Construir e iniciar os containers:
   ```
   docker compose up --build
   ```

   Esse comando inicializa os seguintes serviços:

   | Serviço | Descrição | Endereço |
   |---|---|---|
   | `app` | PHP-FPM executando a aplicação Laravel | — |
   | `nginx` | Servidor web da API | http://localhost:8000 |
   | `mysql` | Banco de dados | localhost:3306 |
   | `front` | Servidor de desenvolvimento Vite | http://localhost:5173 |
   | `phpmyadmin` | Interface administrativa do banco | http://localhost:8080 |

   As migrations do banco de dados são executadas automaticamente na inicialização do container `app`.

6. Popular a base de dados. Existem duas formas:

   - **Sincronizando com a PokéAPI** (execução única; pode levar alguns minutos):
     ```
     docker compose exec app php artisan pokedex:sync --from=1 --limit=898
     ```
     O parâmetro `--limit` define o número de registros sincronizados. Para uma execução mais rápida, restrita à primeira geração, utilizar `--limit=151`.

   - **Restaurando o dump incluído no repositório** (`back/database/dump.sql`), mais rápido por não depender da PokéAPI:
     ```
     docker compose exec -T mysql mysql -u root -p pokedex < back/database/dump.sql
     ```
     O comando solicita a senha definida em `DB_ROOT_PASSWORD` no `.env` da raiz.

7. Sincronizar os itens seguráveis (usados no montador de times):
   ```
   docker compose exec app php artisan pokedex:sync-items
   ```

8. Acessar a aplicação em **http://localhost:5173**.

## Montagem de Times (VGC)

Usuários logados podem montar times em **Meus times** (menu do usuário), seguindo as regras do VGC 2026 (Pokémon Champions):

- Time com até 6 pokémons (com menos de 6 fica salvo como rascunho); nas batalhas em duplas, 4 são escolhidos.
- Todos os pokémons ficam no nível 50.
- **Species Clause**: sem dois pokémons com o mesmo número na dex nacional.
- **Item Clause**: nenhum item repetido.
- Sem IVs (todos fixos em 31). Os EVs são substituídos por **Stat Points**: 66 no total, no máximo 32 por stat.
- Cada membro tem habilidade, natureza, item opcional e de 1 a 4 golpes que o pokémon consegue aprender.
- No máximo **2 lendários restritos** (de capa: Mewtwo, Kyogre, Calyrex...) por time. Míticos são proibidos; os demais lendários contam como pokémons comuns.

As regras ficam em `back/config/vgc.php` (limite de restritos, lista de restritos, banidos, naturezas) e são validadas no back-end por `App\Services\VgcTeamValidator`. O front lê as mesmas regras em `GET /api/vgc/rules`.

> **Bases criadas antes desta funcionalidade** precisam rodar `pokedex:sync` de novo (para trazer todos os golpes aprendíveis, e não só os de level-up, além das flags de lendário/mítico) e `pokedex:sync-items`. O `dump.sql` do repositório ainda não tem esses dados.

### Execuções subsequentes

```
docker compose up -d
```

## Variáveis de Ambiente

| Arquivo | Variáveis relevantes |
|---|---|
| `.env` (raiz) | `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `DB_ROOT_PASSWORD` |
| `back/.env` | Configuração padrão do Laravel, incluindo `APP_KEY` e credenciais de banco consistentes com o `.env` da raiz |
| `front/.env` | `VITE_API_URL`, apontando para o endereço público da API (`http://localhost:8000/api` por padrão) |

## Comandos Úteis

```
docker compose down                              # encerra os containers
docker compose exec app php artisan migrate      # executa migrations manualmente
docker compose exec app php artisan migrate:status
docker compose exec app bash                     # abre um shell no container da aplicação
docker compose exec front npm install            # reinstala dependências do front-end
docker compose logs -f app                        # acompanha os logs do back-end
```

## Observação

O diretório `node_modules` do container `front` é mantido em um volume Docker nomeado, que não é atualizado automaticamente após alterações no `package.json`. Após a inclusão de uma nova dependência, é necessário executar:

```
docker compose exec front npm install
docker compose restart front
```
