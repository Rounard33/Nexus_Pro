-- Script SQL pour ajouter un utilisateur comme admin dans Supabase
-- 
-- UTILISATION:
-- 1. Allez sur https://supabase.com/dashboard
-- 2. Sélectionnez votre projet
-- 3. Allez dans SQL Editor
-- 4. Collez ce script et modifiez l'email ci-dessous avec votre email
-- 5. Exécutez le script

-- OPTION 1: Ajouter un utilisateur par son email (remplacez l'email ci-dessous)
INSERT INTO admin (id, email)
SELECT id, email
FROM auth.users
WHERE email = 'votre-email@example.com'  -- ⚠️ REMPLACEZ PAR VOTRE EMAIL
ON CONFLICT (id) DO NOTHING;

-- OPTION 2: Vérifier si la table admin existe et la créer si nécessaire
CREATE TABLE IF NOT EXISTS admin (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OPTION 3: Lister tous les admins existants
SELECT a.id, a.email, a.created_at, u.email as auth_email
FROM admin a
JOIN auth.users u ON a.id = u.id;

-- OPTION 4: Lister tous les utilisateurs authentifiés (pour trouver votre ID)
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC;

