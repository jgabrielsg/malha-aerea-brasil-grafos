<script>
  import { onMount, onDestroy } from 'svelte';
  import { 
    selectedYear, 
    selectedAirport, 
    selectedGap, 
    metricMode, 
    theme, 
    cameraTarget, 
    hoveredObject 
  } from '$lib/stores/flightState.js';
  import { 
    activeYearAirports, 
    currentRoutes, 
    rawAirports 
  } from '$lib/stores/dataStore.js';

  let mapContainer;
  let mapInstance = null;
  let deckOverlay = null;

  let maplibregl = null;
  let MapboxOverlay = null;
  let ArcLayer = null;
  let ScatterplotLayer = null;

  // Estilos de Mapa sem necessidade de chaves de API
  const STYLES = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
  };

  // Cores Temáticas
  const COLOR_PALETTES = {
    dark: {
      arcDefault: [56, 189, 248, 65],
      arcDimmed: [51, 65, 85, 8],
      arcSelectedOut: [245, 158, 11, 230],
      arcSelectedIn: [56, 189, 248, 230],
      arcGap: [16, 185, 129, 255],
      nodeDefault: [56, 189, 248, 200],
      nodeHub: [245, 158, 11, 240],
      nodeDimmed: [71, 85, 105, 40],
      nodeSelected: [245, 158, 11, 255],
      nodeConnected: [56, 189, 248, 240],
      nodeGap: [16, 185, 129, 255]
    },
    light: {
      arcDefault: [19, 81, 180, 75],
      arcDimmed: [203, 213, 225, 15],
      arcSelectedOut: [234, 88, 12, 230],
      arcSelectedIn: [19, 81, 180, 230],
      arcGap: [22, 136, 33, 255],
      nodeDefault: [19, 81, 180, 200],
      nodeHub: [234, 88, 12, 240],
      nodeDimmed: [203, 213, 225, 60],
      nodeSelected: [234, 88, 12, 255],
      nodeConnected: [19, 81, 180, 240],
      nodeGap: [22, 136, 33, 255]
    }
  };

  function getTooltip({ object }) {
    if (!object) return null;

    // Tooltip de Aeroporto (ScatterplotLayer)
    if (object.icao) {
      const isCapital = object.is_capital ? '<span style="color:#f59e0b;font-weight:bold;margin-left:4px;">● CAPITAL</span>' : '';
      const iata = object.iata ? `<span style="opacity:0.8;font-size:11px;">(${object.iata})</span>` : '';
      const strength = object.metrics?.strength?.toLocaleString('pt-BR') || 0;
      const degree = object.metrics?.degree || 0;
      const betweenness = ((object.metrics?.betweenness_norm || 0) * 100).toFixed(1);

      return {
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; padding: 6px 8px; font-size: 12px; line-height: 1.4;">
            <div style="font-family: 'JetBrains Mono', monospace; font-weight: bold; font-size: 13px; color: #38bdf8;">
              ${object.icao} ${iata} ${isCapital}
            </div>
            <div style="font-weight: 600; color: #ffffff; margin-top: 2px;">${object.name || ''}</div>
            <div style="color: #94a3b8; font-size: 11px;">${object.city || ''}, ${object.state || object.country}</div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.15); display: flex; gap: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
              <div><span style="color:#94a3b8;">Voos:</span> <b>${strength}</b></div>
              <div><span style="color:#94a3b8;">Grau:</span> <b>${degree}</b></div>
              <div><span style="color:#94a3b8;">Hub:</span> <b>${betweenness}%</b></div>
            </div>
          </div>
        `,
        style: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          color: '#ffffff',
          borderRadius: '8px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
        }
      };
    }

    // Tooltip de Rota (ArcLayer)
    if (object.orig && object.dest) {
      const origMeta = $rawAirports[object.orig];
      const destMeta = $rawAirports[object.dest];
      const origCity = origMeta?.city ? `(${origMeta.city})` : '';
      const destCity = destMeta?.city ? `(${destMeta.city})` : '';
      const flights = object.flights?.toLocaleString('pt-BR') || 0;
      const pax = object.pax?.toLocaleString('pt-BR') || 0;
      const dist = object.dist_km ? `${Math.round(object.dist_km).toLocaleString('pt-BR')} km` : '';

      return {
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; padding: 6px 8px; font-size: 12px; line-height: 1.4;">
            <div style="font-family: 'JetBrains Mono', monospace; font-weight: bold; font-size: 13px; color: #38bdf8;">
              ${object.orig} ${origCity} ➔ ${object.dest} ${destCity}
            </div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.15); font-family: 'JetBrains Mono', monospace; font-size: 11px; display: flex; flex-direction: column; gap: 2px;">
              <div><span style="color:#94a3b8;">Frequência Anual:</span> <b>${flights} voos</b></div>
              <div><span style="color:#94a3b8;">Passageiros Est.:</span> <b>${pax} pax</b></div>
              <div><span style="color:#94a3b8;">Distância Geodésica:</span> <b>${dist}</b></div>
            </div>
          </div>
        `,
        style: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          color: '#ffffff',
          borderRadius: '8px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
        }
      };
    }

    return null;
  }

  function getLayers() {
    if (!ArcLayer || !ScatterplotLayer) return [];

    const pal = COLOR_PALETTES[$theme] || COLOR_PALETTES.dark;
    const airportsMap = $rawAirports || {};
    const selectedIcao = $selectedAirport;
    const gap = $selectedGap;

    // Conjuntos para filtragem rápida de Ego-Graph e Desertos de Rota
    let egoConnectedIcaos = new Set();
    if (selectedIcao) {
      egoConnectedIcaos.add(selectedIcao);
      $currentRoutes.forEach(r => {
        if (r.orig === selectedIcao) egoConnectedIcaos.add(r.dest);
        if (r.dest === selectedIcao) egoConnectedIcaos.add(r.orig);
      });
    }

    let gapPathEdges = new Set();
    let gapPathNodes = new Set();
    if (gap && gap.path && gap.path.length > 1) {
      gap.path.forEach(n => gapPathNodes.add(n));
      for (let i = 0; i < gap.path.length - 1; i++) {
        gapPathEdges.add(`${gap.path[i]}-${gap.path[i+1]}`);
        gapPathEdges.add(`${gap.path[i+1]}-${gap.path[i]}`);
      }
    }

    // 1. Camada de Arcos 3D (ArcLayer)
    const arcLayer = new ArcLayer({
      id: 'flight-routes-arc-layer',
      data: $currentRoutes,
      pickable: true,
      getSourcePosition: d => {
        const a = airportsMap[d.orig];
        return a ? [a.lon, a.lat] : [0, 0];
      },
      getTargetPosition: d => {
        const a = airportsMap[d.dest];
        return a ? [a.lon, a.lat] : [0, 0];
      },
      getWidth: d => {
        if (gap && gapPathEdges.has(`${d.orig}-${d.dest}`)) {
          return 4.5;
        }
        if (selectedIcao) {
          if (d.orig === selectedIcao || d.dest === selectedIcao) {
            return Math.max(2, Math.min(6, Math.log2(d.flights + 1) * 0.8));
          }
          return 0.5;
        }
        return Math.max(1, Math.min(4, Math.log2(d.flights + 1) * 0.5));
      },
      getSourceColor: d => {
        if (gap) {
          if (gapPathEdges.has(`${d.orig}-${d.dest}`)) return pal.arcGap;
          return pal.arcDimmed;
        }
        if (selectedIcao) {
          if (d.orig === selectedIcao) return pal.arcSelectedOut;
          if (d.dest === selectedIcao) return pal.arcSelectedIn;
          return pal.arcDimmed;
        }
        return pal.arcDefault;
      },
      getTargetColor: d => {
        if (gap) {
          if (gapPathEdges.has(`${d.orig}-${d.dest}`)) return pal.arcGap;
          return pal.arcDimmed;
        }
        if (selectedIcao) {
          if (d.orig === selectedIcao) return pal.arcSelectedIn;
          if (d.dest === selectedIcao) return pal.arcSelectedOut;
          return pal.arcDimmed;
        }
        return pal.arcDefault;
      },
      getHeight: d => {
        const dist = d.dist_km || 1000;
        return Math.min(1.0, Math.max(0.15, dist / 4500));
      },
      updateTriggers: {
        getWidth: [selectedIcao, gap],
        getSourceColor: [selectedIcao, gap, $theme],
        getTargetColor: [selectedIcao, gap, $theme]
      }
    });

    // 2. Camada de Aeroportos (ScatterplotLayer)
    const scatterLayer = new ScatterplotLayer({
      id: 'airports-node-layer',
      data: $activeYearAirports,
      pickable: true,
      opacity: 0.9,
      stroked: true,
      filled: true,
      radiusScale: 1,
      radiusMinPixels: 3,
      radiusMaxPixels: 28,
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 2,
      getPosition: d => d.coordinates,
      getRadius: d => {
        const m = d.metrics || {};
        if ($metricMode === 'betweenness') {
          return 4000 + (m.betweenness_norm || 0) * 35000;
        }
        if ($metricMode === 'degree') {
          return 4000 + (m.degree || 0) * 900;
        }
        // Padrão: Volume de voos
        const fl = m.strength || 0;
        return 4000 + Math.sqrt(fl) * 120;
      },
      getFillColor: d => {
        const icao = d.icao;
        if (gap) {
          if (icao === gap.orig_icao || icao === gap.dest_icao) return pal.nodeGap;
          if (gapPathNodes.has(icao)) return pal.nodeHub;
          return pal.nodeDimmed;
        }
        if (selectedIcao) {
          if (icao === selectedIcao) return pal.nodeSelected;
          if (egoConnectedIcaos.has(icao)) return pal.nodeConnected;
          return pal.nodeDimmed;
        }
        // Cores base por centralidade
        const betNorm = d.metrics?.betweenness_norm || 0;
        if (betNorm > 0.4) return pal.nodeHub;
        return pal.nodeDefault;
      },
      getLineColor: d => {
        if (d.icao === selectedIcao) return [255, 255, 255, 255];
        return [0, 0, 0, 100];
      },
      onClick: info => {
        if (info.object) {
          selectedAirport.set(info.object.icao);
          selectedGap.set(null);
        }
      },
      updateTriggers: {
        getRadius: [$metricMode],
        getFillColor: [selectedIcao, gap, $theme, $metricMode]
      }
    });

    return [arcLayer, scatterLayer];
  }

  function updateDeckLayers() {
    if (deckOverlay) {
      deckOverlay.setProps({
        layers: getLayers()
      });
    }
  }

  onMount(async () => {
    // Importação dinâmica de bibliotecas WebGL no navegador
    const maplibreModule = await import('maplibre-gl');
    const mapboxModule = await import('@deck.gl/mapbox');
    const layersModule = await import('@deck.gl/layers');

    maplibregl = maplibreModule.default || maplibreModule;
    MapboxOverlay = mapboxModule.MapboxOverlay;
    ArcLayer = layersModule.ArcLayer;
    ScatterplotLayer = layersModule.ScatterplotLayer;

    // Inicialização do MapLibre GL
    mapInstance = new maplibregl.Map({
      container: mapContainer,
      style: STYLES[$theme] || STYLES.dark,
      center: [-52.0, -14.5], // Centro do Brasil
      zoom: 4.2,
      pitch: 32,
      bearing: 0,
      minZoom: 3,
      maxZoom: 12,
      attributionControl: false
    });

    // Controles de Navegação Compactos
    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    // Inicialização do Deck.gl MapboxOverlay
    deckOverlay = new MapboxOverlay({
      layers: getLayers(),
      getTooltip
    });

    mapInstance.addControl(deckOverlay);
  });

  // Reage à mudança de tema trocando o basemap
  $: if (mapInstance && $theme) {
    const nextStyle = STYLES[$theme] || STYLES.dark;
    mapInstance.setStyle(nextStyle);
  }

  // Reage a mudanças de dados ou estado e atualiza as camadas Deck.gl
  $: if (deckOverlay && ($activeYearAirports || $currentRoutes || $selectedAirport || $selectedGap || $metricMode || $theme)) {
    updateDeckLayers();
  }

  // Reage à movimentação suave da câmera solicitada por outros componentes
  $: if (mapInstance && $cameraTarget) {
    const [lon, lat, zoom] = $cameraTarget;
    mapInstance.flyTo({
      center: [lon, lat],
      zoom: zoom || 6.5,
      pitch: 40,
      duration: 1400,
      essential: true
    });
  }

  onDestroy(() => {
    if (mapInstance) {
      mapInstance.remove();
    }
  });
</script>

<div class="relative w-full h-full overflow-hidden bg-dark-bg">
  <div bind:this={mapContainer} class="w-full h-full"></div>
</div>
