import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Transaction, Event, Exercice, Category, Member } from '../types/accounting';

interface AccountingDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-exercice': string; 'by-date': string; 'by-category': string };
  };
  events: {
    key: string;
    value: Event;
    indexes: { 'by-exercice': string; 'by-date': string };
  };
  exercices: {
    key: string;
    value: Exercice;
    indexes: { 'by-year': string };
  };
  categories: {
    key: string;
    value: Category & { id: string };
    indexes: { 'by-type': string };
  };
  members: {
    key: string;
    value: Member;
    indexes: { 'by-status': boolean };
  };
}

let db: IDBPDatabase<AccountingDB>;

export async function initDatabase(): Promise<void> {
  db = await openDB<AccountingDB>('AccountingDB', 4, {
    upgrade(database, oldVersion) {
      // Transactions store
      if (!database.objectStoreNames.contains('transactions')) {
        const transactionStore = database.createObjectStore('transactions', { keyPath: 'id' });
        transactionStore.createIndex('by-exercice', 'exercice');
        transactionStore.createIndex('by-date', 'date');
        transactionStore.createIndex('by-category', 'category');
      }

      // Events store
      if (!database.objectStoreNames.contains('events')) {
        const eventStore = database.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('by-exercice', 'exercice');
        eventStore.createIndex('by-date', 'date');
      }

      // Exercices store
      if (!database.objectStoreNames.contains('exercices')) {
        const exerciceStore = database.createObjectStore('exercices', { keyPath: 'id' });
        exerciceStore.createIndex('by-year', 'year');
      }

      // Categories store
      if (!database.objectStoreNames.contains('categories')) {
        const categoryStore = database.createObjectStore('categories', { keyPath: 'id' });
        categoryStore.createIndex('by-type', 'type');
      }

      // Members store
      if (!database.objectStoreNames.contains('members')) {
        const memberStore = database.createObjectStore('members', { keyPath: 'id' });
        memberStore.createIndex('by-status', 'isActive');
      }
    },
  });

  // Initialize with default data if empty
  await initializeDefaultData();
}

