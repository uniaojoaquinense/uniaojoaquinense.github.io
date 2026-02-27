// Usa CONFIG de config.js (carregado antes deste script)
const CLIENT_ID = CONFIG.CLIENT_ID;
const API_KEY = CONFIG.API_KEY;
const SHEET_ID = CONFIG.SHEET_ID;
const SCOPES = CONFIG.SCOPES;
const RANGE_LINKS = CONFIG.RANGE_LINKS;
const RANGE_CONFIG = CONFIG.RANGE_CONFIG;

// ═══════════════════════════════════════════════════════
// Estado
// ═══════════════════════════════════════════════════════
let accessToken = null;
let todosLinks = [];
let modoModal = null;
let linhaEditar = null;
let modoReorganizar = false;

// ═══════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════
let tokenClient;
function initTokenClient() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID, scope: SCOPES,
        callback: (resp) => {
            if (resp.error) { toast('Erro no login: ' + resp.error, 'error'); return; }
            accessToken = resp.access_token;
            onLoginSuccess();
        },
    });
}
function handleLogin() { if (!tokenClient) initTokenClient(); tokenClient.requestAccessToken({ prompt: 'consent' }); }
function handleLogout() {
    if (accessToken) google.accounts.oauth2.revoke(accessToken);
    accessToken = null;
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('painel').style.display = 'none';
}
async function onLoginSuccess() {
    try {
        const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
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
function authHeaders() { return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }; }
function batchUrl() { return `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`; }

// ═══════════════════════════════════════════════════════
// Carregar Links
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
            if (i === 0 && isNaN(row[1])) return;
            const nome = (row[4] || '').trim();
            const url = (row[5] || '').trim();
            if (!nome && !url && !(row[0] || '').trim()) return;
            todosLinks.push({
                linha: i + 1,
                categoria: (row[0] || '').trim(),
                ordemCat: Number(row[1]) || 99,
                subcategoria: (row[2] || '').trim(),
                ordemSubcat: Number(row[3]) || 99,
                nomeLink: nome, url: url
            });
        });
        renderizarLinks(todosLinks);
    } catch (e) { toast('Erro ao carregar links: ' + e.message, 'error'); }
    finally { loadEl.style.display = 'none'; }
}

// ═══════════════════════════════════════════════════════
// Construir blocos dentro de uma categoria
// Cada bloco = 1 subcategoria inteira OU 1 link avulso (sem subcat)
// ═══════════════════════════════════════════════════════
function construirBlocos(categoria) {
    const linksNaCat = todosLinks.filter(l => l.categoria === categoria);

    // Primeiro os que têm subcategoria, agrupados, ordenados por ordemSubcat
    const subcatMap = {};
    const avulsos = [];
    linksNaCat.forEach(l => {
        if (l.subcategoria) {
            if (!subcatMap[l.subcategoria]) subcatMap[l.subcategoria] = { ordem: l.ordemSubcat, links: [] };
            subcatMap[l.subcategoria].links.push(l);
        } else {
            avulsos.push(l);
        }
    });

    // Criar array de blocos
    const blocos = [];

    // Adicionar subcategorias como blocos
    Object.entries(subcatMap)
        .sort(([, a], [, b]) => a.ordem - b.ordem)
        .forEach(([nome, dados]) => {
            blocos.push({ tipo: 'subcategoria', nome, links: dados.links.sort((a, b) => a.linha - b.linha), ordem: dados.ordem });
        });

    // Adicionar links avulsos como blocos individuais
    avulsos.sort((a, b) => a.ordemSubcat - b.ordemSubcat || a.linha - b.linha)
        .forEach(l => {
            blocos.push({ tipo: 'link', nome: l.nomeLink, links: [l], ordem: l.ordemSubcat });
        });

    // Ordenar todos os blocos pela ordem
    blocos.sort((a, b) => a.ordem - b.ordem);

    return blocos;
}

