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

  console.log('🎯 Export - Events mapping:', Array.from(eventsMap.entries()));

  // Feuille Transactions - 🎯 EXPORT DU NOM D'ÉVÉNEMENT (comme les catégories)
  const transactionsData = data.transactions.map(t => {
    // 🎯 RÉCUPÉRER LE NOM DE L'ÉVÉNEMENT (comme on récupère le nom de catégorie)
    let eventName = '';
    if (t.eventId && t.eventId.trim() !== '') {
      eventName = eventsMap.get(t.eventId) || '';
      console.log(`📝 Transaction "${t.description}" - EventID: ${t.eventId} -> EventName: "${eventName}"`);
    }
    
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
      'Événement Nom': eventName, // 🎯 CHANGEMENT : Nom au lieu d'ID
      'Validé': t.isValidated ? 'Oui' : 'Non',
      'Exercice': t.exercice,
      'Créé le': new Date(t.createdAt).toLocaleDateString('fr-FR'),
      'Modifié le': new Date(t.updatedAt).toLocaleDateString('fr-FR'),
      'Justificatif': t.attachment || ''
    };
  });

  console.log('📊 Export - Sample transaction data:', transactionsData[0]);

  const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');

  // Feuille Événements - Pas de changement
  const eventsData = data.events.map(e => ({
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

        console.log('🔍 Feuilles disponibles:', workbook.SheetNames);

        // 🎯 ÉTAPE 1 : Parse événements (pour créer le mapping nom → événement)
        const eventsSheet = workbook.Sheets['Événements'];
        if (!eventsSheet) {
          throw new Error('Feuille "Événements" non trouvée');
        }

        const eventsJson = XLSX.utils.sheet_to_json(eventsSheet) as any[];
        console.log('📋 Événements bruts du fichier Excel:', eventsJson);
        
        // 🎯 CRÉER LES ÉVÉNEMENTS avec IDs uniques
        const baseTimestamp = Date.now();
        const events: Event[] = [];
        
        eventsJson.forEach((row, index) => {
          const eventName = row['Nom'] || '';
          if (!eventName.trim()) return; // Ignorer les lignes vides
          
          const eventId = `event-${baseTimestamp}-${index}`;
          
          console.log(`🎭 Création événement: "${eventName}" → ID: ${eventId}`);
          
          const event: Event = {
            id: eventId,
            name: eventName.trim(),
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
          
          events.push(event);
        });

        // 🎯 ÉTAPE 2 : Parse transactions avec liaison par NOM d'événement
        const transactionsSheet = workbook.Sheets['Transactions'];
        if (!transactionsSheet) {
          throw new Error('Feuille "Transactions" non trouvée');
        }

        const transactionsJson = XLSX.utils.sheet_to_json(transactionsSheet) as any[];
        console.log('📋 Transactions brutes du fichier Excel (première):', transactionsJson[0]);
        
        const transactions: Transaction[] = transactionsJson.map((row, index) => {
          // 🎯 LIAISON PAR NOM D'ÉVÉNEMENT (comme les catégories)
          let eventId: string | undefined;
          
          // Récupérer le nom de l'événement depuis Excel
          const eventName = row['Événement Nom'] || row['Événement'] || '';
          
          console.log(`📝 Transaction ${index + 1}: "${row['Description']}"`);
          console.log(`   📍 Événement recherché: "${eventName}"`);
          
          if (eventName && eventName.toString().trim()) {
            // 🎯 RECHERCHE PAR NOM (comme les catégories)
            const matchingEvent = events.find(e => e.name.trim() === eventName.toString().trim());
            eventId = matchingEvent?.id;
            
            console.log(`🔗 Recherche événement par nom: "${eventName}" → ID: ${eventId || 'NON TROUVÉ'}`);
            
            if (!eventId) {
              console.log(`❌ Événement "${eventName}" non trouvé. Événements disponibles:`);
              events.forEach(e => console.log(`   - "${e.name}"`));
            } else {
              console.log(`✅ Événement "${eventName}" trouvé → ID: ${eventId}`);
            }
          } else {
            console.log(`ℹ️ Pas d'événement pour la transaction "${row['Description']}"`);
          }

          // Récupération de la sous-catégorie
          let subcategory: string | undefined;
          if (row['Sous-catégorie Code'] && row['Sous-catégorie Code'].toString().trim()) {
            const subcatValue = row['Sous-catégorie Code'].toString().trim();
            if (subcatValue !== 'Sélectionner une sous-catégorie' && subcatValue !== '') {
              subcategory = subcatValue;
            }
          }

          // Récupération de la catégorie
          let category = '';
          if (row['Catégorie Code'] && row['Catégorie Code'].toString().trim()) {
            category = row['Catégorie Code'].toString().trim();
          } else if (row['Catégorie'] && row['Catégorie'].toString().trim()) {
            category = row['Catégorie'].toString().trim();
          }

          // Récupération du mode de paiement
          let paymentMethod = 'CB';
          if (row['Mode Paiement Code'] && row['Mode Paiement Code'].toString().trim()) {
            paymentMethod = row['Mode Paiement Code'].toString().trim();
          } else if (row['Mode de paiement'] && row['Mode de paiement'].toString().trim()) {
            paymentMethod = getPaymentMethodValue(row['Mode de paiement'].toString().trim());
          }

          const transactionId = `imported-trans-${baseTimestamp}-${index}`;

          const transaction = {
            id: transactionId,
            date: formatDateFromExcel(row['Date']),
            amount: parseFloat(row['Montant']) || 0,
            description: row['Description'] || '',
            category: category,
            subcategory: subcategory,
            paymentMethod: paymentMethod as any,
            type: row['Type'] === 'recette' ? 'recette' : 'depense',
            eventId: eventId, // 🎯 ID trouvé par NOM
            pieceNumber: row['N° Pièce'] || '',
            isValidated: row['Validé'] === 'Oui',
            exercice: row['Exercice'] || new Date().getFullYear().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachment: row['Justificatif'] || undefined
          };

          console.log(`📄 Transaction finale ${index + 1}:`, {
            description: transaction.description,
            eventId: transaction.eventId,
            eventName: eventName
          });

          return transaction;
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
          id: `imported-member-${baseTimestamp}-${index}`,
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

        // 🎉 RÉSUMÉ FINAL
        const transactionsWithEvents = result.transactions.filter(t => t.eventId);
        console.log('🎉 IMPORT TERMINÉ - RÉSUMÉ:');
        console.log(`📊 ${result.transactions.length} transactions importées`);
        console.log(`🎭 ${result.events.length} événements importés`);
        console.log(`🔗 ${transactionsWithEvents.length} transactions liées à un événement`);
        console.log('🔗 Détail des liaisons:');
        transactionsWithEvents.forEach(t => {
          const eventName = events.find(e => e.id === t.eventId)?.name;
          console.log(`   - "${t.description}" → "${eventName}"`);
        });
        
        resolve(result);
      } catch (error) {
        console.error('❌ Erreur parsing Excel:', error);
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

// Détection de doublons
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
    existing.name.trim().toLowerCase() === event.name.trim().toLowerCase()
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