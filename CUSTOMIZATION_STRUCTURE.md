# 📁 Structure de Personnalisation - NexusPro Theme

## 🎯 Fichiers Principaux à Modifier

### **1. Configuration du Thème**
```
src/app/config/theme-config.ts
├── Couleurs principales
├── Contenu de l'entreprise
├── Informations de contact
└── Liens réseaux sociaux
```

### **2. Styles Globaux**
```
src/styles.scss
├── Variables CSS (couleurs, polices, espacements)
├── Styles de base
├── Thème sombre/clair
└── Animations
```

### **3. Contenu des Pages**
```
src/app/pages/
├── home/home.component.html          # Page d'accueil
├── about/about.component.html        # À propos
├── services/services.component.html  # Services
├── portfolio/portfolio.component.html # Portfolio
└── contact/contact.component.html    # Contact
```

### **4. Images et Assets**
```
src/assets/
├── images/
│   ├── logo.png              # Logo de l'entreprise
│   ├── hero-bg.jpg          # Image de fond hero
│   ├── about-image.jpg      # Image section à propos
│   └── portfolio/           # Images du portfolio
└── icons/                   # Icônes personnalisées
```

## 🔧 Niveaux de Personnalisation

### **Niveau 1 : Débutant (Modifications Simples)**
- ✅ Changer les couleurs dans `styles.scss`
- ✅ Modifier les textes dans `theme-config.ts`
- ✅ Remplacer les images dans `assets/`
- ✅ Changer les polices

### **Niveau 2 : Intermédiaire (Modifications Avancées)**
- ✅ Modifier les composants HTML
- ✅ Ajuster les styles CSS
- ✅ Personnaliser les animations
- ✅ Modifier le layout

### **Niveau 3 : Avancé (Développement)**
- ✅ Créer de nouveaux composants
- ✅ Modifier la logique TypeScript
- ✅ Ajouter de nouvelles fonctionnalités
- ✅ Intégrer des APIs externes

## 📝 Exemples de Personnalisation

### **Changer la Couleur Principale**
```scss
// Dans src/styles.scss
:root {
  --primary-600: #ff6b6b; // Rouge
  --primary-700: #ff5252; // Rouge plus foncé
  --primary-500: #ff8a80; // Rouge plus clair
}
```

### **Modifier le Nom de l'Entreprise**
```typescript
// Dans src/app/config/theme-config.ts
export const themeConfig = {
  companyName: 'Mon Entreprise',
  tagline: 'Mon Slogan Personnalisé'
};
```

### **Remplacer le Logo**
1. Placez votre logo dans `src/assets/images/logo.png`
2. Le logo sera automatiquement utilisé dans le header

### **Modifier les Services**
```typescript
// Dans src/app/components/services/services.component.ts
services = [
  {
    title: 'Mon Service 1',
    description: 'Description personnalisée...',
    icon: 'mon-icone',
    features: ['Fonctionnalité 1', 'Fonctionnalité 2']
  }
];
```

## 🎨 Thèmes Prédéfinis

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
}
```

## 🚀 Workflow de Personnalisation

### **1. Préparation**
- Téléchargez le thème depuis ThemeForest
- Installez les dépendances : `npm install`
- Lancez le serveur de développement : `ng serve`

### **2. Personnalisation**
- Modifiez les fichiers selon vos besoins
- Testez les changements en temps réel
- Ajustez jusqu'à satisfaction

### **3. Déploiement**
- Build de production : `ng build --configuration production`
- Uploadez le dossier `dist/` sur votre serveur
- Configurez votre serveur web

## 📞 Support et Aide

### **Documentation**
- Guide de personnalisation complet
- Exemples de code dans chaque fichier
- Commentaires détaillés dans le code

### **Communauté**
- Forum ThemeForest
- Documentation Angular officielle
- Communauté GitHub

---

**NexusPro Theme** - Facile à personnaliser, puissant à utiliser
