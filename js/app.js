/**
 * Lojinha do Dev - Frontend Application
 * Design limpo, foco nos livros, fotos detalhadas e checkout WhatsApp.
 */

const CONFIG = {
  WHATSAPP_NUMBER: '5569993306972',
  STORAGE_CART_KEY: 'lojinha_dev_cart_v1',
  DATA_URL: './produtos.json'
};

const state = {
  allProducts: [],
  filteredProducts: [],
  currentCategory: 'todos',
  cart: [],
  activeModalBook: null,
  modalAngles: []
};

const CATEGORY_NAMES = {
  'todos': 'Todos os Livros',
  'especiais': 'Edições Especiais',
  'programação': 'Programação',
  'filosofia': 'Filosofia',
  'ciência': 'Ciência',
  'inglês': 'Inglês',
  'espanhol': 'Espanhol',
  'concursos': 'Concursos'
};

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

  // Modal
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

  // Sacola
  cartToggleBtn: document.getElementById('cartToggleBtn'),
  cartDrawerBackdrop: document.getElementById('cartDrawerBackdrop'),
  cartCloseBtn: document.getElementById('cartCloseBtn'),
  cartItemsList: document.getElementById('cartItemsList'),
  cartEmptyState: document.getElementById('cartEmptyState'),
  cartFooter: document.getElementById('cartFooter'),
  cartCountBadge: document.getElementById('cartCountBadge'),
  cartTotalValue: document.getElementById('cartTotalValue'),
  customerNameInput: document.getElementById('customerNameInput'),
  customerAddressInput: document.getElementById('customerAddressInput'),
  cartCheckoutBtn: document.getElementById('cartCheckoutBtn'),
  cartClearBtn: document.getElementById('cartClearBtn'),
  cartStartShoppingBtn: document.getElementById('cartStartShoppingBtn'),

  toastContainer: document.getElementById('toastContainer')
};

function formatBRL(value) {
  const number = Number(value) || 0;
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function normalizeText(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  fetchProducts();
  setupEventListeners();
});

// Carregamento dos Produtos
async function fetchProducts() {
  try {
    const res = await fetch(`${CONFIG.DATA_URL}?_=${Date.now()}`);
    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
    const rawData = await res.json();

    // Filtra vendidos: vendido === true NUNCA aparece na loja
    state.allProducts = (Array.isArray(rawData) ? rawData : [])
      .filter(item => item && item.vendido !== true && item.vendido !== 'true');

    applyFiltersAndSort();
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    DOM.productGrid.innerHTML = `
      <div class="empty-state">
        <p>Não foi possível carregar os livros no momento.</p>
        <button onclick="location.reload()" class="btn btn-secondary btn-sm">Tentar Novamente</button>
      </div>
    `;
  }
}

