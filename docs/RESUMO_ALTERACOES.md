# Resumo das Alterações — União Joaquinense / Campos dos Goytacazes

## Fase 1 — Site estático (Jul 2023 — Ago 2024)
- HTML, CSS e JS totalmente estáticos
- Conteúdo (links, redes sociais, título, brasão) **hardcoded** no HTML
- Categorias e subcategorias fixas no código
- Admin inexistente — qualquer alteração exigia editar o HTML manualmente

## Fase 2 — Google Sheets + Admin dinâmico (Fev 2026 — branch `autoaccordion`)
- **Carregamento dinâmico**: links lidos de uma planilha do Google Sheets via API REST
- **Admin panel** (`/admin/`): interface para CRUD de links com autenticação OAuth do Google
- **Accordion dinâmico**: categorias e subcategorias renderizadas automaticamente a partir dos dados
- **Slides**: suporte a slider de imagens configurado via Sheet2
- API key exposta diretamente no `script.js`

## Fase 3 — Generalização e Centralização (Fev/Mar 2026)

### 1. Arquivo `config.js` centralizado
- Todas as credenciais e parâmetros (CLIENT_ID, SHEET_ID, escopos, ranges) foram movidos para um único arquivo (`config.js`)
- Tanto o site principal quanto o admin consomem `CONFIG` desse arquivo
- Basta editar `config.js` para apontar para outra planilha/credenciais — sem precisar alterar `script.js` nem `admin/app.js`

### 2. Generalização do template
- Site deixou de ser exclusivo da "União Joaquinense"
- **Título**, **descrição meta**, **handle**, **redes sociais** e **logo** são agora configuráveis via Sheet2 (campos `nome`, `descricao`, `handle`, `facebook`, `instagram`, `logo`)
- Redes sociais só aparecem se preenchidas (antes ficavam fixas no HTML)
- Handle fica oculto se vazio
- Admin passou a exibir o nome da organização dinamicamente

### 3. Proxy nas chamadas à API
- Substituição do uso direto da API Key nas URLs (`?key=API_KEY`) por chamadas via **Cloudflare Worker** (proxy)
- A API Key não fica mais exposta no código-fonte do lado cliente
- Proxy configurado em `CONFIG.PROXY_URL`

### 4. Admin — novo sistema de reorganização por blocos
- Antes: ordenação manual de subcategorias e links via swap simples
- Agora: sistema baseado em **blocos** (cada subcategoria inteira ou link avulso é um bloco)
- Botões ↑↓ movem blocos completos e renumeração automática na planilha
- Subcategorias agora têm estilo visual próprio (seção com borda e destaque)
- Adicionados campos de **logo URL**, **slides dinâmicos** (adicionar/remover) na aba de configurações
- Campos de **nome** e **descrição** no admin (antes não existiam)

### 5. Limpeza de assets
- Imagens não utilizadas foram removidas do repositório (`123.jpeg`, `1614009494766(1).png`, calendários antigos, etc.)
- Mantido apenas `brasao.png` como logo padrão

## Guia de configuração para forks

Para aplicar estas atualizações em um fork (ex: `decimaquintasp.github.io`), siga os passos abaixo:

### Pré-requisitos
- Uma conta Google (Gmail)
- Acesso ao Google Sheets
- O repositório forkado clonado localmente

### Passo a passo

#### 1. Copiar os arquivos do template para o fork
Os seguintes arquivos DEVEM ser copiados do projeto original para o fork (substituindo os existentes):
- `config.js` — configuração centralizada
- `index.html` — template dinâmico
- `script.js` — lógica de carregamento via proxy
- `style.css` — estilos completos
- `admin/` — pasta inteira com o painel admin
- `favicon.ico` — para a raiz do fork

Manter do fork original:
- `imgs/` — as imagens específicas do capítulo (logo, slides, etc.)

#### 2. Criar a planilha do Google Sheets
Crie uma nova planilha no Google Sheets com duas abas:

**Sheet1 — Links**
| Categoria | Ordem Cat | Subcategoria | Ordem Subcat | Nome do Link | URL |
|---|---|---|---|---|---|
| Documentos | 1 | | | Modelo de Indicação | https://drive.google.com/... |
| Documentos | 1 | Modelos | 1 | Modelo A | https://... |
| Documentos | 1 | Modelos | 2 | Modelo B | https://... |
| Editais | 2 | Gabinete Nacional | 1 | Capítulos | https://... |

