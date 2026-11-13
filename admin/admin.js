/**
 * Lojinha do Dev - Painel Administrativo
 * Gerenciamento do arquivo produtos.json via GitHub API.
 * Auth: sessionStorage (login.html)
 */

// ─── Guard de autenticação ────────────────────────────────────────────────────
if (sessionStorage.getItem('admin_auth') !== 'ok') {
  location.replace('login.html');
}

// ─── Configuração do repositório GitHub ──────────────────────────────────────
// Detecta o owner e repo automaticamente a partir da URL do GitHub Pages.
// Formato esperado: https://<owner>.github.io/<repo>/admin/
const GH = (() => {
  const parts = location.hostname.split('.');
  const owner = parts[0]; // ex: devaniljr
  // No GitHub Pages, o repo pode ser "<owner>.github.io" (raiz) ou outro nome
  const pathParts = location.pathname.split('/').filter(Boolean);
  // Se o site está na raiz (usuario.github.io), não há sub-path de repo
  const repo = (owner + '.github.io' === location.hostname.toLowerCase())
    ? owner + '.github.io'
    : (pathParts[0] || owner + '.github.io');

  const PRODUTOS_PATH = 'produtos.json';
  const API_BASE = `https://api.github.com/repos/${owner}/${repo}`;

  function getToken() {
    return localStorage.getItem('gh_token') || '';
  }

  async function getFileSha(filePath) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/contents/${filePath}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.sha || null;
  }

  async function commitFile(filePath, contentBase64, message, sha) {
    const token = getToken();
    const body = { message, content: contentBase64 };
    if (sha) body.sha = sha;
    const res = await fetch(`${API_BASE}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error ${res.status}`);
    }
    return res.json();
  }

  return { owner, repo, PRODUTOS_PATH, getToken, getFileSha, commitFile, API_BASE };
})();

// Verifica se o token está configurado
function ensureToken() {
  if (!GH.getToken()) {
    const token = prompt(
      '🔑 Token do GitHub não configurado.\n\n' +
      'Acesse: github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)\n' +
      'Crie um token com permissão "repo" e cole abaixo:'
    );
    if (token && token.trim()) {
      localStorage.setItem('gh_token', token.trim());
      return true;
    }
    alert('Token não informado. As alterações não serão salvas no GitHub.');
    return false;
  }
  return true;
}

const state = {
  products: [],
  currentFilter: 'all', // all, available, sold
  searchQuery: '',
  editingBookId: null,
  dynamicDetails: [] // array de { url, legenda } para o formulário
};

