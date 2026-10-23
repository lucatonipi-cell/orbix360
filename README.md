# Orbix360

Plataforma de gestão de imagens de produto e visualização 360º. Ver
`ARCHITECTURE.md` para as decisões de arquitetura (inclui uma nota
importante sobre por que este projeto não usa Next.js/Prisma/Tailwind) e
`API.md` para a documentação da API.

## Requisitos

- Node.js 22+ (usa `node:sqlite`, nativo desde o Node 22.5)
- Nenhuma dependência externa a instalar — tudo corre com Node puro.

Se estiveres num ambiente **com** acesso normal à internet, o mais simples é
instalar as dependências reais em vez de depender dos symlinks incluídos:

```bash
npm install react react-dom sharp typescript tsx esbuild
```

(este repositório já inclui `node_modules/` com symlinks para uma
instalação global, para correr sem `npm install` no sandbox onde foi
desenvolvido — substitui por uma instalação normal em qualquer outro
ambiente.)

## Arrancar em desenvolvimento

```bash
npm run migrate       # cria a base de dados SQLite em data/orbix360.db
npm run build:client  # gera os bundles JS/CSS em public/assets
npm run dev           # arranca o servidor em http://localhost:3000
```

Ou tudo de uma vez: `npm run dev` já corre o build do cliente antes de
arrancar o servidor.

## Estrutura

Ver `ARCHITECTURE.md`, secção 2.

## Storage em produção

Por omissão os ficheiros são guardados em `uploads/` no disco local. Para
usar S3, Cloudflare R2 ou Supabase Storage, define:

```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://...
S3_BUCKET=...
S3_REGION=auto
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_PUBLIC_BASE_URL=https://cdn.exemplo.com   # opcional
```

## Testes

Não há dependências de teste instaladas, mas o fluxo completo (registo,
login, criação de produto, upload, sequência 360º, embed, visualizador
público, analytics, isolamento entre utilizadores, responsividade) foi
verificado end-to-end com Playwright durante o desenvolvimento.
