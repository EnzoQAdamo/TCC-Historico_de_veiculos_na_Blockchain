import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { VehicleHistory } from '../types';

/**
 * Gera um Certificado de Procedência Veicular profissional em PDF
 * Auditado via Blockchain Registro Veicular Verificado
 */
export const generatePDF = async (vehicleHistory: VehicleHistory, _type: 'dealer' | 'insurance' | 'public'): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Cores do Projeto
  const primaryColor = [79, 70, 229]; // #4f46e5
  const accentColor = [31, 41, 55];  // Gray-800
  
  // Função auxiliar para verificar espaço e adicionar página
  const checkPageBreak = (needed: number, current: number) => {
    if (current + needed > pageHeight - 30) {
      doc.addPage();
      return 20; // Nova margem superior na nova página
    }
    return current;
  };

  // Função para desenhar o rodapé em qualquer página
  const drawFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setPage(pageNum);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    
    const emissionDate = new Date().toLocaleDateString('pt-BR');
    const emissionTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const footerText = `Emitido em: ${emissionDate} às ${emissionTime} | Certificado de Procedência Registro Veicular | Página ${pageNum} de ${totalPages}`;
    
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  // 1. Cabeçalho Principal (Apenas Página 1)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE PROCEDÊNCIA", margin, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("AUDITADO VIA SMART CONTRACT BLOCKCHAIN", margin, 28);

  // QR Code no Cabeçalho
  try {
    const publicUrl = `https://registro-veicular.blockchain.app/search?chassis=${vehicleHistory.chassis}`;
    const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1 });
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - 42, 4, 32, 32, 2, 2, 'F');
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 41, 5, 30, 30);
    
    // Pequeno label abaixo do QR Code
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("ESCANEIE PARA VALIDAR", pageWidth - 26, 38, { align: 'center' });
  } catch (err) {
    console.error("Erro ao gerar QR Code:", err);
  }

  let yPos = 55;

  // 2. Quadro de Identificação
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICAÇÃO DO VEÍCULO", margin, yPos);
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Informação', 'Dados do Veículo']],
    body: [
      ['Fabricante / Modelo', `${vehicleHistory.brand} ${vehicleHistory.model}`],
      ['Número do Chassi', vehicleHistory.chassis],
      ['Placa de Identificação', vehicleHistory.plate],
      ['Ano Fabricação / Modelo', `${vehicleHistory.manufacturingYear} / ${vehicleHistory.modelYear}`],
      ['Cor Registrada', vehicleHistory.color],
      ['Quilometragem Atual', `${vehicleHistory.mileage.toLocaleString('pt-BR')} km`],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor as any },
    styles: { fontSize: 10 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // 3. Bloco de Score (Verifica espaço)
  yPos = checkPageBreak(60, yPos);
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, (pageWidth / 2) - 20, 45, 5, 5, 'D');
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text("SCORE DE PROCEDÊNCIA VEICULAR", 22, yPos + 10);
  
  doc.setFontSize(36);
  if (vehicleHistory.riskScore >= 80) doc.setTextColor(22, 163, 74);
  else if (vehicleHistory.riskScore >= 50) doc.setTextColor(217, 119, 6);
  else doc.setTextColor(220, 38, 38);
  
  doc.text(`${vehicleHistory.riskScore}`, 22, yPos + 30);
  doc.setFontSize(12);
  doc.text("/100", 55, yPos + 30);
  
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("APONTAMENTOS AUDITADOS:", (pageWidth / 2) + 5, yPos + 5);
  doc.setFont("helvetica", "normal");
  
  let factorY = yPos + 12;
  if (vehicleHistory.riskFactors.length === 0) {
    doc.text("- Nenhum apontamento negativo encontrado.", (pageWidth / 2) + 5, factorY);
    factorY += 6;
  } else {
    vehicleHistory.riskFactors.forEach((factor) => {
      doc.text(`• ${factor}`, (pageWidth / 2) + 5, factorY);
      factorY += 6;
    });
  }

  yPos = Math.max(yPos + 50, factorY + 5);

  // 4. Histórico de Proprietários
  yPos = checkPageBreak(20, yPos);
  autoTable(doc, {
    startY: yPos,
    head: [['Histórico de Titularidade (Donos)']],
    body: [
      [`Este veículo registrou um total de ${vehicleHistory.owners} proprietário(s) desde sua fabricação.`],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 5 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // 5. Histórico de Sinistros
  yPos = checkPageBreak(30, yPos);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("HISTÓRICO DE SINISTROS (ORGÃOS OFICIAIS)", margin, yPos);

  autoTable(doc, {
    startY: yPos + 5,
    head: [['Data', 'Descrição', 'Gravidade', 'Localidade']],
    body: vehicleHistory.officialReports.map(rep => [
      new Date(rep.date).toLocaleDateString('pt-BR'),
      rep.description,
      rep.severity.toUpperCase(),
      rep.location
    ]),
    headStyles: { fillColor: [185, 28, 28] }, 
    styles: { fontSize: 9 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // 6.5 Histórico de Recalls (Apenas se houver)
  if (vehicleHistory.recalls && vehicleHistory.recalls.length > 0) {
    yPos = checkPageBreak(30, yPos);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(217, 119, 6); // Orange-600
    doc.text("HISTÓRICO DE RECALLS (MONTADORA)", margin, yPos);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Data', 'Descrição / Recall ID', 'Status']],
      body: vehicleHistory.recalls.map(rec => [
        new Date(rec.date).toLocaleDateString('pt-BR'),
        rec.description,
        rec.status === 'completed' ? 'RESOLVIDO' : 'PENDENTE'
      ]),
      headStyles: { fillColor: [217, 119, 6] },
      styles: { fontSize: 9 }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // 6. Histórico de Manutenções
  yPos = checkPageBreak(30, yPos);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("HISTÓRICO DE MANUTENÇÕES (OFICINAS)", margin, yPos);

  autoTable(doc, {
    startY: yPos + 5,
    head: [['Data', 'Serviço Executado', 'Estabelecimento']],
    body: vehicleHistory.maintenanceRecords.map(srv => [
      new Date(srv.date).toLocaleDateString('pt-BR'),
      srv.description,
      srv.workshop
    ]),
    headStyles: { fillColor: [21, 128, 61] },
    styles: { fontSize: 9 }
  });

  // 7. Disclaimer Final (Novidade)
  yPos = (doc as any).lastAutoTable.finalY + 15;
  yPos = checkPageBreak(40, yPos);
  
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 25, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  
  const publicUrl = `https://registro-veicular.blockchain.app/search?chassis=${vehicleHistory.chassis}`;
  const disclaimer = [
    "AVISO LEGAL E PROCEDÊNCIA DOS DADOS:",
    "As informações contidas neste certificado são extraídas em tempo real de uma rede Blockchain descentralizada.",
    "Cada registro possui um selo de autenticidade criptográfica garantido pelos nós validadores do Registro Veicular.",
    "A imutabilidade da rede garante que estes dados não foram alterados após sua inserção original.",
    `Link para consulta dos dados originais: ${publicUrl}`
  ];
  
  disclaimer.forEach((line, i) => {
    doc.text(line, margin + 5, yPos + 7 + (i * 4));
  });

  // FINALIZADOR: Aplica o rodapé em todas as páginas
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    drawFooter(doc, i, totalPages);
  }

  doc.save(`certificado-procedencia-${vehicleHistory.chassis}.pdf`);
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