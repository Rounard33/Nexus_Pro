# 🎨 Guide de Personnalisation - NexusPro Theme

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Personnalisation des Couleurs](#personnalisation-des-couleurs)
3. [Typographie](#typographie)
4. [Layout et Structure](#layout-et-structure)
5. [Contenu des Pages](#contenu-des-pages)
6. [Images et Assets](#images-et-assets)
7. [Animations](#animations)
8. [Composants Personnalisés](#composants-personnalisés)
9. [Thèmes Prédéfinis](#thèmes-prédéfinis)
10. [Bonnes Pratiques](#bonnes-pratiques)

## 🎯 Vue d'ensemble

NexusPro est conçu pour être facilement personnalisable. Ce guide vous explique comment modifier tous les aspects du thème selon vos besoins.

### Structure des Fichiers
```
src/
├── app/
│   ├── components/          # Composants réutilisables
│   ├── pages/              # Pages principales
│   └── services/           # Services Angular
├── assets/
│   └── images/             # Images et assets
└── styles.scss             # Variables CSS globales
```

## 🎨 Personnalisation des Couleurs

### Variables CSS Principales
Modifiez les couleurs dans `src/styles.scss` :

```scss
:root {
  // Couleurs principales
  --primary-50: #f0f9ff;
  --primary-100: #e0f2fe;
  --primary-200: #bae6fd;
  --primary-300: #7dd3fc;
  --primary-400: #38bdf8;
  --primary-500: #0ea5e9;
  --primary-600: #0284c7;    // Couleur principale
  --primary-700: #0369a1;
  --primary-800: #075985;
  --primary-900: #0c4a6e;

  // Couleurs secondaires
  --secondary-50: #fdf4ff;
  --secondary-100: #fae8ff;
  --secondary-200: #f5d0fe;
  --secondary-300: #f0abfc;
  --secondary-400: #e879f9;
  --secondary-500: #d946ef;
  --secondary-600: #c026d3;  // Couleur secondaire
  --secondary-700: #a21caf;
  --secondary-800: #86198f;
  --secondary-900: #701a75;
}
```

### Exemples de Palettes

#### Palette Minimaliste
```scss
:root {
  --primary-600: #000000;
  --secondary-600: #666666;
  --accent-600: #cccccc;
}
```

#### Palette Colorée
```scss
:root {
  --primary-600: #ff6b6b;
  --secondary-600: #4ecdc4;
  --accent-600: #ffe66d;
}
```

#### Palette Professionnelle
```scss
:root {
  --primary-600: #2c3e50;
  --secondary-600: #3498db;
  --accent-600: #e74c3c;
}
```

## 📝 Typographie

### Polices Disponibles
```scss
:root {
  // Police principale
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  // Police des titres
  --heading-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Ajouter une Nouvelle Police
1. **Importer la police** dans `src/styles.scss` :
```scss
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
```

2. **Modifier les variables** :
```scss
:root {
  --font-family: 'Poppins', sans-serif;
  --heading-font: 'Poppins', sans-serif;
}
```

### Tailles de Police
```scss
:root {
  --font-size-xs: 0.75rem;    // 12px
  --font-size-sm: 0.875rem;   // 14px
  --font-size-base: 1rem;     // 16px
  --font-size-lg: 1.125rem;   // 18px
  --font-size-xl: 1.25rem;    // 20px
  --font-size-2xl: 1.5rem;    // 24px
  --font-size-3xl: 1.875rem;  // 30px
  --font-size-4xl: 2.25rem;   // 36px
}
```

## 🏗️ Layout et Structure

### Largeur du Conteneur
```scss
:root {
  --container-width: 1200px;  // Largeur maximale
}
```

### Espacements
```scss
:root {
  --spacing-xs: 0.25rem;   // 4px
  --spacing-sm: 0.5rem;    // 8px
  --spacing-md: 1rem;      // 16px
  --spacing-lg: 1.5rem;    // 24px
  --spacing-xl: 2rem;      // 32px
  --spacing-2xl: 3rem;     // 48px
  --spacing-3xl: 4rem;     // 64px
}
```

### Arrondi des Coins
```scss
:root {
  --radius-sm: 0.25rem;    // 4px
  --radius-md: 0.5rem;     // 8px
  --radius-lg: 0.75rem;    // 12px
  --radius-xl: 1rem;       // 16px
  --radius-2xl: 1.5rem;    // 24px
}
```

## 📄 Contenu des Pages

### Page d'Accueil
Modifiez `src/app/pages/home/home.component.ts` :

```typescript
// Section Hero
heroTitle = "Votre Titre Principal";
heroDescription = "Votre description accrocheuse...";

// Fonctionnalités
features = [
  {
    icon: 'design',
    title: 'Votre Fonctionnalité',
    description: 'Description de votre fonctionnalité...'
  }
];

// Témoignages
testimonials = [
  {
    name: 'Nom du Client',
    role: 'Poste, Entreprise',
    content: 'Témoignage du client...',
    avatar: 'chemin/vers/avatar.jpg'
  }
];
```

### Page À Propos
Modifiez `src/app/pages/about/about.component.ts` :

```typescript
// Équipe
team = [
  {
    name: 'Nom du Membre',
    role: 'Poste',
    bio: 'Biographie...',
    image: 'chemin/vers/photo.jpg',
    social: {
      linkedin: 'https://linkedin.com/in/profil',
      twitter: 'https://twitter.com/compte'
    }
  }
];
```

### Page Services
Modifiez `src/app/pages/services/services.component.ts` :

```typescript
services = [
  {
    title: 'Votre Service',
    description: 'Description du service...',
    icon: '🚀',
    features: ['Fonctionnalité 1', 'Fonctionnalité 2'],
    price: 'À partir de 999€'
  }
];
```

### Page Portfolio
Modifiez `src/app/pages/portfolio/portfolio.component.ts` :

```typescript
projects = [
  {
    title: 'Votre Projet',
    description: 'Description du projet...',
    image: 'chemin/vers/image.jpg',
    technologies: ['Angular', 'TypeScript'],
    category: 'web',
    link: 'https://votre-projet.com'
  }
];
```

### Page Contact
Modifiez `src/app/pages/contact/contact.component.ts` :

```typescript
contactInfo = {
  email: 'contact@votre-entreprise.com',
  phone: '+33 1 23 45 67 89',
  address: 'Votre Adresse Complète',
  mapEmbed: 'Code d\'intégration Google Maps'
};
```

## 🖼️ Images et Assets

### Remplacement des Images
Placez vos images dans `src/assets/images/` :

```
src/assets/images/
├── logo.png              # Logo (200x60px)
├── hero-bg.jpg           # Image hero (1920x1080px)
├── about-image.jpg       # Image à propos (600x400px)
├── portfolio/            # Images portfolio
│   ├── project1.jpg
│   └── project2.jpg
└── team/                 # Photos équipe
    ├── member1.jpg
    └── member2.jpg
```

### Optimisation des Images
```bash
# Optimiser les images avec ImageOptim (Mac)
# ou TinyPNG (Web)
# ou imagemin (Node.js)
npm install -g imagemin-cli
imagemin src/assets/images/*.jpg --out-dir=src/assets/images/optimized
```

### Formats Recommandés
- **Logo** : PNG (transparent) ou SVG
- **Photos** : JPG (qualité 85%)
- **Icônes** : SVG ou PNG 24x24px
- **Images hero** : JPG 1920x1080px

## ✨ Animations

### Désactiver les Animations
```scss
// Dans src/styles.scss
.no-animations * {
  animation: none !important;
  transition: none !important;
}
```

### Modifier la Vitesse
```scss
:root {
  --animation-duration: 0.5s;  // Plus rapide : 0.3s, Plus lent : 0.8s
}
```

### Créer une Nouvelle Animation
```scss
@keyframes mon-animation {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}

.mon-element {
  animation: mon-animation 0.6s ease-out;
}
```

## 🧩 Composants Personnalisés

### Créer un Nouveau Composant
```bash
ng generate component mon-composant
```

### Exemple de Composant
```typescript
// src/app/components/mon-composant/mon-composant.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-mon-composant',
  standalone: true,
  template: `
    <div class="mon-composant">
      <h2>{{ titre }}</h2>
      <p>{{ description }}</p>
    </div>
  `,
  styles: [`
    .mon-composant {
      padding: var(--spacing-lg);
      background: var(--card-bg);
      border-radius: var(--radius-md);
    }
  `]
})
export class MonComposantComponent {
  titre = 'Mon Titre';
  description = 'Ma description...';
}
```

### Utiliser le Composant
```html
<!-- Dans n'importe quelle page -->
<app-mon-composant></app-mon-composant>
```

## 🎨 Thèmes Prédéfinis

### Thème Minimaliste
```scss
// src/styles.scss
:root {
  --primary-600: #000000;
  --secondary-600: #666666;
  --font-family: 'Helvetica', sans-serif;
  --radius-md: 0;
}
```

### Thème Coloré
```scss
:root {
  --primary-600: #ff6b6b;
  --secondary-600: #4ecdc4;
  --accent-600: #ffe66d;
  --font-family: 'Poppins', sans-serif;
}
```

### Thème Sombre
```scss
.dark {
  --primary-600: #60a5fa;
  --secondary-600: #a78bfa;
  --accent-600: #fbbf24;
}
```

## 📱 Responsive Design

### Breakpoints
```scss
// Mobile
@media (max-width: 768px) {
  .mon-element {
    font-size: 14px;
  }
}

// Tablet
@media (min-width: 769px) and (max-width: 1024px) {
  .mon-element {
    font-size: 16px;
  }
}

// Desktop
@media (min-width: 1025px) {
  .mon-element {
    font-size: 18px;
  }
}
```

### Grilles Responsives
```scss
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}
```

## 🔧 Bonnes Pratiques

### 1. Utiliser les Variables CSS
```scss
// ✅ Bon
.mon-element {
  color: var(--primary-600);
  padding: var(--spacing-md);
}

// ❌ Éviter
.mon-element {
  color: #3b82f6;
  padding: 16px;
}
```

### 2. Structure des Composants
```typescript
// ✅ Bon - Composant simple et réutilisable
@Component({
  selector: 'app-bouton',
  template: `
    <button [class]="classe" (click)="onClick()">
      <ng-content></ng-content>
    </button>
  `
})
export class BoutonComponent {
  @Input() classe = 'btn btn-primary';
  @Output() click = new EventEmitter();
  
  onClick() {
    this.click.emit();
  }
}
```

### 3. Performance
```typescript
// ✅ Bon - Lazy loading
const routes: Routes = [
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  }
];
```

### 4. Accessibilité
```html
<!-- ✅ Bon -->
<button aria-label="Fermer la modal" (click)="fermer()">
  <span aria-hidden="true">&times;</span>
</button>

<!-- ✅ Bon -->
<img src="image.jpg" alt="Description de l'image">
```

## 🚀 Déploiement

### Build de Production
```bash
ng build --configuration production
```

### Vérification
```bash
# Tester le build localement
npx http-server dist -p 4200
```

## 📞 Support

### Ressources
- 📖 **Documentation** : [Guide d'Installation](INSTALLATION.md)
- 🐛 **Bugs** : [GitHub Issues](https://github.com/nexuspro/theme/issues)
- 💬 **Forum** : [GitHub Discussions](https://github.com/nexuspro/theme/discussions)

### Informations de Debug
En cas de problème, fournissez :
- Code de votre personnalisation
- Message d'erreur complet
- Navigateur et version
- Étapes pour reproduire

---

<div align="center">
  <p>🎉 Votre thème NexusPro est maintenant personnalisé !</p>
  <p>N'hésitez pas à partager vos créations avec la communauté.</p>
</div>
