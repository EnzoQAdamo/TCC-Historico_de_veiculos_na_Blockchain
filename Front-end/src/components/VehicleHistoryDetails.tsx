import React from 'react';
import { Car, Wrench, AlertTriangle, CreditCard, Calendar, MapPin, DollarSign, FileText, Shield, Clock } from 'lucide-react';
import { VehicleHistory } from '../types';
import { formatCurrency, formatDate } from '../utils/pdfGenerator';

interface VehicleHistoryDetailsProps {
  vehicleHistory: VehicleHistory;
}

const VehicleHistoryDetails: React.FC<VehicleHistoryDetailsProps> = ({ vehicleHistory }) => {
  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'accident':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'theft':
      case 'robbery':
        return <Shield className="h-5 w-5 text-orange-500" />;
      case 'flood':
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      case 'fire':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getReportTypeText = (type: string) => {
    switch (type) {
      case 'accident':
        return 'Acidente';
      case 'theft':
        return 'Furto';
      case 'robbery':
        return 'Roubo';
      case 'flood':
        return 'Enchente';
      case 'fire':
        return 'Incêndio';
      default:
        return 'Outros';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return 'N/A';
    }
  };

  const getDebtStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDebtStatusText = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'Vencido';
      case 'pending':
        return 'Pendente';
      case 'paid':
        return 'Pago';
      default:
        return 'N/A';
    }
  };

  const getMaintenanceTypeColor = (type: string) => {
    switch (type) {
      case 'preventive':
        return 'bg-green-100 text-green-800';
      case 'corrective':
        return 'bg-yellow-100 text-yellow-800';
      case 'recall':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaintenanceTypeText = (type: string) => {
    switch (type) {
      case 'preventive':
        return 'Preventiva';
      case 'corrective':
        return 'Corretiva';
      case 'recall':
        return 'Recall';
      default:
        return 'Outros';
    }
  };

  return (
    <div className="space-y-8">
      {/* Seção 1: Informações Básicas do Veículo */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Car className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            Informações do Veículo
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Marca/Modelo</label>
              <p className="text-lg font-semibold text-gray-900">
                {vehicleHistory.brand} {vehicleHistory.model}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Cor</label>
              <p className="text-gray-900">{vehicleHistory.color}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Placa</label>
              <p className="text-gray-900 font-mono">{vehicleHistory.plate}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Cidade/Estado</label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <p className="text-gray-900">{vehicleHistory.city}/{vehicleHistory.state}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Ano Modelo</label>
              <p className="text-gray-900">{vehicleHistory.modelYear}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Ano Fabricação</label>
              <p className="text-gray-900">{vehicleHistory.manufacturingYear}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Início do Chassi</label>
              <p className="text-gray-900 font-mono">{vehicleHistory.chassisPrefix}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Preço Tabela FIPE</label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(vehicleHistory.fipePrice)}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Quilometragem</label>
              <p className="text-gray-900">{vehicleHistory.mileage.toLocaleString('pt-BR')} km</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Histórico de Manutenções */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Wrench className="h-6 w-6 text-green-600" />
          <h3 className="text-xl font-semibold text-gray-900">
            Histórico de Manutenções
          </h3>
          <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">
            {vehicleHistory.maintenanceRecords.length} registro{vehicleHistory.maintenanceRecords.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {vehicleHistory.maintenanceRecords.length > 0 ? (
          <div className="space-y-4">
            {vehicleHistory.maintenanceRecords.map((maintenance) => (
              <div key={maintenance.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{formatDate(maintenance.date)}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMaintenanceTypeColor(maintenance.type)}`}>
                        {getMaintenanceTypeText(maintenance.type)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{maintenance.description}</h4>
                    <p className="text-sm text-gray-600">{maintenance.workshop}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(maintenance.cost)}
                    </p>
                    <p className="text-sm text-gray-500">{maintenance.mileage.toLocaleString('pt-BR')} km</p>
                  </div>
                </div>
                {maintenance.invoiceNumber && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>NF: {maintenance.invoiceNumber}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum registro de manutenção encontrado</p>
          </div>
        )}
      </div>

      {/* Seção 3: Relatórios Oficiais e Débitos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Relatórios Oficiais */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              Relatórios Oficiais
            </h3>
            <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded-full">
              {vehicleHistory.officialReports.length} registro{vehicleHistory.officialReports.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {vehicleHistory.officialReports.length > 0 ? (
            <div className="space-y-4">
              {vehicleHistory.officialReports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {getReportTypeIcon(report.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {getReportTypeText(report.type)}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(report.severity)}`}>
                          Gravidade: {getSeverityText(report.severity)}
                        </span>
                        {report.resolved && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Resolvido
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{report.description}</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(report.date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span>{report.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          <span>{report.reportNumber} - {report.authority}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum relatório oficial encontrado</p>
            </div>
          )}
        </div>

        {/* Débitos Pendentes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="h-6 w-6 text-orange-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              Débitos Pendentes
            </h3>
            <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2 py-1 rounded-full">
              {vehicleHistory.pendingDebts.length} débito{vehicleHistory.pendingDebts.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {vehicleHistory.pendingDebts.length > 0 ? (
            <div className="space-y-4">
              {vehicleHistory.pendingDebts.map((debt) => (
                <div key={debt.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{debt.description}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDebtStatusColor(debt.status)}`}>
                          {getDebtStatusText(debt.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{debt.issuer}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>Vencimento: {formatDate(debt.dueDate)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(debt.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum débito pendente encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleHistoryDetails;