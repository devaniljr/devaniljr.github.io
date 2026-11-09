/**
 * Script de Deploy para GitHub Pages
 * Publica os arquivos públicos da loja + o painel admin.
 * O server.js (backend local) é excluído — não faz sentido no GitHub Pages.
 */

const ghpages = require('gh-pages');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(__dirname, '..', '.dist_deploy');

console.log('📦 Preparando arquivos para deploy no GitHub Pages...');

// Limpa pasta temporária anterior se existir
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Função auxiliar para cópia recursiva
function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Copia index.html e produtos.json
fs.copyFileSync(path.join(ROOT_DIR, 'index.html'), path.join(DIST_DIR, 'index.html'));
fs.copyFileSync(path.join(ROOT_DIR, 'produtos.json'), path.join(DIST_DIR, 'produtos.json'));

// 2. Copia pastas públicas (css, js, images)
copyFolderRecursive(path.join(ROOT_DIR, 'css'), path.join(DIST_DIR, 'css'));
copyFolderRecursive(path.join(ROOT_DIR, 'js'), path.join(DIST_DIR, 'js'));
copyFolderRecursive(path.join(ROOT_DIR, 'images'), path.join(DIST_DIR, 'images'));

// 3. Copia o painel admin (com login.html de autenticação)
copyFolderRecursive(path.join(ROOT_DIR, 'admin'), path.join(DIST_DIR, 'admin'));

// 4. Cria arquivo .nojekyll para o GitHub Pages não ignorar arquivos
fs.writeFileSync(path.join(DIST_DIR, '.nojekyll'), '');

console.log('✅ Arquivos copiados para deploy:');
console.log('   - index.html');
console.log('   - produtos.json');
console.log('   - css/');
console.log('   - js/');
console.log('   - images/');
console.log('   - admin/  ✅ (painel com autenticação)');
console.log('🔒 server.js e node_modules foram EXCLUÍDOS do pacote de deploy.');

console.log('\n🚀 Iniciando publicação no GitHub Pages (branch gh-pages)...');

ghpages.publish(DIST_DIR, {
  branch: 'gh-pages',
  dotfiles: true,
  message: 'Deploy: Atualização da Lojinha do Dev (produtos.json & assets)'
}, (err) => {
  // Limpa pasta temporária
  fs.rmSync(DIST_DIR, { recursive: true, force: true });

  if (err) {
    console.error('❌ Erro durante o deploy:', err);
    console.log('\nDica: Verifique se o seu repositório remoto git está configurado (git remote -v).');
    process.exit(1);
  } else {
    console.log('🎉 Deploy concluído com sucesso no branch gh-pages!');
    console.log('👉 Acesse: https://devaniljr.github.io/admin/login.html');
  }
});
