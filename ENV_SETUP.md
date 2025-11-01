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