// ═══════════════════════════════════════════════════════
// Renderizar
// ═══════════════════════════════════════════════════════
function renderizarLinks(links) {
    const container = document.getElementById('links-lista');
    const vazio = document.getElementById('links-vazio');
    if (links.length === 0) { container.innerHTML = ''; vazio.style.display = 'block'; return; }
    vazio.style.display = 'none';

    // Categorias únicas ordenadas
    const catNomes = [];
    const catOrdens = {};
    links.forEach(l => {
        if (!catOrdens[l.categoria]) { catNomes.push(l.categoria); catOrdens[l.categoria] = l.ordemCat; }
    });
    catNomes.sort((a, b) => catOrdens[a] - catOrdens[b]);

    let html = '';

    catNomes.forEach((cat, gi) => {
        // Header categoria
        const catBtns = modoReorganizar
            ? `<span class="reorder-cat-btns">
           <button class="btn-reorder" onclick="event.stopPropagation(); moverCategoria('${esc(cat)}', -1)" ${gi === 0 ? 'disabled' : ''}>↑</button>
           <button class="btn-reorder" onclick="event.stopPropagation(); moverCategoria('${esc(cat)}', 1)" ${gi === catNomes.length - 1 ? 'disabled' : ''}>↓</button>
         </span>` : '';
        html += `<div class="cat-header">${cat} ${catBtns}</div>`;

        const blocos = construirBlocos(cat);

        blocos.forEach((bloco, bi) => {
            // Se é subcategoria, mostrar header
            if (bloco.tipo === 'subcategoria') {
                const subBtns = modoReorganizar
                    ? `<span class="reorder-cat-btns">
               <button class="btn-reorder btn-reorder-sm" onclick="event.stopPropagation(); moverBloco('${esc(cat)}', ${bi}, -1)" ${bi === 0 ? 'disabled' : ''}>↑</button>
               <button class="btn-reorder btn-reorder-sm" onclick="event.stopPropagation(); moverBloco('${esc(cat)}', ${bi}, 1)" ${bi === blocos.length - 1 ? 'disabled' : ''}>↓</button>
             </span>` : '';
                html += `<div class="subcat-section"><div class="subcat-header"><span>${bloco.nome}</span>${subBtns}</div>`;
            }

            // Links do bloco
            bloco.links.forEach((l, i) => {
                let arrows = '';
                if (modoReorganizar) {
                    if (bloco.tipo === 'link') {
                        // Link avulso: pode mover como bloco
                        arrows = `<span class="reorder-btns" onclick="event.stopPropagation()">
              <button class="btn-reorder btn-reorder-sm" onclick="moverBloco('${esc(cat)}', ${bi}, -1)" ${bi === 0 ? 'disabled' : ''}>↑</button>
              <button class="btn-reorder btn-reorder-sm" onclick="moverBloco('${esc(cat)}', ${bi}, 1)" ${bi === blocos.length - 1 ? 'disabled' : ''}>↓</button>
            </span>`;
                    } else {
                        // Link dentro de subcategoria: pode trocar posição (swap de linhas)
                        arrows = `<span class="reorder-btns" onclick="event.stopPropagation()">
              <button class="btn-reorder btn-reorder-sm" onclick="moverLinkDentroSubcat(${l.linha}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button class="btn-reorder btn-reorder-sm" onclick="moverLinkDentroSubcat(${l.linha}, 1)" ${i === bloco.links.length - 1 ? 'disabled' : ''}>↓</button>
            </span>`;
                    }
                } else {
                    arrows = '<i class="fa-solid fa-chevron-right"></i>';
                }

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
            if (bloco.tipo === 'subcategoria') html += '</div>';
        });
    });

    container.innerHTML = html;
}

function esc(s) { return s.replace(/'/g, "\\'"); }

function filtrarLinks() {
    const q = document.getElementById('busca').value.toLowerCase();
    if (!q) { renderizarLinks(todosLinks); return; }
    renderizarLinks(todosLinks.filter(l =>
        l.nomeLink.toLowerCase().includes(q) || l.categoria.toLowerCase().includes(q) ||
        l.subcategoria.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
    ));
}

// ═══════════════════════════════════════════════════════
// Salvar / Remover
// ═══════════════════════════════════════════════════════
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
                method: 'POST', headers: authHeaders(), body: JSON.stringify({ values: [row] })
            });
            toast('✅ Link adicionado!', 'success');
        } else {
            await fetch(sheetsUrl(`Sheet1!A${linhaEditar}:F${linhaEditar}`, '?valueInputOption=USER_ENTERED'), {
                method: 'PUT', headers: authHeaders(), body: JSON.stringify({ values: [row] })
            });
            toast('✅ Link atualizado!', 'success');
        }
        fecharModal(); await carregarLinks();
    } catch (e) { modalStatus('Erro: ' + e.message, 'error'); }
    finally { document.getElementById('btn-salvar').disabled = false; }
}

