import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  Edit, 
  Trash2,
  Check,
  X,
  FileText,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Users
} from 'lucide-react';
import { 
  getAllTransactions,
  updateTransaction, 
  deleteTransaction, 
  getCategories, 
  getAllEvents, 
  getMembers, 
  addTransaction, 
  addEvent, 
  addCategory, 
  addMember,
  clearAllData
} from '../services/database';
import { PAYMENT_METHODS } from '../data/accountingPlan';
import { Transaction, Category } from '../types/accounting';
import { 
  exportToExcel, 
  parseExcelFile, 
  ExportData,
  isDuplicateTransaction,
  isDuplicateEvent,
  isDuplicateCategory,
  isDuplicateMember
} from '../services/excelService';
import { useExercise } from '../contexts/ExerciseContext';
import TransactionEditModal from './TransactionEditModal';

interface TransactionListProps {
  refreshTrigger?: number;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  refreshTrigger = 0 
}) => {
  const { exercices, selectedExercice, setSelectedExercice } = useExercise();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<(Category & { id: string })[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    isValidated: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  useEffect(() => {
    applyFilters();
  }, [allTransactions, searchTerm, filters, selectedExercice]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [transactionsData, categoriesData, eventsData] = await Promise.all([
        getAllTransactions(),
        getCategories(),
        getAllEvents()
      ]);
      
      setAllTransactions(transactionsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setCategories(categoriesData);
      setEvents(eventsData);

      // 🔍 DEBUG : Vérifier les événements chargés
      console.log('🎭 Événements chargés dans TransactionList:', eventsData.map(e => ({ id: e.id, name: e.name })));
      
      // 🔍 DEBUG : Vérifier les transactions avec eventId
      const transactionsWithEvents = transactionsData.filter(t => t.eventId);
      console.log('🔗 Transactions avec eventId:', transactionsWithEvents.map(t => ({ 
        description: t.description, 
        eventId: t.eventId 
      })));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allTransactions;

    // Filter by exercice first - SEULES les transactions de l'exercice sélectionné
    if (selectedExercice) {
      filtered = filtered.filter(t => t.exercice === selectedExercice);
    }

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.pieceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }

    // Payment method filter
    if (filters.paymentMethod) {
      filtered = filtered.filter(t => t.paymentMethod === filters.paymentMethod);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(t => t.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(t => t.date <= filters.dateTo);
    }

    // Validation status filter
    if (filters.isValidated !== '') {
      filtered = filtered.filter(t => t.isValidated === (filters.isValidated === 'true'));
    }

    setFilteredTransactions(filtered);
  };

  const handleValidateTransaction = async (id: string, isValidated: boolean) => {
    try {
      await updateTransaction(id, { isValidated });
      loadData();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      try {
        await deleteTransaction(id);
        loadData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
  };

  const handleTransactionUpdated = () => {
    loadData();
  };

  const getCategoryName = (code: string) => {
    const category = categories.find(cat => cat.code === code);
    return category ? category.name : code;
  };

  const getSubcategoryName = (categoryCode: string, subcategoryCode: string) => {
    const category = categories.find(cat => cat.code === categoryCode);
    const subcategory = category?.subcategories?.find(sub => sub.code === subcategoryCode);
    return subcategory ? subcategory.name : subcategoryCode;
  };

  // 🔧 CORRECTION : Fonction améliorée pour récupérer le nom de l'événement
  const getEventName = (eventId: string | undefined) => {
    if (!eventId || !eventId.trim()) {
      return '';
    }
    
    const event = events.find(e => e.id === eventId);
    const eventName = event ? event.name : '';
    
    // 🔍 DEBUG : Log pour chaque recherche d'événement
    console.log(`🔍 Recherche événement ID "${eventId}" → Nom: "${eventName}"`);
    
    return eventName;
  };

  const handleExportExcel = async () => {
    try {
      const [transactionsData, eventsData, categoriesData, membersData] = await Promise.all([
        getAllTransactions(),
        getAllEvents(),
        getCategories(),
        getMembers()
      ]);

      const exportData: ExportData = {
        transactions: transactionsData,
        events: eventsData,
        categories: categoriesData,
        members: membersData,
        exercice: selectedExercice,
        exportDate: new Date().toLocaleDateString('fr-FR')
      };

      exportToExcel(exportData);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Erreur lors de l\'export Excel');
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>, clearData: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      return;
    }

    try {
      setImporting(true);
      const importData = await parseExcelFile(file);

      // Charger les données existantes pour détecter les doublons
      const [existingTransactions, existingEvents, existingCategories, existingMembers] = await Promise.all([
        getAllTransactions(),
        getAllEvents(),
        getCategories(),
        getMembers()
      ]);

      // Analyser les doublons
      const duplicateTransactions = importData.transactions.filter(t => 
        isDuplicateTransaction(t, existingTransactions)
      );
      const duplicateEvents = importData.events.filter(e => 
        isDuplicateEvent(e, existingEvents)
      );
      const duplicateCategories = importData.categories.filter(c => 
        isDuplicateCategory(c, existingCategories)
      );
      const duplicateMembers = importData.members.filter(m => 
        isDuplicateMember(m, existingMembers)
      );

      // Préparer le message de confirmation
      let confirmMessage = `Voulez-vous importer les données suivantes ?\n\n`;
      
      if (clearData) {
        confirmMessage += `⚠️ ATTENTION: Toutes les données existantes seront supprimées !\n\n`;
      }
      
      confirmMessage += `- ${importData.transactions.length} transactions`;
      if (duplicateTransactions.length > 0 && !clearData) {
        confirmMessage += ` (${duplicateTransactions.length} doublons détectés)`;
      }
      
      confirmMessage += `\n- ${importData.events.length} événements`;
      if (duplicateEvents.length > 0 && !clearData) {
        confirmMessage += ` (${duplicateEvents.length} doublons détectés)`;
      }
      
      confirmMessage += `\n- ${importData.categories.length} catégories`;
      if (duplicateCategories.length > 0 && !clearData) {
        confirmMessage += ` (${duplicateCategories.length} doublons détectés)`;
      }
      
      confirmMessage += `\n- ${importData.members.length} adhérents`;
      if (duplicateMembers.length > 0 && !clearData) {
        confirmMessage += ` (${duplicateMembers.length} doublons détectés)`;
      }
      
      confirmMessage += `\n\nExercice: ${importData.exercice}\nDate export: ${importData.exportDate}`;

      if (!clearData && (duplicateTransactions.length > 0 || duplicateEvents.length > 0 || duplicateCategories.length > 0 || duplicateMembers.length > 0)) {
        confirmMessage += `\n\n⚠️ Des doublons ont été détectés. Ils seront ignorés lors de l'import.`;
      }

      if (!window.confirm(confirmMessage)) {
        return;
      }

      // Vider les données si demandé
      if (clearData) {
        await clearAllData();
      }

      let importedCounts = {
        transactions: 0,
        events: 0,
        categories: 0,
        members: 0
      };

      // Importer les catégories (en premier car référencées par les transactions)
      for (const category of importData.categories) {
        try {
          if (clearData || !isDuplicateCategory(category, existingCategories)) {
            await addCategory(category);
            importedCounts.categories++;
          }
        } catch (error) {
          console.warn('Category import error:', error);
        }
      }

      // Importer les événements
      for (const event of importData.events) {
        try {
          if (clearData || !isDuplicateEvent(event, existingEvents)) {
            await addEvent(event);
            importedCounts.events++;
          }
        } catch (error) {
          console.warn('Event import error:', error);
        }
      }

      // Importer les adhérents
      for (const member of importData.members) {
        try {
          if (clearData || !isDuplicateMember(member, existingMembers)) {
            await addMember(member);
            importedCounts.members++;
          }
        } catch (error) {
          console.warn('Member import error:', error);
        }
      }

      // Importer les transactions
      for (const transaction of importData.transactions) {
        try {
          if (clearData || !isDuplicateTransaction(transaction, existingTransactions)) {
            await addTransaction(transaction);
            importedCounts.transactions++;
          }
        } catch (error) {
          console.warn('Transaction import error:', error);
        }
      }

      const successMessage = clearData 
        ? `Import terminé avec succès !\n\nToutes les données ont été remplacées :\n`
        : `Import terminé avec succès !\n\nDonnées importées (doublons ignorés) :\n`;
      
      alert(successMessage +
        `${importedCounts.transactions} transactions\n` +
        `${importedCounts.events} événements\n` +
        `${importedCounts.categories} catégories\n` +
        `${importedCounts.members} adhérents`);

      loadData();
      setShowImportOptions(false);
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Erreur lors de l\'import: ' + error);
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const resetFilters = () => {
    setFilters({
      type: '',
      category: '',
      paymentMethod: '',
      dateFrom: '',
      dateTo: '',
      isValidated: ''
    });
    setSearchTerm('');
  };

  // CORRECTION : Calculer les totaux UNIQUEMENT sur les transactions filtrées (exercice sélectionné)
  const totalAmount = filteredTransactions.reduce((sum, t) => {
    return sum + (t.type === 'recette' ? t.amount : -t.amount);
  }, 0);

  const totalRecettes = filteredTransactions
    .filter(t => t.type === 'recette')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDepenses = filteredTransactions
    .filter(t => t.type === 'depense')
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <div className="flex items-center space-x-4 mt-2">
            <label className="text-sm font-medium text-gray-700">Exercice :</label>
            <select
              value={selectedExercice}
              onChange={(e) => setSelectedExercice(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {exercices.map(ex => (
                <option key={ex.id} value={ex.year}>
                  {ex.year} {ex.isActive ? '(Actif)' : ''} {ex.isClosed ? '(Clôturé)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Import Options */}
          <div className="relative">
            <button
              onClick={() => setShowImportOptions(!showImportOptions)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={importing}
            >
              <Upload size={16} className="mr-2" />
              {importing ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                'Importer Excel'
              )}
            </button>

            {showImportOptions && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Options d'import</h3>
                  
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                        <div className="text-xs text-yellow-700">
                          <strong>Ajouter aux données existantes :</strong> Les doublons seront automatiquement ignorés.
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload size={14} className="mr-2 text-gray-500" />
                      <span className="text-sm text-gray-700">Ajouter aux données existantes</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleImportExcel(e, false)}
                        disabled={importing}
                        className="hidden"
                      />
                    </label>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
                        <div className="text-xs text-red-700">
                          <strong>Remplacer toutes les données :</strong> Toutes les données existantes seront supprimées avant l'import.
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center px-3 py-2 border border-red-300 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                      <RefreshCw size={14} className="mr-2 text-red-500" />
                      <span className="text-sm text-red-700">Remplacer toutes les données</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleImportExcel(e, true)}
                        disabled={importing}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => setShowImportOptions(false)}
                    className="mt-3 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={16} className="mr-2" />
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par description ou numéro de pièce..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
              showFilters 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} className="mr-2" />
            Filtres
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-4 border-t border-gray-200">
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les types</option>
              <option value="recette">Recettes</option>
              <option value="depense">Dépenses</option>
            </select>

            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.code} - {category.name}
                </option>
              ))}
            </select>

            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les modes</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Date début"
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Date fin"
            />

            <div className="flex items-center space-x-2">
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary - CORRECTION : Totaux uniquement sur l'exercice sélectionné */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-medium text-green-800">Recettes ({selectedExercice})</div>
          <div className="text-2xl font-bold text-green-900">
            {totalRecettes.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-800">Dépenses ({selectedExercice})</div>
          <div className="text-2xl font-bold text-red-900">
            {totalDepenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
        <div className={`border rounded-lg p-4 ${
          totalAmount >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className={`text-sm font-medium ${
            totalAmount >= 0 ? 'text-green-800' : 'text-red-800'
          }`}>
            Résultat ({selectedExercice})
          </div>
          <div className={`text-2xl font-bold ${
            totalAmount >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            {totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">N° Pièce</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Catégorie</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Montant</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Mode</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Aucune transaction trouvée pour l'exercice {selectedExercice}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => {
                  // 🔧 CORRECTION : Récupérer le nom de l'événement pour chaque transaction
                  const eventName = getEventName(transaction.eventId);
                  
                  return (
                    <tr 
                      key={transaction.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleEditTransaction(transaction)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-2 text-gray-400" />
                          {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {transaction.pieceNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs">
                          <div className="truncate font-medium">{transaction.description}</div>
                          {/* 🔧 CORRECTION : Affichage conditionnel de l'événement */}
                          {eventName && (
                            <div className="flex items-center text-xs text-blue-600 mt-1">
                              <Users size={12} className="mr-1" />
                              {eventName}
                            </div>
                          )}
                          {transaction.attachment && (
                            <FileText size={14} className="inline ml-1 text-blue-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{getCategoryName(transaction.category)}</div>
                          {transaction.subcategory && (
                            <div className="text-xs text-gray-500">
                              {getSubcategoryName(transaction.category, transaction.subcategory)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        <span className={
                          transaction.type === 'recette' ? 'text-green-600' : 'text-red-600'
                        }>
                          {transaction.type === 'recette' ? '+' : '-'}
                          {transaction.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {PAYMENT_METHODS.find(pm => pm.value === transaction.paymentMethod)?.label}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.isValidated 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.isValidated ? 'Validé' : 'En attente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          {!transaction.isValidated ? (
                            <button
                              onClick={() => handleValidateTransaction(transaction.id, true)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Valider"
                            >
                              <Check size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleValidateTransaction(transaction.id, false)}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Mettre en attente"
                            >
                              <X size={16} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600 text-center">
        {filteredTransactions.length} transaction(s) pour l'exercice {selectedExercice}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          onClose={handleCloseEditModal}
          onTransactionUpdated={handleTransactionUpdated}
        />
      )}

      {/* Click outside to close import options */}
      {showImportOptions && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowImportOptions(false)}
        />
      )}
    </div>
  );
};

export default TransactionList;