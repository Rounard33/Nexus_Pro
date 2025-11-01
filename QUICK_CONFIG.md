# ⚡ Configuration rapide Supabase

## 🎯 Pour se connecter à l'admin (développement local)

Vous devez configurer vos clés Supabase dans un fichier `.env` (ignoré par Git pour la sécurité).

### Étape 1 : Récupérer vos clés Supabase

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings > API**
4. Copiez :
   - **Project URL** (ex: `https://xivqhmrbyyhezdhcwutz.supabase.co`)
   - **anon public key** (commence par `eyJhbGci...`)

### Étape 2 : Créer le fichier .env

Créez un fichier `.env` à la racine du projet avec vos clés :

```env
SUPABASE_URL=https://xivqhmrbyyhezdhcwutz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service_role key)
```

**Important** : 
- `SUPABASE_ANON_KEY` : Pour le frontend Angular (déjà récupéré)
- `SUPABASE_SERVICE_ROLE_KEY` : Pour le serveur API local (nécessaire pour `npm run api:dev`)
  - Retrouvez cette clé dans Supabase Dashboard > Settings > API > **service_role key** (⚠️ à garder secrète !)

**Important** : Le fichier `.env` est automatiquement ignoré par Git (déjà configuré dans `.gitignore`).

### Étape 3 : Générer les fichiers environment (automatique)

Les fichiers `environment.ts` sont générés automatiquement depuis `.env` avant chaque build ou démarrage :
- ✅ `npm start` → génère automatiquement `environment.ts`
- ✅ `npm run build` → génère automatiquement `environment.ts` et `environment.prod.ts`

Vous pouvez aussi générer manuellement :
```bash
npm run generate:env
```

**Note** : Ne modifiez **jamais** directement `environment.ts` ou `environment.prod.ts` car ils sont régénérés automatiquement !

### Étape 4 : Créer un utilisateur admin

1. Dans Supabase Dashboard, allez dans **Authentication > Users**
2. Cliquez sur **Add User**
3. Créez un utilisateur avec email/password
4. Notez l'email et le mot de passe

**Optionnel** : Ajouter l'utilisateur à la table `admin` si elle existe :

```sql
INSERT INTO admin (id, email)
SELECT id, email
FROM auth.users
WHERE email = 'votre-email@example.com';
```

### Étape 5 : Tester la connexion

1. Lancez votre serveur Angular (`npm start`)
2. Allez sur `http://localhost:4200/admin/login`
3. Connectez-vous avec l'email/mot de passe créé

## ⚠️ Important pour la sécurité

- ✅ Le fichier `.env` est **automatiquement ignoré par Git** (déjà configuré)
- ✅ **Ne commitez JAMAIS** le fichier `.env` avec vos vraies clés
- ✅ Les fichiers `environment.ts` générés contiendront vos clés, mais ils ne seront commités que s'ils sont vides (pas de clés)
- ✅ En production, utilisez les variables d'environnement Vercel (voir ci-dessous)

## 🔒 Pour la production (Vercel)

Le script `generate-env.js` lit automatiquement les variables d'environnement système. Configurez-les dans le dashboard Vercel :

- `SUPABASE_URL` ou `NG_APP_SUPABASE_URL`
- `SUPABASE_ANON_KEY` ou `NG_APP_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (pour l'API)
- `ALLOWED_ORIGINS`

Le script les utilisera automatiquement lors du build, et les fichiers `environment.prod.ts` seront générés avec les bonnes valeurs.

Voir `SECURITY_SETUP.md` pour plus de détails.

