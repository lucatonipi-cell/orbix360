# Orbix360 API

Todas as respostas são JSON. Autentica-te com a sessão do browser (cookie) ou,
para uso externo, com uma API key gerada em **Definições → API Keys**:

```
Authorization: Bearer orbix_xxxxxxxxxxxxxxxxxxxx
```

## Produtos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/products` | Lista os produtos do utilizador autenticado |
| POST | `/api/products` | Cria um produto — body: `{ name, description? }` |
| GET | `/api/products/:id` | Detalhe do produto + imagens |
| PUT | `/api/products/:id` | Atualiza `name`/`description` |
| DELETE | `/api/products/:id` | Elimina o produto, imagens e ficheiros associados |

## Ângulos / eixos ("rows")

Um produto 360º é composto por uma ou mais **rows**: cada row é um anel
horizontal de fotografias tiradas a uma altura/ângulo vertical diferente
(ex. "Nível", "De cima", "De baixo"). Um produto clássico de um único eixo
tem sempre exatamente uma row (criada automaticamente); um produto com
fotografias de vários eixos (X/Y/Z) tem várias rows, e o visualizador passa
a responder também ao arrasto vertical para alternar entre elas.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/products/:id/rows` | Lista as rows do produto, ordenadas |
| POST | `/api/products/:id/rows` | Cria uma row — body: `{ label: string }` |
| PATCH | `/api/products/:id/rows/reorder` | Reordena — body: `{ orderedIds: string[] }` |
| DELETE | `/api/products/:id/rows/:rowId` | Elimina a row e todas as suas imagens |

## Imagens

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/products/:id/images` | Lista as imagens do produto (ordenadas por row, depois por posição) |
| POST | `/api/products/:id/images` | Upload — `multipart/form-data`, campo `image` + campo opcional `row_id` (sem ele, usa/cria a row por omissão) |
| PATCH | `/api/products/:id/images/reorder` | Reordena dentro de uma row — body: `{ rowId: string, orderedIds: string[] }` |
| DELETE | `/api/products/:id/images/:imageId` | Remove uma imagem |

## Sequência 360º

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/products/:id/360` | Lê as definições da sequência |
| POST / PUT | `/api/products/:id/360` | Atualiza — body: `{ frame_count?, auto_rotate?, rotate_speed?, zoom_enabled?, fullscreen_enabled?, controls_enabled?, background? }` |

## Embed

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/products/:id/embed` | Devolve `{ embed, viewerUrl, iframe }` prontos a usar |
| PUT | `/api/products/:id/embed` | Atualiza `default_width`/`default_height`/`responsive` |

## Analytics (públicas, sem autenticação — chamadas pelo visualizador embutido)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/products/:id/analytics/view` | Regista uma visualização — body: `{ sessionId, device?, browser? }` |
| POST | `/api/products/:id/analytics/interaction` | Regista interação — body: `{ sessionId, kind: "rotate"\|"zoom"\|"fullscreen", device?, browser? }` |

## Erros

Respostas de erro seguem `{ "error": "mensagem" }` com o código HTTP
apropriado (400 validação, 401 não autenticado, 404 não encontrado/sem
permissão, 500 erro interno).
