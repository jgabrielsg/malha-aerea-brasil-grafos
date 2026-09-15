/**
 * Utilitários de Exportação de Dados e Mapas em Alta Resolução (GeoFlight-BR)
 * Caminho: src/lib/analytics/exportUtils.js
 */

/**
 * Captura o buffer WebGL do mapa (MapLibre + Deck.gl), mescla em um canvas 2D de alta definição,
 * estampa rodapé estético (identidade visual, safra, filtros e créditos) e dispara o download em PNG.
 * 
 * @param {any} mapInstance Instância do MapLibre GL
 * @param {HTMLElement} mapContainer Contêiner DOM do mapa
 * @param {object} meta Metadados para estampagem no rodapé
 * @returns {Promise<boolean>}
 */
export async function captureMapSnapshot(mapInstance, mapContainer, meta = {}) {
  try {
    if (!mapInstance || !mapContainer) {
      console.warn('Instância ou contêiner do mapa indisponível para captura.');
      return false;
    }

    // Força uma renderização síncrona imediata para atualizar os buffers de desenho
    mapInstance.triggerRepaint();

    // Aguarda próximo quadro de animação para garantir que WebGL esteja desenhado
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50)));

    const canvases = Array.from(mapContainer.querySelectorAll('canvas'));
    if (canvases.length === 0) {
      console.warn('Nenhum canvas WebGL encontrado.');
      return false;
    }

    const primaryCanvas = canvases[0];
    const width = primaryCanvas.width;
    const height = primaryCanvas.height;

    // Cria canvas offscreen de alta definição
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return false;

    // 1. Desenha as camadas WebGL (MapLibre e eventuais overlays do Deck.gl)
    canvases.forEach(canvas => {
      try {
        ctx.drawImage(canvas, 0, 0, width, height);
      } catch (err) {
        console.error('Falha ao desenhar camada do canvas:', err);
      }
    });

    // 2. Estampa Banner Rodapé Estético Retro-Aeroespacial
    const bannerHeight = Math.max(70, Math.round(height * 0.08));
    const bannerY = height - bannerHeight;

    // Fundo translúcido com degradê escuro
    const grad = ctx.createLinearGradient(0, bannerY, 0, height);
    grad.addColorStop(0, 'rgba(11, 15, 25, 0.75)');
    grad.addColorStop(1, 'rgba(11, 15, 25, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY, width, bannerHeight);

    // Linha de borda superior do rodapé (ciano/verde sutil)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.fillRect(0, bannerY, width, 2);

    // Tipografia proporcional à resolução da imagem
    const baseFontSize = Math.max(12, Math.round(width * 0.012));
    ctx.textBaseline = 'middle';

    // Bloco Esquerdo: Logotipo & Identidade
    const leftMargin = Math.round(width * 0.025);
    ctx.font = `bold ${baseFontSize * 1.3}px 'JetBrains Mono', 'IBM Plex Mono', monospace, sans-serif`;
    ctx.fillStyle = '#38bdf8'; // Ciano vibrante
    ctx.fillText('GeoFlight-BR', leftMargin, bannerY + bannerHeight * 0.38);

    ctx.font = `${baseFontSize * 0.85}px sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Topologia e Análise da Malha Aérea (ANAC/VRA)', leftMargin, bannerY + bannerHeight * 0.72);

    // Bloco Central: Contexto da Análise
    const centerTextX = width * 0.35;
    ctx.font = `bold ${baseFontSize * 0.95}px 'JetBrains Mono', monospace, sans-serif`;
    ctx.fillStyle = '#f8fafc';
    
    let line1 = `Safra: ${meta.year || 'Consolidado'}`;
    if (meta.activeRoutesCount) line1 += `  •  ${meta.activeRoutesCount.toLocaleString('pt-BR')} rotas ativas`;
    ctx.fillText(line1, centerTextX, bannerY + bannerHeight * 0.38);

    ctx.font = `${baseFontSize * 0.8}px sans-serif`;
    ctx.fillStyle = '#cbd5e1';
    let line2 = meta.filtersSummary || 'Todas as conexões';
    if (meta.focusedDetail) line2 += `  |  ${meta.focusedDetail}`;
    ctx.fillText(line2, centerTextX, bannerY + bannerHeight * 0.72);

    // Bloco Direito: Timestamp e Créditos
    const rightMargin = width - leftMargin;
    ctx.textAlign = 'right';
    ctx.font = `${baseFontSize * 0.8}px sans-serif`;
    ctx.fillStyle = '#94a3b8';
    const now = new Date().toLocaleDateString('pt-BR');
    ctx.fillText(`Dados Oficiais: ANAC (VRA) • Exportado em: ${now}`, rightMargin, bannerY + bannerHeight * 0.4);

    ctx.font = `bold ${baseFontSize * 0.8}px 'JetBrains Mono', monospace, sans-serif`;
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('geoflight.br', rightMargin, bannerY + bannerHeight * 0.72);

    // 3. Converte para Blob e dispara o download
    return new Promise(resolve => {
      offscreen.toBlob(blob => {
        if (!blob) {
          resolve(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geoflight-br-mapa-${meta.year || 'analise'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2500);
        resolve(true);
      }, 'image/png');
    });
  } catch (err) {
    console.error('Erro durante exportação do snapshot do mapa:', err);
    return false;
  }
}

/**
 * Exporta a lista de rotas ativas filtradas em formato CSV compatível com Excel (UTF-8 com BOM).
 * 
 * @param {Array<object>} routes Lista de rotas ativas
 * @param {number} year Ano selecionado
 * @param {string} filterSummary Descrição textual dos filtros ativos
 */
export function exportRoutesToCsv(routes, year, filterSummary = '') {
  if (!routes || routes.length === 0) {
    alert('Nenhuma rota disponível para exportação com os filtros atuais.');
    return;
  }

  const lines = [
    `# GeoFlight-BR - Relatorio Operacional de Rotas Aereas`,
    `# Safra ANAC: ${year}`,
    `# Filtros Ativos: ${filterSummary || 'Padrao'}`,
    `# Total de Conexoes: ${routes.length}`,
    `# Data de Geracao: ${new Date().toLocaleString('pt-BR')}`,
    `Origem;Destino;Ano;Voos_Anuais;Passageiros_Estimados;Distancia_Km`
  ];

  for (const r of routes) {
    const orig = r.orig || '';
    const dest = r.dest || '';
    const rYear = r.year || year;
    const flights = r.flights || 0;
    const pax = r.pax || 0;
    const dist = Math.round(r.dist_km || 0);
    lines.push(`${orig};${dest};${rYear};${flights};${pax};${dist}`);
  }

  // Adiciona BOM UTF-8 (\uFEFF) para garantir abertura com acentuação correta no Microsoft Excel
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `geoflight-br-rotas-${year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Exporta o itinerário planejado ativo (opção selecionada no RoutePlanner) em CSV.
 * 
 * @param {object} plannedRoute Objeto da rota ótima ou alternativa
 * @param {object} airportsMap Dicionário de metadados dos aeroportos
 */
export function exportPlannedRouteToCsv(plannedRoute, airportsMap = {}) {
  if (!plannedRoute || !plannedRoute.segments || plannedRoute.segments.length === 0) {
    alert('Nenhum itinerário planejado ativo para exportação.');
    return;
  }

  const origIcao = plannedRoute.path[0];
  const destIcao = plannedRoute.path[plannedRoute.path.length - 1];
  const origCity = airportsMap[origIcao]?.city || origIcao;
  const destCity = airportsMap[destIcao]?.city || destIcao;

  const lines = [
    `# GeoFlight-BR - Planejamento de Itinerario Multi-Escala (Algoritmo Yen SOTA)`,
    `# Origem: ${origIcao} (${origCity})`,
    `# Destino: ${destIcao} (${destCity})`,
    `# Distancia Total: ${plannedRoute.totalDistanceKm} km`,
    `# Escalas: ${plannedRoute.hops} (${plannedRoute.hops === 0 ? 'Voo direto' : plannedRoute.hops + ' conexao(oes)'})`,
    `# Razao de Desvio Geodesico: ${plannedRoute.detourRatio}x`,
    `# Elo Critico: ${plannedRoute.bottleneckSegment?.origCity || ''} -> ${plannedRoute.bottleneckSegment?.destCity || ''} (${plannedRoute.bottleneckSegment?.cadenceLabel || ''})`,
    `# Data de Calculo: ${new Date().toLocaleString('pt-BR')}`,
    `Trecho;Origem_ICAO;Origem_Cidade;Destino_ICAO;Destino_Cidade;Cadencia_Estimada;Voos_Anuais;Distancia_Trecho_Km`
  ];

  plannedRoute.segments.forEach((seg, idx) => {
    lines.push(`${idx + 1};${seg.orig};"${seg.origCity || ''}";${seg.dest};"${seg.destCity || ''}";"${seg.cadenceLabel || ''}";${seg.flights || 0};${Math.round(seg.dist_km || 0)}`);
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `geoflight-br-itinerario-${origIcao}-${destIcao}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
