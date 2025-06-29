import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  TrendingUp,
  TrendingDown,
  Users,
  Euro
} from 'lucide-react';
import { getAllEvents, addEvent, updateEvent, deleteEvent, getAllTransactions, getExercices, getActiveExercice } from '../services/database';
import { EVENT_TYPES } from '../data/accountingPlan';
import { Event, Transaction } from '../types/accounting';

const EventManagement: React.FC = () => {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedExercice, setSelectedExercice] = useState<string>('');
  const [exercices, setExercices] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    type: 'concert' as const,
    budget: 0,
    capacity: 0,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allEvents, selectedExercice]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger l'exercice actif et tous les exercices
      const [activeExercice, allExercices] = await Promise.all([
        getActiveExercice(),
        getExercices()
      ]);
      
      setExercices(allExercices.sort((a, b) => b.year.localeCompare(a.year)));
      setSelectedExercice(activeExercice?.year || new Date().getFullYear().toString());
      
      const [eventsData, transactionsData] = await Promise.all([
        getAllEvents(),
        getAllTransactions()
      ]);
      setAllEvents(eventsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allEvents;

    // Filter by exercice
    if (selectedExercice) {
      filtered = filtered.filter(e => e.exercice === selectedExercice);
    }

    setFilteredEvents(filtered);
  };

  const calculateEventStats = (event: Event) => {
    const eventTransactions = transactions.filter(t => t.eventId === event.id);
    const revenue = eventTransactions
      .filter(t => t.type === 'recette')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = eventTransactions
      .filter(t => t.type === 'depense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      revenue,
      expenses,
      result: revenue - expenses,
      transactionCount: eventTransactions.length
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const eventData = {
        ...formData,
        exercice: selectedExercice,
        actualCost: 0,
        revenue: 0,
        attendance: 0
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
      } else {
        await addEvent(eventData);
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      date: event.date,
      type: event.type,
      budget: event.budget,
      capacity: event.capacity,
      description: event.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      try {
        await deleteEvent(id);
        await loadData();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      type: 'concert',
      budget: 0,
      capacity: 0,
      description: ''
    });
    setEditingEvent(null);
    setShowForm(false);
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des événements</h1>
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
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Nouvel événement
        </button>
      </div>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={resetForm}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'événement *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Concert Les Vagabonds"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget prévisionnel (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacité
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Description de l'événement..."
                  />
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
                    {editingEvent ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="grid gap-6">
        {allEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun événement créé</p>
            <p className="text-sm text-gray-500 mt-2">
              Commencez par créer votre premier événement
            </p>
          </div>
        ) : (
          allEvents.map((event) => {
            const stats = calculateEventStats(event);
            const isUpcoming = new Date(event.date) > new Date();
            const isCurrentExercice = event.exercice === selectedExercice;
            const cardOpacity = isCurrentExercice ? 'opacity-100' : 'opacity-40';
            
            return (
              <div key={event.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${cardOpacity}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isUpcoming 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isUpcoming ? 'À venir' : 'Passé'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isCurrentExercice ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {event.exercice}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {new Date(event.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span>{EVENT_TYPES.find(t => t.value === event.type)?.label}</span>
                      {event.capacity > 0 && (
                        <span className="flex items-center">
                          <Users size={14} className="mr-1" />
                          {event.capacity} places
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Event Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Budget</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {event.budget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Recettes</div>
                    <div className="text-lg font-semibold text-green-600">
                      {stats.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Dépenses</div>
                    <div className="text-lg font-semibold text-red-600">
                      {stats.expenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Résultat</div>
                    <div className={`text-lg font-semibold flex items-center justify-center ${
                      stats.result >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stats.result >= 0 ? (
                        <TrendingUp size={16} className="mr-1" />
                      ) : (
                        <TrendingDown size={16} className="mr-1" />
                      )}
                      {stats.result.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                </div>

                {stats.transactionCount > 0 && (
                  <div className="mt-3 text-sm text-gray-600 text-center">
                    {stats.transactionCount} transaction(s) associée(s)
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Results Info */}
      <div className="text-sm text-gray-600 text-center">
        {filteredEvents.length} événement(s) affiché(s) sur {allEvents.length} au total
      </div>
    </div>
  );
};

export default EventManagement;