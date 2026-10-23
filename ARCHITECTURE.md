# Orbix360 — Arquitetura

Plataforma SaaS de gestão de imagens de produto e visualização 360º, inspirada
no conceito do Sirv, com identidade, código e implementação próprios.

## 0. Nota sobre o ambiente e desvio de stack

O ambiente de desenvolvimento (sandbox) não tem acesso de rede a nenhum
registo de pacotes — `registry.npmjs.org`, PyPI, apt, GitHub e Docker Hub
devolvem `403 host_not_allowed` a partir daqui. Não é possível correr
`npm install`, `pip install` ou `apt install`. Isto impede o uso de Next.js,
Prisma, Tailwind CLI, NextAuth, drivers de PostgreSQL para Node, bcrypt, zod,
etc., tal como pedido na secção "Tecnologia" do briefing original.

**Alternativa funcional implementada**, usando apenas o que já está
pré-instalado e verificado a funcionar neste ambiente:

| Requisito original      | Substituto funcional                                   |
|--------------------------|----------------------------------------------------------|
| Next.js (framework)      | Servidor HTTP próprio em Node/TypeScript + router modular |
| React                    | React + react-dom (já instalados) — SSR + hidratação      |
| Bundler do Next.js       | `esbuild` (encontrado como dependência do `tsx`)          |
| Tailwind CSS             | Sistema de design CSS próprio (tokens, escala, componentes) — também evita depender de um CDN externo que não seria fiável para testar dentro deste sandbox |
| Prisma + PostgreSQL      | `node:sqlite` (nativo do Node 22) + camada de repositórios equivalente a um ORM |
| bcrypt                   | `crypto.scrypt` (nativo do Node)                          |
| zod                      | Validadores próprios, tipados em TypeScript                |
| AWS SDK (S3)             | Cliente S3-compatível próprio (assinatura SigV4 com `crypto`+`https`) |

Esta é uma decisão de arquitetura reversível: a camada de dados usa um
padrão de repositório (`src/db/repositories`) e a camada de storage usa um
adaptador (`src/lib/storage`), precisamente para que, num ambiente com
acesso normal à internet, seja simples trocar `node:sqlite` por
PostgreSQL+Prisma e o servidor próprio por Next.js, sem tocar na lógica de
negócio. O schema SQL abaixo espelha deliberadamente o modelo Prisma pedido.

Tudo o resto do briefing (funcionalidades, fluxos, modelo de dados, UX) é
implementado tal como pedido, com código real e testado, não simulado.

## 1. Stack técnica

- **Runtime**: Node.js 22 + TypeScript, executado via `tsx`
- **Servidor HTTP**: router próprio sobre `node:http` (`src/server`)
- **UI**: React 19 — páginas renderizadas no servidor (SSR) + "ilhas"
  interativas hidratadas no cliente (Viewer360, uploader, timeline de frames)
- **Bundling do cliente**: `esbuild` via `scripts/build-client.ts`
- **Base de dados**: `node:sqlite` (ficheiro em `data/orbix360.db`)
- **Storage de imagens**: adaptador local (`uploads/`) pronto para trocar
  por S3/R2/Supabase Storage via variáveis de ambiente
- **Processamento de imagens**: `sharp` (thumbnail/medium/large/original,
  conversão para WebP)
- **Autenticação**: sessões por cookie assinado + `crypto.scrypt`
- **Testes**: Playwright (Chromium local) para verificação end-to-end real

## 2. Estrutura de pastas

```
/src
  /server        servidor HTTP, router, middleware, rotas (páginas + API)
  /db            ligação à BD, schema SQL, repositórios (equivalente a ORM)
  /lib
    /auth        hashing de password, sessões
    /storage     StorageAdapter (interface) + Local + S3-compatible
    /image-processing  pipeline sharp, deteção/ordenação de sequência 360
    /validation  validadores de input
  /components    componentes React reutilizáveis (Viewer360, ProductCard, ...)
  /pages         páginas React renderizadas no servidor
  /client        pontos de entrada para bundles do lado do cliente
  /styles        sistema de design CSS
/uploads         ficheiros de imagem (dev); trocar por bucket em produção
/data            base de dados SQLite (dev)
/public/assets   bundles JS/CSS gerados
```

## 3. Modelo de dados

Equivalente ao modelo Prisma pedido, implementado em SQL:

- **users**: id, email (único), password_hash, name, created_at
- **sessions**: id (token), user_id, expires_at, created_at
- **products**: id, user_id, name, slug (único por utilizador), description,
  status (`draft`|`processing`|`ready`), cover_image_id, created_at, updated_at
- **sequence_rows**: id, product_id, label (ex. "Nível", "De cima"),
  row_order, created_at — um anel horizontal de frames capturado a um
  ângulo/altura vertical (ver secção 6.1)
