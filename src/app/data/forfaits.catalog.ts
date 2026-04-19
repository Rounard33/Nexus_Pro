/**
 * Catalogue des forfaits (aligné sur la section vitrine).
 * Une seule source pour le site public et l’admin (ventes additionnelles).
 *
 * Progression auto (RDV terminé) : remplir `eligiblePrestationIds` avec les UUID
 * des lignes `prestations` pour un filtrage fiable ; sinon les sous-chaînes sont
 * comparées au nom de la prestation (voir `prestationMatchesForfait`).
 */
export interface ForfaitCatalogEntry {
  id: string;
  name: string;
  description: string;
  details: string[];
  price: string;
  originalPrice: string;
  savings: string;
  /** Nombre de séances incluses dans le forfait */
  sessionsTotal: number;
  /**
   * IDs des prestations (table `prestations`) qui comptent pour ce forfait.
   * Si vide, on utilise uniquement `eligibleNameSubstrings`.
   */
  eligiblePrestationIds: string[];
  /**
   * Sous-chaînes (insensible à la casse) qu’on cherche dans le nom de la prestation.
   * Une seule suffit pour considérer la prestation comme éligible (OR).
   */
  eligibleNameSubstrings: string[];
}

export const FORFAITS_CATALOG: ForfaitCatalogEntry[] = [
  {
    id: 'accompagnement-global',
    name: 'Forfait Accompagnement Global',
    description: 'Un parcours complet pour une transformation en profondeur.',
    details: [
      'Une séance de PNL (programmation neuro linguistique) afin de faire l\'état des lieux. Identifier ensemble les blocages, les schémas, définir des objectifs clairs afin d\'agir là où vous en avez le plus besoin.',
      'Suivi d\'une séance de massage crânien énergétique pour lâcher prise et faire un « reset » intérieur.',
      'Pour terminer une séance de reiki pour intégrer le travail effectué, permet une véritable harmonisation et favorise l\'ancrage.'
    ],
    price: '165 €',
    originalPrice: '195 €',
    savings: '30 €',
    sessionsTotal: 3,
    eligiblePrestationIds: [],
    eligibleNameSubstrings: ['pnl', 'programmation neuro', 'crânien', 'reiki']
  },
  {
    id: 'cure-energetique',
    name: 'Forfait Cure Énergétique',
    description: '4 séances de Reiki à utiliser comme vous le souhaitez sur une année.',
    details: [
      'Soit de manière rapprochée pour un travail en profondeur sur un « sujet » spécifique.',
      'Soit de manière plus espacée, quand vous en ressentez le besoin, avant un événement important ou aux changements de saisons.'
    ],
    price: '200 €',
    originalPrice: '240 €',
    savings: '40 €',
    sessionsTotal: 4,
    eligiblePrestationIds: [],
    eligibleNameSubstrings: ['reiki']
  },
  {
    id: 'reconnexion-a-soi',
    name: 'Forfait Reconnexion à Soi',
    description: 'Un duo de séances pour un lâcher-prise complet.',
    details: [
      'Une première séance de massage crânien énergétique pour lâcher prise, faire un « reset intérieur ».',
      'Une séance de Reiki pour harmoniser, réaligner et ancrer.'
    ],
    price: '100 €',
    originalPrice: '120 €',
    savings: '20 €',
    sessionsTotal: 2,
    eligiblePrestationIds: [],
    eligibleNameSubstrings: ['crânien', 'reiki']
  }
];

export function getForfaitCatalogEntry(id: string): ForfaitCatalogEntry | undefined {
  return FORFAITS_CATALOG.find((f) => f.id === id);
}
