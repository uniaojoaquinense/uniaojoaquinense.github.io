// ============================================================
// CONFIGURAÇÃO — preencha com os dados da sua planilha
// ============================================================
const API_KEY = 'AIzaSyAmW-hkAUHCnYc_4CIcN99HiNAlbc31-Qs';
const SPREADSHEET_ID = '14wrXo2lohTXepgApiqsSQNIzaNH1bvjMLOaCXK65hWU';
const SHEET_NAME = 'Sheet1';          // aba com os links
const SHEET_CONFIG = 'Sheet2';        // aba com as configurações visuais
const RANGE = `${SHEET_NAME}!A:F`;   // colunas A até F
const RANGE_CONFIG = `${SHEET_CONFIG}!A:B`; // chave | valor


// ============================================================
// DADOS MOCKADOS — usados enquanto a planilha não for configurada
// Remova ou deixe vazio após configurar SPREADSHEET_ID acima
// ============================================================
const MOCK_DATA = [
  // [categoria, ordem_cat, subcategoria, ordem_subcat, nome_link, url]
  ['Modelos', '1', '', '', 'Modelo de Indicação', 'https://drive.google.com/drive/folders/1gDLteGMZLD3FICia58WqMAX6iRosqebB?usp=sharing'],
  ['Modelos', '1', '', '', 'Modelo de Justificativa', 'https://drive.google.com/drive/folders/14Bzjd6yXrXeXgXZ59pKcHLmdKLHUz_BE?usp=drive_link'],
  ['Projetos', '2', '', '', 'Modelo de Plano de Ação', 'https://drive.google.com/drive/folders/108sYjwwfoMJe00KVRsNS7IMA0zBhN1Na?usp=sharing'],
  ['Projetos', '2', '', '', 'Projetos em Execução', 'https://drive.google.com/drive/folders/1dxyZoE040bc8i8cQfGT0l9faumsdMnq0?usp=sharing'],
  ['Projetos', '2', '', '', 'Projetos Finalizados', 'https://drive.google.com/drive/folders/1lPJQc625sP1C_dra9WoinbWwuC_PyhnZ?usp=sharing'],
  ['Secretaria', '3', '', '', 'Área do Escrivão', 'https://drive.google.com/drive/folders/15r6CyAQn6UE6gOANXflZRzUy2xVqAje7?usp=sharing'],
  ['Estudos', '4', '', '', 'Acervo de Conhecimento', 'https://drive.google.com/drive/folders/1haVXjqETVtgim8YwA0fnRMJzdH2W81Lw?usp=sharing'],
  ['Tesouraria', '5', '', '', '', ''],
];

// ============================================================
// FUNÇÕES PRINCIPAIS
// ============================================================

/**
 * Busca as configurações visuais da Sheet2.
 * Espera linhas no formato: [ chave, valor ]
 * Chaves esperadas: handle, facebook, instagram
 */
async function fetchConfig() {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE_CONFIG)}?key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return {};

    const data = await response.json();
    const rows = data.values || [];

    // Constrói objeto { chave: valor } ignorando a linha de cabeçalho
    const config = {};
    rows.forEach(row => {
      const chave = (row[0] || '').trim().toLowerCase();
      const valor = (row[1] || '').trim();
      if (chave && chave !== 'chave') config[chave] = valor;
    });
    return config;
  } catch (e) {
    console.warn('Não foi possível carregar configurações da Sheet2:', e);
    return {};
  }
}

/**
 * Converte um link de compartilhamento do Google Drive para URL direta de imagem.
 * Aceita os formatos:
 *   https://drive.google.com/file/d/FILE_ID/view?...
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID  (já é direto)
 * Retorna a mesma URL se não for do Drive.
 */
function converterUrlDrive(url) {
  if (!url) return url;

  // Formato: /file/d/ID/view
  const matchFile = url.match(/\/file\/d\/([^/?#]+)/);
  if (matchFile) {
    return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;
  }

  // Formato: open?id=ID ou uc?id=ID&...
  const matchId = url.match(/[?&]id=([^&]+)/);
  if (matchId && url.includes('drive.google.com')) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }

  return url; // URL de outro domínio, usa direto
}

/**
 * Aplica as configurações visuais no DOM.
 * Campos suportados na Sheet2:
 *   handle    → texto exibido abaixo da logo (sem o @)
 *   facebook  → URL do Facebook
 *   instagram → URL do Instagram
 *   logo      → URL de imagem para a logo (aceita links do Drive)
 */
function applyConfig(config) {
  // Handle (@usuario)
  const handleEl = document.getElementById('handle');
  if (handleEl && config.handle) {
    handleEl.textContent = '@' + config.handle.replace(/^@/, '');
  }

  // Facebook
  const fbEl = document.getElementById('link-facebook');
  if (fbEl && config.facebook) {
    fbEl.href = config.facebook;
  }

  // Instagram
  const igEl = document.getElementById('link-instagram');
  if (igEl && config.instagram) {
    igEl.href = config.instagram;
  }

  // Logo — converte link do Drive automaticamente se necessário
  const logoEl = document.getElementById('logo-img');
  if (logoEl && config.logo) {
    logoEl.src = converterUrlDrive(config.logo);
  }
  // favicon.ico fica como arquivo estático na raiz do repositório
}

/**
 * Busca dados da planilha via Google Sheets API v4.
 * Se SPREADSHEET_ID não foi configurado, usa MOCK_DATA.
 */
async function fetchLinks() {
  if (SPREADSHEET_ID === 'COLE_O_ID_DA_PLANILHA_AQUI') {
    console.info('Usando dados mockados. Configure SPREADSHEET_ID no script.js.');
    return MOCK_DATA;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro ao buscar planilha: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rows = data.values || [];

  // Remove a primeira linha se for cabeçalho (texto, não número)
  if (rows.length > 0 && isNaN(rows[0][1])) {
    rows.shift();
  }

  return rows;
}

/**
 * Agrupa as linhas em estrutura: { categoria: { subcategoria: [links] } }
 */
function agruparDados(rows) {
  const categorias = {};

  rows.forEach(row => {
    const categoria = (row[0] || '').trim();
    const ordemCat = parseInt(row[1]) || 99;
    const subcategoria = (row[2] || '').trim();
    const ordemSubcat = parseInt(row[3]) || 99;
    const nomeLink = (row[4] || '').trim();
    const url = (row[5] || '').trim();

    if (!categoria) return;

    if (!categorias[categoria]) {
      categorias[categoria] = { ordem: ordemCat, subcategorias: {} };
    }

    const chaveSubcat = subcategoria || '__sem_subcategoria__';

    if (!categorias[categoria].subcategorias[chaveSubcat]) {
      categorias[categoria].subcategorias[chaveSubcat] = { ordem: ordemSubcat, links: [] };
    }

    if (nomeLink && url) {
      categorias[categoria].subcategorias[chaveSubcat].links.push({ nome: nomeLink, url });
    }
  });

  return categorias;
}

/**
 * Gera o HTML dos acordeões e injeta no DOM.
 */
function buildAccordions(categorias) {
  const lista = document.getElementById('lista');
  lista.innerHTML = '';

  const catOrdenadas = Object.entries(categorias)
    .sort(([, a], [, b]) => a.ordem - b.ordem);

  catOrdenadas.forEach(([nomeCategoria, dadosCat]) => {
    const li = document.createElement('li');
    li.className = 'lista';

    const botao = document.createElement('button');
    botao.className = 'accordion';
    botao.innerHTML = `<big><b>${nomeCategoria}</b></big>`;

    const painel = document.createElement('div');
    painel.className = 'panel';

    const subcatsOrdenadas = Object.entries(dadosCat.subcategorias)
      .sort(([, a], [, b]) => a.ordem - b.ordem);

    subcatsOrdenadas.forEach(([chave, dadosSubcat]) => {
      if (chave === '__sem_subcategoria__') {
        // Links sem subcategoria: direto no painel
        dadosSubcat.links.forEach(link => {
          const a = document.createElement('a');
          a.className = 'linksgerais';
          a.href = link.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = link.nome;
          painel.appendChild(a);
        });
      } else {
        // Subcategoria: acordeão interno
        const botaoInner = document.createElement('button');
        botaoInner.className = 'accordion-inner';
        botaoInner.textContent = chave;

        const painelInner = document.createElement('div');
        painelInner.className = 'panel-inner';

        dadosSubcat.links.forEach(link => {
          const a = document.createElement('a');
          a.className = 'linksgerais';
          a.href = link.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = link.nome;
          painelInner.appendChild(a);
        });

        botaoInner.addEventListener('click', function () {
          this.classList.toggle('active');
          painelInner.style.display = painelInner.style.display === 'block' ? 'none' : 'block';
        });

        painel.appendChild(botaoInner);
        painel.appendChild(painelInner);
      }
    });

    botao.addEventListener('click', function () {
      this.classList.toggle('active');
      painel.style.display = painel.style.display === 'block' ? 'none' : 'block';
    });

    li.appendChild(botao);
    li.appendChild(painel);
    lista.appendChild(li);
  });
}

/**
 * Inicializa o carregamento da página.
 */
async function init() {
  const loading = document.getElementById('loading');
  const erro = document.getElementById('erro');

  // Busca configurações visuais (Sheet2) e links (Sheet1) em paralelo
  const [config, rows] = await Promise.allSettled([
    fetchConfig(),
    fetchLinks()
  ]);

  // Aplica configurações visuais
  if (config.status === 'fulfilled') {
    applyConfig(config.value);
  }

  // Renderiza os acordeões com os links
  try {
    const linhas = rows.status === 'fulfilled' ? rows.value : (() => { throw rows.reason; })();
    const categorias = agruparDados(linhas);
    buildAccordions(categorias);
    loading.style.display = 'none';
  } catch (e) {
    console.error(e);
    loading.style.display = 'none';
    erro.style.display = 'block';
  }
}

init();
