# 📝 Configuration du fichier .env.local

## Format du fichier .env.local

Créez un fichier `.env.local` à la **racine du projet** avec le contenu suivant :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJhbGci... (votre anon key complète)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (votre service_role key complète)
```

## ⚠️ Règles importantes

1. **Pas d'espaces** autour du signe `=`
2. **Pas de guillemets** autour des valeurs
3. **Une variable par ligne**
4. **Pas de ligne vide** avec des espaces
5. **Pas de commentaires** sur la même ligne que les variables

## 📍 Où trouver les clés

### 1. SUPABASE_URL
- Allez sur https://supabase.com/dashboard
- Sélectionnez votre projet
- **Settings > API**
- Copiez le **Project URL**

### 2. SUPABASE_ANON_KEY
- Même page (Settings > API)
- Dans la section **Project API keys**
- Copiez la clé **anon** `public`
- Commence par `eyJhbGci...`

### 3. SUPABASE_SERVICE_ROLE_KEY ⚠️ OBLIGATOIRE
- Même page (Settings > API)
- Dans la section **Project API keys**
- Cliquez sur **Reveal** pour la clé **service_role** `secret`
- Copiez la clé complète (très longue, plusieurs centaines de caractères)
- ⚠️ **C'est une clé différente de l'anon key !**

## ✅ Vérification

Après avoir créé/modifié votre fichier `.env.local`, relancez :

```bash
npm run api:dev
```

Vous devriez voir :
```
✅ Variables chargées depuis .env.local
   3 variable(s) chargée(s): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
✅ SUPABASE_URL: ✅ (https://...)
✅ SUPABASE_ANON_KEY: ✅ (présent, XXX caractères)
✅ SUPABASE_SERVICE_ROLE_KEY: ✅ (présent, XXX caractères)
✅ Client Supabase créé avec succès
```

## 🔒 Sécurité

- ✅ Le fichier `.env.local` est automatiquement ignoré par Git
- ❌ Ne commitez JAMAIS ce fichier
- ❌ Ne partagez JAMAIS la clé `service_role`
- ✅ Utilisez-la uniquement sur votre machine locale ou sur le serveur

## 🔄 Régénérer les clés Supabase (si exposées)

Si vos clés ont été exposées (ex: commitées dans Git), régénérez-les :

### Étapes :

1. **Supabase Dashboard** → Votre projet → **Settings > API**
2. **Section "Project API keys"** :
   - Pour **anon public** : Cliquez sur **"Reset"** ou **"Regenerate"**
   - Pour **service_role secret** : Cliquez sur **"Reset"** ou **"Regenerate"**
3. **⚠️ Attention** : Les anciennes clés seront **immédiatement invalidées**
4. **Copiez les nouvelles clés** et mettez à jour :
   - Votre fichier `.env.local`
   - Vos variables d'environnement en production (Vercel, etc.)
5. **Redémarrez vos services** après mise à jour

### Important :

- ⚠️ Régénérer une clé invalide l'ancienne **immédiatement**
- ⚠️ Toutes vos apps devront être mises à jour **en même temps**
- ⚠️ Si vous avez des apps en production, planifiez la mise à jour avant de régénérer

