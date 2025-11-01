# Guide de déploiement Vercel

## Option 1 : Déploiement direct (Recommandé)

1. **Push votre code sur GitHub** :
   ```bash
   git add .
   git commit -m "Add API routes and content service"
   git push origin main
   ```

2. **Connecter sur Vercel** :
   - Allez sur https://vercel.com
   - Cliquez sur "Add New Project"
   - Importez votre repo GitHub
   - Vercel détectera automatiquement les routes `/api/*`

3. **Configurer les variables d'environnement** dans Vercel Dashboard :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Déployer** : Vercel déploiera automatiquement

5. **Récupérer l'URL** : Ex: `https://votre-projet.vercel.app`

6. **Mettre à jour `content.service.ts`** avec votre URL Vercel :
   ```typescript
   const API_URL = 'https://votre-projet.vercel.app/api';
   ```

## Option 2 : Tester en local (si besoin)

Pour tester les APIs en local sans `vercel dev` :

### Alternative : Utiliser un serveur Node.js simple

Créez `server.js` à la racine :
```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Proxy vers Supabase (à faire manuellement ou via fetch)
app.get('/api/prestations', async (req, res) => {
  // Code pour appeler Supabase
});

app.listen(3000, () => console.log('API on port 3000'));
```

Mais le plus simple est de **déployer directement sur Vercel** !

