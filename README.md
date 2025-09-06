# 🚀 NexusPro - Professional Angular Theme

<div align="center">
  <img src="preview-images/01-homepage.jpg" alt="NexusPro Theme Preview" width="800">
  
  [![Angular](https://img.shields.io/badge/Angular-17-red.svg)](https://angular.io/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
  [![SCSS](https://img.shields.io/badge/SCSS-CSS3-pink.svg)](https://sass-lang.com/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## ✨ Aperçu

**NexusPro** est un thème Angular professionnel et moderne, conçu pour créer des expériences web exceptionnelles. Parfait pour les agences, freelancers, startups et entreprises qui recherchent un design élégant et des performances optimales.

## 🎨 Caractéristiques Principales

### 🚀 **Technologies Modernes**
- **Angular 17** avec composants standalone
- **TypeScript 5** pour un code robuste
- **SCSS** pour un styling avancé
- **RxJS** pour la gestion d'état
- **Responsive Design** mobile-first

### 🎯 **Fonctionnalités Avancées**
- ✨ **Animations fluides** et micro-interactions
- 🌙 **Mode sombre** complet
- 📱 **100% Responsive** (Mobile, Tablet, Desktop)
- ⚡ **Performance optimisée** avec lazy loading
- 🎨 **Design moderne** et professionnel
- 🔧 **Facilement personnalisable**

### 📄 **Sections Incluses**
- 🏠 **Page d'accueil** avec hero animé
- 👥 **À propos** avec présentation d'équipe
- 🛠️ **Services** détaillés avec filtres
- 💼 **Portfolio** avec galerie interactive
- 💬 **Témoignages** avec carousel automatique
- 💰 **Tarifs** et plans détaillés
- 📞 **Contact** avec formulaire fonctionnel

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+ 
- npm 9+ ou yarn
- Angular CLI 17+

### Installation

1. **Télécharger le thème**
   ```bash
   # Extraire l'archive dans votre dossier de projet
   unzip nexuspro-theme.zip
   cd nexuspro-theme
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   # ou
   yarn install
   ```

3. **Lancer le serveur de développement**
   ```bash
   ng serve
   # ou
   npm start
   ```

4. **Ouvrir dans le navigateur**
   ```
   http://localhost:4200
   ```

## 🎨 Personnalisation

### Couleurs
Modifiez les variables CSS dans `src/styles.scss` :

```scss
:root {
  --primary-600: #3b82f6;    // Couleur principale
  --secondary-600: #8b5cf6;  // Couleur secondaire
  --accent-600: #f59e0b;     // Couleur d'accent
}
```

### Contenu
Éditez les données dans les composants :

```typescript
// src/app/pages/home/home.component.ts
features = [
  {
    icon: 'design',
    title: 'Votre Titre',
    description: 'Votre description...'
  }
];
```

### Images
Remplacez les images dans `src/assets/images/` :
- `logo.png` - Votre logo
- `hero-bg.jpg` - Image de fond hero
- `about-image.jpg` - Image section à propos

## 📱 Responsive Design

Le thème s'adapte parfaitement à tous les écrans :

- **Mobile** : < 768px
- **Tablet** : 768px - 1024px  
- **Desktop** : > 1024px

## 🌙 Mode Sombre

Le mode sombre est activé automatiquement selon les préférences système ou via le toggle dans le header.

## ⚡ Performance

- **Lazy Loading** des composants
- **Images optimisées** et compressées
- **CSS minifié** en production
- **Animations performantes** avec `requestAnimationFrame`

## 🛠️ Build et Déploiement

### Build de Production
```bash
ng build --configuration production
```

### Déploiement
```bash
# Les fichiers de production sont dans dist/
# Uploadez le contenu de dist/ sur votre serveur
```

## 📚 Documentation

- [Guide d'Installation](INSTALLATION.md)
- [Guide de Personnalisation](CUSTOMIZATION.md)
- [Changelog](CHANGELOG.md)

## 🎯 Compatibilité

### Navigateurs Supportés
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Versions Angular
- Angular 17+
- TypeScript 5+
- Node.js 18+

## 🆘 Support

### Support Inclus
- 📧 **Email** : support@nexuspro.com
- 📖 **Documentation** complète
- 🐛 **Corrections** de bugs
- 🔄 **Mises à jour** gratuites

### Communauté
- 💬 **Forum** : [GitHub Discussions](https://github.com/nexuspro/theme/discussions)
- 🐛 **Bugs** : [GitHub Issues](https://github.com/nexuspro/theme/issues)
- 💡 **Suggestions** : [GitHub Discussions](https://github.com/nexuspro/theme/discussions)

## 📄 Licence

Ce thème est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- **Angular Team** pour le framework exceptionnel
- **Unsplash** pour les images de démonstration
- **Communauté** pour les retours et suggestions

---

<div align="center">
  <p>Créé avec ❤️ pour la communauté Angular</p>
  <p>© 2024 NexusPro. Tous droits réservés.</p>
</div>