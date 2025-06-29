import { Category } from '../types/accounting';

export const ACCOUNTING_PLAN: Category[] = [
  // RECETTES
  {
    code: '70',
    name: 'Ventes de prestations de services',
    type: 'recette',
    subcategories: [
      { code: '701', name: 'Billetterie événements', parentCode: '70' },
      { code: '702', name: 'Recettes bar', parentCode: '70' },
      { code: '703', name: 'Merchandising', parentCode: '70' },
      { code: '704', name: 'Ateliers et formations', parentCode: '70' }
    ]
  },
  {
    code: '74',
    name: 'Subventions d\'exploitation',
    type: 'recette',
    subcategories: [
      { code: '741', name: 'Subventions publiques', parentCode: '74' },
      { code: '742', name: 'Subventions privées', parentCode: '74' },
      { code: '743', name: 'Subventions européennes', parentCode: '74' }
    ]
  },
  {
    code: '75',
    name: 'Autres produits de gestion courante',
    type: 'recette',
    subcategories: [
      { code: '751', name: 'Cotisations adhérents', parentCode: '75' },
      { code: '752', name: 'Dons et mécénat', parentCode: '75' },
      { code: '753', name: 'Partenariats', parentCode: '75' }
    ]
  },
  {
    code: '76',
    name: 'Produits financiers',
    type: 'recette',
    subcategories: [
      { code: '761', name: 'Intérêts bancaires', parentCode: '76' },
      { code: '762', name: 'Autres produits financiers', parentCode: '76' }
    ]
  },

  // DÉPENSES
  {
    code: '60',
    name: 'Achats',
    type: 'depense',
    subcategories: [
      { code: '601', name: 'Matières premières', parentCode: '60' },
      { code: '602', name: 'Fournitures consommables', parentCode: '60' },
      { code: '603', name: 'Boissons et nourriture', parentCode: '60' },
      { code: '604', name: 'Matériel technique', parentCode: '60' }
    ]
  },
  {
    code: '61',
    name: 'Services extérieurs',
    type: 'depense',
    subcategories: [
      { code: '611', name: 'Locations immobilières', parentCode: '61' },
      { code: '612', name: 'Locations mobilières', parentCode: '61' },
      { code: '613', name: 'Locations matériel', parentCode: '61' },
      { code: '614', name: 'Entretien et réparations', parentCode: '61' }
    ]
  },
  {
    code: '62',
    name: 'Autres services extérieurs',
    type: 'depense',
    subcategories: [
      { code: '621', name: 'Personnel extérieur', parentCode: '62' },
      { code: '622', name: 'Rémunérations artistes', parentCode: '62' },
      { code: '623', name: 'Publicité et communication', parentCode: '62' },
      { code: '624', name: 'Transports et déplacements', parentCode: '62' },
      { code: '625', name: 'Frais postaux', parentCode: '62' },
      { code: '626', name: 'Frais bancaires', parentCode: '62' }
    ]
  },
  {
    code: '63',
    name: 'Impôts et taxes',
    type: 'depense',
    subcategories: [
      { code: '631', name: 'SACEM/SPEDIDAM', parentCode: '63' },
      { code: '632', name: 'Taxes diverses', parentCode: '63' }
    ]
  },
  {
    code: '64',
    name: 'Charges de personnel',
    type: 'depense',
    subcategories: [
      { code: '641', name: 'Salaires bruts', parentCode: '64' },
      { code: '642', name: 'Charges sociales', parentCode: '64' }
    ]
  },
  {
    code: '65',
    name: 'Autres charges de gestion courante',
    type: 'depense',
    subcategories: [
      { code: '651', name: 'Redevances', parentCode: '65' },
      { code: '652', name: 'Pertes sur créances', parentCode: '65' }
    ]
  },
  {
    code: '66',
    name: 'Charges financières',
    type: 'depense',
    subcategories: [
      { code: '661', name: 'Intérêts d\'emprunts', parentCode: '66' },
      { code: '662', name: 'Charges sur cessions', parentCode: '66' }
    ]
  },
  {
    code: '68',
    name: 'Dotations aux amortissements',
    type: 'depense',
    subcategories: [
      { code: '681', name: 'Amortissement matériel', parentCode: '68' },
      { code: '682', name: 'Amortissement mobilier', parentCode: '68' }
    ]
  }
];

export const EVENT_TYPES = [
  { value: 'concert', label: 'Concert' },
  { value: 'theatre', label: 'Théâtre' },
  { value: 'projection', label: 'Projection' },
  { value: 'atelier', label: 'Atelier' },
  { value: 'jeux', label: 'Journée jeux' }
];

export const PAYMENT_METHODS = [
  { value: 'CB', label: 'Carte bancaire' },
  { value: 'Especes', label: 'Espèces' },
  { value: 'Cheque', label: 'Chèque' },
  { value: 'Virement', label: 'Virement' },
  { value: 'Prelevement', label: 'Prélèvement' }
];