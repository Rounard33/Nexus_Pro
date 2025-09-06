#!/usr/bin/env node

/**
 * Script de build pour ThemeForest
 * Crée une archive prête pour la soumission
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building NexusPro Theme for ThemeForest...\n');

// 1. Nettoyer les dossiers de build
console.log('📁 Cleaning build directories...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
if (fs.existsSync('themeforest-package')) {
  fs.rmSync('themeforest-package', { recursive: true });
}

// 2. Build de production
console.log('🔨 Building production version...');
try {
  execSync('ng build --configuration production', { stdio: 'inherit' });
  console.log('✅ Production build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// 3. Créer la structure ThemeForest
console.log('📦 Creating ThemeForest package structure...');
const packageDir = 'themeforest-package';
const sourceDir = 'source-files';
const previewDir = 'preview-images';

// Créer les dossiers
fs.mkdirSync(packageDir, { recursive: true });
fs.mkdirSync(path.join(packageDir, sourceDir), { recursive: true });
fs.mkdirSync(path.join(packageDir, previewDir), { recursive: true });

// 4. Copier les fichiers source
console.log('📋 Copying source files...');
const sourceFiles = [
  'src',
  'angular.json',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.spec.json',
  'README.md',
  'INSTALLATION.md',
  'CUSTOMIZATION.md',
  'CHANGELOG.md',
  'LICENSE'
];

sourceFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const dest = path.join(packageDir, sourceDir, file);
    if (fs.statSync(file).isDirectory()) {
      fs.cpSync(file, dest, { recursive: true });
    } else {
      fs.copyFileSync(file, dest);
    }
    console.log(`  ✅ Copied ${file}`);
  } else {
    console.log(`  ⚠️  Skipped ${file} (not found)`);
  }
});

// 5. Copier les fichiers de build
console.log('🌐 Copying build files...');
fs.cpSync('dist', path.join(packageDir, 'dist'), { recursive: true });
console.log('  ✅ Copied dist/');

// 6. Créer les fichiers ThemeForest
console.log('📝 Creating ThemeForest files...');

// Description
const description = `🚀 NEXUSPRO - TEMPLATE ANGULAR PREMIUM

✨ CARACTÉRISTIQUES PRINCIPALES :
• Design moderne et professionnel
• 100% Responsive (Mobile, Tablet, Desktop)
• Code Angular 17 + TypeScript
• Performance optimisée
• Documentation complète
• Support 24/7

🎨 SECTIONS INCLUSES :
• Page d'accueil avec hero animé
• À propos avec équipe
• Services détaillés
• Portfolio avec filtres
• Témoignages clients
• Tarifs et plans
• Contact avec formulaire

💻 TECHNOLOGIES :
• Angular 17
• TypeScript 5
• SCSS
• RxJS

📱 RESPONSIVE DESIGN :
• Mobile First
• Breakpoints optimisés
• Touch-friendly
• Performance mobile

🎯 PERFECT FOR :
• Agences web
• Freelancers
• Startups
• Entreprises
• Portfolios

🔧 FONCTIONNALITÉS AVANCÉES :
• Animations fluides
• Mode sombre
• Parallax effects
• Micro-interactions
• Lazy loading
• SEO optimisé

📚 DOCUMENTATION :
• Guide d'installation
• Guide de personnalisation
• Code commenté
• Exemples inclus

🆘 SUPPORT :
• Email support
• Documentation complète
• Mises à jour gratuites
• Communauté active

💰 LICENCE :
• Usage commercial
• Projets illimités
• Redistribution autorisée
• Support inclus

🎉 PRÊT À L'EMPLOI :
• Installation en 5 minutes
• Personnalisation facile
• Code propre et documenté
• Performance optimisée`;

fs.writeFileSync(path.join(packageDir, 'description.txt'), description);

// Instructions d'installation
const installationInstructions = `INSTRUCTIONS D'INSTALLATION

1. Télécharger et extraire l'archive
2. Installer Node.js 18+ et npm
3. Ouvrir un terminal dans le dossier source-files
4. Exécuter : npm install
5. Exécuter : ng serve
6. Ouvrir http://localhost:4200

Pour plus de détails, voir INSTALLATION.md`;

fs.writeFileSync(path.join(packageDir, 'INSTALLATION.txt'), installationInstructions);

// 7. Créer les dossiers pour les images de prévisualisation
console.log('🖼️  Creating preview images structure...');
const previewImages = [
  '01-homepage.jpg',
  '02-about.jpg',
  '03-services.jpg',
  '04-portfolio.jpg',
  '05-contact.jpg',
  '06-mobile.jpg',
  '07-dark-mode.jpg'
];

previewImages.forEach(image => {
  const placeholder = `# Placeholder for ${image}
# Image size: 1920x1080px
# Format: JPG
# Quality: High
# Content: Screenshot of ${image.replace('.jpg', '').replace('0', '')} page`;
  
  fs.writeFileSync(path.join(packageDir, previewDir, image.replace('.jpg', '.txt')), placeholder);
});

// 8. Créer l'archive ZIP
console.log('📦 Creating ZIP archive...');
try {
  execSync(`cd ${packageDir} && zip -r ../nexuspro-themeforest.zip .`, { stdio: 'inherit' });
  console.log('✅ ZIP archive created: nexuspro-themeforest.zip\n');
} catch (error) {
  console.log('⚠️  ZIP creation failed, but package directory is ready');
}

// 9. Afficher le résumé
console.log('🎉 Build completed successfully!\n');
console.log('📁 Package structure:');
console.log('   themeforest-package/');
console.log('   ├── source-files/          # Code source complet');
console.log('   ├── dist/                  # Build de production');
console.log('   ├── preview-images/        # Images de prévisualisation');
console.log('   ├── description.txt        # Description ThemeForest');
console.log('   └── INSTALLATION.txt       # Instructions rapides');
console.log('\n📋 Next steps:');
console.log('   1. Ajouter les images de prévisualisation (1920x1080px)');
console.log('   2. Créer main-preview.jpg (590x400px)');
console.log('   3. Créer thumbnail.jpg (80x80px)');
console.log('   4. Tester l\'installation');
console.log('   5. Soumettre sur ThemeForest');
console.log('\n🚀 Ready for ThemeForest submission!');
