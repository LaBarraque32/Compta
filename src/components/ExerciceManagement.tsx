import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { 
  getExercices, 
  addExercice, 
  updateExercice, 
  deleteExercice, 
  calculateExerciceStats,
  getAllTransactions 
} from '../services/database';
import { Exercice } from '../types/accounting';
import { useExercise } from '../contexts/ExerciseContext';

const ExerciceManagement: React.FC = () => {
  const { exercices, refreshExercices, setActiveExercice } = useExercise();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExercice, setEditingExercice] = useState<Exercice | null>(null);
  const [exercicesWithStats, setExercicesWithStats] = useState<(Exercice & { stats?: any })[]>([]);
  const [formData, setFormData] = useState({
    year: (new Date().getFullYear() + 1).toString(),
    startDate: `${new Date().getFullYear() + 1}-01-01`,
    endDate: `${new Date().getFullYear() + 1}-12-31`,
    openingBalance: 0,
    isActive: false
  });

  useEffect(() => {
    loadExercices();
  }, [exercices]);

  const loadExercices = async () => {
    try {
      setLoading(true);
      
      // Calculer les stats pour chaque exercice
      const exercicesWithStats = await Promise.all(
        exercices.map(async (exercice) => {
          const stats = await calculateExerciceStats(exercice.year);
          return {
            ...exercice,
            totalRevenue: stats.totalRevenue,
            totalExpenses: stats.totalExpenses,
            result: stats.result,
            stats
          };
        })
      );
      
      setExercicesWithStats(exercicesWithStats.sort((a, b) => b.year.localeCompare(a.year)));
    } catch (error) {
      console.error('Error loading exercices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const exerciceData = {
        ...formData,
        isClosed: false,
        closingBalance: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        result: 0
      };

      if (editingExercice) {
        await updateExercice(editingExercice.id, exerciceData);
      } else {
        await addExercice(exerciceData);
      }

      await refreshExercices();
      resetForm();
    } catch (error) {
      console.error('Error saving exercice:', error);
      alert('Erreur lors de la sauvegarde de l\'exercice');
    }
  };

  const handleEdit = (exercice: Exercice) => {
    setEditingExercice(exercice);
    setFormData({
      year: exercice.year,
      startDate: exercice.startDate,
      endDate: exercice.endDate,
      openingBalance: exercice.openingBalance,
      isActive: exercice.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const exercice = exercices.find(ex => ex.id === id);
    if (!exercice) return;

    // Vérifier s'il y a des transactions
    const transactions = await getAllTransactions();
    const exerciceTransactions = transactions.filter(t => t.exercice === exercice.year);
    if (exerciceTransactions.length > 0) {
      alert('Impossible de supprimer un exercice contenant des transactions. Veuillez d\'abord supprimer toutes les transactions de cet exercice.');
      return;
    }

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet exercice ?')) {
      try {
        await deleteExercice(id);
        await refreshExercices();
      } catch (error) {
        console.error('Error deleting exercice:', error);
        alert('Erreur lors de la suppression de l\'exercice');
      }
    }
  };

  const handleToggleActive = async (exercice: Exercice) => {
    try {
      if (!exercice.isActive) {
        // Activer cet exercice (désactivera automatiquement les autres)
        await setActiveExercice(exercice.year);
      } else {
        // Désactiver cet exercice
        await updateExercice(exercice.id, { isActive: false });
        await refreshExercices();
      }
    } catch (error) {
      console.error('Error toggling exercice active status:', error);
      alert('Erreur lors de la modification du statut de l\'exercice');
    }
  };

  const handleToggleClosed = async (exercice: Exercice) => {
    if (!exercice.isClosed) {
      // Clôturer l'exercice
      const confirmMessage = `Êtes-vous sûr de vouloir clôturer l'exercice ${exercice.year} ?\n\n` +
        `Cette action est irréversible et empêchera toute modification des transactions de cet exercice.\n\n` +
        `Résultat de l'exercice : ${exercice.result.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
      
      if (!window.confirm(confirmMessage)) return;
    }

    try {
      const updates: Partial<Exercice> = {
        isClosed: !exercice.isClosed,
        closingBalance: exercice.isClosed ? 0 : exercice.openingBalance + exercice.result
      };

      // Si on clôture, désactiver aussi
      if (!exercice.isClosed) {
        updates.isActive = false;
      }

      await updateExercice(exercice.id, updates);
      await refreshExercices();
    } catch (error) {
      console.error('Error toggling exercice closed status:', error);
      alert('Erreur lors de la modification du statut de clôture');
    }
  };

  const resetForm = () => {
    const nextYear = (new Date().getFullYear() + 1).toString();
    setFormData({
      year: nextYear,
      startDate: `${nextYear}-01-01`,
      endDate: `${nextYear}-12-31`,
      openingBalance: 0,
      isActive: false
    });
    setEditingExercice(null);
    setShowForm(false);
  };

  const getExerciceStatus = (exercice: Exercice) => {
    if (exercice.isClosed) return { label: 'Clôturé', color: 'bg-gray-100 text-gray-800' };
    if (exercice.isActive) return { label: 'Actif', color: 'bg-green-100 text-green-800' };
    return { label: 'Inactif', color: 'bg-yellow-100 text-yellow-800' };
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Gestion des exercices</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Nouvel exercice
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">À propos des exercices</h4>
            <p className="text-sm text-blue-700 mt-1">
              Un exercice comptable correspond à une période de 12 mois. Seul un exercice peut être actif à la fois. 
              Une fois clôturé, un exercice ne peut plus être modifié.
            </p>
          </div>
        </div>
      </div>

      {/* Exercice Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={resetForm}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingExercice ? 'Modifier l\'exercice' : 'Nouvel exercice'}
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Année *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2024"
                    pattern="[0-9]{4}"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Solde d'ouverture (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData(prev => ({ ...prev, openingBalance: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Exercice actif (désactivera automatiquement les autres)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save size={16} className="mr-2" />
                    {editingExercice ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Exercices List */}
      <div className="space-y-4">
        {exercicesWithStats.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun exercice créé</p>
            <p className="text-sm text-gray-500 mt-2">
              Commencez par créer votre premier exercice comptable
            </p>
          </div>
        ) : (
          exercicesWithStats.map((exercice) => {
            const status = getExerciceStatus(exercice);
            
            return (
              <div key={exercice.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Exercice {exercice.year}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {new Date(exercice.startDate).toLocaleDateString('fr-FR')} - {new Date(exercice.endDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!exercice.isClosed && (
                      <>
                        <button
                          onClick={() => handleToggleActive(exercice)}
                          className={`p-2 rounded-lg transition-colors ${
                            exercice.isActive 
                              ? 'text-green-600 hover:bg-green-50' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                          title={exercice.isActive ? 'Désactiver' : 'Activer'}
                        >
                          {exercice.isActive ? <Unlock size={16} /> : <Lock size={16} />}
                        </button>
                        
                        <button
                          onClick={() => handleEdit(exercice)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleToggleClosed(exercice)}
                      className={`p-2 rounded-lg transition-colors ${
                        exercice.isClosed 
                          ? 'text-gray-600 hover:bg-gray-50' 
                          : 'text-orange-600 hover:bg-orange-50'
                      }`}
                      title={exercice.isClosed ? 'Rouvrir (non recommandé)' : 'Clôturer'}
                    >
                      <CheckCircle size={16} />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(exercice.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                      disabled={exercice.isClosed}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Solde ouverture</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {exercice.openingBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Recettes</div>
                    <div className="text-lg font-semibold text-green-600 flex items-center justify-center">
                      <TrendingUp size={16} className="mr-1" />
                      {exercice.totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Dépenses</div>
                    <div className="text-lg font-semibold text-red-600 flex items-center justify-center">
                      <TrendingDown size={16} className="mr-1" />
                      {exercice.totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">
                      {exercice.isClosed ? 'Solde clôture' : 'Résultat'}
                    </div>
                    <div className={`text-lg font-semibold flex items-center justify-center ${
                      (exercice.isClosed ? exercice.closingBalance : exercice.result) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      <DollarSign size={16} className="mr-1" />
                      {(exercice.isClosed ? exercice.closingBalance : exercice.result)
                        .toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                </div>

                {exercice.isClosed && (
                  <div className="mt-3 text-sm text-gray-600 text-center bg-gray-50 rounded p-2">
                    Exercice clôturé - Aucune modification possible
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ExerciceManagement;