async function removerLink() {
    const nome = document.getElementById('m-nome').value;
    if (!confirm(`Remover "${nome}"?\nEssa ação não pode ser desfeita.`)) return;
    try {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: 0, dimension: 'ROWS', startIndex: linhaEditar - 1, endIndex: linhaEditar } } }] })
        });
        toast('✅ Link removido!', 'success'); fecharModal(); await carregarLinks();
    } catch (e) { modalStatus('Erro: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════
// Mover BLOCO (subcategoria inteira ou link avulso)
// Renumera todos os blocos da categoria: 1, 2, 3...
// ═══════════════════════════════════════════════════════
async function moverBloco(categoria, blocoIdx, direcao) {
    const blocos = construirBlocos(categoria);
    const novoIdx = blocoIdx + direcao;
    if (novoIdx < 0 || novoIdx >= blocos.length) return;

    // Swap no array
    [blocos[blocoIdx], blocos[novoIdx]] = [blocos[novoIdx], blocos[blocoIdx]];

    // Renumerar 1, 2, 3...
    const updates = [];
    blocos.forEach((bloco, i) => {
        const ordem = i + 1;
        bloco.links.forEach(l => {
            l.ordemSubcat = ordem;
            updates.push({ range: `Sheet1!D${l.linha}`, values: [[ordem]] });
        });
    });

    renderizarLinks(todosLinks);

    try {
        await fetch(batchUrl(), {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: updates })
        });
    } catch (e) { toast('Erro: ' + e.message, 'error'); await carregarLinks(); }
}

// ═══════════════════════════════════════════════════════
// Mover link dentro de subcategoria (swap de linhas)
// ═══════════════════════════════════════════════════════
async function moverLinkDentroSubcat(linha, direcao) {
    const link = todosLinks.find(l => l.linha === linha);
    if (!link) return;

    const irmaos = todosLinks
        .filter(l => l.categoria === link.categoria && l.subcategoria === link.subcategoria)
        .sort((a, b) => a.linha - b.linha);

    const idx = irmaos.findIndex(l => l.linha === linha);
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= irmaos.length) return;

    const outro = irmaos[novoIdx];

    // Swap dados (manter linhas)
    const tmp = { categoria: link.categoria, ordemCat: link.ordemCat, subcategoria: link.subcategoria, ordemSubcat: link.ordemSubcat, nomeLink: link.nomeLink, url: link.url };
    const tmp2 = { categoria: outro.categoria, ordemCat: outro.ordemCat, subcategoria: outro.subcategoria, ordemSubcat: outro.ordemSubcat, nomeLink: outro.nomeLink, url: outro.url };
    Object.assign(link, tmp2);
    Object.assign(outro, tmp);

    renderizarLinks(todosLinks);

    try {
        await fetch(batchUrl(), {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({
                valueInputOption: 'USER_ENTERED', data: [
                    { range: `Sheet1!A${link.linha}:F${link.linha}`, values: [[link.categoria, link.ordemCat, link.subcategoria, link.ordemSubcat, link.nomeLink, link.url]] },
                    { range: `Sheet1!A${outro.linha}:F${outro.linha}`, values: [[outro.categoria, outro.ordemCat, outro.subcategoria, outro.ordemSubcat, outro.nomeLink, outro.url]] }
                ]
            })
        });
    } catch (e) { toast('Erro: ' + e.message, 'error'); await carregarLinks(); }
}

