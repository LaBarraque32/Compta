import * as XLSX from 'xlsx';
import { Transaction, Event, Category, Member } from '../types/accounting';
import { PAYMENT_METHODS } from '../data/accountingPlan';

export interface ExportData {
  transactions: Transaction[];
  events: Event[];
  categories: (Category & { id: string })[];
  members: Member[];
  exercice: string;
  exportDate: string;
}

export interface ImportOptions {
  clearExistingData: boolean;
  skipDuplicates: boolean;
}

export function exportToExcel(data: ExportData): void {
  const workbook = XLSX.utils.book_new();

  // Créer un mapping des événements pour l'export
  const eventsMap = new Map(data.events.map(e => [e.id, e.name]));
  
  // Créer un mapping des catégories pour l'export des sous-catégories
  const categoriesMap = new Map(data.categories.map(c => [c.code, c]));

  // Feuille Transactions - CORRECTION COMPLÈTE
  const transactionsData = data.transactions.map(t => {
    // Récupérer le nom de l'événement associé
    const eventName = t.eventId ? eventsMap.get(t.eventId) || '' : '';
    
    // Récupérer le nom de la catégorie
    const categoryName = categoriesMap.get(t.category)?.name || '';
    
    // Récupérer le nom de la sous-catégorie
    let subcategoryName = '';
    if (t.subcategory && t.category) {
      const category = categoriesMap.get(t.category);
      const subcategory = category?.subcategories?.find(sub => sub.code === t.subcategory);
      subcategoryName = subcategory ? subcategory.name : '';
    }

    // Récupérer le libellé du mode de paiement
    const paymentMethodLabel = PAYMENT_METHODS.find(pm => pm.value === t.paymentMethod)?.label || t.paymentMethod;

    return {
      'Date': t.date,
      'N° Pièce': t.pieceNumber,
      'Description': t.description,
      'Catégorie Code': t.category,
      'Catégorie Nom': categoryName,
      'Sous-catégorie Code': t.subcategory || '',
      'Sous-catégorie Nom': subcategoryName,
      'Type': t.type,
      'Montant': t.amount,
      'Mode Paiement Code': t.paymentMethod,
      'Mode Paiement Nom': paymentMethodLabel,
      'Événement ID': t.eventId || '',
      'Événement Nom': eventName,
      'Validé': t.isValidated ? 'Oui' : 'Non',
      'Exercice': t.exercice,
      'Créé le': new Date(t.createdAt).toLocaleDateString('fr-FR'),
      'Modifié le': new Date(t.updatedAt).toLocaleDateString('fr-FR'),
      'Justificatif': t.attachment || ''
    };
  });

  const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

  // Feuille Événements
  const eventsData = data.events.map(e => ({
    'ID': e.id,
    'Nom': e.name,
    'Date': e.date,
    'Type': e.type,
    'Budget': e.budget,
    'Coût réel': e.actualCost,
    'Recettes': e.revenue,
    'Capacité': e.capacity,
    'Fréquentation': e.attendance,
    'Exercice': e.exercice,
    'Description': e.description || ''
  }));

  const eventsSheet = XLSX.utils.json_to_sheet(eventsData);
  XLSX.utils.book_append_sheet(workbook, eventsSheet, 'Événements');

  // Feuille Catégories
  const categoriesData: any[] = [];
  data.categories.forEach(cat => {
    categoriesData.push({
      'Code': cat.code,
      'Nom': cat.name,
      'Type': cat.type,
      'Sous-catégorie': '',
      'Code sous-catégorie': '',
      'Nom sous-catégorie': ''
    });

    if (cat.subcategories) {
      cat.subcategories.forEach(sub => {
        categoriesData.push({
          'Code': cat.code,
          'Nom': cat.name,
          'Type': cat.type,
          'Sous-catégorie': 'Oui',
          'Code sous-catégorie': sub.code,
          'Nom sous-catégorie': sub.name
        });
      });
    }
  });

  const categoriesSheet = XLSX.utils.json_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Catégories');

  // Feuille Adhérents
  const membersData = data.members.map(m => ({
    'Prénom': m.firstName,
    'Nom': m.lastName,
    'Email': m.email,
    'Téléphone': m.phone || '',
    'Date adhésion': m.membershipDate,
    'Cotisation': m.membershipFee,
    'Actif': m.isActive ? 'Oui' : 'Non',
    'Adresse': m.address || ''
  }));

  const membersSheet = XLSX.utils.json_to_sheet(membersData);
  XLSX.utils.book_append_sheet(workbook, membersSheet, 'Adhérents');

  // Feuille Résumé
  const totalRecettes = data.transactions
    .filter(t => t.type === 'recette')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDepenses = data.transactions
    .filter(t => t.type === 'depense')
    .reduce((sum, t) => sum + t.amount, 0);

  const resumeData = [
    { 'Indicateur': 'Exercice', 'Valeur': data.exercice },
    { 'Indicateur': 'Date export', 'Valeur': data.exportDate },
    { 'Indicateur': 'Nombre transactions', 'Valeur': data.transactions.length },
    { 'Indicateur': 'Nombre événements', 'Valeur': data.events.length },
    { 'Indicateur': 'Nombre adhérents actifs', 'Valeur': data.members.filter(m => m.isActive).length },
    { 'Indicateur': 'Total recettes', 'Valeur': totalRecettes },
    { 'Indicateur': 'Total dépenses', 'Valeur': totalDepenses },
    { 'Indicateur': 'Résultat', 'Valeur': totalRecettes - totalDepenses }
  ];

  const resumeSheet = XLSX.utils.json_to_sheet(resumeData);
  XLSX.utils.book_append_sheet(workbook, resumeSheet, 'Résumé');

  // Télécharger le fichier
  const fileName = `comptabilite_la_barraque_${data.exercice}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function parseExcelFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Parse events first to preserve original IDs
        const eventsSheet = workbook.Sheets['Événements'];
        const eventsJson = XLSX.utils.sheet_to_json(eventsSheet) as any[];
        
        const events: Event[] = eventsJson.map((row, index) => {
          // Préserver l'ID original de l'événement s'il existe
          const originalId = row['ID'];
          const eventId = originalId && originalId.toString().trim() 
            ? originalId.toString().trim() 
            : `imported-event-${Date.now()}-${index}`;
            
          return {
            id: eventId,
            name: row['Nom'] || '',
            date: formatDateFromExcel(row['Date']),
            type: row['Type'] || 'concert',
            budget: parseFloat(row['Budget']) || 0,
            actualCost: parseFloat(row['Coût réel']) || 0,
            revenue: parseFloat(row['Recettes']) || 0,
            capacity: parseInt(row['Capacité']) || 0,
            attendance: parseInt(row['Fréquentation']) || 0,
            exercice: row['Exercice'] || new Date().getFullYear().toString(),
            description: row['Description'] || undefined
          };
        });

        // CORRECTION MAJEURE : Créer un mapping robuste pour les événements
        const eventNameToIdMap = new Map(events.map(e => [e.name, e.id]));
        const eventIdMap = new Map(events.map(e => [e.id, e]));

        console.log('Events loaded:', events);
        console.log('Event mappings:', {
          nameToId: Array.from(eventNameToIdMap.entries()),
          idMap: Array.from(eventIdMap.keys())
        });

        // Parse transactions - CORRECTION COMPLÈTE
        const transactionsSheet = workbook.Sheets['Transactions'];
        const transactionsJson = XLSX.utils.sheet_to_json(transactionsSheet) as any[];
        
        const transactions: Transaction[] = transactionsJson.map((row, index) => {
          // CORRECTION MAJEURE : Récupération robuste de l'ID de l'événement
          let eventId: string | undefined;
          
          // Priorité 1: Événement ID (nouveau format)
          if (row['Événement ID'] && row['Événement ID'].toString().trim()) {
            const rawEventId = row['Événement ID'].toString().trim();
            // Vérifier si cet ID existe dans les événements importés
            if (eventIdMap.has(rawEventId)) {
              eventId = rawEventId;
              console.log(`✅ Event ID trouvé directement: ${rawEventId}`);
            } else {
              console.log(`❌ Event ID non trouvé: ${rawEventId}, événements disponibles:`, Array.from(eventIdMap.keys()));
            }
          }
          
          // Priorité 2: ID Événement (ancien format)
          if (!eventId && row['ID Événement'] && row['ID Événement'].toString().trim()) {
            const rawEventId = row['ID Événement'].toString().trim();
            if (eventIdMap.has(rawEventId)) {
              eventId = rawEventId;
              console.log(`✅ ID Événement trouvé: ${rawEventId}`);
            }
          }
          
          // Priorité 3: Événement Nom (nouveau format) - Mapping par nom
          if (!eventId && row['Événement Nom'] && row['Événement Nom'].toString().trim()) {
            const eventName = row['Événement Nom'].toString().trim();
            const mappedId = eventNameToIdMap.get(eventName);
            if (mappedId) {
              eventId = mappedId;
              console.log(`✅ Event trouvé par nom: ${eventName} -> ${mappedId}`);
            } else {
              console.log(`❌ Event non trouvé par nom: ${eventName}, noms disponibles:`, Array.from(eventNameToIdMap.keys()));
            }
          }
          
          // Priorité 4: Nom Événement (ancien format)
          if (!eventId && row['Nom Événement'] && row['Nom Événement'].toString().trim()) {
            const eventName = row['Nom Événement'].toString().trim();
            const mappedId = eventNameToIdMap.get(eventName);
            if (mappedId) {
              eventId = mappedId;
              console.log(`✅ Nom Événement trouvé: ${eventName} -> ${mappedId}`);
            }
          }

          // CORRECTION : Récupération robuste de la sous-catégorie
          let subcategory: string | undefined;
          
          // Priorité 1: Sous-catégorie Code (nouveau format)
          if (row['Sous-catégorie Code'] && row['Sous-catégorie Code'].toString().trim()) {
            const subcatValue = row['Sous-catégorie Code'].toString().trim();
            if (subcatValue !== 'Sélectionner une sous-catégorie' && subcatValue !== '') {
              subcategory = subcatValue;
            }
          }
          
          // Priorité 2: Code sous-catégorie (ancien format)
          if (!subcategory && row['Code sous-catégorie'] && row['Code sous-catégorie'].toString().trim()) {
            const subcatValue = row['Code sous-catégorie'].toString().trim();
            if (subcatValue !== 'Sélectionner une sous-catégorie' && subcatValue !== '') {
              subcategory = subcatValue;
            }
          }

          // CORRECTION : Récupération robuste de la catégorie
          let category = '';
          
          // Priorité 1: Catégorie Code (nouveau format)
          if (row['Catégorie Code'] && row['Catégorie Code'].toString().trim()) {
            category = row['Catégorie Code'].toString().trim();
          }
          // Priorité 2: Catégorie (ancien format)
          else if (row['Catégorie'] && row['Catégorie'].toString().trim()) {
            category = row['Catégorie'].toString().trim();
          }

          // CORRECTION : Récupération robuste du mode de paiement
          let paymentMethod = 'CB';
          
          // Priorité 1: Mode Paiement Code (nouveau format)
          if (row['Mode Paiement Code'] && row['Mode Paiement Code'].toString().trim()) {
            paymentMethod = row['Mode Paiement Code'].toString().trim();
          }
          // Priorité 2: Mode de paiement (ancien format avec conversion)
          else if (row['Mode de paiement'] && row['Mode de paiement'].toString().trim()) {
            paymentMethod = getPaymentMethodValue(row['Mode de paiement'].toString().trim());
          }

          console.log(`Transaction ${index + 1} import:`, {
            description: row['Description'],
            eventId,
            subcategory,
            category,
            paymentMethod,
            eventExists: eventId ? eventIdMap.has(eventId) : false,
            rawEventId: row['Événement ID'],
            rawEventName: row['Événement Nom']
          });

          return {
            id: `imported-trans-${Date.now()}-${index}`,
            date: formatDateFromExcel(row['Date']),
            amount: parseFloat(row['Montant']) || 0,
            description: row['Description'] || '',
            category: category,
            subcategory: subcategory,
            paymentMethod: paymentMethod as any,
            type: row['Type'] === 'recette' ? 'recette' : 'depense',
            eventId: eventId,
            pieceNumber: row['N° Pièce'] || '',
            isValidated: row['Validé'] === 'Oui',
            exercice: row['Exercice'] || new Date().getFullYear().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachment: row['Justificatif'] || undefined
          };
        });

        // Parse categories
        const categoriesSheet = workbook.Sheets['Catégories'];
        const categoriesJson = XLSX.utils.sheet_to_json(categoriesSheet) as any[];
        
        const categoriesMap = new Map<string, Category & { id: string }>();
        
        categoriesJson.forEach((row, index) => {
          const code = row['Code'];
          if (!categoriesMap.has(code)) {
            categoriesMap.set(code, {
              id: `imported-cat-${code}`,
              code: code,
              name: row['Nom'] || '',
              type: row['Type'] === 'recette' ? 'recette' : 'depense',
              subcategories: []
            });
          }

          if (row['Sous-catégorie'] === 'Oui' && row['Code sous-catégorie']) {
            const category = categoriesMap.get(code)!;
            category.subcategories = category.subcategories || [];
            category.subcategories.push({
              code: row['Code sous-catégorie'],
              name: row['Nom sous-catégorie'] || '',
              parentCode: code
            });
          }
        });

        const categories = Array.from(categoriesMap.values());

        // Parse members
        const membersSheet = workbook.Sheets['Adhérents'];
        const membersJson = XLSX.utils.sheet_to_json(membersSheet) as any[];
        
        const members: Member[] = membersJson.map((row, index) => ({
          id: `imported-member-${Date.now()}-${index}`,
          firstName: row['Prénom'] || '',
          lastName: row['Nom'] || '',
          email: row['Email'] || '',
          phone: row['Téléphone'] || undefined,
          membershipDate: formatDateFromExcel(row['Date adhésion']),
          membershipFee: parseFloat(row['Cotisation']) || 0,
          isActive: row['Actif'] === 'Oui',
          address: row['Adresse'] || undefined
        }));

        // Parse resume for exercice info
        const resumeSheet = workbook.Sheets['Résumé'];
        const resumeJson = XLSX.utils.sheet_to_json(resumeSheet) as any[];
        const exerciceRow = resumeJson.find(row => row['Indicateur'] === 'Exercice');
        const exportDateRow = resumeJson.find(row => row['Indicateur'] === 'Date export');

        const result: ExportData = {
          transactions,
          events,
          categories,
          members,
          exercice: exerciceRow?.['Valeur'] || new Date().getFullYear().toString(),
          exportDate: exportDateRow?.['Valeur'] || new Date().toISOString().split('T')[0]
        };

        console.log('Import result final:', {
          transactionsCount: result.transactions.length,
          eventsCount: result.events.length,
          transactionsWithEvents: result.transactions.filter(t => t.eventId).length,
          transactionsWithSubcategories: result.transactions.filter(t => t.subcategory).length,
          eventIds: result.events.map(e => e.id),
          transactionEventIds: result.transactions.filter(t => t.eventId).map(t => t.eventId)
        });
        
        resolve(result);
      } catch (error) {
        console.error('Excel parsing error:', error);
        reject(new Error('Erreur lors de la lecture du fichier Excel: ' + error));
      }
    };

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

function formatDateFromExcel(dateValue: any): string {
  if (!dateValue) return new Date().toISOString().split('T')[0];
  
  // Si c'est déjà au format YYYY-MM-DD
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Si c'est un nombre Excel (jours depuis 1900)
  if (typeof dateValue === 'number') {
    const date = XLSX.SSF.parse_date_code(dateValue);
    return `${date.y}-${date.m.toString().padStart(2, '0')}-${date.d.toString().padStart(2, '0')}`;
  }
  
  // Essayer de parser comme date
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    // Ignore
  }
  
  return new Date().toISOString().split('T')[0];
}

function getPaymentMethodValue(label: string): string {
  const method = PAYMENT_METHODS.find(pm => pm.label === label);
  return method?.value || 'CB';
}

// Fonctions utilitaires pour détecter les doublons
export function isDuplicateTransaction(transaction: Transaction, existingTransactions: Transaction[]): boolean {
  return existingTransactions.some(existing => 
    existing.date === transaction.date &&
    existing.amount === transaction.amount &&
    existing.description === transaction.description &&
    existing.category === transaction.category &&
    existing.type === transaction.type
  );
}

export function isDuplicateEvent(event: Event, existingEvents: Event[]): boolean {
  return existingEvents.some(existing => 
    existing.name === event.name &&
    existing.date === event.date &&
    existing.type === event.type
  );
}

export function isDuplicateCategory(category: Category, existingCategories: (Category & { id: string })[]): boolean {
  return existingCategories.some(existing => existing.code === category.code);
}

export function isDuplicateMember(member: Member, existingMembers: Member[]): boolean {
  return existingMembers.some(existing => 
    existing.email === member.email ||
    (existing.firstName === member.firstName && existing.lastName === member.lastName)
  );
}