async function initializeDefaultData(): Promise<void> {
  const exercices = await db.getAll('exercices');
  
  if (exercices.length === 0) {
    // Create default exercices: 2023 (closed), 2024 (active), 2025 (future)
    const defaultExercices: Exercice[] = [
      {
        id: 'exercice-2023',
        year: '2023',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        isClosed: true,
        isActive: false,
        openingBalance: 0,
        closingBalance: 1850,
        totalRevenue: 4200,
        totalExpenses: 2350,
        result: 1850
      },
      {
        id: 'exercice-2024',
        year: '2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        isClosed: false,
        isActive: true,
        openingBalance: 1850,
        closingBalance: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        result: 0
      },
      {
        id: 'exercice-2025',
        year: '2025',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        isClosed: false,
        isActive: false,
        openingBalance: 0,
        closingBalance: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        result: 0
      }
    ];

    for (const exercice of defaultExercices) {
      await db.put('exercices', exercice);
    }

    // Add sample transactions for 2024 - CORRECTION : Numéros de pièce avec année
    const sampleTransactions: Transaction[] = [
      {
        id: 'trans-1',
        date: '2024-01-15',
        amount: 2500,
        description: 'Subvention mairie - programmation culturelle',
        category: '74',
        subcategory: '741',
        paymentMethod: 'Virement',
        type: 'recette',
        pieceNumber: '2024-REC001',
        isValidated: true,
        exercice: '2024',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'trans-2',
        date: '2024-02-03',
        amount: 450,
        description: 'Location salle concert février',
        category: '61',
        subcategory: '611',
        paymentMethod: 'Cheque',
        type: 'depense',
        pieceNumber: '2024-DEP001',
        isValidated: true,
        exercice: '2024',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'trans-3',
        date: '2024-02-15',
        amount: 850,
        description: 'Billetterie concert Les Vagabonds',
        category: '70',
        subcategory: '701',
        paymentMethod: 'CB',
        type: 'recette',
        eventId: 'event-1',
        pieceNumber: '2024-REC002',
        isValidated: true,
        exercice: '2024',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Add some transactions for 2023 (closed exercice) - CORRECTION : Numéros de pièce avec année
    const sampleTransactions2023: Transaction[] = [
      {
        id: 'trans-2023-1',
        date: '2023-03-10',
        amount: 1200,
        description: 'Subvention région - aide aux associations',
        category: '74',
        subcategory: '741',
        paymentMethod: 'Virement',
        type: 'recette',
        pieceNumber: '2023-REC001',
        isValidated: true,
        exercice: '2023',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'trans-2023-2',
        date: '2023-06-20',
        amount: 800,
        description: 'Achat matériel sono',
        category: '60',
        subcategory: '604',
        paymentMethod: 'CB',
        type: 'depense',
        pieceNumber: '2023-DEP001',
        isValidated: true,
        exercice: '2023',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const transaction of [...sampleTransactions, ...sampleTransactions2023]) {
      await db.put('transactions', transaction);
    }

    // Add sample events
    const sampleEvents: Event[] = [
      {
        id: 'event-1',
        name: 'Concert Les Vagabonds',
        date: '2024-02-15',
        type: 'concert',
        budget: 1200,
        actualCost: 1050,
        revenue: 850,
        capacity: 120,
        attendance: 95,
        exercice: '2024',
        description: 'Concert de rock français avec Les Vagabonds'
      },
      {
        id: 'event-2023-1',
        name: 'Festival d\'été 2023',
        date: '2023-07-14',
        type: 'concert',
        budget: 3000,
        actualCost: 2800,
        revenue: 3500,
        capacity: 200,
        attendance: 180,
        exercice: '2023',
        description: 'Grand festival d\'été avec plusieurs artistes'
      }
    ];

    for (const event of sampleEvents) {
      await db.put('events', event);
    }

    // Add sample members
    const sampleMembers: Member[] = [
      {
        id: 'member-1',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@email.com',
        phone: '0123456789',
        membershipDate: '2024-01-01',
        membershipFee: 25,
        isActive: true,
        address: '123 Rue de la Culture, 75001 Paris'
      },
      {
        id: 'member-2',
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie.martin@email.com',
        phone: '0987654321',
        membershipDate: '2024-01-15',
        membershipFee: 25,
        isActive: true,
        address: '456 Avenue des Arts, 75002 Paris'
      }
    ];

    for (const member of sampleMembers) {
      await db.put('members', member);
    }
  }

  // Initialize categories from accounting plan if empty
  const categories = await db.getAll('categories');
  if (categories.length === 0) {
    const { ACCOUNTING_PLAN } = await import('../data/accountingPlan');
    for (const category of ACCOUNTING_PLAN) {
      const categoryWithId = {
        ...category,
        id: `cat-${category.code}`
      };
      await db.put('categories', categoryWithId);
    }
  }
}

// Transaction CRUD operations
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const newTransaction: Transaction = {
    ...transaction,
    id,
    createdAt: now,
    updatedAt: now
  };

  await db.add('transactions', newTransaction);
  return id;
}

export async function getTransactions(exercice?: string): Promise<Transaction[]> {
  if (exercice) {
    return db.getAllFromIndex('transactions', 'by-exercice', exercice);
  }
  return db.getAll('transactions');
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return db.getAll('transactions');
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  const transaction = await db.get('transactions', id);
  if (transaction) {
    const updatedTransaction = {
      ...transaction,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await db.put('transactions', updatedTransaction);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.delete('transactions', id);
}

// Event CRUD operations
export async function addEvent(event: Omit<Event, 'id'>): Promise<string> {
  const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newEvent: Event = { ...event, id };
  await db.add('events', newEvent);
  return id;
}

export async function getEvents(exercice?: string): Promise<Event[]> {
  if (exercice) {
    return db.getAllFromIndex('events', 'by-exercice', exercice);
  }
  return db.getAll('events');
}

export async function getAllEvents(): Promise<Event[]> {
  return db.getAll('events');
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<void> {
  const event = await db.get('events', id);
  if (event) {
    const updatedEvent = { ...event, ...updates };
    await db.put('events', updatedEvent);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  await db.delete('events', id);
}

// Category CRUD operations
export async function getCategories(): Promise<(Category & { id: string })[]> {
  return db.getAll('categories');
}

export async function addCategory(category: Category): Promise<string> {
  const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const categoryWithId = { ...category, id };
  await db.add('categories', categoryWithId);
  return id;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const category = await db.get('categories', id);
  if (category) {
    const updatedCategory = { ...category, ...updates };
    await db.put('categories', updatedCategory);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  await db.delete('categories', id);
}

// Member CRUD operations
export async function getMembers(): Promise<Member[]> {
  return db.getAll('members');
}

export async function addMember(member: Omit<Member, 'id'>): Promise<string> {
  const id = `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const newMember: Member = { ...member, id };
  await db.add('members', newMember);
  return id;
}

export async function updateMember(id: string, updates: Partial<Member>): Promise<void> {
  const member = await db.get('members', id);
  if (member) {
    const updatedMember = { ...member, ...updates };
    await db.put('members', updatedMember);
  }
}

export async function deleteMember(id: string): Promise<void> {
  await db.delete('members', id);
}

// Exercice CRUD operations
export async function addExercice(exercice: Omit<Exercice, 'id'>): Promise<string> {
  const id = `exercice-${exercice.year}`;
  const newExercice: Exercice = { ...exercice, id };
  await db.add('exercices', newExercice);
  return id;
}

export async function getExercices(): Promise<Exercice[]> {
  return db.getAll('exercices');
}

export async function getActiveExercice(): Promise<Exercice | undefined> {
  const exercices = await db.getAll('exercices');
  return exercices.find(ex => ex.isActive);
}

export async function updateExercice(id: string, updates: Partial<Exercice>): Promise<void> {
  const exercice = await db.get('exercices', id);
  if (exercice) {
    const updatedExercice = { ...exercice, ...updates };
    await db.put('exercices', updatedExercice);
  }
}

export async function deleteExercice(id: string): Promise<void> {
  await db.delete('exercices', id);
}

// Utility functions - CORRECTION : Numéros de pièce avec année
export async function generatePieceNumber(type: 'recette' | 'depense', exercice: string): Promise<string> {
  const transactions = await getTransactions(exercice);
  const filteredTransactions = transactions.filter(t => t.type === type);
  const count = filteredTransactions.length + 1;
  const prefix = type === 'recette' ? 'REC' : 'DEP';
  return `${exercice}-${prefix}${count.toString().padStart(3, '0')}`;
}

export async function calculateExerciceStats(exercice: string): Promise<{
  totalRevenue: number;
  totalExpenses: number;
  result: number;
  transactionCount: number;
}> {
  const transactions = await getTransactions(exercice);
  
  const totalRevenue = transactions
    .filter(t => t.type === 'recette')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = transactions
    .filter(t => t.type === 'depense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  return {
    totalRevenue,
    totalExpenses,
    result: totalRevenue - totalExpenses,
    transactionCount: transactions.length
  };
}

// Clear functions
export async function clearAllData(): Promise<void> {
  const tx = db.transaction(['transactions', 'events', 'categories', 'members'], 'readwrite');
  await Promise.all([
    tx.objectStore('transactions').clear(),
    tx.objectStore('events').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('members').clear()
  ]);
  await tx.done;
}

export async function clearAllTransactions(): Promise<void> {
  const tx = db.transaction('transactions', 'readwrite');
  await tx.objectStore('transactions').clear();
  await tx.done;
}

export async function clearAllEvents(): Promise<void> {
  const tx = db.transaction('events', 'readwrite');
  await tx.objectStore('events').clear();
  await tx.done;
}

export async function clearAllCategories(): Promise<void> {
  const tx = db.transaction('categories', 'readwrite');
  await tx.objectStore('categories').clear();
  await tx.done;
}

export async function clearAllMembers(): Promise<void> {
  const tx = db.transaction('members', 'readwrite');
  await tx.objectStore('members').clear();
  await tx.done;
}