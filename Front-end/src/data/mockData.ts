import { Vehicle, ServiceRecord, VehicleHistory, SearchQuery, MaintenanceRecord, OfficialReport, PendingDebt } from '../types';

export const dealerInventory: Vehicle[] = [
  {
    id: '1',
    chassis: '9BWHE21JX24060831',
    plate: 'ABC1234',
    brand: 'BMW',
    model: 'X3 2.0',
    color: 'Branco',
    city: 'São Paulo',
    state: 'SP',
    modelYear: 2023,
    manufacturingYear: 2023,
    chassisPrefix: '9BWHE21JX',
    fipePrice: 285000,
    status: 'verified',
    mileage: 15420,
    owners: 1,
    price: 285000
  },
  {
    id: '2',
    chassis: '1HGBH41JXMN109186',
    plate: 'DEF5678',
    brand: 'Honda',
    model: 'Civic Si',
    color: 'Preto',
    city: 'Rio de Janeiro',
    state: 'RJ',
    modelYear: 2022,
    manufacturingYear: 2022,
    chassisPrefix: '1HGBH41JX',
    fipePrice: 145000,
    status: 'verified',
    mileage: 32100,
    owners: 2,
    price: 145000
  },
  {
    id: '3',
    chassis: '2T1BURHE0JC123456',
    plate: 'GHI9012',
    brand: 'Toyota',
    model: 'Corolla XEI',
    color: 'Prata',
    city: 'Belo Horizonte',
    state: 'MG',
    modelYear: 2024,
    manufacturingYear: 2024,
    chassisPrefix: '2T1BURHE0',
    fipePrice: 125000,
    status: 'pending',
    mileage: 5200,
    owners: 1,
    price: 125000
  },
  {
    id: '4',
    chassis: '3VW2K7AJ8EM654321',
    plate: 'JKL3456',
    brand: 'Volkswagen',
    model: 'Jetta TSI',
    color: 'Azul',
    city: 'Porto Alegre',
    state: 'RS',
    modelYear: 2023,
    manufacturingYear: 2023,
    chassisPrefix: '3VW2K7AJ8',
    fipePrice: 165000,
    status: 'verified',
    mileage: 18500,
    owners: 1,
    price: 165000
  }
];

export const workshopServices: ServiceRecord[] = [
  {
    id: '1',
    chassis: '9BWHE21JX24060831',
    plate: 'ABC1234',
    vehicle: 'BMW X3 2.0 2023',
    description: 'Troca de óleo e filtro, alinhamento e balanceamento',
    mileage: 15000,
    cost: 450.00,
    date: '2024-01-15',
    status: 'verified',
    invoiceAttached: true
  },
  {
    id: '2',
    chassis: '1HGBH41JXMN109186',
    plate: 'DEF5678',
    vehicle: 'Honda Civic Si 2022',
    description: 'Revisão dos 30.000km - Completa',
    mileage: 30000,
    cost: 1200.00,
    date: '2024-01-10',
    status: 'verified',
    invoiceAttached: true
  },
  {
    id: '3',
    chassis: '2T1BURHE0JC123456',
    plate: 'GHI9012',
    vehicle: 'Toyota Corolla XEI 2024',
    description: 'Instalação de película e proteção de pintura',
    mileage: 5000,
    cost: 800.00,
    date: '2024-01-12',
    status: 'pending',
    invoiceAttached: false
  }
];

const maintenanceRecords: MaintenanceRecord[] = [
  {
    id: '1',
    date: '2024-01-15',
    mileage: 15000,
    description: 'Troca de óleo e filtro do motor',
    workshop: 'Auto Center Premium',
    cost: 280.00,
    type: 'preventive',
    status: 'completed',
    invoiceNumber: 'NF-2024-001'
  },
  {
    id: '2',
    date: '2023-12-10',
    mileage: 14500,
    description: 'Alinhamento e balanceamento',
    workshop: 'Auto Center Premium',
    cost: 170.00,
    type: 'corrective',
    status: 'completed',
    invoiceNumber: 'NF-2023-458'
  },
  {
    id: '3',
    date: '2023-10-05',
    mileage: 12000,
    description: 'Revisão dos 10.000km',
    workshop: 'Concessionária BMW',
    cost: 850.00,
    type: 'preventive',
    status: 'completed',
    invoiceNumber: 'NF-2023-789'
  }
];

