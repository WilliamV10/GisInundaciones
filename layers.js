function createWMSProvider(layer, additionalParams = {}) {
  return new Cesium.WebMapServiceImageryProvider({
    url: CONFIG.GEOSERVER_URL,
    layers: layer,
    parameters: { transparent: true, format: 'image/png', ...additionalParams },
    tilingScheme: new Cesium.GeographicTilingScheme()
  });
}

const layers = {
  elevacion: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.ELEVACION)),
  municipios: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.MUNICIPIOS)),
  rios: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.RIOS)),
  departamentos: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.DEPARTAMENTOS)),
  clasificacion: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.CLASIFICACION)),
  carreteras: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.CARRETERAS)),
  humedad: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.HUMEDAD)),
  inundaciones: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.INUNDACIONES, { info_format: 'application/json' }))
};

// Configurar visibilidad inicial
layers.elevacion.show = false;
layers.rios.show = false;
layers.clasificacion.show = false;
layers.humedad.show = false;
layers.inundaciones.show = false;
layers.carreteras.show = false; 

// Mantener municipios y departamentos visibles
layers.municipios.show = true;
layers.departamentos.show = true;

// Sincronizar checkboxes con el estado inicial de las capas
function syncCheckboxWithLayerAndLegend(checkboxId, layerKey, legendId) {
  const checkbox = document.getElementById(checkboxId);
  const legend = document.getElementById(legendId);

  if (checkbox && layers[layerKey]) {
    // Sincronizar estado inicial
    checkbox.checked = layers[layerKey].show;
    legend.style.display = layers[layerKey].show ? 'block' : 'none';

    // Agregar evento para manejar cambios
    checkbox.addEventListener('change', () => {
      layers[layerKey].show = checkbox.checked;
      legend.style.display = checkbox.checked ? 'block' : 'none';
    });
  }
}

// Configurar los checkboxes y leyendas
syncCheckboxWithLayerAndLegend('chkElevacion', 'elevacion', 'leyendaElevacion');
syncCheckboxWithLayerAndLegend('chkMunicipios', 'municipios', 'leyendaMunicipios');
syncCheckboxWithLayerAndLegend('chkRios', 'rios', 'leyendaRios');
syncCheckboxWithLayerAndLegend('chkDepartamentos', 'departamentos', 'leyendaDepartamentos');
syncCheckboxWithLayerAndLegend('chkClasificacionInundaciones', 'clasificacion', 'leyendaClasificacionInundaciones');
syncCheckboxWithLayerAndLegend('chkHumedad', 'humedad', 'leyendaHumedad');
syncCheckboxWithLayerAndLegend('chkInundaciones', 'inundaciones', 'leyendaInundaciones');
syncCheckboxWithLayerAndLegend('chkCarreteras', 'carreteras', 'leyendaCarreteras');