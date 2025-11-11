export interface Vehicle {
  id: string;
  chassis: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  city: string;
  state: string;
  modelYear: number;
  manufacturingYear: number;
  chassisPrefix: string;
  fipePrice: number;
  status: 'verified' | 'pending' | 'issue';
  mileage: number;
  owners: number;
  lastService?: string;
  price?: number;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  mileage: number;
  description: string;
  workshop: string;
  cost: number;
  type: 'preventive' | 'corrective' | 'recall';
  status: 'completed' | 'pending';
  invoiceNumber?: string;
}

export interface OfficialReport {
  id: string;
  type: 'accident' | 'theft' | 'robbery' | 'flood' | 'fire';
  date: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  reportNumber: string;
  authority: string;
}

export interface PendingDebt {
  id: string;
  type: 'ipva' | 'licensing' | 'fine' | 'insurance';
  description: string;
  amount: number;
  dueDate: string;
  issuer: string;
  status: 'pending' | 'overdue' | 'paid';
}

export interface VehicleHistory {
  // Seção 1: Informações básicas
  chassis: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  city: string;
  state: string;
  modelYear: number;
  manufacturingYear: number;
  chassisPrefix: string;
  fipePrice: number;
  
  // Seção 2: Histórico de manutenções
  maintenanceRecords: MaintenanceRecord[];
  
  // Seção 3: Relatórios oficiais e débitos
  officialReports: OfficialReport[];
  pendingDebts: PendingDebt[];
  
  // Dados gerais
  owners: number;
  mileage: number;
  riskScore: number;
  lastUpdate: string;
}

export interface ServiceRecord {
  id: string;
  chassis: string;
  plate: string;
  vehicle: string;
  description: string;
  mileage: number;
  cost: number;
  date: string;
  status: 'verified' | 'pending';
  invoiceAttached: boolean;
}

export interface SearchQuery {
  query: string; // placa ou chassi
  date: string;
  type: 'dealer' | 'insurance' | 'workshop';
}