const officialReports: OfficialReport[] = [
  {
    id: '1',
    type: 'accident',
    date: '2023-08-15',
    description: 'Colisão traseira em semáforo - danos leves no para-choque',
    location: 'Av. Paulista, São Paulo - SP',
    severity: 'low',
    resolved: true,
    reportNumber: 'BO-2023-SP-789456',
    authority: 'Polícia Civil - SP'
  }
];

const pendingDebts: PendingDebt[] = [
  {
    id: '1',
    type: 'fine',
    description: 'Multa por excesso de velocidade',
    amount: 195.23,
    dueDate: '2024-02-15',
    issuer: 'DETRAN-SP',
    status: 'pending'
  }
];

export const vehicleHistories: VehicleHistory[] = [
  {
    // Seção 1: Informações básicas
    chassis: '9BWHE21JX24060831',
    plate: 'ABC1234',
    brand: 'BMW',
    model: 'X3 2.0',
    color: 'Branco',
    city: 'São Paulo',
    state: 'SP',
    modelYear: 2023,
    manufacturingYear: 2023,
    chassisPrefix: '9BWHE21JX',
    fipePrice: 285000,
    
    // Seção 2: Histórico de manutenções
    maintenanceRecords: maintenanceRecords,
    
    // Seção 3: Relatórios oficiais e débitos
    officialReports: officialReports,
    pendingDebts: pendingDebts,
    
    // Dados gerais
    owners: 1,
    mileage: 15420,
    riskScore: 85,
    lastUpdate: '2024-01-15'
  },
  {
    chassis: '1HGBH41JXMN109186',
    plate: 'DEF5678',
    brand: 'Honda',
    model: 'Civic Si',
    color: 'Preto',
    city: 'Rio de Janeiro',
    state: 'RJ',
    modelYear: 2022,
    manufacturingYear: 2022,
    chassisPrefix: '1HGBH41JX',
    fipePrice: 145000,
    maintenanceRecords: [
      {
        id: '4',
        date: '2024-01-10',
        mileage: 30000,
        description: 'Revisão dos 30.000km - Completa',
        workshop: 'Honda Autorizada',
        cost: 1200.00,
        type: 'preventive',
        status: 'completed',
        invoiceNumber: 'NF-2024-002'
      }
    ],
    officialReports: [
      {
        id: '2',
        type: 'theft',
        date: '2023-06-20',
        description: 'Tentativa de furto - veículo recuperado',
        location: 'Centro, Rio de Janeiro - RJ',
        severity: 'medium',
        resolved: true,
        reportNumber: 'BO-2023-RJ-456789',
        authority: 'Polícia Civil - RJ'
      }
    ],
    pendingDebts: [],
    owners: 2,
    mileage: 32100,
    riskScore: 65,
    lastUpdate: '2024-01-14'
  },
  {
    chassis: '2T1BURHE0JC123456',
    plate: 'GHI9012',
    brand: 'Toyota',
    model: 'Corolla XEI',
    color: 'Prata',
    city: 'Belo Horizonte',
    state: 'MG',
    modelYear: 2024,
    manufacturingYear: 2024,
    chassisPrefix: '2T1BURHE0',
    fipePrice: 125000,
    maintenanceRecords: [
      {
        id: '5',
        date: '2024-01-12',
        mileage: 5000,
        description: 'Primeira revisão - 5.000km',
        workshop: 'Toyota Autorizada',
        cost: 350.00,
        type: 'preventive',
        status: 'completed',
        invoiceNumber: 'NF-2024-003'
      }
    ],
    officialReports: [],
    pendingDebts: [
      {
        id: '2',
        type: 'ipva',
        description: 'IPVA 2024 - 1ª parcela',
        amount: 2850.00,
        dueDate: '2024-01-31',
        issuer: 'DETRAN-MG',
        status: 'overdue'
      }
    ],
    owners: 1,
    mileage: 5200,
    riskScore: 95,
    lastUpdate: '2024-01-12'
  }
];

export const recentSearches: SearchQuery[] = [
  {
    query: 'ABC1234',
    date: '2024-01-15',
    type: 'insurance'
  },
  {
    query: '1HGBH41JXMN109186',
    date: '2024-01-14',
    type: 'dealer'
  },
  {
    query: 'GHI9012',
    date: '2024-01-12',
    type: 'workshop'
  }
];