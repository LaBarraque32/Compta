import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Users,
  AlertTriangle 
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getTransactions, getAllEvents, getMembers, calculateExerciceStats } from '../services/database';
import { ACCOUNTING_PLAN } from '../data/accountingPlan';
import { Transaction, Event, Member } from '../types/accounting';
import { useExercise } from '../contexts/ExerciseContext';

const Dashboard: React.FC = () => {
  const { selectedExercice, activeExercice } = useExercise();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    result: 0,
    transactionCount: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedExercice) {
      loadDashboardData();
    }
  }, [selectedExercice]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load basic stats pour l'exercice sélectionné
      const statsData = await calculateExerciceStats(selectedExercice);
      setStats(statsData);

      // Load transactions pour l'exercice sélectionné
      const transactionsData = await getTransactions(selectedExercice);
      setTransactions(transactionsData);

      // Load events pour l'exercice sélectionné
      const eventsData = await getAllEvents();
      const filteredEvents = eventsData.filter(e => e.exercice === selectedExercice);
      setEvents(filteredEvents);

      // Load members (pas lié à un exercice spécifique)
      const membersData = await getMembers();
      setMembers(membersData);

      // Prepare category data for pie chart
      const categoryStats = ACCOUNTING_PLAN.map(category => {
        const categoryTransactions = transactionsData.filter(t => t.category === category.code);
        const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        return {
          name: category.name,
          value: total,
          code: category.code,
          type: category.type
        };
      }).filter(item => item.value > 0);

      setCategoryData(categoryStats);

      // Prepare monthly data pour l'exercice sélectionné
      const monthlyStats = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthTransactions = transactionsData.filter(t => {
          const transactionMonth = new Date(t.date).getMonth() + 1;
          return transactionMonth === month;
        });

        const revenue = monthTransactions
          .filter(t => t.type === 'recette')
          .reduce((sum, t) => sum + t.amount, 0);

        const expenses = monthTransactions
          .filter(t => t.type === 'depense')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          month: new Date(parseInt(selectedExercice), i).toLocaleDateString('fr-FR', { month: 'short' }),
          recettes: revenue,
          depenses: expenses,
          resultat: revenue - expenses
        };
      });

      setMonthlyData(monthlyStats);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const upcomingEvents = events
    .filter(event => new Date(event.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const COLORS = ['#1e40af', '#059669', '#ea580c', '#dc2626', '#7c3aed', '#0891b2'];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-600 mt-1">
            Exercice {selectedExercice} {activeExercice?.year === selectedExercice ? '(Actif)' : ''} • Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Actualiser
        </button>
      </div>

      {/* Alert si pas de données pour l'exercice */}
      {transactions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Aucune donnée pour l'exercice {selectedExercice}</h4>
              <p className="text-sm text-yellow-700">
                Commencez par saisir des transactions pour voir apparaître les statistiques.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recettes totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Dépenses totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className={`h-8 w-8 ${stats.result >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Résultat</p>
              <p className={`text-2xl font-bold ${stats.result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.result.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">Adhérents actifs</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.filter(m => m.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par catégorie</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Evolution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution mensuelle</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value}€`} />
                  <Tooltip formatter={(value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
                  <Bar dataKey="recettes" fill="#059669" name="Recettes" />
                  <Bar dataKey="depenses" fill="#dc2626" name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity and Upcoming Events */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transactions récentes</h3>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune transaction récente</p>
              ) : (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('fr-FR')} • {transaction.paymentMethod}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <span className={`text-sm font-semibold ${
                        transaction.type === 'recette' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'recette' ? '+' : '-'}
                        {transaction.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Événements à venir</h3>
            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun événement programmé</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{event.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleDateString('fr-FR')} • {event.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        Budget: {event.budget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {stats.result < 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Attention</h4>
              <p className="text-sm text-yellow-700">
                Le résultat de l'exercice {selectedExercice} est négatif. Il est recommandé de revoir les dépenses ou d'augmenter les recettes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;