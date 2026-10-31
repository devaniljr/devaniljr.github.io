# ☕ Lojinha do Dev

Uma lojinha virtual estática, aconchegante (*cozy*) e super simples, ideal para vender livros físicos com transparência total sobre o estado real de cada exemplar e negociação direta via **WhatsApp**.

Projetada especialmente para deploy no **GitHub Pages**, com um **painel administrativo local** que atualiza o arquivo `produtos.json` por debaixo dos panos.

---

## ✨ Funcionalidades

### 📖 Loja Pública (GitHub Pages)
- **Design Aconchegante (*Cozy*):** Paleta quente em tons de papel, linho, café expresso e terracota, com tipografia literária (*Lora* + *Plus Jakarta Sans*).
- **Inspeção Completa do Livro (Galeria Interativa):**
  - Foto da Frente (capa)
  - Foto do Verso (contracapa)
  - Fotos das Lombadas (dois ângulos)
  - Fotos das Folhas (corte/miolo)
  - **Fotos de Detalhes:** visualização com **legendas explicativas** para demonstrar marcas, grifos, dobras ou estado impecável.
- **Filtro de Venda Automático:** Livros marcados com `vendido: true` são **completamente ocultados** da loja pública.
- **Compra Imediata ou Sacola:**
  - Botão *"Comprar agora pelo WhatsApp"* direto na ficha do livro.
  - Sacola de compras persistida no `localStorage` do navegador.
- **Checkout Inteligente no WhatsApp (Número `69993306972`):**
  - Gera uma mensagem estruturada com o resumo do pedido (títulos, valores individuais, valor total, nome e CEP para frete).
- **Busca e Ordenação:** Pesquisa por título, autor e ordenação por preço.

---

### 🛠️ Painel Admin (Uso Exclusivo Local)
- Acessível apenas em ambiente local (`http://localhost:3000/admin`).
- **Dashboard de Estoque:** Mostra total de livros, quantos estão disponíveis, quantos estão vendidos e o valor total em estoque ativo.
- **Cadastro e Edição Visual:**
  - Nome, autor, valor (R$), condição física e sinopse.
  - Upload direto de imagens (salva automaticamente em `images/produtos/`) ou preenchimento de URL.
  - Adição dinâmica de fotos de detalhes com legendas explicativas personalizadas.
- **Alternar Status com 1 Clique:**
  - Botão para marcar/desmarcar livro como **Vendido** instantaneamente.
- **Atualização Automática:** Grava diretamente no arquivo `produtos.json` no disco com formatação limpa.
- **Backup:** Botão para baixar uma cópia do `produtos.json` a qualquer momento.
- **Ignorado no Deploy:** O painel admin e o servidor local **não são enviados para o GitHub Pages**.

---

## 📁 Estrutura de Arquivos

```text
lojinha/
├── index.html               # Loja pública (GitHub Pages)
├── produtos.json            # Base de dados dos produtos (JSON)
├── css/
│   └── style.css            # Estilos aconchegantes da loja
├── js/
│   └── app.js               # Lógica da loja, sacola, galeria e WhatsApp
├── images/
│   ├── produtos/            # Fotos dos livros organizadas
│   └── placeholder-book.svg # Imagem de fallback
├── admin/                   # 🔒 Painel local de cadastro (ignorado no deploy)
│   ├── index.html
│   ├── admin.css
│   └── admin.js
├── server.js                # Servidor Node.js local (Express + Multer)
├── scripts/
│   └── deploy.js            # Script para deploy seguro no GitHub Pages
├── .github/workflows/
│   └── deploy.yml           # GitHub Action para deploy automático sem admin
├── package.json
└── README.md
```

---

## 🚀 Como Usar no Dia a Dia

### 1. Iniciar o Ambiente Local
Para abrir a loja e o painel de cadastro na sua máquina:

```bash
# Instala as dependências (caso seja a primeira vez)
npm install

# Inicia o servidor local
npm run dev
# ou: npm start
```

No terminal, você verá os links:
- **Loja Pública:** [http://localhost:3000](http://localhost:3000)
- **Painel de Cadastro:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

### 2. Cadastrar ou Atualizar Livros
1. Abra o painel em [http://localhost:3000/admin](http://localhost:3000/admin).
2. Clique em **"+ Cadastrar Livro"** ou no ícone **✏️** de qualquer livro existente.
3. Preencha as informações e adicione as fotos:
   - Clique em **"📁 Selecionar Arquivo"** em cada campo para subir fotos direto do seu computador.
   - Adicione quantas fotos de **detalhe com legenda** desejar.
4. Clique em **"Salvar no produtos.json"**.
5. O arquivo `produtos.json` será atualizado automaticamente na raiz do seu projeto!

---

### 3. Publicar no GitHub Pages

Você tem **duas formas simples** de fazer o deploy seguro (sem o admin):

#### Opção A: Pelo comando automatizado (Recomendado)
Execute:
```bash
npm run deploy
```
*Este comando copia apenas os arquivos públicos (`index.html`, `produtos.json`, `css/`, `js/`, `images/`) e publica diretamente na branch `gh-pages` do seu repositório no GitHub.*

#### Opção B: Pelo GitHub Actions (Automático ao dar `git push`)
Já deixamos configurado o arquivo `.github/workflows/deploy.yml`. Toda vez que você der:
```bash
git add produtos.json images/
git commit -m "Atualiza catálogo de livros"
git push origin main
```
O GitHub Actions irá publicar apenas a loja pública no GitHub Pages automaticamente.

---

## 📱 Configuração do WhatsApp

O número configurado é:
- **DDD + Número:** `(69) 99330-6972` (formato internacional: `5569993306972`)

Quando o cliente clica em **"Finalizar Pedido no WhatsApp"** ou **"Comprar agora pelo WhatsApp"**, a mensagem é montada perfeitamente:

```text
☕ Olá! Gostaria de fazer um pedido na Lojinha do Dev:

📚 Itens Escolhidos (2):
1. O Programador Pragmático — R$ 68,00
2. Código Limpo — R$ 75,00

💰 Total dos Livros: R$ 143,00
👤 Meu Nome: Lucas
📍 Meu CEP para Frete: 76801-000

Os exemplares ainda estão disponíveis? Como podemos combinar o pagamento e o envio?
```