// Filtros e Ordenação
function applyFiltersAndSort() {
  const query = (DOM.searchInput.value || '').trim().toLowerCase();
  const sort = DOM.sortSelect.value;
  const activeCat = state.currentCategory;

  let list = state.allProducts.filter(book => {
    // Categoria
    if (activeCat !== 'todos') {
      const bookCats = getBookCategories(book).map(c => normalizeText(c));
      if (!bookCats.includes(normalizeText(activeCat))) {
        return false;
      }
    }

    // Busca textual
    if (query) {
      const title = (book.nome || '').toLowerCase();
      const author = (book.autor || '').toLowerCase();
      const desc = (book.descricao || '').toLowerCase();
      const cats = getBookCategories(book).join(' ').toLowerCase();
      if (!title.includes(query) && !author.includes(query) && !desc.includes(query) && !cats.includes(query)) {
        return false;
      }
    }

    return true;
  });

  // Ordenação
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

// Renderização do Catálogo (Cards Limpos)
function renderCatalog() {
  const count = state.filteredProducts.length;
  DOM.catalogCount.textContent = `${count} ${count === 1 ? 'livro' : 'livros'}`;
  DOM.currentCategoryHeading.textContent = CATEGORY_NAMES[state.currentCategory] || 'Livros';
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
    const author = book.autor || '';
    const condition = book.estado || 'Seminovo';

    return `
      <article class="book-card" data-id="${book.id}">
        <div class="book-card__cover-wrap" onclick="openBookModal('${book.id}')">
          <img 
            src="${coverUrl}" 
            alt="${book.nome}" 
            class="book-card__cover" 
            loading="lazy"
            onerror="this.src='images/placeholder-book.svg'"
          >
        </div>

        <div class="book-card__body">
          <div class="book-card__meta">
            <span class="book-card__condition">${condition}</span>
          </div>

          <h3 class="book-card__title" onclick="openBookModal('${book.id}')" title="${book.nome}">
            ${book.nome}
          </h3>
          ${author ? `<p class="book-card__author">${author}</p>` : ''}

          <div class="book-card__footer">
            <span class="book-card__price">${formatBRL(book.valor)}</span>
            <div class="book-card__actions">
              <button class="btn btn-secondary btn-sm" onclick="openBookModal('${book.id}')">
                Fotos
              </button>
              <button class="btn btn-primary btn-sm" onclick="handleAddToCart('${book.id}')">
                + Sacola
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Modal de Fotos e Detalhes
window.openBookModal = function(bookId) {
  const book = state.allProducts.find(b => String(b.id) === String(bookId));
  if (!book) return;

  state.activeModalBook = book;

  DOM.modalBookTitle.textContent = book.nome;
  DOM.modalBookAuthor.textContent = book.autor ? `Por ${book.autor}` : '';
  DOM.modalBookPrice.textContent = formatBRL(book.valor);
  DOM.modalBookCondition.textContent = book.estado || 'Seminovo';

  const cats = getBookCategories(book);
  DOM.modalBookCategory.textContent = cats.join(' • ') || 'Livro';
  DOM.modalBookDescription.textContent = book.descricao || 'Exemplar físico pronto para envio.';

  // Montagem da lista de fotos
  const angles = [];
  const imgs = book.imagens || {};

  if (imgs.frente) angles.push({ label: 'Frente', url: imgs.frente, isDetail: false });
  if (imgs.verso) angles.push({ label: 'Verso', url: imgs.verso, isDetail: false });
  if (imgs.lombada1) angles.push({ label: 'Lombada 1', url: imgs.lombada1, isDetail: false });
  if (imgs.lombada2) angles.push({ label: 'Lombada 2', url: imgs.lombada2, isDetail: false });
  if (imgs.folhas) angles.push({ label: 'Folhas', url: imgs.folhas, isDetail: false });

  if (Array.isArray(imgs.detalhes)) {
    imgs.detalhes.forEach((det, idx) => {
      if (det && det.url) {
        angles.push({
          label: `Detalhe ${idx + 1}`,
          url: det.url,
          isDetail: true,
          caption: det.legenda || 'Detalhe do estado físico deste exemplar.'
        });
      }
    });
  }

  if (angles.length > 0) {
    DOM.galleryThumbs.innerHTML = angles.map((item, i) => `
      <button 
        type="button" 
        class="gallery-thumb-btn ${i === 0 ? 'is-active' : ''}" 
        onclick="selectGalleryAngle(${i})"
      >
        <img src="${item.url}" alt="${item.label}">
        <span class="thumb-label">${item.label}</span>
      </button>
    `).join('');

    state.modalAngles = angles;
    selectGalleryAngle(0);
  } else {
    DOM.galleryThumbs.innerHTML = '';
    DOM.galleryMainImg.src = 'images/placeholder-book.svg';
    DOM.galleryCurrentBadge.textContent = 'Sem foto';
    DOM.galleryCaptionBox.style.display = 'none';
  }

  DOM.modalBuyNowBtn.onclick = () => buySingleBookViaWhatsApp(book);
  DOM.modalAddToCartBtn.onclick = () => handleAddToCart(book.id);

  DOM.bookModal.classList.add('is-open');
  DOM.bookModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

window.selectGalleryAngle = function(index) {
  const angle = (state.modalAngles || [])[index];
  if (!angle) return;

  const thumbBtns = DOM.galleryThumbs.querySelectorAll('.gallery-thumb-btn');
  thumbBtns.forEach((btn, i) => btn.classList.toggle('is-active', i === index));

  DOM.galleryMainImg.src = angle.url;
  DOM.galleryCurrentBadge.textContent = angle.label;

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

// Carrinho em localStorage
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
    showToast(`"${book.nome}" já está na sua sacola.`);
    openCartDrawer();
    return;
  }

  state.cart.push({
    id: book.id,
    nome: book.nome,
    autor: book.autor || '',
    valor: Number(book.valor) || 0,
    imagem: (book.imagens && book.imagens.frente) ? book.imagens.frente : ''
  });

  saveCartToStorage();
  showToast(`"${book.nome}" adicionado.`);
};

window.removeFromCart = function(bookId) {
  state.cart = state.cart.filter(item => String(item.id) !== String(bookId));
  saveCartToStorage();
};

function updateCartUI() {
  const count = state.cart.length;
  DOM.cartCountBadge.textContent = count;

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
        <div class="cart-item__price">${formatBRL(item.valor)}</div>
      </div>
      <button class="cart-item__remove-btn" onclick="removeFromCart('${item.id}')" title="Remover" aria-label="Remover">
        ✕
      </button>
    </div>
  `).join('');

  const total = state.cart.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
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

// Integração com WhatsApp (Mensagens Limpas)
function buySingleBookViaWhatsApp(book) {
  const bookName = book.nome || 'Livro';
  const price = formatBRL(book.valor);

  const message = [
    `*Lojinha do Dev - Pedido*`,
    ``,
    `Ola! Gostaria de comprar o livro:`,
    `- Livro: *${bookName}*`,
    `- Valor: ${price}`,
    `- Frete: GRATIS (Registro Modico Correios)`,
    ``,
    `O exemplar ainda esta disponivel? Como combinamos o pagamento e o envio?`
  ].join('\n');

  sendWhatsAppMessage(message);
}

function checkoutCartViaWhatsApp() {
  if (state.cart.length === 0) return;

  const total = state.cart.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
  const totalFormatted = formatBRL(total);
  const customerName = (DOM.customerNameInput.value || '').trim();
  const customerAddress = (DOM.customerAddressInput.value || '').trim();

  const lines = [
    `*Lojinha do Dev - Pedido*`,
    ``,
    `Ola! Gostaria de fazer o pedido dos seguintes livros:`,
    ``,
    `[Itens Escolhidos (${state.cart.length})]:`
  ];

  state.cart.forEach((item, index) => {
    lines.push(`${index + 1}. *${item.nome}* - ${formatBRL(item.valor)}`);
  });

  lines.push(``);
  lines.push(`- *Total:* ${totalFormatted}`);
  lines.push(`- *Frete:* GRATIS (Registro Modico Correios)`);

  if (customerName) {
    lines.push(`- *Nome:* ${customerName}`);
  }
  if (customerAddress) {
    lines.push(`- *Endereco de Envio:* ${customerAddress}`);
  }

  lines.push(``);
  lines.push(`Os livros estao disponiveis? Como podemos combinar o pagamento e o envio?`);

  sendWhatsAppMessage(lines.join('\n'));
}

function sendWhatsAppMessage(text) {
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Toast
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}

// Event Listeners
function setupEventListeners() {
  const categoryPills = DOM.categoriesNav.querySelectorAll('.category-pill');
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      state.currentCategory = pill.dataset.category;
      applyFiltersAndSort();
    });
  });

  DOM.searchInput.addEventListener('input', applyFiltersAndSort);
  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    applyFiltersAndSort();
    DOM.searchInput.focus();
  });
  DOM.resetSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.currentCategory = 'todos';
    categoryPills.forEach(p => p.classList.toggle('is-active', p.dataset.category === 'todos'));
    applyFiltersAndSort();
  });

  DOM.sortSelect.addEventListener('change', applyFiltersAndSort);

  DOM.modalCloseBtn.addEventListener('click', closeBookModal);
  DOM.bookModal.addEventListener('click', (e) => {
    if (e.target === DOM.bookModal) closeBookModal();
  });

  DOM.cartToggleBtn.addEventListener('click', openCartDrawer);
  DOM.cartCloseBtn.addEventListener('click', closeCartDrawer);
  DOM.cartDrawerBackdrop.addEventListener('click', (e) => {
    if (e.target === DOM.cartDrawerBackdrop) closeCartDrawer();
  });

  DOM.cartStartShoppingBtn.addEventListener('click', () => closeCartDrawer());
  DOM.cartCheckoutBtn.addEventListener('click', checkoutCartViaWhatsApp);

  DOM.cartClearBtn.addEventListener('click', () => {
    if (confirm('Esvaziar a sacola?')) {
      state.cart = [];
      saveCartToStorage();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.bookModal.classList.contains('is-open')) closeBookModal();
      else if (DOM.cartDrawerBackdrop.classList.contains('is-open')) closeCartDrawer();
    }
  });
}
