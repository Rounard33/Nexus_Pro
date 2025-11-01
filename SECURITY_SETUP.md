# Configuration de sécurité

## ⚠️ IMPORTANT : Variables d'environnement

Les clés Supabase ont été retirées du code source pour des raisons de sécurité.
Vous devez les configurer via des variables d'environnement.

### Pour le développement local (Angular)

Créez un fichier `.env` à la racine du projet :

```env
NG_APP_SUPABASE_URL=https://votre-projet.supabase.co
NG_APP_SUPABASE_ANON_KEY=votre_anon_key_ici
```

**Note** : Angular ne lit pas automatiquement les fichiers `.env`. Vous devrez utiliser un script de build ou modifier `angular.json` pour injecter ces variables.

### Alternative : Configuration manuelle

Modifiez directement `src/environments/environment.ts` pour le développement local :

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://votre-projet.supabase.co',
  supabaseAnonKey: 'votre_anon_key_ici'
};
```

**⚠️ NE COMMITEZ JAMAIS ce fichier avec les vraies clés dans Git !**

### Pour la production

#### Vercel
Configurez les variables d'environnement dans le dashboard Vercel :
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

#### Serveur API (local-api-server.js)
Créez un fichier `.env.local` à la racine :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
SUPABASE_ANON_KEY=votre_anon_key
```

### Sécurité

1. ✅ Ajoutez `.env*` à votre `.gitignore`
2. ✅ Ne partagez jamais les clés dans le code source
3. ✅ Régénérez les clés si elles ont été exposées
4. ✅ Utilisez des secrets management pour la production