// Elementos do DOM
const DOM = {
  // Métricas
  metricTotal: document.getElementById('metricTotal'),
  metricAvailable: document.getElementById('metricAvailable'),
  metricSold: document.getElementById('metricSold'),
  metricTotalValue: document.getElementById('metricTotalValue'),

  // Filtros & Tabela
  adminSearchInput: document.getElementById('adminSearchInput'),
  filterBtns: document.querySelectorAll('.filter-btn'),
  booksTableBody: document.getElementById('booksTableBody'),

  // Ações de Topo
  newBookBtn: document.getElementById('newBookBtn'),
  backupBtn: document.getElementById('backupBtn'),

  // Modal & Form
  bookFormModal: document.getElementById('bookFormModal'),
  modalFormTitle: document.getElementById('modalFormTitle'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelFormBtn: document.getElementById('cancelFormBtn'),
  bookForm: document.getElementById('bookForm'),
  bookId: document.getElementById('bookId'),
  bookNome: document.getElementById('bookNome'),
  bookAutor: document.getElementById('bookAutor'),
  bookValor: document.getElementById('bookValor'),
  bookEstado: document.getElementById('bookEstado'),
  bookDescricao: document.getElementById('bookDescricao'),
  bookVendido: document.getElementById('bookVendido'),

  // Ângulos Padrão
  img_frente: document.getElementById('img_frente'),
  img_verso: document.getElementById('img_verso'),
  img_lombada1: document.getElementById('img_lombada1'),
  img_lombada2: document.getElementById('img_lombada2'),
  img_folhas: document.getElementById('img_folhas'),

  prev_frente: document.getElementById('prev_frente'),
  prev_verso: document.getElementById('prev_verso'),
  prev_lombada1: document.getElementById('prev_lombada1'),
  prev_lombada2: document.getElementById('prev_lombada2'),
  prev_folhas: document.getElementById('prev_folhas'),

  // Detalhes
  addDetailBtn: document.getElementById('addDetailBtn'),
  detailsListContainer: document.getElementById('detailsListContainer'),

  // Toast
  adminToast: document.getElementById('adminToast')
};

// Formatação BRL
function formatBRL(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Extrai array de categorias
function getBookCategories(book) {
  if (Array.isArray(book.categorias)) return book.categorias;
  if (Array.isArray(book.categoria)) return book.categoria;
  if (typeof book.categorias === 'string' && book.categorias.trim()) {
    return book.categorias.split(',').map(c => c.trim());
  }
  if (typeof book.categoria === 'string' && book.categoria.trim()) {
    return book.categoria.split(',').map(c => c.trim());
  }
  return [];
}

// Resolve caminho relativo de imagens para funcionar dentro do subdiretório /admin/
function resolveImgUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return '../images/placeholder-book.svg';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  if (trimmed.startsWith('../')) {
    return trimmed;
  }
  const clean = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  return `../${clean}`;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupEventListeners();
});

