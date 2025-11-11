import React, { useState } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, Upload } from 'lucide-react';
import { workshopServices, vehicleHistories } from '../data/mockData';
import { ServiceRecord } from '../types';
import { formatCurrency, formatDate } from '../utils/pdfGenerator';
import VehicleHistoryDetails from './VehicleHistoryDetails';

const WorkshopPanel: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleHistory, setVehicleHistory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    chassis: '',
    plate: '',
    vehicle: '',
    description: '',
    mileage: '',
    cost: '',
    invoiceAttached: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simula salvamento
    setTimeout(() => {
      setIsSubmitting(false);
      setShowForm(false);
      setFormData({
        chassis: '',
        plate: '',
        vehicle: '',
        description: '',
        mileage: '',
        cost: '',
        invoiceAttached: false
      });
      // Aqui você adicionaria o novo serviço à lista
    }, 1500);
  };

  const handleVehicleSearch = (query: string) => {
    const searchQuery = query.toLowerCase();
    const found = vehicleHistories.find(v => 
      v.chassis.toLowerCase().includes(searchQuery) ||
      v.plate.toLowerCase().includes(searchQuery)
    );
    setVehicleHistory(found || null);
  };

  const filteredServices = workshopServices.filter(service =>
    service.chassis.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    return status === 'verified' ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <Clock className="h-5 w-5 text-yellow-500" />
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Painel da Oficina
        </h1>
        <p className="text-gray-600">
          Registro simples e rápido de serviços realizados
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Iniciar Novo Registro
        </button>
        
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.length > 3) {
                  handleVehicleSearch(e.target.value);
                }
              }}
              placeholder="Buscar por placa, chassi ou veículo..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Vehicle History Details */}
      {vehicleHistory && (
        <div className="mb-8">
          <VehicleHistoryDetails vehicleHistory={vehicleHistory} />
        </div>
      )}

      {/* Service Registration Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Registro de Novo Serviço
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.plate}
                  onChange={(e) => setFormData({...formData, plate: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: ABC1234"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Chassi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.chassis}
                  onChange={(e) => setFormData({...formData, chassis: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: 9BWHE21JX24060831"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Veículo *
              </label>
              <input
                type="text"
                required
                value={formData.vehicle}
                onChange={(e) => setFormData({...formData, vehicle: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: Honda Civic Si 2022"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição do Serviço *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Descreva detalhadamente o serviço realizado..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quilometragem Atual *
                </label>
                <input
                  type="number"
                  required
                  value={formData.mileage}
                  onChange={(e) => setFormData({...formData, mileage: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: 45000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custo do Serviço *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.cost}
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ex: 450.00"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.invoiceAttached}
                  onChange={(e) => setFormData({...formData, invoiceAttached: e.target.checked})}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Nota fiscal anexada
                </span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-8 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Histórico de Serviços da Oficina
          </h2>
          <span className="text-sm text-gray-600">
            {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''} encontrado{filteredServices.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="space-y-4">
          {filteredServices.map((service) => (
            <div key={service.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {service.vehicle}
                  </h3>
                  <p className="text-sm text-gray-600 font-mono">
                    Placa: {service.plate}
                  </p>
                  <p className="text-sm text-gray-600 font-mono">
                    Chassi: {service.chassis}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <span className="text-sm font-medium capitalize">
                    {service.status === 'verified' ? 'Verificado' : 'Pendente'}
                  </span>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-gray-700 text-sm">{service.description}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Data:</span>
                  <p className="font-medium">{formatDate(service.date)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Km:</span>
                  <p className="font-medium">{service.mileage.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <span className="text-gray-500">Custo:</span>
                  <p className="font-medium text-green-600">{formatCurrency(service.cost)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Nota Fiscal:</span>
                  <div className="flex items-center gap-1">
                    {service.invoiceAttached ? (
                      <>
                        <Upload className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 text-xs">Anexada</span>
                      </>
                    ) : (
                      <span className="text-red-600 text-xs">Não anexada</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkshopPanel;