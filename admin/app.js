// ═══════════════════════════════════════════════════════
// Configuração
// ═══════════════════════════════════════════════════════
const CLIENT_ID = '897683631001-ugml9ertq7bldbtmsugcejhitav6l4dp.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAmW-hkAUHCnYc_4CIcN99HiNAlbc31-Qs';
const SHEET_ID = '14wrXo2lohTXepgApiqsSQNIzaNH1bvjMLOaCXK65hWU';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets profile email';

const RANGE_LINKS = 'Sheet1!A:F';
const RANGE_CONFIG = 'Sheet2!A:B';

// ═══════════════════════════════════════════════════════
// Estado
// ═══════════════════════════════════════════════════════
let accessToken = null;
let todosLinks = [];     // [{linha, categoria, ordemCat, subcategoria, ordemSubcat, nomeLink, url}]
let modoModal = null;   // 'adicionar' | 'editar'
let linhaEditar = null;
let modoReorganizar = false;

// ═══════════════════════════════════════════════════════
// Auth — Google Identity Services (token model)
// ═══════════════════════════════════════════════════════
let tokenClient;

function initTokenClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
            if (resp.error) { toast('Erro no login: ' + resp.error, 'error'); return; }
            accessToken = resp.access_token;
            onLoginSuccess();
        },
    });
}

function handleLogin() {
    if (!tokenClient) initTokenClient();
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function handleLogout() {
    if (accessToken) google.accounts.oauth2.revoke(accessToken);
    accessToken = null;
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('painel').style.display = 'none';
}

async function onLoginSuccess() {
    // Pegar info do usuário
    try {
        const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const u = await r.json();
        document.getElementById('user-avatar').src = u.picture || '';
    } catch (_) { }

    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('painel').style.display = 'block';
    await carregarLinks();
    await carregarConfig();
}

// ═══════════════════════════════════════════════════════
// API helpers
// ═══════════════════════════════════════════════════════
function sheetsUrl(range, params = '', suffix = '') {
    return `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}${suffix}${params}`;
}

function authHeaders() {
    return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

// ═══════════════════════════════════════════════════════
// CRUD — Links (Sheet1)
// ═══════════════════════════════════════════════════════
async function carregarLinks() {
    const loadEl = document.getElementById('links-loading');
    loadEl.style.display = 'flex';

    try {
        const r = await fetch(sheetsUrl(RANGE_LINKS), { headers: authHeaders() });
        const data = await r.json();
        const rows = data.values || [];

        todosLinks = [];
        rows.forEach((row, i) => {
            if (i === 0 && isNaN(row[1])) return; // Header
            const nome = (row[4] || '').trim();
            const url = (row[5] || '').trim();
            if (!nome && !url && !(row[0] || '').trim()) return;
            todosLinks.push({
                linha: i + 1,
                categoria: (row[0] || '').trim(),
                ordemCat: Number(row[1]) || 99,
                subcategoria: (row[2] || '').trim(),
                ordemSubcat: Number(row[3]) || 99,
                nomeLink: nome,
                url: url
            });
        });

        renderizarLinks(todosLinks);
    } catch (e) {
        toast('Erro ao carregar links: ' + e.message, 'error');
    } finally {
        loadEl.style.display = 'none';
    }
}

function renderizarLinks(links) {
    const container = document.getElementById('links-lista');
    const vazio = document.getElementById('links-vazio');

    if (links.length === 0) {
        container.innerHTML = '';
        vazio.style.display = 'block';
        return;
    }
    vazio.style.display = 'none';

    // Agrupar por categoria, com subcats ordenadas
    const grupos = {};
    links.forEach(l => {
        if (!grupos[l.categoria]) grupos[l.categoria] = { ordemCat: l.ordemCat, links: [] };
        grupos[l.categoria].links.push(l);
    });
    // Ordenar links dentro de cada categoria por ordemSubcat e depois por linha
    Object.values(grupos).forEach(g => {
        g.links.sort((a, b) => (a.ordemSubcat || 99) - (b.ordemSubcat || 99) || a.linha - b.linha);
    });

    let html = '';
    const gruposOrdenados = Object.entries(grupos)
        .sort(([, a], [, b]) => a.ordemCat - b.ordemCat);

    gruposOrdenados.forEach(([cat, dadosCat], gi) => {
        const items = dadosCat.links;
        const reorderBtns = modoReorganizar
            ? `<span class="reorder-cat-btns">
                 <button class="btn-reorder" onclick="event.stopPropagation(); moverCategoria('${cat}', -1)" ${gi === 0 ? 'disabled' : ''}>↑</button>
                 <button class="btn-reorder" onclick="event.stopPropagation(); moverCategoria('${cat}', 1)" ${gi === gruposOrdenados.length - 1 ? 'disabled' : ''}>↓</button>
               </span>`
            : '';
        html += `<div class="cat-header">${cat} ${reorderBtns}</div>`;

        items.forEach((l, i) => {
            const arrows = modoReorganizar
                ? `<span class="reorder-btns" onclick="event.stopPropagation()">
                     <button class="btn-reorder" onclick="moverLink(${l.linha}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
                     <button class="btn-reorder" onclick="moverLink(${l.linha}, 1)" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
                   </span>`
                : '<i class="fa-solid fa-chevron-right"></i>';
            html += `
          <div class="link-card ${modoReorganizar ? 'reorder-mode' : ''}" onclick="${modoReorganizar ? '' : `abrirModal('editar', ${l.linha})`}">
            <div class="link-info">
              <div class="link-cat">${cat}${l.subcategoria ? ' › ' + l.subcategoria : ''}</div>
              <div class="link-nome">${l.nomeLink || '(sem nome)'}</div>
              <div class="link-url">${l.url || '(sem url)'}</div>
            </div>
            ${arrows}
          </div>`;
        });
    });

    container.innerHTML = html;
}

function filtrarLinks() {
    const q = document.getElementById('busca').value.toLowerCase();
    if (!q) { renderizarLinks(todosLinks); return; }
    renderizarLinks(todosLinks.filter(l =>
        l.nomeLink.toLowerCase().includes(q) ||
        l.categoria.toLowerCase().includes(q) ||
        l.subcategoria.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q)
    ));
}

async function salvarLink() {
    const cat = getCatValue();
    const sub = getSubValue();
    const nome = document.getElementById('m-nome').value.trim();
    const url = document.getElementById('m-url').value.trim();

    if (!cat.nome) { modalStatus('Informe a categoria.', 'error'); return; }
    if (!nome) { modalStatus('Informe o nome do link.', 'error'); return; }
    if (!url) { modalStatus('Informe a URL.', 'error'); return; }

    const row = [cat.nome, cat.ordem, sub.nome, sub.ordem, nome, url];
    document.getElementById('btn-salvar').disabled = true;
    modalStatus('Salvando...', '');

    try {
        if (modoModal === 'adicionar') {
            await fetch(sheetsUrl(RANGE_LINKS, '?valueInputOption=USER_ENTERED', ':append'), {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ values: [row] })
            });
            toast('✅ Link adicionado!', 'success');
        } else {
            await fetch(sheetsUrl(`Sheet1!A${linhaEditar}:F${linhaEditar}`, '?valueInputOption=USER_ENTERED'), {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ values: [row] })
            });
            toast('✅ Link atualizado!', 'success');
        }
        fecharModal();
        await carregarLinks();
    } catch (e) {
        modalStatus('Erro: ' + e.message, 'error');
    } finally {
        document.getElementById('btn-salvar').disabled = false;
    }
}

async function removerLink() {
    const nome = document.getElementById('m-nome').value;
    if (!confirm(`Remover "${nome}"?\nEssa ação não pode ser desfeita.`)) return;

    try {
        // Delete row via batchUpdate
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: 0, // Sheet1 = first sheet
                            dimension: 'ROWS',
                            startIndex: linhaEditar - 1,
                            endIndex: linhaEditar
                        }
                    }
                }]
            })
        });
        toast('✅ Link removido!', 'success');
        fecharModal();
        await carregarLinks();
    } catch (e) {
        modalStatus('Erro ao remover: ' + e.message, 'error');
    }
}

async function moverLink(linha, direcao) {
    const link = todosLinks.find(l => l.linha === linha);
    if (!link) return;

    // Reconstruir lista ordenada da mesma categoria (mesma lógica do render)
    const linksNaCategoria = todosLinks
        .filter(l => l.categoria === link.categoria)
        .sort((a, b) => (a.ordemSubcat || 99) - (b.ordemSubcat || 99) || a.linha - b.linha);

    const idx = linksNaCategoria.findIndex(l => l.linha === linha);
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= linksNaCategoria.length) return;

    const outro = linksNaCategoria[novoIdx];

    // Trocar subcategoria e ordem entre os dois links
    const updates = [
        { range: `Sheet1!C${link.linha}:D${link.linha}`, values: [[outro.subcategoria, outro.ordemSubcat]] },
        { range: `Sheet1!C${outro.linha}:D${outro.linha}`, values: [[link.subcategoria, link.ordemSubcat]] }
    ];

    try {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: updates })
        });
        toast('✅ Ordem atualizada!', 'success');
        await carregarLinks();
    } catch (e) {
        toast('Erro ao mover: ' + e.message, 'error');
    }
}

async function moverCategoria(categoria, direcao) {
    const linksDaCategoria = todosLinks.filter(l => l.categoria === categoria);
    if (linksDaCategoria.length === 0) return;

    const ordemAtual = linksDaCategoria[0].ordemCat;

    // Find all unique categories and their order
    const categoriasOrdenadas = [...new Map(todosLinks.map(l => [l.categoria, l.ordemCat]))]
        .sort((a, b) => a[1] - b[1]);

    const indexCategoria = categoriasOrdenadas.findIndex(([cat]) => cat === categoria);
    if (indexCategoria === -1) return;

    const novoIndexCategoria = indexCategoria + direcao;
    if (novoIndexCategoria < 0 || novoIndexCategoria >= categoriasOrdenadas.length) return;

    const [categoriaParaTrocar, ordemTroca] = categoriasOrdenadas[novoIndexCategoria];

    // Update order for all links in the current category
    const updates = linksDaCategoria.map(l => ({
        range: `Sheet1!B${l.linha}`,
        values: [[ordemTroca]]
    }));

    // Update order for all links in the category to swap with
    const linksParaTrocar = todosLinks.filter(l => l.categoria === categoriaParaTrocar);
    linksParaTrocar.forEach(l => {
        updates.push({
            range: `Sheet1!B${l.linha}`,
            values: [[ordemAtual]]
        });
    });

    try {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                valueInputOption: 'USER_ENTERED',
                data: updates
            })
        });
        toast('✅ Ordem da categoria atualizada!', 'success');
        await carregarLinks();
    } catch (e) {
        toast('Erro ao mover categoria: ' + e.message, 'error');
    }
}


// ═══════════════════════════════════════════════════════
// Config (Sheet2)
// ═══════════════════════════════════════════════════════
async function carregarConfig() {
    try {
        const r = await fetch(sheetsUrl(RANGE_CONFIG), { headers: authHeaders() });
        const data = await r.json();
        const rows = data.values || [];

        rows.forEach(row => {
            const chave = (row[0] || '').trim().toLowerCase();
            const valor = (row[1] || '').trim();
            if (chave === 'handle') document.getElementById('cfg-handle').value = valor;
            if (chave === 'facebook') document.getElementById('cfg-facebook').value = valor;
            if (chave === 'instagram') document.getElementById('cfg-instagram').value = valor;
        });
    } catch (_) { }
}

async function salvarConfig() {
    const handle = document.getElementById('cfg-handle').value.trim();
    const facebook = document.getElementById('cfg-facebook').value.trim();
    const instagram = document.getElementById('cfg-instagram').value.trim();
    const statusEl = document.getElementById('config-status');
    statusEl.textContent = 'Salvando...';
    statusEl.style.color = 'var(--text-muted)';

    const values = [
        ['handle', handle],
        ['facebook', facebook],
        ['instagram', instagram]
    ];

    try {
        await fetch(sheetsUrl('Sheet2!A1:B3', '?valueInputOption=USER_ENTERED'), {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ values })
        });
        statusEl.textContent = '✅ Configurações salvas!';
        statusEl.style.color = 'var(--success)';
        toast('✅ Configurações salvas!', 'success');
    } catch (e) {
        statusEl.textContent = 'Erro: ' + e.message;
        statusEl.style.color = 'var(--danger)';
    }
}

// ═══════════════════════════════════════════════════════
// Modal
// ═══════════════════════════════════════════════════════
function abrirModal(modo, linha) {
    modoModal = modo;
    linhaEditar = linha || null;

    document.getElementById('modal-titulo').textContent = modo === 'adicionar' ? 'Adicionar link' : 'Editar link';
    document.getElementById('btn-remover').style.display = modo === 'editar' ? 'inline-flex' : 'none';

    // Popular dropdown de categorias
    popularCategorias();

    if (modo === 'editar') {
        const link = todosLinks.find(l => l.linha === linha);
        if (link) {
            // Selecionar a categoria existente
            const selCat = document.getElementById('m-categoria');
            selCat.value = link.categoria;
            onCatChange();

            // Selecionar subcategoria
            setTimeout(() => {
                const selSub = document.getElementById('m-subcategoria');
                selSub.value = link.subcategoria || '__sem__';
                onSubChange();
            }, 50);

            document.getElementById('m-nome').value = link.nomeLink;
            document.getElementById('m-url').value = link.url;
        }
    } else {
        document.getElementById('m-nome').value = '';
        document.getElementById('m-url').value = '';
        document.getElementById('m-nova-cat-div').style.display = 'none';
        document.getElementById('m-nova-sub-div').style.display = 'none';
    }

    modalStatus('', '');
    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('modal').style.display = 'block';
}

function fecharModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('modal').style.display = 'none';
    modoModal = null;
    linhaEditar = null;
}

function popularCategorias() {
    const sel = document.getElementById('m-categoria');
    const cats = [...new Map(todosLinks.map(l => [l.categoria, l.ordemCat]))];
    cats.sort((a, b) => a[1] - b[1]);

    sel.innerHTML = '<option value="">Selecione...</option>';
    cats.forEach(([nome]) => {
        sel.innerHTML += `<option value="${nome}">${nome}</option>`;
    });
    sel.innerHTML += '<option value="__nova__">+ Nova categoria...</option>';
}

function onCatChange() {
    const val = document.getElementById('m-categoria').value;
    document.getElementById('m-nova-cat-div').style.display = val === '__nova__' ? 'block' : 'none';

    // Popular subcategorias
    const selSub = document.getElementById('m-subcategoria');
    selSub.innerHTML = '<option value="__sem__">— Sem subcategoria —</option>';

    if (val && val !== '__nova__') {
        const subs = [...new Map(
            todosLinks
                .filter(l => l.categoria === val && l.subcategoria)
                .map(l => [l.subcategoria, l.ordemSubcat])
        )];
        subs.sort((a, b) => a[1] - b[1]);
        subs.forEach(([nome]) => {
            selSub.innerHTML += `<option value="${nome}">${nome}</option>`;
        });
    }
    selSub.innerHTML += '<option value="__nova__">+ Nova subcategoria...</option>';
    onSubChange();
}

function onSubChange() {
    const val = document.getElementById('m-subcategoria').value;
    document.getElementById('m-nova-sub-div').style.display = val === '__nova__' ? 'block' : 'none';
}

function getCatValue() {
    const sel = document.getElementById('m-categoria');
    if (sel.value === '__nova__') {
        // Auto-calcular próxima ordem
        const maxOrdem = todosLinks.length > 0 ? Math.max(...todosLinks.map(l => l.ordemCat)) : 0;
        return {
            nome: document.getElementById('m-nova-cat').value.trim(),
            ordem: maxOrdem + 1
        };
    }
    const link = todosLinks.find(l => l.categoria === sel.value);
    return { nome: sel.value, ordem: link?.ordemCat || 99 };
}

function getSubValue() {
    const sel = document.getElementById('m-subcategoria');
    if (sel.value === '__sem__') return { nome: '', ordem: '' };
    if (sel.value === '__nova__') {
        // Auto-calcular próxima ordem
        const catNome = getCatValue().nome;
        const existentes = todosLinks.filter(l => l.categoria === catNome && l.subcategoria);
        const maxOrdem = existentes.length > 0 ? Math.max(...existentes.map(l => l.ordemSubcat)) : 0;
        return {
            nome: document.getElementById('m-nova-sub').value.trim(),
            ordem: maxOrdem + 1
        };
    }
    const link = todosLinks.find(l => l.subcategoria === sel.value);
    return { nome: sel.value, ordem: link?.ordemSubcat || 99 };
}

// ═══════════════════════════════════════════════════════
// UI helpers
// ═══════════════════════════════════════════════════════
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

function toggleReorganizar() {
    modoReorganizar = !modoReorganizar;
    const btn = document.getElementById('btn-reorganizar');
    btn.classList.toggle('active', modoReorganizar);
    btn.innerHTML = modoReorganizar
        ? '<i class="fa-solid fa-check"></i> Pronto'
        : '<i class="fa-solid fa-arrows-up-down"></i>';
    renderizarLinks(todosLinks);
}

function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'show ' + type;
    setTimeout(() => el.className = '', 3000);
}

function modalStatus(msg, type) {
    const el = document.getElementById('modal-status');
    el.textContent = msg;
    el.style.color = type === 'error' ? 'var(--danger)' : 'var(--text-muted)';
}

// ═══════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════
window.addEventListener('load', () => {
    initTokenClient();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
}
