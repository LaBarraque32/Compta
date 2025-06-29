export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  subcategory?: string;
  paymentMethod: 'CB' | 'Especes' | 'Cheque' | 'Virement' | 'Prelevement';
  type: 'recette' | 'depense';
  eventId?: string;
  pieceNumber: string;
  isValidated: boolean;
  exercice: string;
  createdAt: string;
  updatedAt: string;
  attachment?: string; // Base64 or file path
}

export interface Event {
  id: string;
  name: string;
  date: string;
  type: 'concert' | 'theatre' | 'projection' | 'atelier' | 'jeux';
  budget: number;
  actualCost: number;
  revenue: number;
  capacity: number;
  attendance: number;
  exercice: string;
  description?: string;
}

export interface Exercice {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  isActive: boolean;
  openingBalance: number;
  closingBalance: number;
  totalRevenue: number;
  totalExpenses: number;
  result: number;
}

export interface Category {
  code: string;
  name: string;
  type: 'recette' | 'depense';
  subcategories?: Subcategory[];
}

export interface Subcategory {
  code: string;
  name: string;
  parentCode: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  membershipDate: string;
  membershipFee: number;
  isActive: boolean;
  address?: string;
}

export interface Budget {
  id: string;
  exercice: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
}