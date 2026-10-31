const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUTOS_PATH = path.join(__dirname, 'produtos.json');
const UPLOAD_DIR = path.join(__dirname, 'images', 'produtos');

// Garante que o diretório de imagens existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const uniqueName = `${Date.now()}-${baseName}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (allowed.test(ext) || allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem (JPG, PNG, WebP, GIF, SVG) são permitidos.'));
    }
  }
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rotas da API
// 1. Obter todos os produtos
app.get('/api/produtos', (req, res) => {
  try {
    if (!fs.existsSync(PRODUTOS_PATH)) {
      fs.writeFileSync(PRODUTOS_PATH, '[]', 'utf-8');
      return res.json([]);
    }
    const data = fs.readFileSync(PRODUTOS_PATH, 'utf-8');
    const produtos = JSON.parse(data || '[]');
    res.json(produtos);
  } catch (err) {
    console.error('Erro ao ler produtos.json:', err);
    res.status(500).json({ error: 'Erro ao ler arquivo de produtos.' });
  }
});

// 2. Salvar todos os produtos (substituição / atualização)
app.post('/api/produtos', (req, res) => {
  try {
    const produtos = req.body;
    if (!Array.isArray(produtos)) {
      return res.status(400).json({ error: 'Os dados enviados devem ser uma lista de produtos.' });
    }

    // Salva com indentação de 2 espaços para manter o JSON limpo e legível
    fs.writeFileSync(PRODUTOS_PATH, JSON.stringify(produtos, null, 2), 'utf-8');
    console.log(`[Admin] produtos.json atualizado com sucesso! Total de itens: ${produtos.length}`);
    res.json({ success: true, message: 'Produtos salvos com sucesso!', count: produtos.length });
  } catch (err) {
    console.error('Erro ao gravar produtos.json:', err);
    res.status(500).json({ error: 'Erro ao salvar produtos no arquivo.' });
  }
});

// 3. Upload de imagem
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const relativePath = `images/produtos/${req.file.filename}`;
    res.json({
      success: true,
      url: relativePath,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (err) {
    console.error('Erro no upload de imagem:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar imagem.' });
  }
});

// Servir arquivos estáticos da loja
app.use(express.static(path.join(__dirname)));

// Servir o painel admin explicitamente na rota /admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Fallback para admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Inicia servidor
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`☕ Lojinha do Dev iniciada com sucesso!`);
  console.log(`👉 Loja Pública:  http://localhost:${PORT}`);
  console.log(`🛠️  Painel Admin:  http://localhost:${PORT}/admin`);
  console.log('====================================================');
});
