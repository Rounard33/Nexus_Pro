# 🚀 Guide d'Installation - NexusPro Theme

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Premier Lancement](#premier-lancement)
5. [Déploiement](#déploiement)
6. [Dépannage](#dépannage)

## 🔧 Prérequis

### Logiciels Requis
- **Node.js** 18.0.0 ou supérieur
- **npm** 9.0.0 ou supérieur (ou yarn 1.22.0+)
- **Angular CLI** 17.0.0 ou supérieur
- **Git** (optionnel, pour le versioning)

### Vérification des Prérequis
```bash
# Vérifier Node.js
node --version
# Doit afficher v18.0.0 ou supérieur

# Vérifier npm
npm --version
# Doit afficher 9.0.0 ou supérieur

# Vérifier Angular CLI
ng version
# Doit afficher Angular CLI 17.0.0 ou supérieur
```

### Installation d'Angular CLI (si nécessaire)
```bash
npm install -g @angular/cli@17
# ou
yarn global add @angular/cli@17
```

## 📦 Installation

### Étape 1 : Téléchargement
1. Téléchargez l'archive `nexuspro-theme.zip`
2. Extrayez l'archive dans votre dossier de travail
3. Renommez le dossier en `nexuspro-project` (optionnel)

### Étape 2 : Installation des Dépendances
```bash
# Naviguer vers le dossier du projet
cd nexuspro-project

# Installer les dépendances
npm install
# ou
yarn install
```

### Étape 3 : Vérification de l'Installation
```bash
# Vérifier que tout est installé correctement
ng version
npm list --depth=0
```

## ⚙️ Configuration

### Configuration de Base
Le thème est prêt à l'emploi, mais vous pouvez personnaliser :

#### 1. Variables CSS (src/styles.scss)
```scss
:root {
  // Couleurs principales
  --primary-600: #3b82f6;    // Bleu principal
  --secondary-600: #8b5cf6;  // Violet secondaire
  --accent-600: #f59e0b;     // Orange accent
  
  // Polices
  --font-family: 'Inter', sans-serif;
  --heading-font: 'Inter', sans-serif;
  
  // Layout
  --container-width: 1200px;
  --radius-md: 0.5rem;
}
```

#### 2. Contenu des Pages
Modifiez les données dans les composants :

**Page d'accueil** (`src/app/pages/home/home.component.ts`) :
```typescript
features = [
  {
    icon: 'design',
    title: 'Votre Titre',
    description: 'Votre description...'
  }
];
```

**Informations de contact** (`src/app/pages/contact/contact.component.ts`) :
```typescript
contactInfo = {
  email: 'contact@votre-entreprise.com',
  phone: '+33 1 23 45 67 89',
  address: 'Votre Adresse'
};
```

#### 3. Images et Assets
Remplacez les images dans `src/assets/images/` :
- `logo.png` - Votre logo (recommandé : 200x60px)
- `hero-bg.jpg` - Image de fond hero (recommandé : 1920x1080px)
- `about-image.jpg` - Image section à propos (recommandé : 600x400px)

## 🚀 Premier Lancement

### Serveur de Développement
```bash
# Lancer le serveur de développement
ng serve
# ou
npm start

# Le site sera accessible sur http://localhost:4200
```

### Build de Production
```bash
# Créer un build de production
ng build --configuration production

# Les fichiers de production seront dans dist/
```

### Vérification
1. Ouvrez http://localhost:4200 dans votre navigateur
2. Vérifiez que toutes les pages se chargent correctement
3. Testez la navigation entre les pages
4. Vérifiez le mode sombre/clair
5. Testez la responsivité sur mobile

## 🌐 Déploiement

### Option 1 : Serveur Web Standard
```bash
# Build de production
ng build --configuration production

# Copier les fichiers de dist/ vers votre serveur web
# Configuration Apache (.htaccess)
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Option 2 : Netlify
1. Connectez votre repository GitHub
2. Configurez les paramètres de build :
   - **Build command** : `ng build --configuration production`
   - **Publish directory** : `dist`
3. Déployez automatiquement

### Option 3 : Vercel
```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel --prod
```

### Option 4 : GitHub Pages
```bash
# Installer angular-cli-ghpages
npm install -g angular-cli-ghpages

# Build et déploiement
ng build --configuration production --base-href "https://votre-username.github.io/votre-repo/"
ngh --dir=dist
```

## 🔧 Configuration Serveur

### Apache (.htaccess)
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Compression GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache Headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

### Nginx
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    root /var/www/nexuspro/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🐛 Dépannage

### Problèmes Courants

#### 1. Erreur "ng command not found"
```bash
# Solution : Installer Angular CLI globalement
npm install -g @angular/cli@17
```

#### 2. Erreur de dépendances
```bash
# Solution : Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
```

#### 3. Erreur de build
```bash
# Solution : Vérifier la version de Node.js
node --version
# Doit être 18.0.0 ou supérieur
```

#### 4. Problème de routing en production
```bash
# Solution : Vérifier la configuration du serveur
# Assurez-vous que toutes les routes redirigent vers index.html
```

#### 5. Images qui ne se chargent pas
```bash
# Solution : Vérifier les chemins dans src/assets/
# Utilisez des chemins relatifs : ./assets/images/logo.png
```

### Logs de Débogage
```bash
# Mode debug
ng serve --verbose

# Build avec source maps
ng build --source-map

# Analyse du bundle
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

## 📞 Support

### Ressources d'Aide
- 📖 **Documentation** : [Guide de Personnalisation](CUSTOMIZATION.md)
- 🐛 **Bugs** : [GitHub Issues](https://github.com/nexuspro/theme/issues)
- 💬 **Forum** : [GitHub Discussions](https://github.com/nexuspro/theme/discussions)
- 📧 **Email** : support@nexuspro.com

### Informations de Debug
En cas de problème, fournissez :
- Version de Node.js : `node --version`
- Version d'Angular CLI : `ng version`
- Message d'erreur complet
- Étapes pour reproduire le problème

---

<div align="center">
  <p>🎉 Félicitations ! Votre site NexusPro est maintenant prêt !</p>
  <p>Pour toute question, n'hésitez pas à nous contacter.</p>
</div>
