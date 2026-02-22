-- Mise à jour des créneaux : 1 ligne = 1 créneau de 1h30
-- Exécuter ce script dans l'éditeur SQL de Supabase

-- Supprimer les anciennes données
DELETE FROM available_slots;

-- Insérer les nouveaux créneaux
INSERT INTO available_slots (day_of_week, start_time, end_time, duration_minutes, is_active) VALUES
-- Lundi (1)
(1, '12:30:00', '14:00:00', 90, true),
(1, '14:30:00', '16:00:00', 90, true),
-- Mardi (2)
(2, '09:00:00', '10:30:00', 90, true),
(2, '10:30:00', '12:00:00', 90, true),
(2, '12:30:00', '14:00:00', 90, true),
(2, '14:30:00', '16:00:00', 90, true),
-- Mercredi (3)
(3, '09:00:00', '10:30:00', 90, true),
(3, '10:30:00', '12:00:00', 90, true),
(3, '16:00:00', '17:30:00', 90, true),
(3, '17:30:00', '19:00:00', 90, true),
-- Jeudi (4)
(4, '14:30:00', '16:00:00', 90, true),
(4, '16:00:00', '17:30:00', 90, true),
(4, '17:30:00', '19:00:00', 90, true),
-- Vendredi (5)
(5, '09:00:00', '10:30:00', 90, true),
(5, '10:30:00', '12:00:00', 90, true),
(5, '12:30:00', '14:00:00', 90, true),
(5, '14:30:00', '16:00:00', 90, true),
-- Samedi (6)
(6, '09:00:00', '10:30:00', 90, true),
(6, '10:30:00', '12:00:00', 90, true);
