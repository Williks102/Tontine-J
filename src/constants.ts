import { Category, Formula } from './types';

export const CATEGORIES: { id: Category; title: string; description: string; icon: string }[] = [
  { id: 'Alimentaire', title: 'Tontine Pro Alimentaire', description: 'Épargne pour soutien alimentaire, distribution de vivres, projets alimentaires', icon: 'Utensils' },
  { id: 'Cash', title: 'Tontine Pro Cash', description: 'Épargne pour besoins d’argent liquide, paiements rapides', icon: 'Banknote' },
  { id: 'Baby Mama', title: 'Tontine Pro Baby Mama', description: 'Soutien familial, maternité, dépenses liées aux enfants', icon: 'Baby' },
  { id: 'Immobilier', title: 'Tontine Pro Immobilier', description: 'Projets immobiliers (maisons, appartements, terrains)', icon: 'Home' },
  { id: 'Terrain', title: 'Tontine Pro Terrain', description: 'Achat ou investissement dans des terrains', icon: 'Map' },
  { id: 'Voyage', title: 'Tontine Pro Voyage', description: 'Épargne pour voyages ou vacances', icon: 'Plane' },
  { id: 'Épargne', title: 'Tontine Pro Épargne', description: 'Cotisations journalières ou mensuelles, flexible selon montant et durée', icon: 'PiggyBank' },
];

export const INITIAL_FORMULAS: Formula[] = [
  {
    id: 'f1',
    categoryId: 'Alimentaire',
    title: 'Soutien Alimentaire Mensuel',
    amountPerPayment: 5000,
    currency: 'FCFA',
    durationMonths: 6,
    totalPayments: 6,
    description: 'Épargnez pour vos vivres chaque mois.'
  },
  {
    id: 'f2',
    categoryId: 'Cash',
    title: 'Cash Rapide 500',
    amountPerPayment: 500,
    currency: 'FCFA',
    durationMonths: 6,
    totalPayments: 180,
    description: '500 FCFA / jour pendant 6 mois.'
  },
  {
    id: 'f3',
    categoryId: 'Immobilier',
    title: 'Projet Maison Pro',
    amountPerPayment: 50000,
    currency: 'FCFA',
    durationMonths: 24,
    totalPayments: 24,
    description: 'Épargnez pour votre futur chez-vous.'
  }
];

export const COLORS = {
  primary: '#6D28D9', // Violet
  accent: '#D97706',  // Gold
  white: '#FFFFFF',
};