- **images**: id, product_id, row_id (→ sequence_rows), filename,
  original_url, thumbnail_url, medium_url, large_url, width, height,
  file_size, sort_order, created_at
- **sequences_360**: id, product_id (único), frame_count, auto_rotate,
  rotate_speed (`slow`|`normal`|`fast`), zoom_enabled, fullscreen_enabled,
  controls_enabled, background, created_at, updated_at
- **embed_settings**: id, product_id (único), default_width, default_height,
  responsive, created_at
- **api_keys**: id, user_id, name, key_hash, key_prefix, created_at, last_used_at
- **analytics_events**: id, product_id, event_type (`view`|`rotate`|`zoom`|
  `fullscreen`), session_id, device, browser, created_at
- **analytics_sessions**: id, product_id, started_at, ended_at,
  rotation_count, device, browser (para tempo médio de visualização)

Relações: `User 1—N Product 1—N SequenceRow 1—N Image`, `Product 1—1 Sequence360`,
`Product 1—1 EmbedSettings`, `User 1—N ApiKey`, `Product 1—N AnalyticsEvent`.

## 4. Fluxo de autenticação

1. Registo: email + password → validação → `scrypt(password, salt)` →
   utilizador criado.
2. Login: valida hash → cria sessão (token aleatório de 256 bits) → cookie
   `httpOnly`, `SameSite=Lax`, com expiração de 30 dias.
3. Middleware `requireAuth` valida o cookie em cada rota privada e injecta
   `req.user`; todas as queries de produtos/imagens filtram por `user_id`,
   garantindo isolamento entre utilizadores.
4. Logout: apaga a sessão da BD e limpa o cookie.
5. Recuperação de password: gera token de reset com expiração de 1h. Como
   este sandbox não tem acesso a um serviço de email (rede bloqueada), o
   link de reset é apresentado diretamente na interface (em produção seria
   enviado por email via um provedor como Resend/SendGrid) — o fluxo em si
   (pedir reset → validar token → definir nova password) é real e funcional.

## 5. Fluxo de upload e processamento

1. Utilizador arrasta/seleciona ficheiros → upload em `multipart/form-data`
   para `POST /api/products/:id/images`, um pedido por imagem, com barra de
   progresso individual e geral no cliente.
2. Servidor valida tipo (JPG/PNG/WEBP) e tamanho, grava o original em
   `uploads/{userId}/{productId}/originals/`.
3. `sharp` gera 3 variantes adicionais em WebP: `thumbnail` (320px),
   `medium` (1024px), `large` (2048px), preservando o original.
4. Metadados (dimensões, tamanho, URLs) são guardados na tabela `images`;
   `sort_order` inicial vem da ordenação natural do nome do ficheiro.
5. Resposta ao cliente inclui as URLs das variantes para preview imediato.

## 6. Deteção e ordenação da sequência 360º

- Ordenação natural (numérica, não lexicográfica): extrai o(s) grupo(s) de
  dígitos do nome do ficheiro e compara numericamente, para que
  `img2 < img10` (em vez de `img10 < img2` como aconteceria lexicograficamente).
- Deteção automática de sequência: se um produto tiver ≥ 8 imagens cujos
  nomes partilham um prefixo comum e uma numeração sequencial (com no máximo
  um "salto" tolerado), o sistema propõe automaticamente criar uma
  sequência 360º com esse número de frames.
- Reordenação manual: drag & drop na timeline de frames → `PATCH` que
  atualiza `sort_order` de todas as imagens afetadas numa transação.

### 6.1 Múltiplos eixos (X/Y/Z) — "rows"

Um produto pode ter uma ou várias **rows** (anéis horizontais de frames a
uma altura/ângulo diferente — ex. "Nível", "De cima", "De baixo"). Um
produto clássico de um único eixo tem sempre uma row criada automaticamente
(`sequenceRowsRepo.ensureDefault`), pelo que este modelo é 100%
retrocompatível: produtos já existentes continuam a funcionar sem alteração
visível.

- No editor, cada row tem o seu próprio uploader e a sua própria timeline de
  frames — o utilizador escolhe/cria a row antes de carregar as fotografias
  desse ângulo ("upload separado por grupo"), em vez de o sistema tentar
  adivinhar o ângulo a partir do nome do ficheiro.
- `sort_order` e a ordenação natural por filename são calculados **por row**
  — carregar mais frames para um ângulo nunca reordena os frames já
  organizados noutro ângulo.
- Migração: como a tabela `images` já existia em bases de dados live
  (incluindo a instância publicada), a coluna `row_id` é adicionada de forma
  aditiva e idempotente no arranque do servidor (`runAdditiveMigrations` em
  `src/db/client.ts`), que também cria a row por omissão e associa a ela as
  imagens já existentes de cada produto — não é necessária qualquer ação
  manual ao atualizar a instância em produção.

