import React from 'react';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Shield, 
  AlertTriangle, 
  Wrench, 
  FileText,
  Search,
  History,
  Info
} from 'lucide-react';
import { VehicleHistory } from '../types';

interface VehicleHistoryDetailsProps {
  vehicleHistory: VehicleHistory;
}

const VehicleHistoryDetails: React.FC<VehicleHistoryDetailsProps> = ({ vehicleHistory }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      default:
        return severity;
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'accident':
        return <Car className="h-5 w-5 text-red-600" />;
      case 'theft':
        return <Search className="h-5 w-5 text-red-600" />;
      case 'robbery':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'flood':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'fire':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'auction':
        return <FileText className="h-5 w-5 text-amber-600" />;
      case 'salvage':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getReportTypeText = (type: string) => {
    switch (type.toLowerCase()) {
      case 'accident':
        return 'Sinistro / Acidente';
      case 'theft':
        return 'Furto';
      case 'robbery':
        return 'Roubo';
      case 'flood':
        return 'Inundação';
      case 'fire':
        return 'Incêndio';
      case 'auction':
        return 'Histórico de Leilão';
      case 'salvage':
        return 'Veículo Recuperado / Reconstruído';
      case 'title':
        return 'Alteração de Título';
      default:
        return 'Outros';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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
              <label className="text-sm font-medium text-gray-500">Quilometragem</label>
              <p className="text-gray-900">{vehicleHistory.mileage.toLocaleString('pt-BR')} km</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Nº de Proprietários</label>
              <p className="text-gray-900 font-bold">{vehicleHistory.owners} registrados</p>
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
                      <span className="font-medium text-gray-900">{formatDate(maintenance.date)}</span>
                      {maintenance.type && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          maintenance.type === 'preventive' ? 'bg-blue-100 text-blue-800' :
                          maintenance.type === 'corrective' ? 'bg-red-100 text-red-800' :
                          maintenance.type === 'sinistro' ? 'bg-amber-100 text-amber-800' :
                          maintenance.type === 'revisao' ? 'bg-green-100 text-green-800' :
                          maintenance.type === 'recall' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {maintenance.type === 'sinistro' ? 'Funilaria / Sinistro' : 
                           maintenance.type === 'revisao' ? 'Revisão' :
                           maintenance.type === 'preventive' ? 'Preventiva' :
                           maintenance.type === 'corrective' ? 'Corretiva' :
                           maintenance.type === 'recall' ? 'Recall' : 'Outros'}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 font-semibold">{maintenance.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-50 pt-3 mt-3">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>{maintenance.workshop}</span>
                  </div>
                  {maintenance.mileage > 0 && (
                    <div className="flex items-center gap-1">
                      <History className="h-3 w-3" />
                      <span>{maintenance.mileage.toLocaleString('pt-BR')} km</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <p>Nenhuma manutenção registrada na blockchain</p>
          </div>
        )}
      </div>

      {/* Seção 2.5: Recalls Oficiais (Só aparece se houver) */}
      {vehicleHistory.recalls && vehicleHistory.recalls.length > 0 && (
        <div className="bg-amber-50 rounded-lg shadow-md p-6 border border-amber-200 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <h3 className="text-xl font-semibold text-gray-900">
              Recalls Oficiais pendentes ou registrados
            </h3>
            <span className="bg-amber-100 text-amber-800 text-sm font-medium px-2 py-1 rounded-full">
              {vehicleHistory.recalls.length} registro{vehicleHistory.recalls.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-4">
            {vehicleHistory.recalls.map((recall) => (
              <div key={recall.id} className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-gray-900">{recall.description}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        recall.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800 animate-pulse'
                      }`}>
                        {recall.status === 'completed' ? 'Resolvido' : 'PENDENTE'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(recall.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>{recall.workshop}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção 3: Relatórios Oficiais */}
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
                      {report.location && (
                        <div className="flex items-center gap-2">
                          {report.type === 'accident' ? <Car className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          <span>{report.type === 'accident' ? 'Área de Impacto:' : ''} {report.location}</span>
                        </div>
                      )}
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
    </div>
  );
};

export default VehicleHistoryDetails;