Colunas:
- `A`: Nome da categoria
- `B`: Ordem da categoria (número)
- `C`: Nome da subcategoria (opcional — deixe vazio se não tiver)
- `D`: Ordem da subcategoria (número, usado também para ordenar links avulsos)
- `E`: Nome do link
- `F`: URL do link

**Sheet2 — Configurações**
| Chave | Valor |
|---|---|
| nome | Nome da Organização |
| descricao | Descrição do site (meta description) |
| handle | redesocial (sem @) |
| facebook | https://facebook.com/... |
| instagram | https://instagram.com/... |
| logo | https://drive.google.com/file/d/.../view (ou URL direta) |
| slide1 | https://drive.google.com/file/d/.../view |
| slide2 | https://... |

Campos opcionais: `facebook`, `instagram`, `logo`, `slide1`..`slideN`. Se não preenchidos, o elemento não aparece no site.

#### 3. Configurar o `config.js`
Edite o arquivo `config.js` na raiz do fork:

```js
const CONFIG = {
    PROXY_URL: 'https://seu-worker.workers.dev',  // URL do seu Cloudflare Worker (ou use o existente)
    CLIENT_ID: 'SEU_CLIENT_ID_OAUTH',             // ID do cliente OAuth do Google Cloud
    SHEET_ID: 'ID_DA_SUA_PLANILHA',               // ID da planilha (extraído da URL)
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets profile email',
    SHEET_LINKS: 'Sheet1',
    SHEET_CONFIG: 'Sheet2',
    RANGE_LINKS: 'Sheet1!A:F',
    RANGE_CONFIG: 'Sheet2!A:B',
};
```

**Onde encontrar cada informação:**
- `SHEET_ID`: Na URL da planilha: `https://docs.google.com/spreadsheets/d/**[ID_AQUI]**/edit`
- `CLIENT_ID`: Criar em https://console.cloud.google.com → APIs e Serviços → Credenciais → Criar ID de cliente OAuth (Tipo: Aplicativo Web)
- `PROXY_URL`: Opção 1 — usar o proxy existente (já configurado no template). Opção 2 — criar seu próprio Cloudflare Worker (ver seção abaixo)

#### 4. Criar seu próprio proxy (Cloudflare Worker — opcional)
Se quiser seu próprio proxy em vez de usar o existente:

1. Crie uma conta em https://cloudflare.com
2. Vá em Workers & Pages → Criar aplicação → Criar Worker
3. Cole o código abaixo e faça deploy:

```js
// Cloudflare Worker — proxy para Google Sheets API
// A SHEET_ID fica embutida no worker, nunca exposta no frontend
const SHEET_ID = 'ID_DA_SUA_PLANILHA';
const API_KEY = 'SUA_API_KEY_GOOGLE';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || 'Sheet1!A:F';
    
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
    
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
```

4. Em `config.js`, coloque a URL do worker em `PROXY_URL`

#### 5. Publicar o site
Faça push do repositório forkado para o GitHub. O GitHub Pages publica automaticamente na URL `https://[seu-usuario].github.io/[repositorio]/`.

O admin fica em: `https://[seu-usuario].github.io/[repositorio]/admin/`

### Arquitetura final do repositório
```
raiz/
├── admin/
│   ├── app.js          # Lógica do painel admin
│   ├── index.html      # Interface do admin
│   ├── manifest.json   # PWA manifest
│   ├── style.css       # Estilos do admin (tema escuro)
│   └── sw.js           # Service Worker (cache do admin)
├── imgs/               # Imagens do capítulo (logo, slides, etc.)
├── config.js           # ⬅️ ÚNICO arquivo que precisa editar
├── favicon.ico
├── index.html          # Template dinâmico — não precisa editar
├── script.js           # Lógica do site — não precisa editar
└── style.css           # Estilos do site — não precisa editar
```

Após configurar a planilha e o `config.js`, o site funciona sem nenhuma alteração adicional nos arquivos HTML/JS/CSS.

## Resumo técnico
| Aspecto | Antes | Depois |
|---|---|---|
| Configurações | Espalhadas em múltiplos arquivos | Centralizado em `config.js` |
| Template | Fixo "União Joaquinense" | Genérico (configurável por planilha) |
| API Key | Exposta no frontend | Via proxy (Cloudflare Worker) |
| Ordenação | Swap simples entre links | Blocos com renumeração automática |
| Admin - Config | Apenas handle + redes sociais | Nome, descrição, logo, slides ilimitados |
| Imagens | Várias não utilizadas | Limpeza, só o essencial |