## 7. Visualizador 360º

Componente `<Viewer360 />`, sem dependências externas:

- Mantém o índice do frame atual em estado React.
- `pointerdown` + `pointermove` (cobre rato e touch) mede o deslocamento
  horizontal acumulado; a cada N pixels arrastados avança/recua um frame
  (arrastar para a direita → ordem decrescente; para a esquerda →
  crescente, conforme pedido).
- Pré-carrega os frames vizinhos ao atual (preload em janela deslizante)
  para rotação suave sem saltos.
- Zoom: `wheel`/pinch aplica `transform: scale()` centrado no ponto do cursor.
- Fullscreen: Fullscreen API nativa do browser.
- Auto-rotate: `setInterval` configurável (slow/normal/fast), pausa ao
  interagir.
- Resolução por viewport: escolhe `thumbnail`/`medium`/`large` consoante a
  largura do contentor no momento do render (evita carregar imagens grandes
  em ecrãs pequenos).
- Múltiplos eixos: quando o produto tem mais do que uma row com frames, o
  componente também escuta `pointermove` na vertical. O primeiro gesto de
  arrasto decide o eixo dominante (horizontal vs. vertical) e fica "preso"
  a esse eixo até se largar o rato/dedo, para que rodar o produto não mude
  de ângulo por acidente. Ao mudar de row, o índice do frame é mapeado
  proporcionalmente (mesmo ângulo de rotação relativo) mesmo que os anéis
  tenham números de frames diferentes. Um indicador de pontos no canto
  mostra a row ativa e permite saltar diretamente para outra.

## 8. Embed

- `GET /viewer/:productId` — página pública, sem sidebar/dashboard, apenas
  o `<Viewer360 />` a full-bleed, lida as definições de `sequences_360`.
- Página do produto mostra o código `<iframe>` pronto, com opções de
  largura/altura e alternativa "responsive" (`width:100%` + `aspect-ratio`).
- Cada visualização pública regista um evento `analytics_events` (tipo
  `view`) e agrega interações (`rotate`, `zoom`, `fullscreen`) por sessão.

## 9. Storage

`StorageAdapter` (interface) com dois métodos-chave: `put(key, buffer,
contentType) → url` e `delete(key)`. Implementações:

- `LocalStorageAdapter`: grava em `uploads/` e serve via rota estática —
  usado neste ambiente de desenvolvimento.
- `S3CompatibleStorageAdapter`: assina pedidos com AWS Signature V4 (usando
  apenas `crypto`/`https` nativos, sem SDK) — compatível com AWS S3,
  Cloudflare R2 e Supabase Storage (todos expõem a mesma API S3). Ativado
  por variáveis de ambiente (`STORAGE_DRIVER=s3`, `S3_ENDPOINT`,
  `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`). Não é a opção por
  omissão (sem rede de saída para testar contra um bucket real neste
  sandbox), mas o código está pronto e documentado.

Nunca se guardam imagens na base de dados — apenas metadados e URLs.

## 10. Performance

- 4 resoluções por imagem (thumbnail/medium/large/original), WebP por omissão.
- `<img loading="lazy">` em grelhas de produtos/imagens.
- Preload inteligente de frames vizinhos no Viewer360.
- Cache-Control de longa duração para ficheiros de `uploads/` e `public/assets`
  (nomes com hash de conteúdo).
- Bundles do cliente por página (code-splitting manual via múltiplos
  entry-points do esbuild) em vez de um bundle único.

## 11. Segurança

- Passwords: `scrypt` com salt aleatório por utilizador, nunca em texto simples.
- Sessões: token opaco de 256 bits, cookie `httpOnly` + `SameSite=Lax`.
- Autorização: toda a query a `products`/`images`/`sequences_360` filtra por
  `user_id` do pedido autenticado; tentativa de aceder a recurso de outro
  utilizador devolve 404 (não 403, para não confirmar existência).
- Validação de input em todas as rotas de escrita (tipos, tamanhos, limites).
- Rotas da API protegidas por `API key` (para uso externo) ou sessão
  (para o próprio painel).
- Uploads: validação de tipo MIME real (via assinatura do ficheiro, não
  apenas extensão) e limite de tamanho.

## 12. Ordem de implementação (incremental)

1. Fundação: servidor, router, BD, migrações, sistema de estilos base.
2. Autenticação completa.
3. Storage + processamento de imagens.
4. API de produtos/imagens/360/embed.
5. Componente Viewer360 + página pública `/viewer/[id]`.
6. Interface: dashboard, produtos, uploader, editor 360, embed, definições.
7. Analytics + verificação end-to-end real (Playwright) de todo o fluxo.