// ═══════════════════════════════════════════════════════
// Mover categoria inteira — renumera 1, 2, 3...
// ═══════════════════════════════════════════════════════
async function moverCategoria(categoria, direcao) {
    const catNomes = [];
    const visto = new Set();
    [...todosLinks].sort((a, b) => a.ordemCat - b.ordemCat)
        .forEach(l => { if (!visto.has(l.categoria)) { visto.add(l.categoria); catNomes.push(l.categoria); } });

    const idx = catNomes.indexOf(categoria);
    if (idx === -1) return;
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= catNomes.length) return;

    [catNomes[idx], catNomes[novoIdx]] = [catNomes[novoIdx], catNomes[idx]];

    const updates = [];
    catNomes.forEach((nome, i) => {
        const ordem = i + 1;
        todosLinks.filter(l => l.categoria === nome).forEach(l => {
            l.ordemCat = ordem;
            updates.push({ range: `Sheet1!B${l.linha}`, values: [[ordem]] });
        });
    });

    renderizarLinks(todosLinks);

    try {
        await fetch(batchUrl(), {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: updates })
        });
    } catch (e) { toast('Erro: ' + e.message, 'error'); await carregarLinks(); }
}

// ═══════════════════════════════════════════════════════
// Config (Sheet2) — handle, facebook, instagram, logo, slides
// ═══════════════════════════════════════════════════════
async function carregarConfig() {
    try {
        const r = await fetch(sheetsUrl(RANGE_CONFIG), { headers: authHeaders() });
        const data = await r.json();
        const container = document.getElementById('slides-container');
        container.innerHTML = '';
        let slideCount = 0;
        (data.values || []).forEach(row => {
            const chave = (row[0] || '').trim().toLowerCase();
            const valor = (row[1] || '').trim();
            if (chave === 'handle') document.getElementById('cfg-handle').value = valor;
            else if (chave === 'facebook') document.getElementById('cfg-facebook').value = valor;
            else if (chave === 'instagram') document.getElementById('cfg-instagram').value = valor;
            else if (chave === 'logo') document.getElementById('cfg-logo').value = valor;
            else if (chave.startsWith('slide') && valor) { slideCount++; adicionarSlide(valor); }
        });
        if (slideCount === 0) adicionarSlide('');
    } catch (_) { }
}

function adicionarSlide(valor = '') {
    const container = document.getElementById('slides-container');
    const idx = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'slide-row';
    div.innerHTML = `
    <span class="slide-num">${idx}</span>
    <input type="url" class="slide-input" value="${valor}" placeholder="https://drive.google.com/file/d/.../view">
    <button type="button" class="btn-icon btn-danger-icon" onclick="removerSlide(this)" title="Remover"><i class="fa-solid fa-xmark"></i></button>
  `;
    container.appendChild(div);
}

function removerSlide(btn) {
    btn.closest('.slide-row').remove();
    document.querySelectorAll('#slides-container .slide-num').forEach((el, i) => el.textContent = i + 1);
}

