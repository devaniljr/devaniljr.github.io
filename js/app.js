/**
 * Lojinha do Dev - Frontend Application
 * Consumo do catálogo, categorias (Especiais, Programação, Filosofia, etc), 
 * galeria de fotos com legendas, Frete Grátis via Registro Módico e WhatsApp.
 */

// Configurações Globais
const CONFIG = {
  WHATSAPP_NUMBER: '5569993306972',
  STORAGE_CART_KEY: 'lojinha_dev_cart_v1',
  DATA_URL: './produtos.json'
};

// Estado da Aplicação
const state = {
  allProducts: [],        // Apenas produtos disponíveis (vendido === false)
  filteredProducts: [],   // Produtos filtrados pela categoria/busca/ordenação
  currentCategory: 'todos',// Categoria ativa
  cart: [],               // Itens na sacola
  activeModalBook: null,  // Livro atualmente aberto no modal
  modalAngles: []         // Ângulos do livro no modal
};

// Nomes amigáveis para as categorias no cabeçalho
const CATEGORY_NAMES = {
  'todos': 'Todos os Livros',
  'especiais': '⭐ Edições Especiais',
  'programação': '💻 Livros de Programação',
  'filosofia': '🏛️ Livros de Filosofia',
  'ciência': '🔬 Livros de Ciência',
  'inglês': '🇬🇧 Livros em Inglês & Gramática',
  'espanhol': '🇪🇸 Livros em Espanhol & Gramática',
  'concursos': '⚖️ Livros para Concursos Públicos'
};

