# 🎨 Guide de Personnalisation - NexusPro Theme

## 📋 Introduction

Ce guide vous explique comment personnaliser facilement votre thème NexusPro après l'achat sur ThemeForest.

## 🚀 Démarrage Rapide

### 1. **Modification des Couleurs**

Ouvrez le fichier `src/styles.scss` et modifiez les variables CSS :

```scss
:root {
  // Couleur principale (boutons, liens, accents)
  --primary-600: #votre-couleur;
  
  // Couleur secondaire (éléments complémentaires)
  --secondary-600: #votre-couleur;
  
  // Couleur d'accent (highlights, badges)
  --accent-600: #votre-couleur;
}
```

### 2. **Modification du Contenu**

Ouvrez le fichier `src/app/config/theme-config.ts` :

```typescript
export const themeConfig = {
  // Informations de votre entreprise
  companyName: 'Votre Entreprise',
  tagline: 'Votre Slogan Accrocheur',
  description: 'Description de votre entreprise...',
  
  // Contact
  email: 'contact@votre-entreprise.com',
  phone: '+33 1 23 45 67 89',
  address: 'Votre Adresse Complète',
  
  // Réseaux sociaux
  socialLinks: {
    facebook: 'https://facebook.com/votre-page',
    twitter: 'https://twitter.com/votre-compte',
    linkedin: 'https://linkedin.com/in/votre-profil'
  }
};
```

### 3. **Modification des Images**

Remplacez les images dans `src/assets/images/` :
- `logo.png` - Votre logo
- `hero-bg.jpg` - Image de fond de la section hero
- `about-image.jpg` - Image de la section à propos

### 4. **Modification des Polices**

Dans `src/styles.scss` :

```scss
:root {
  --font-family: 'Votre-Police', sans-serif;
  --heading-font: 'Votre-Police-Titres', sans-serif;
}
```

## 🎯 Personnalisations Avancées

### **Modifier les Sections**

Dans `src/app/app.component.html`, commentez/décommentez les sections :

```html
<!-- Section Hero -->
<section class="hero">...</section>

<!-- Section À Propos -->
<section class="about">...</section>

<!-- Section Services -->
<section class="services">...</section>
```

### **Modifier les Animations**

Dans `src/styles.scss` :

```scss
// Désactiver toutes les animations
.no-animations * {
  animation: none !important;
  transition: none !important;
}

// Modifier la vitesse des animations
:root {
  --animation-duration: 0.5s; // Plus rapide
  --animation-duration: 1s;   // Plus lent
}
```

### **Modifier le Layout**

Dans `src/styles.scss` :

```scss
:root {
  --container-width: 1200px; // Largeur du conteneur
  --radius-md: 0.5rem;       // Arrondi des coins
}
```

## 📱 Personnalisation Responsive

### **Breakpoints**

```scss
// Mobile
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
}

// Tablet
@media (min-width: 769px) and (max-width: 1024px) {
  .hero-title {
    font-size: 3rem;
  }
}

// Desktop
@media (min-width: 1025px) {
  .hero-title {
    font-size: 4rem;
  }
}
```

## 🎨 Exemples de Personnalisation

### **Thème Minimaliste**

```scss
:root {
  --primary-600: #000000;
  --secondary-600: #666666;
  --font-family: 'Helvetica', sans-serif;
  --radius-md: 0;
}
```

### **Thème Coloré**

```scss
:root {
  --primary-600: #ff6b6b;
  --secondary-600: #4ecdc4;
  --accent-600: #ffe66d;
  --font-family: 'Poppins', sans-serif;
}
```

### **Thème Professionnel**

```scss
:root {
  --primary-600: #2c3e50;
  --secondary-600: #3498db;
  --font-family: 'Roboto', sans-serif;
  --radius-md: 0.25rem;
}
```

## 🔧 Personnalisation des Composants

### **Modifier les Cartes de Services**

Dans `src/app/components/services/services.component.ts` :

```typescript
services = [
  {
    title: 'Votre Service 1',
    description: 'Description de votre service...',
    icon: 'votre-icone',
    features: ['Fonctionnalité 1', 'Fonctionnalité 2']
  }
];
```

### **Modifier le Portfolio**

Dans `src/app/components/portfolio/portfolio.component.ts` :

```typescript
projects = [
  {
    title: 'Votre Projet',
    description: 'Description de votre projet...',
    image: 'chemin/vers/votre/image.jpg',
    technologies: ['Angular', 'TypeScript']
  }
];
```

## 📝 Modifier les Textes

### **Page d'Accueil**

Dans `src/app/pages/home/home.component.html` :

```html
<h1>Votre Titre Principal</h1>
<p>Votre description personnalisée...</p>
```

### **Page À Propos**

Dans `src/app/pages/about/about.component.html` :

```html
<h2>À Propos de Nous</h2>
<p>Notre histoire et notre mission...</p>
```

## 🚀 Déploiement

### **Build de Production**

```bash
ng build --configuration production
```

### **Fichiers à Uploader**

- `dist/` - Dossier complet à uploader sur votre serveur
- `index.html` - Page d'accueil
- `assets/` - Images, polices, styles

## 📞 Support

### **Documentation Complète**

- Consultez les commentaires dans le code
- Vérifiez les exemples dans chaque composant
- Utilisez les outils de développement du navigateur

### **Personnalisation Complexe**

- Modifiez les services Angular
- Créez vos propres composants
- Étendez les fonctionnalités existantes

## 🎯 Checklist de Personnalisation

- [ ] Modifier les couleurs dans `styles.scss`
- [ ] Changer le contenu dans `theme-config.ts`
- [ ] Remplacer les images dans `assets/`
- [ ] Modifier les textes dans les composants
- [ ] Ajuster les polices
- [ ] Tester sur mobile et desktop
- [ ] Build et déploiement

---

**NexusPro Theme** - Créé avec ❤️ pour ThemeForest
