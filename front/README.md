# Front — Pokédex (React + TypeScript + Vite + Tailwind)

Consome a API própria do Laravel (não a PokéAPI diretamente). Veja o README na raiz do projeto para instruções completas de setup via Docker.

## Rodando fora do Docker (opcional, pra dev local)

```
npm install
cp .env.example .env
npm run dev
```

Por padrão espera a API em `http://localhost:8000/api` (ajustável em `.env`, variável `VITE_API_URL`).