// ==========================================================================
// 1. Carregamento dos Produtos (lê o produtos.json estático do site)
// ==========================================================================
async function loadProducts() {
  try {
    // Lê o arquivo estático publicado — funciona em GitHub Pages
    const res = await fetch('../produtos.json?nocache=' + Date.now());
    if (!res.ok) throw new Error('Falha ao buscar produtos.json.');
    const data = await res.json();
    state.products = Array.isArray(data) ? data : [];
    updateMetrics();
    renderTable();
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    DOM.booksTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 30px; color: #DC2626;">
          ⚠️ Erro ao carregar produtos.json.
        </td>
      </tr>
    `;
    showToast('Falha ao carregar produtos.json.');
  }
}

// ==========================================================================
// 2. Atualização das Métricas
// ==========================================================================
function updateMetrics() {
  const total = state.products.length;
  const sold = state.products.filter(p => p.vendido === true || p.vendido === 'true').length;
  const available = total - sold;

  const totalValue = state.products
    .filter(p => p.vendido !== true && p.vendido !== 'true')
    .reduce((sum, p) => sum + (Number(p.valor) || 0), 0);

  DOM.metricTotal.textContent = total;
  DOM.metricAvailable.textContent = available;
  DOM.metricSold.textContent = sold;
  DOM.metricTotalValue.textContent = formatBRL(totalValue);
}

// ==========================================================================
// 3. Renderização da Tabela
// ==========================================================================
function renderTable() {
  const query = (state.searchQuery || '').toLowerCase();
  const filter = state.currentFilter;

  const filtered = state.products.filter(book => {
    // Filtro de Status
    const isSold = book.vendido === true || book.vendido === 'true';
    if (filter === 'available' && isSold) return false;
    if (filter === 'sold' && !isSold) return false;

    // Filtro de Busca
    if (query) {
      const title = (book.nome || '').toLowerCase();
      const author = (book.autor || '').toLowerCase();
      const catsString = getBookCategories(book).join(' ').toLowerCase();
      if (!title.includes(query) && !author.includes(query) && !catsString.includes(query)) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    DOM.booksTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 40px; color: #64748B;">
          Nenhum livro encontrado com esses filtros.
        </td>
      </tr>
    `;
    return;
  }

  DOM.booksTableBody.innerHTML = filtered.map(book => {
    const isSold = book.vendido === true || book.vendido === 'true';
    const coverUrl = (book.imagens && book.imagens.frente) ? resolveImgUrl(book.imagens.frente) : '../images/placeholder-book.svg';
    const author = book.autor || 'Autor não informado';
    const condition = book.estado || 'Seminovo';
    const cats = getBookCategories(book);

    const categoriesHtml = cats.length > 0 
      ? cats.map(c => `<span class="category-check-item" style="padding: 2px 8px; font-size: 0.74rem;">${c}</span>`).join('')
      : '<span style="color:#94A3B8; font-size:0.75rem;">Sem categoria</span>';

    return `
      <tr data-id="${book.id}">
        <td>
          <img src="${coverUrl}" alt="Capa" class="table-cover-thumb" onerror="this.src='../images/placeholder-book.svg'">
        </td>
        <td>
          <span class="book-title-cell">${book.nome}</span>
          <span class="book-author-cell">${author}</span>
        </td>
        <td>
          <div class="category-chips-list">${categoriesHtml}</div>
        </td>
        <td>
          <span class="book-price-cell">${formatBRL(book.valor)}</span>
        </td>
        <td>
          <span style="font-size:0.85rem; color:#475569;">${condition}</span>
        </td>
        <td>
          ${isSold 
            ? `<span class="status-badge status-badge--sold"><span class="status-dot"></span> Vendido (Oculto)</span>` 
            : `<span class="status-badge status-badge--available"><span class="status-dot"></span> Ativo na Loja</span>`
          }
        </td>
        <td>
          <div class="table-actions">
            <button 
              type="button" 
              class="btn-toggle-sold" 
              onclick="toggleBookSold('${book.id}')"
              title="${isSold ? 'Colocar de volta à venda' : 'Marcar como vendido'}"
            >
              ${isSold ? '🔄 Reativar' : '🏷️ Marcar Vendido'}
            </button>
            <button 
              type="button" 
              class="btn-action-icon" 
              onclick="openEditModal('${book.id}')" 
              title="Editar informações e fotos"
            >
              ✏️
            </button>
            <button 
              type="button" 
              class="btn-action-icon btn-action-icon--delete" 
              onclick="deleteBook('${book.id}')" 
              title="Excluir livro permanentemente"
            >
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// 4. Ações Rápidas: Alternar Status Vendido e Deletar
// ==========================================================================
window.toggleBookSold = async function(bookId) {
  const book = state.products.find(b => String(b.id) === String(bookId));
  if (!book) return;

  const currentStatus = book.vendido === true || book.vendido === 'true';
  book.vendido = !currentStatus;

  await saveProductsToServer(
    book.vendido ? `"${book.nome}" marcado como VENDIDO e ocultado da loja!` : `"${book.nome}" reativado na loja!`
  );
};

window.deleteBook = async function(bookId) {
  const book = state.products.find(b => String(b.id) === String(bookId));
  if (!book) return;

  const confirmed = confirm(`Tem certeza que deseja excluir o livro "${book.nome}" do catálogo?`);
  if (!confirmed) return;

  state.products = state.products.filter(b => String(b.id) !== String(bookId));
  await saveProductsToServer(`Livro "${book.nome}" excluído do catálogo.`);
};

// ==========================================================================
// 5. Salvar produtos.json via GitHub API (commit direto no repositório)
// ==========================================================================
async function saveProductsToServer(successMessage) {
  if (!ensureToken()) return;

  showToast('⏳ Salvando no GitHub...');

  try {
    const jsonStr = JSON.stringify(state.products, null, 2);
    // btoa não suporta UTF-8 direto — usa TextEncoder
    const bytes = new TextEncoder().encode(jsonStr);
    const binStr = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    const base64 = btoa(binStr);

    const sha = await GH.getFileSha(GH.PRODUTOS_PATH);
    await GH.commitFile(
      GH.PRODUTOS_PATH,
      base64,
      `Admin: ${successMessage || 'Atualização do catálogo'}`,
      sha
    );

    showToast('✅ ' + (successMessage || 'Salvo no GitHub com sucesso!'));
    updateMetrics();
    renderTable();
  } catch (err) {
    console.error('Falha ao salvar no GitHub:', err);
    if (err.message && err.message.includes('Bad credentials')) {
      localStorage.removeItem('gh_token');
      alert('❌ Token do GitHub inválido ou expirado.\nO token foi removido. Tente salvar novamente para inserir um novo token.');
    } else {
      alert('❌ Erro ao salvar no GitHub:\n' + err.message);
    }
  }
}

// ==========================================================================
// 6. Modal de Formulário (Criar / Editar Livro com Múltiplas Categorias)
// ==========================================================================
function openCreateModal() {
  state.editingBookId = null;
  DOM.modalFormTitle.textContent = 'Cadastrar Novo Livro';
  DOM.bookForm.reset();
  DOM.bookId.value = '';
  DOM.bookVendido.checked = false;
  state.dynamicDetails = [];

  // Reseta categorias (marca programação por padrão)
  const categoryCheckboxes = document.querySelectorAll('input[name="adminCategorias"]');
  categoryCheckboxes.forEach(cb => {
    cb.checked = (cb.value === 'programação');
  });

  // Reseta previews
  ['frente', 'verso', 'lombada1', 'lombada2', 'folhas'].forEach(key => {
    DOM[`img_${key}`].value = '';
    DOM[`prev_${key}`].src = '../images/placeholder-book.svg';
  });

  renderDetailsList();
  openModal();
}

window.openEditModal = function(bookId) {
  const book = state.products.find(b => String(b.id) === String(bookId));
  if (!book) return;

  state.editingBookId = book.id;
  DOM.modalFormTitle.textContent = `Editar: ${book.nome}`;

  DOM.bookId.value = book.id;
  DOM.bookNome.value = book.nome || '';
  DOM.bookAutor.value = book.autor || '';
  DOM.bookValor.value = book.valor || '';
  DOM.bookEstado.value = book.estado || 'Seminovo - Excelente';
  DOM.bookDescricao.value = book.descricao || '';
  DOM.bookVendido.checked = (book.vendido === true || book.vendido === 'true');

  // Marca os checkboxes das categorias que o livro possui
  const bookCats = getBookCategories(book).map(c => c.toLowerCase().trim());
  const categoryCheckboxes = document.querySelectorAll('input[name="adminCategorias"]');
  categoryCheckboxes.forEach(cb => {
    cb.checked = bookCats.includes(cb.value.toLowerCase().trim());
  });

  const imgs = book.imagens || {};

  ['frente', 'verso', 'lombada1', 'lombada2', 'folhas'].forEach(key => {
    const val = imgs[key] || '';
    DOM[`img_${key}`].value = val;
    DOM[`prev_${key}`].src = resolveImgUrl(val);
  });

  // Detalhes dinâmicos
  state.dynamicDetails = Array.isArray(imgs.detalhes) ? JSON.parse(JSON.stringify(imgs.detalhes)) : [];
  renderDetailsList();

  openModal();
};

function openModal() {
  DOM.bookFormModal.classList.add('is-open');
  DOM.bookFormModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  DOM.bookFormModal.classList.remove('is-open');
  DOM.bookFormModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ==========================================================================
// 7. Manipulação de Detalhes Dinâmicos (Fotos com Legenda)
// ==========================================================================
function renderDetailsList() {
  if (state.dynamicDetails.length === 0) {
    DOM.detailsListContainer.innerHTML = `
      <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; padding: 18px; border-radius: 8px; text-align: center; font-size: 0.85rem; color: #64748B;">
        Nenhuma foto de detalhe adicionada. Clique no botão acima caso este livro tenha marcas, grifos ou especificidades para demonstrar.
      </div>
    `;
    return;
  }

  DOM.detailsListContainer.innerHTML = state.dynamicDetails.map((det, index) => {
    const previewUrl = resolveImgUrl(det.url);
    const caption = det.legenda || '';

    return `
      <div class="detail-row-card" data-index="${index}">
        <img src="${previewUrl}" alt="Detalhe ${index + 1}" class="detail-thumb-preview" id="det_prev_${index}" onerror="this.src='../images/placeholder-book.svg'">
        
        <div class="detail-fields">
          <div style="display: flex; gap: 8px; align-items: center;">
            <label class="btn-file-upload btn-sm">
              📁 Foto do Detalhe
              <input type="file" accept="image/*" class="file-input" onchange="handleDetailFileUpload(event, ${index})">
            </label>
            <input 
              type="text" 
              class="form-control form-control--sm" 
              placeholder="Caminho da foto (ex: images/produtos/...)" 
              value="${det.url || ''}"
              oninput="handleDetailUrlChange(${index}, this.value)"
            >
          </div>
          <input 
            type="text" 
            class="form-control" 
            placeholder="Legenda explicativa (ex: Canto com levíssima marca de guardado, folhas limpas)" 
            value="${caption.replace(/"/g, '&quot;')}"
            oninput="handleDetailCaptionChange(${index}, this.value)"
            required
          >
        </div>

        <button type="button" class="btn-remove-detail" onclick="removeDetailRow(${index})" title="Remover este detalhe">
          ✕
        </button>
      </div>
    `;
  }).join('');
}

DOM.addDetailBtn.addEventListener('click', () => {
  state.dynamicDetails.push({ url: '', legenda: '' });
  renderDetailsList();
});

window.removeDetailRow = function(index) {
  state.dynamicDetails.splice(index, 1);
  renderDetailsList();
};

window.handleDetailUrlChange = function(index, value) {
  if (state.dynamicDetails[index]) {
    state.dynamicDetails[index].url = value;
    const imgElem = document.getElementById(`det_prev_${index}`);
    if (imgElem) imgElem.src = resolveImgUrl(value);
  }
};

window.handleDetailCaptionChange = function(index, value) {
  if (state.dynamicDetails[index]) {
    state.dynamicDetails[index].legenda = value;
  }
};

// ==========================================================================
// 8. Upload de Imagens via GitHub API (commit do arquivo de imagem)
// ==========================================================================
async function uploadImageToGitHub(file) {
  if (!ensureToken()) throw new Error('Token não configurado.');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // reader.result = "data:image/jpeg;base64,AAAA..."
        const base64 = reader.result.split(',')[1];
        const ext = file.name.split('.').pop().toLowerCase();
        const safeName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '-');
        const filename = `${Date.now()}-${safeName}`;
        const filePath = `images/produtos/${filename}`;

        const sha = await GH.getFileSha(filePath); // normalmente null (arquivo novo)
        await GH.commitFile(filePath, base64, `Admin: upload de imagem ${filename}`, sha);

        resolve(filePath);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

window.handleFileUpload = async function(event, key) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  // Mostra o preview local instantaneamente
  DOM[`prev_${key}`].src = URL.createObjectURL(file);

  try {
    showToast(`⏳ Enviando foto para o GitHub...`);
    const url = await uploadImageToGitHub(file);
    DOM[`img_${key}`].value = url;
    showToast(`✅ Foto enviada: ${url}`);
  } catch (err) {
    console.error('Erro no upload:', err);
    alert('Erro ao enviar imagem: ' + err.message);
  }
};

window.handleDetailFileUpload = async function(event, index) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  // Mostra o preview local instantaneamente
  const localPreview = URL.createObjectURL(file);
  const imgElem = document.getElementById(`det_prev_${index}`);
  if (imgElem) imgElem.src = localPreview;

  try {
    showToast(`⏳ Enviando foto de detalhe...`);
    const url = await uploadImageToGitHub(file);
    state.dynamicDetails[index].url = url;
    showToast(`✅ Foto de detalhe enviada!`);
  } catch (err) {
    console.error('Erro no upload de detalhe:', err);
    alert('Erro ao enviar foto de detalhe: ' + err.message);
  }
};

['frente', 'verso', 'lombada1', 'lombada2', 'folhas'].forEach(key => {
  const input = DOM[`img_${key}`];
  const prev = DOM[`prev_${key}`];
  if (input && prev) {
    input.addEventListener('input', () => {
      prev.src = resolveImgUrl(input.value.trim());
    });
  }
});

// ==========================================================================
// 9. Salvar Formulário do Livro (Submit com Múltiplas Categorias)
// ==========================================================================
DOM.bookForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = DOM.bookId.value || `livro-${Date.now()}`;
  const nome = DOM.bookNome.value.trim();
  const autor = DOM.bookAutor.value.trim();

  // Coleta todas as categorias marcadas
  const checkedBoxes = Array.from(document.querySelectorAll('input[name="adminCategorias"]:checked'));
  const categorias = checkedBoxes.map(cb => cb.value.trim().toLowerCase());

  if (categorias.length === 0) {
    alert('Por favor, selecione ao menos uma categoria para o livro.');
    return;
  }

  const valor = parseFloat(DOM.bookValor.value) || 0;
  const estado = DOM.bookEstado.value;
  const descricao = DOM.bookDescricao.value.trim();
  const vendido = DOM.bookVendido.checked;

  const imagens = {
    frente: DOM.img_frente.value.trim(),
    verso: DOM.img_verso.value.trim(),
    lombada1: DOM.img_lombada1.value.trim(),
    lombada2: DOM.img_lombada2.value.trim(),
    folhas: DOM.img_folhas.value.trim(),
    detalhes: state.dynamicDetails
      .filter(d => d.url && d.url.trim() !== '')
      .map(d => ({
        url: d.url.trim(),
        legenda: (d.legenda || '').trim()
      }))
  };

  const bookData = {
    id,
    nome,
    autor,
    categorias,
    categoria: categorias[0], // compatibilidade retroativa
    valor,
    estado,
    descricao,
    imagens,
    vendido
  };

  if (state.editingBookId) {
    const idx = state.products.findIndex(b => String(b.id) === String(state.editingBookId));
    if (idx !== -1) {
      state.products[idx] = bookData;
    }
  } else {
    state.products.unshift(bookData);
  }

  await saveProductsToServer(`"${nome}" salvo com sucesso no produtos.json!`);
  closeModal();
});

// ==========================================================================
// 10. Backup do produtos.json
// ==========================================================================
DOM.backupBtn.addEventListener('click', () => {
  const jsonStr = JSON.stringify(state.products, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `produtos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup do produtos.json baixado!');
});

// ==========================================================================
// 11. Filtros e Event Listeners
// ==========================================================================
function setupEventListeners() {
  DOM.newBookBtn.addEventListener('click', openCreateModal);
  DOM.closeModalBtn.addEventListener('click', closeModal);
  DOM.cancelFormBtn.addEventListener('click', closeModal);

  DOM.bookFormModal.addEventListener('click', (e) => {
    if (e.target === DOM.bookFormModal) closeModal();
  });

  // Busca
  DOM.adminSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderTable();
  });

  // Filtros de Status
  DOM.filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.currentFilter = btn.dataset.filter;
      renderTable();
    });
  });

  // Tecla Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.bookFormModal.classList.contains('is-open')) {
      closeModal();
    }
  });
}

function showToast(msg) {
  DOM.adminToast.textContent = msg;
  DOM.adminToast.classList.add('show');
  setTimeout(() => {
    DOM.adminToast.classList.remove('show');
  }, 3500);
}