async function salvarConfig() {
    const handle = document.getElementById('cfg-handle').value.trim();
    const facebook = document.getElementById('cfg-facebook').value.trim();
    const instagram = document.getElementById('cfg-instagram').value.trim();
    const logo = document.getElementById('cfg-logo').value.trim();
    const slides = [];
    document.querySelectorAll('#slides-container .slide-input').forEach(input => {
        const v = input.value.trim(); if (v) slides.push(v);
    });
    const values = [['handle', handle], ['facebook', facebook], ['instagram', instagram], ['logo', logo]];
    slides.forEach((url, i) => values.push([`slide${i + 1}`, url]));
    const statusEl = document.getElementById('config-status');
    statusEl.textContent = 'Salvando...'; statusEl.style.color = 'var(--text-muted)';
    try {
        await fetch(sheetsUrl(`Sheet2!A1:B${values.length}`, '?valueInputOption=USER_ENTERED'), {
            method: 'PUT', headers: authHeaders(), body: JSON.stringify({ values })
        });
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(`Sheet2!A${values.length + 1}:B50`)}:clear`, {
            method: 'POST', headers: authHeaders()
        }).catch(() => { });
        statusEl.textContent = '✅ Salvo!'; statusEl.style.color = 'var(--success)';
        toast('✅ Configurações salvas!', 'success');
    } catch (e) { statusEl.textContent = 'Erro: ' + e.message; statusEl.style.color = 'var(--danger)'; }
}

// ═══════════════════════════════════════════════════════
// Modal
// ═══════════════════════════════════════════════════════
function abrirModal(modo, linha) {
    modoModal = modo; linhaEditar = linha || null;
    document.getElementById('modal-titulo').textContent = modo === 'adicionar' ? 'Adicionar link' : 'Editar link';
    document.getElementById('btn-remover').style.display = modo === 'editar' ? 'inline-flex' : 'none';
    popularCategorias();
    if (modo === 'editar') {
        const link = todosLinks.find(l => l.linha === linha);
        if (link) {
            document.getElementById('m-categoria').value = link.categoria; onCatChange();
            setTimeout(() => { document.getElementById('m-subcategoria').value = link.subcategoria || '__sem__'; onSubChange(); }, 50);
            document.getElementById('m-nome').value = link.nomeLink;
            document.getElementById('m-url').value = link.url;
        }
    } else {
        document.getElementById('m-nome').value = ''; document.getElementById('m-url').value = '';
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
    modoModal = null; linhaEditar = null;
}
function popularCategorias() {
    const sel = document.getElementById('m-categoria');
    const cats = [...new Map(todosLinks.map(l => [l.categoria, l.ordemCat]))].sort((a, b) => a[1] - b[1]);
    sel.innerHTML = '<option value="">Selecione...</option>';
    cats.forEach(([nome]) => { sel.innerHTML += `<option value="${nome}">${nome}</option>`; });
    sel.innerHTML += '<option value="__nova__">+ Nova categoria...</option>';
}
function onCatChange() {
    const val = document.getElementById('m-categoria').value;
    document.getElementById('m-nova-cat-div').style.display = val === '__nova__' ? 'block' : 'none';
    const selSub = document.getElementById('m-subcategoria');
    selSub.innerHTML = '<option value="__sem__">— Sem subcategoria —</option>';
    if (val && val !== '__nova__') {
        const subs = [...new Map(todosLinks.filter(l => l.categoria === val && l.subcategoria).map(l => [l.subcategoria, l.ordemSubcat]))].sort((a, b) => a[1] - b[1]);
        subs.forEach(([nome]) => { selSub.innerHTML += `<option value="${nome}">${nome}</option>`; });
    }
    selSub.innerHTML += '<option value="__nova__">+ Nova subcategoria...</option>';
    onSubChange();
}
function onSubChange() { document.getElementById('m-nova-sub-div').style.display = document.getElementById('m-subcategoria').value === '__nova__' ? 'block' : 'none'; }
function getCatValue() {
    const sel = document.getElementById('m-categoria');
    if (sel.value === '__nova__') {
        const max = todosLinks.length > 0 ? Math.max(...todosLinks.map(l => l.ordemCat)) : 0;
        return { nome: document.getElementById('m-nova-cat').value.trim(), ordem: max + 1 };
    }
    const link = todosLinks.find(l => l.categoria === sel.value);
    return { nome: sel.value, ordem: link?.ordemCat || 99 };
}
function getSubValue() {
    const sel = document.getElementById('m-subcategoria');
    if (sel.value === '__sem__') return { nome: '', ordem: '' };
    if (sel.value === '__nova__') {
        const catNome = getCatValue().nome;
        const existentes = todosLinks.filter(l => l.categoria === catNome && l.subcategoria);
        const max = existentes.length > 0 ? Math.max(...existentes.map(l => l.ordemSubcat)) : 0;
        return { nome: document.getElementById('m-nova-sub').value.trim(), ordem: max + 1 };
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
    btn.innerHTML = modoReorganizar ? '<i class="fa-solid fa-check"></i> Pronto' : '<i class="fa-solid fa-arrows-up-down"></i>';
    renderizarLinks(todosLinks);
}
function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg; el.className = 'show ' + type;
    setTimeout(() => el.className = '', 3000);
}
function modalStatus(msg, type) {
    const el = document.getElementById('modal-status');
    el.textContent = msg; el.style.color = type === 'error' ? 'var(--danger)' : 'var(--text-muted)';
}

// ═══════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════
window.addEventListener('load', () => { initTokenClient(); });
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(() => { }); }