// Elementos do DOM
const DOM = {
  productGrid: document.getElementById('productGrid'),
  catalogCount: document.getElementById('catalogCount'),
  currentCategoryHeading: document.getElementById('currentCategoryHeading'),
  emptyCatalogState: document.getElementById('emptyCatalogState'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  resetSearchBtn: document.getElementById('resetSearchBtn'),
  sortSelect: document.getElementById('sortSelect'),
  categoriesNav: document.getElementById('categoriesNav'),

  // Modal de Detalhes
  bookModal: document.getElementById('bookModal'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  galleryMainImg: document.getElementById('galleryMainImg'),
  galleryCurrentBadge: document.getElementById('galleryCurrentBadge'),
  galleryCaptionBox: document.getElementById('galleryCaptionBox'),
  galleryCaptionText: document.getElementById('galleryCaptionText'),
  galleryThumbs: document.getElementById('galleryThumbs'),
  modalBookCategory: document.getElementById('modalBookCategory'),
  modalBookCondition: document.getElementById('modalBookCondition'),
  modalBookTitle: document.getElementById('modalBookTitle'),
  modalBookAuthor: document.getElementById('modalBookAuthor'),
  modalBookPrice: document.getElementById('modalBookPrice'),
  modalBookDescription: document.getElementById('modalBookDescription'),
  modalBuyNowBtn: document.getElementById('modalBuyNowBtn'),
  modalAddToCartBtn: document.getElementById('modalAddToCartBtn'),

  // Sacola / Gaveta
  cartToggleBtn: document.getElementById('cartToggleBtn'),
  cartDrawerBackdrop: document.getElementById('cartDrawerBackdrop'),
  cartCloseBtn: document.getElementById('cartCloseBtn'),
  cartItemsList: document.getElementById('cartItemsList'),
  cartEmptyState: document.getElementById('cartEmptyState'),
  cartFooter: document.getElementById('cartFooter'),
  cartCountBadge: document.getElementById('cartCountBadge'),
  cartTotalItemsCount: document.getElementById('cartTotalItemsCount'),
  cartSubtotalValue: document.getElementById('cartSubtotalValue'),
  cartTotalValue: document.getElementById('cartTotalValue'),
  customerNameInput: document.getElementById('customerNameInput'),
  customerAddressInput: document.getElementById('customerAddressInput'),
  cartCheckoutBtn: document.getElementById('cartCheckoutBtn'),
  cartClearBtn: document.getElementById('cartClearBtn'),
  cartStartShoppingBtn: document.getElementById('cartStartShoppingBtn'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// Formatação de Moeda BRL
function formatBRL(value) {
  const number = Number(value) || 0;
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Normaliza texto para comparações
function normalizeText(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ==========================================================================
// 1. Inicialização
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  fetchProducts();
  setupEventListeners();
});

// ==========================================================================
// 2. Carregamento dos Produtos (produtos.json)
// ==========================================================================
async function fetchProducts() {
  try {
    const res = await fetch(`${CONFIG.DATA_URL}?_=${Date.now()}`);
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
    const rawData = await res.json();

    // REGRA FUNDAMENTAL: Se vendido for true, NÃO mostra em nenhum lugar da loja pública
    state.allProducts = (Array.isArray(rawData) ? rawData : [])
      .filter(item => item && item.vendido !== true && item.vendido !== 'true');

    applyFiltersAndSort();
  } catch (error) {
    console.error('Falha ao carregar catálogo de produtos:', error);
    DOM.productGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Ops! Não conseguimos carregar os livros.</h3>
        <p>Verifique sua conexão ou tente recarregar a página.</p>
        <button onclick="location.reload()" class="btn btn-secondary">Tentar Novamente</button>
      </div>
    `;
    DOM.catalogCount.textContent = 'Indisponível no momento';
  }
}

// ==========================================================================
// 3. Filtros (Categorias, Busca e Ordenação)
// ==========================================================================
function applyFiltersAndSort() {
  const query = (DOM.searchInput.value || '').trim().toLowerCase();
  const sort = DOM.sortSelect.value;
  const activeCat = state.currentCategory;

  let list = state.allProducts.filter(book => {
    // 1. Filtro por Categoria
    if (activeCat !== 'todos') {
      const bookCat = normalizeText(book.categoria);
      const targetCat = normalizeText(activeCat);
      if (bookCat !== targetCat) {
        return false;
      }
    }

    // 2. Filtro por Busca de Texto
    if (query) {
      const title = (book.nome || '').toLowerCase();
      const author = (book.autor || '').toLowerCase();
      const desc = (book.descricao || '').toLowerCase();
      const cat = (book.categoria || '').toLowerCase();
      if (!title.includes(query) && !author.includes(query) && !desc.includes(query) && !cat.includes(query)) {
        return false;
      }
    }

    return true;
  });

  // 3. Ordenação
  if (sort === 'price-asc') {
    list.sort((a, b) => Number(a.valor || 0) - Number(b.valor || 0));
  } else if (sort === 'price-desc') {
    list.sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));
  } else if (sort === 'name-asc') {
    list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }

  state.filteredProducts = list;
  renderCatalog();
}

// ==========================================================================
// 4. Renderização do Catálogo (Grid de Livros)
// ==========================================================================
function renderCatalog() {
  const count = state.filteredProducts.length;
  DOM.catalogCount.textContent = `${count} ${count === 1 ? 'livro disponível' : 'livros disponíveis'}`;

  // Atualiza título da categoria ativa
  DOM.currentCategoryHeading.textContent = CATEGORY_NAMES[state.currentCategory] || 'Livros Disponíveis';

  // Controle do botão de limpar busca
  DOM.clearSearchBtn.style.display = DOM.searchInput.value ? 'block' : 'none';

  if (count === 0) {
    DOM.productGrid.style.display = 'none';
    DOM.emptyCatalogState.style.display = 'block';
    return;
  }

  DOM.emptyCatalogState.style.display = 'none';
  DOM.productGrid.style.display = 'grid';

  DOM.productGrid.innerHTML = state.filteredProducts.map(book => {
    const coverUrl = (book.imagens && book.imagens.frente) ? book.imagens.frente : 'images/placeholder-book.svg';
    const condition = book.estado || 'Seminovo';
    const author = book.autor || 'Autor não informado';
    const category = book.categoria || 'Geral';

    return `
      <article class="book-card" data-id="${book.id}">
        <div class="book-card__cover-wrap" onclick="openBookModal('${book.id}')">
          <div class="book-card__badges-overlay">
            <span class="book-card__shipping-badge">🚚 Frete Grátis</span>
            <span class="book-card__category-badge">${category}</span>
          </div>

          <img 
            src="${coverUrl}" 
            alt="Capa de ${book.nome}" 
            class="book-card__cover" 
            loading="lazy"
            onerror="this.src='images/placeholder-book.svg'"
          >
          <span class="book-card__inspect-hint">🔍 Ver fotos e ângulos</span>
        </div>

        <div class="book-card__body">
          <span class="book-card__condition-tag">${condition}</span>
          <h3 class="book-card__title" onclick="openBookModal('${book.id}')" title="${book.nome}">
            ${book.nome}
          </h3>
          <p class="book-card__author">${author}</p>

          <div class="book-card__price-row">
            <div class="book-card__price-wrap">
              <span class="book-card__price">${formatBRL(book.valor)}</span>
            </div>
            <span class="book-card__free-shipping-note">
              ✓ Frete Grátis (Correios)
            </span>
          </div>

          <div class="book-card__actions">
            <button class="btn btn-secondary btn-sm" onclick="openBookModal('${book.id}')" title="Inspecionar todos os ângulos e detalhes">
              🔍 Detalhes
            </button>
            <button class="btn btn-primary btn-sm" onclick="handleAddToCart('${book.id}')" title="Adicionar este livro à sacola">
              + Sacola
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================================================
// 5. Modal de Detalhes e Galeria de Fotos
// ==========================================================================
window.openBookModal = function(bookId) {
  const book = state.allProducts.find(b => String(b.id) === String(bookId));
  if (!book) return;

  state.activeModalBook = book;

  // Preenche dados textuais
  DOM.modalBookTitle.textContent = book.nome;
  DOM.modalBookAuthor.textContent = book.autor ? `Por ${book.autor}` : '';
  DOM.modalBookPrice.textContent = formatBRL(book.valor);
  DOM.modalBookCondition.textContent = book.estado || 'Exemplar físico';
  DOM.modalBookCategory.textContent = book.categoria ? `Categoria: ${book.categoria}` : 'Livro';
  DOM.modalBookDescription.textContent = book.descricao || 'Exemplar em bom estado físico para pronta entrega.';

  // Monta lista de fotos e ângulos disponíveis
  const angles = [];
  const imgs = book.imagens || {};

  if (imgs.frente) {
    angles.push({ key: 'frente', label: 'Capa Frente', url: imgs.frente, isDetail: false });
  }
  if (imgs.verso) {
    angles.push({ key: 'verso', label: 'Verso / Traseira', url: imgs.verso, isDetail: false });
  }
  if (imgs.lombada1) {
    angles.push({ key: 'lombada1', label: 'Lombada (1)', url: imgs.lombada1, isDetail: false });
  }
  if (imgs.lombada2) {
    angles.push({ key: 'lombada2', label: 'Lombada (2)', url: imgs.lombada2, isDetail: false });
  }
  if (imgs.folhas) {
    angles.push({ key: 'folhas', label: 'Folhas / Corte', url: imgs.folhas, isDetail: false });
  }

  // Detalhes (array com url e legenda)
  if (Array.isArray(imgs.detalhes)) {
    imgs.detalhes.forEach((det, idx) => {
      if (det && det.url) {
        angles.push({
          key: `detalhe-${idx}`,
          label: `Detalhe ${idx + 1}`,
          url: det.url,
          isDetail: true,
          caption: det.legenda || 'Observação do estado físico deste exemplar.'
        });
      }
    });
  }

  // Renderiza miniaturas
  if (angles.length > 0) {
    DOM.galleryThumbs.innerHTML = angles.map((item, i) => `
      <button 
        type="button" 
        class="gallery-thumb-btn ${i === 0 ? 'is-active' : ''}" 
        data-index="${i}"
        onclick="selectGalleryAngle(${i})"
        title="${item.label}"
      >
        <img src="${item.url}" alt="${item.label}">
        <span class="thumb-label">${item.label}</span>
      </button>
    `).join('');

    state.modalAngles = angles;
    selectGalleryAngle(0);
  } else {
    DOM.galleryThumbs.innerHTML = '<span style="font-size:0.8rem;color:#888;">Sem outras fotos disponíveis.</span>';
    DOM.galleryMainImg.src = 'images/placeholder-book.svg';
    DOM.galleryCurrentBadge.textContent = 'Sem Imagem';
    DOM.galleryCaptionBox.style.display = 'none';
  }

  // Ações do modal
  DOM.modalBuyNowBtn.onclick = () => buySingleBookViaWhatsApp(book);
  DOM.modalAddToCartBtn.onclick = () => {
    handleAddToCart(book.id);
  };

  // Abre modal
  DOM.bookModal.classList.add('is-open');
  DOM.bookModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

window.selectGalleryAngle = function(index) {
  const angle = (state.modalAngles || [])[index];
  if (!angle) return;

  const thumbBtns = DOM.galleryThumbs.querySelectorAll('.gallery-thumb-btn');
  thumbBtns.forEach((btn, i) => {
    btn.classList.toggle('is-active', i === index);
  });

  DOM.galleryMainImg.style.opacity = '0.35';
  setTimeout(() => {
    DOM.galleryMainImg.src = angle.url;
    DOM.galleryMainImg.alt = `${state.activeModalBook.nome} - ${angle.label}`;
    DOM.galleryCurrentBadge.textContent = angle.label;
    DOM.galleryMainImg.style.opacity = '1';
  }, 100);

  if (angle.isDetail && angle.caption) {
    DOM.galleryCaptionBox.style.display = 'block';
    DOM.galleryCaptionText.textContent = angle.caption;
  } else {
    DOM.galleryCaptionBox.style.display = 'none';
    DOM.galleryCaptionText.textContent = '';
  }
};

function closeBookModal() {
  DOM.bookModal.classList.remove('is-open');
  DOM.bookModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.activeModalBook = null;
}

// ==========================================================================
// 6. Carrinho de Compras em localStorage
// ==========================================================================
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_CART_KEY);
    state.cart = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.cart = [];
  }
  updateCartUI();
}

function saveCartToStorage() {
  try {
    localStorage.setItem(CONFIG.STORAGE_CART_KEY, JSON.stringify(state.cart));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
  updateCartUI();
}

window.handleAddToCart = function(bookId) {
  const book = state.allProducts.find(b => String(b.id) === String(bookId));
  if (!book) return;

  const existing = state.cart.find(item => String(item.id) === String(bookId));
  if (existing) {
    showToast(`"${book.nome}" já está na sua sacola!`);
    openCartDrawer();
    return;
  }

  const cartItem = {
    id: book.id,
    nome: book.nome,
    autor: book.autor || '',
    valor: Number(book.valor) || 0,
    imagem: (book.imagens && book.imagens.frente) ? book.imagens.frente : ''
  };

  state.cart.push(cartItem);
  saveCartToStorage();
  showToast(`"${book.nome}" adicionado à sacola com Frete Grátis! 📖`);
};

window.removeFromCart = function(bookId) {
  state.cart = state.cart.filter(item => String(item.id) !== String(bookId));
  saveCartToStorage();
};

function updateCartUI() {
  const count = state.cart.length;
  DOM.cartCountBadge.textContent = count;
  DOM.cartTotalItemsCount.textContent = count;

  DOM.cartCountBadge.style.transform = 'scale(1.25)';
  setTimeout(() => {
    DOM.cartCountBadge.style.transform = 'scale(1)';
  }, 180);

  if (count === 0) {
    DOM.cartItemsList.style.display = 'none';
    DOM.cartFooter.style.display = 'none';
    DOM.cartEmptyState.style.display = 'flex';
    return;
  }

  DOM.cartEmptyState.style.display = 'none';
  DOM.cartItemsList.style.display = 'flex';
  DOM.cartFooter.style.display = 'flex';

  DOM.cartItemsList.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <img src="${item.imagem}" alt="${item.nome}" class="cart-item__cover" onerror="this.src='images/placeholder-book.svg'">
      <div class="cart-item__info">
        <h4 class="cart-item__title">${item.nome}</h4>
        <div class="cart-item__price">${formatBRL(item.valor)} <span style="font-size:0.75rem; color:#2D6A4F; font-weight:600;">(Frete Grátis)</span></div>
      </div>
      <button class="cart-item__remove-btn" onclick="removeFromCart('${item.id}')" title="Remover da sacola" aria-label="Remover">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');

  const total = state.cart.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  DOM.cartSubtotalValue.textContent = formatBRL(total);
  DOM.cartTotalValue.textContent = formatBRL(total);
}

function openCartDrawer() {
  DOM.cartDrawerBackdrop.classList.add('is-open');
  DOM.cartDrawerBackdrop.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  DOM.cartDrawerBackdrop.classList.remove('is-open');
  DOM.cartDrawerBackdrop.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ==========================================================================
// 7. Integração e Checkout via WhatsApp com Frete Grátis
// ==========================================================================

// Compra direta de 1 único livro
function buySingleBookViaWhatsApp(book) {
  const bookName = book.nome || 'Livro';
  const price = formatBRL(book.valor);

  const message = [
    `☕ *Olá! Gostaria de comprar um livro na Lojinha do Dev:*`,
    ``,
    `📖 *Livro:* ${bookName}`,
    `💰 *Valor:* ${price}`,
    `🚚 *Frete:* GRÁTIS (Registro Módico Correios)`,
    ``,
    `O exemplar ainda está disponível? Como combinamos o pagamento e o envio?`
  ].join('\n');

  sendWhatsAppMessage(message);
}

// Checkout da Sacola
function checkoutCartViaWhatsApp() {
  if (state.cart.length === 0) return;

  const total = state.cart.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  const totalFormatted = formatBRL(total);
  const customerName = (DOM.customerNameInput.value || '').trim();
  const customerAddress = (DOM.customerAddressInput.value || '').trim();

  const lines = [
    `☕ *Olá! Gostaria de fazer um pedido na Lojinha do Dev:*`,
    ``,
    `📚 *Itens Escolhidos (${state.cart.length}):*`
  ];

  state.cart.forEach((item, index) => {
    lines.push(`${index + 1}. *${item.nome}* — ${formatBRL(item.valor)}`);
  });

  lines.push(``);
  lines.push(`💰 *Total dos Livros:* ${totalFormatted}`);
  lines.push(`🚚 *Frete:* GRÁTIS (Registro Módico Correios)`);

  if (customerName) {
    lines.push(`👤 *Meu Nome:* ${customerName}`);
  }
  if (customerAddress) {
    lines.push(`📍 *Endereço / CEP de Envio:* ${customerAddress}`);
  }

  lines.push(``);
  lines.push(`Os exemplares ainda estão disponíveis? Como combinamos o pagamento e o envio gratuito?`);

  sendWhatsAppMessage(lines.join('\n'));
}

function sendWhatsAppMessage(text) {
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ==========================================================================
// 8. Toast de Notificações
// ==========================================================================
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span> <span>${message}</span>`;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================================================
// 9. Event Listeners Globais
// ==========================================================================
function setupEventListeners() {
  // Seletor de Categorias
  const categoryPills = DOM.categoriesNav.querySelectorAll('.category-pill');
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      state.currentCategory = pill.dataset.category;
      applyFiltersAndSort();
    });
  });

  // Busca em tempo real
  DOM.searchInput.addEventListener('input', applyFiltersAndSort);
  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    applyFiltersAndSort();
    DOM.searchInput.focus();
  });
  DOM.resetSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.currentCategory = 'todos';
    categoryPills.forEach(p => {
      p.classList.toggle('is-active', p.dataset.category === 'todos');
    });
    applyFiltersAndSort();
  });

  // Ordenação
  DOM.sortSelect.addEventListener('change', applyFiltersAndSort);

  // Modal de Detalhes
  DOM.modalCloseBtn.addEventListener('click', closeBookModal);
  DOM.bookModal.addEventListener('click', (e) => {
    if (e.target === DOM.bookModal) closeBookModal();
  });

  // Sacola
  DOM.cartToggleBtn.addEventListener('click', openCartDrawer);
  DOM.cartCloseBtn.addEventListener('click', closeCartDrawer);
  DOM.cartDrawerBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.cartDrawerBackdrop) closeCartDrawer();
  });

  DOM.cartStartShoppingBtn.addEventListener('click', () => {
    closeCartDrawer();
  });

  DOM.cartCheckoutBtn.addEventListener('click', checkoutCartViaWhatsApp);

  DOM.cartClearBtn.addEventListener('click', () => {
    if (confirm('Deseja realmente esvaziar todos os itens da sacola?')) {
      state.cart = [];
      saveCartToStorage();
      showToast('Sacola esvaziada.');
    }
  });

  // Tecla Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.bookModal.classList.contains('is-open')) {
        closeBookModal();
      } else if (DOM.cartDrawerBackdrop.classList.contains('is-open')) {
        closeCartDrawer();
      }
    }
  });
}
