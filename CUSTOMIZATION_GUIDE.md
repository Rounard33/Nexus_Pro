# 🎨 Guide de Personnalisation - NexusPro Theme

## 📋 Vue d'ensemble

NexusPro est un thème Angular entièrement personnalisable conçu pour ThemeForest. Ce guide vous explique comment personnaliser facilement tous les aspects du thème selon vos besoins.

## 🚀 Démarrage Rapide

### 1. **Personnalisateur Visuel**
- Cliquez sur le bouton "Personnaliser" en bas à droite de l'écran
- Modifiez les couleurs, polices, et contenus en temps réel
- Exportez votre configuration pour la sauvegarder

### 2. **Configuration par Code**
```typescript
// Dans src/app/config/theme-config.ts
export const customConfig: ThemeConfig = {
  primaryColor: '#your-color',
  companyName: 'Votre Entreprise',
  // ... autres options
};
```

## 🎨 Personnalisation des Couleurs

### Couleurs Principales
- **Couleur principale** : Utilisée pour les boutons, liens, et éléments d'accent
- **Couleur secondaire** : Couleur complémentaire pour la variété
- **Couleur d'accent** : Pour les éléments spéciaux et les highlights

### Exemple de Palette
```typescript
primaryColor: '#3b82f6',    // Bleu
secondaryColor: '#8b5cf6',  // Violet
accentColor: '#f59e0b'      // Orange
```

## 📝 Typographie

### Polices Disponibles
- Inter (recommandée)
- Roboto
- Open Sans
- Lato
- Poppins
- Montserrat
- Source Sans Pro

### Personnalisation
```typescript
fontFamily: 'Inter, sans-serif',
headingFont: 'Poppins, sans-serif'
```

## 🏗️ Layout et Structure

### Largeur du Conteneur
- **Petit** : 1000px (pour les sites compacts)
- **Moyen** : 1200px (recommandé)
- **Grand** : 1400px (pour les écrans larges)
- **Plein écran** : 100% (responsive complet)

### Arrondi des Coins
- **Petit** : 0.25rem (minimaliste)
- **Moyen** : 0.5rem (équilibré)
- **Grand** : 0.75rem (moderne)
- **Très grand** : 1rem (arrondi prononcé)

## ⚡ Animations

### Contrôle des Animations
```typescript
enableAnimations: true,
animationSpeed: 'normal' // 'slow' | 'normal' | 'fast'
```

### Désactiver les Animations
```typescript
enableAnimations: false
```

## 📄 Sections du Site

### Sections Disponibles
- **Hero** : Section d'accueil principale
- **À propos** : Présentation de l'entreprise
- **Services** : Liste des services offerts
- **Portfolio** : Galerie de projets
- **Témoignages** : Avis clients
- **Tarifs** : Plans et prix
- **Contact** : Informations de contact

### Masquer/Afficher des Sections
```typescript
sections: {
  hero: true,
  about: true,
  services: true,
  portfolio: false,  // Masquer le portfolio
  testimonials: true,
  pricing: true,
  contact: true
}
```

## 📞 Contenu Personnalisable

### Informations de Base
```typescript
content: {
  companyName: 'Votre Entreprise',
  tagline: 'Votre Slogan Accrocheur',
  description: 'Description de votre entreprise...',
  logo: 'chemin/vers/votre/logo.png',
  favicon: 'chemin/vers/favicon.ico'
}
```

### Réseaux Sociaux
```typescript
socialLinks: {
  facebook: 'https://facebook.com/votre-page',
  twitter: 'https://twitter.com/votre-compte',
  linkedin: 'https://linkedin.com/in/votre-profil',
  instagram: 'https://instagram.com/votre-compte',
  github: 'https://github.com/votre-compte'
}
```

### Informations de Contact
```typescript
contact: {
  email: 'contact@votre-entreprise.com',
  phone: '+33 1 23 45 67 89',
  address: 'Votre Adresse Complète',
  mapEmbed: 'Code d\'intégration Google Maps'
}
```

## 💾 Sauvegarde et Export

### Export de Configuration
1. Ouvrez le personnalisateur
2. Cliquez sur "Exporter"
3. Sauvegardez le fichier `theme-config.json`

### Import de Configuration
1. Ouvrez le personnalisateur
2. Cliquez sur "Importer"
3. Sélectionnez votre fichier de configuration

### Configuration par Défaut
- Cliquez sur "Réinitialiser" pour revenir aux paramètres par défaut

## 🔧 Personnalisation Avancée

### CSS Personnalisé
```scss
// Dans src/styles.scss
:root {
  --custom-color: #your-color;
  --custom-spacing: 2rem;
}

.custom-element {
  color: var(--custom-color);
  margin: var(--custom-spacing);
}
```

### Composants Personnalisés
```typescript
// Créez vos propres composants
@Component({
  selector: 'app-custom-section',
  // ... configuration
})
export class CustomSectionComponent {
  // ... logique personnalisée
}
```

## 📱 Responsive Design

### Breakpoints
- **Mobile** : < 768px
- **Tablet** : 768px - 1024px
- **Desktop** : > 1024px

### Personnalisation Responsive
```scss
@media (max-width: 768px) {
  .custom-element {
    font-size: 14px;
  }
}
```

## 🎯 Bonnes Pratiques

### 1. **Cohérence Visuelle**
- Utilisez une palette de couleurs cohérente
- Respectez la hiérarchie typographique
- Maintenez des espacements réguliers

### 2. **Performance**
- Optimisez les images
- Utilisez des polices web optimisées
- Évitez les animations excessives

### 3. **Accessibilité**
- Contraste de couleurs suffisant
- Tailles de police lisibles
- Navigation au clavier

### 4. **SEO**
- Remplissez tous les champs de contenu
- Utilisez des descriptions pertinentes
- Optimisez les images avec des alt text

## 🚀 Déploiement

### 1. **Build de Production**
```bash
ng build --configuration production
```

### 2. **Configuration Serveur**
- Configurez la redirection des routes Angular
- Activez la compression gzip
- Configurez les headers de cache

### 3. **Optimisations**
- Minifiez les assets
- Activez le lazy loading
- Utilisez un CDN pour les images

## 📞 Support

### Documentation Complète
- Consultez la documentation Angular
- Vérifiez les exemples dans le code
- Utilisez les commentaires dans le code

### Personnalisation Complexe
- Modifiez les services Angular
- Créez des composants personnalisés
- Étendez les fonctionnalités existantes

---

**NexusPro Theme** - Créé avec ❤️ pour ThemeForest
