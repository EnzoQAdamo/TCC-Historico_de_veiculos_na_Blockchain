export const generatePDF = async (vehicleData: any, type: 'dealer' | 'insurance'): Promise<void> => {
  // Simula geração de PDF
  return new Promise((resolve) => {
    setTimeout(() => {
      // Cria um link de download simulado
      const element = document.createElement('a');
      const file = new Blob([`Relatório ${type} - Chassi: ${vehicleData.chassis}`], {
        type: 'text/plain'
      });
      element.href = URL.createObjectURL(file);
      element.download = `relatorio-${type}-${vehicleData.chassis}.pdf`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      resolve();
    }, 1000);
  });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};