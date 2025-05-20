/**
 * Crea un proveedor de imágenes WMS para Cesium
 * @param {string} layer - Nombre de la capa
 * @param {Object} additionalParams - Parámetros adicionales
 * @returns {Cesium.WebMapServiceImageryProvider} - Proveedor de imágenes
 */
// Modificar la función createWMSProvider para habilitar el drapeado en terreno
function createWMSProvider(layer, additionalParams = {}) {
  // Solo para humedad usar texto plano, el resto JSON
  const isHumedadLayer = layer === CONFIG.LAYERS.HUMEDAD;
  const defaultParams = isHumedadLayer ? 
    { info_format: 'text/plain' } : 
    { info_format: 'application/json' };
  
  const provider = new Cesium.WebMapServiceImageryProvider({
    url: CONFIG.GEOSERVER_URL,
    layers: layer,
    parameters: { 
      transparent: true, 
      format: 'image/png', 
      tiled: true, 
      ...defaultParams,
      ...additionalParams 
    },
    tilingScheme: new Cesium.GeographicTilingScheme()
  });
  
  return provider;
}

// Asegurar que el terreno está activado
viewer.terrainProvider = Cesium.createWorldTerrain({
  requestWaterMask: true,
  requestVertexNormals: true
});

// Configurar el globo para habilitar la verdadera representación 3D
viewer.scene.globe.depthTestAgainstTerrain = true;
// Inicialización de capas
const layers = {
  elevacion: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.ELEVACION)),
  humedad: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.HUMEDAD)),
  clasificacion: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.CLASIFICACION)),
  municipios: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.MUNICIPIOS)),
  rios: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.RIOS)),
  departamentos: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.DEPARTAMENTOS)),
  carreteras: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.CARRETERAS)),
  inundaciones: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.INUNDACIONES, { info_format: 'application/json' }))
};

// Configurar visibilidad inicial
const defaultVisibleLayers = ['municipios', 'departamentos'];
const initialHiddenLayers = ['elevacion', 'rios', 'clasificacion', 'humedad', 'inundaciones', 'carreteras'];

// Aplicar visibilidad inicial
initialHiddenLayers.forEach(layer => layers[layer].show = false);
defaultVisibleLayers.forEach(layer => layers[layer].show = true);

/**
 * Sincroniza un checkbox HTML con una capa en el mapa
 * @param {string} checkboxId - ID del elemento checkbox
 * @param {string} layerKey - Clave de la capa en el objeto layers
 */
function syncCheckboxWithLayer(checkboxId, layerKey) {
  const checkbox = document.getElementById(checkboxId);

  if (checkbox && layers[layerKey]) {
    // Sincronizar estado inicial
    checkbox.checked = layers[layerKey].show;

    // Agregar evento para manejar cambios
    checkbox.addEventListener('change', () => {
      layers[layerKey].show = checkbox.checked;
    });
  }
}

// Configurar los checkboxes
const layerMappings = [
  { checkboxId: 'chkElevacion', layerKey: 'elevacion' },
  { checkboxId: 'chkMunicipios', layerKey: 'municipios' },
  { checkboxId: 'chkRios', layerKey: 'rios' },
  { checkboxId: 'chkDepartamentos', layerKey: 'departamentos' },
  { checkboxId: 'chkClasificacionInundaciones', layerKey: 'clasificacion' },
  { checkboxId: 'chkHumedad', layerKey: 'humedad' },
  { checkboxId: 'chkInundaciones', layerKey: 'inundaciones' },
  { checkboxId: 'chkCarreteras', layerKey: 'carreteras' }
];

layerMappings.forEach(({ checkboxId, layerKey }) => {
  syncCheckboxWithLayer(checkboxId, layerKey);
});

// Deshabilitar el comportamiento predeterminado de selección de Cesium
viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Constantes para la UI
const UI_CONSTANTS = {
  LOADING_TITLE: 'Cargando...',
  LOADING_TEXT: 'Obteniendo información de las capas',
  INFO_TITLE: 'Información de capas',
  NO_RESULTS_TITLE: 'Sin resultados',
  NO_RESULTS_TEXT: 'No se encontró información en este punto.',
  ERROR_TITLE: 'Error',
  ERROR_TEXT: 'No se pudo obtener la información de las capas.',
  CLOSE_BUTTON_TEXT: 'Cerrar',
  PREVIOUS_BUTTON_TEXT: 'Anterior',
  NEXT_BUTTON_TEXT: 'Siguiente',
  ELEMENT_TEXT: 'Elemento',
  LAYER_TEXT: 'Capa',
  COUNTER_TEXT: 'de'
};

/**
 * Obtiene un nombre amigable para la capa
 * @param {string} layerName - Nombre técnico de la capa
 * @returns {string} - Nombre amigable
 */
function getNombreAmigable(layerName) {
  // Verificar si la entrada es válida
  if (!layerName) {
    console.error('Nombre de capa inválido:', layerName);
    return 'Capa desconocida';
  }
  // Casos especiales (capas raster sin prefijo)
  if (layerName === 'Elevacion' || layerName.endsWith(':Elevacion')) {
    return 'Elevación';
  }
  
  if (layerName === 'Humedad' || layerName.endsWith(':Humedad')) {
    return 'Humedad del Suelo';
  }
  
  // Quitar el prefijo (por ejemplo, "ProyectoSGG:")
  const nameParts = layerName.split(':');
  const baseName = nameParts.length > 1 ? nameParts[1] : layerName;
  
  // Mapeo de nombres técnicos a nombres amigables
  const nameMapping = {
    'vista_municipios': 'Municipios',
    'vista_departamentos': 'Departamentos',
    'vista_rios': 'Ríos',
    'vista_carreteras': 'Carreteras',
    'Elevacion': 'Elevación',
    'Humedad': 'Humedad del Suelo',
    'vulnerabilidad': 'Clasificación de Vulnerabilidad',
    'vista_inundaciones_liviana': 'Registro de Inundaciones',
    'vista_inundaciones_con_ubicacion':'Registro de Inundaciones',
  };
  
  // Debug
  console.log('Obteniendo nombre amigable para:', layerName, 'Base:', baseName);
  
  // Intentar con nameMapping primero o aplicar transformaciones
  return nameMapping[baseName] || baseName.replace(/_/g, ' ')
    .replace(/^vista /i, '')
    .replace(/^\w/, c => c.toUpperCase());
}

/**
 * Formatea el nombre de una propiedad para mostrar
 * @param {string} propertyName - Nombre de la propiedad
 * @returns {string} - Nombre formateado
 */
function formatPropertyName(propertyName) {
  return propertyName
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .replace(/id/i, 'ID')
    .replace(/gray index/i, 'Valor')
    .replace(/value/i, 'Tipo de Vulnerabilidad');
}

/**
 * Formatea el valor de una propiedad según la capa
 * @param {string} key - Clave de la propiedad
 * @param {any} value - Valor de la propiedad
 * @param {string} layerName - Nombre de la capa
 * @returns {string} - Valor formateado
 */
function formatPropertyValue(key, value, layerName) {
  const keyLower = key.toLowerCase();
  const isGrayIndex = keyLower === 'gray_index' || keyLower.includes('gray');
  
  // Para clasificación de vulnerabilidad
  if (layerName === 'vulnerabilidad' || 
      layerName.toLowerCase().includes('vulnerabilidad') || 
      layerName.toLowerCase().includes('clasificacion')) {
    
    // Formatear 'Value' para vulnerabilidad
    if (keyLower === 'value') {
      const numValue = parseInt(value);
      switch (numValue) {
        case 1: return 'Alta vulnerabilidad';
        case 2: return 'Media vulnerabilidad';
        case 3: return 'Baja vulnerabilidad';
        default: return value;
      }
    }
  }
  // Agregar unidades según el tipo de capa
  if (isGrayIndex) {
    // Para elevación
    if (layerName === 'Elevacion' || layerName.toLowerCase().includes('elev')) {
      return `${value} msnm`;
    }
    // Para humedad
    if (layerName === 'Humedad' || layerName.toLowerCase().includes('hum')) {
      return `${value}%`;
    }
  }
  
  return value;
}

/**
 * Configura el manejador para mostrar información de capas al hacer clic
 */
function setupFeatureInfoHandler(viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction((click) => {
    // Validar capas visibles
    const visibleLayers = getVisibleLayers();
    if (visibleLayers.length === 0) return;

    // Obtener coordenadas del clic
    const coordinates = getClickCoordinates(click.position, viewer);
    if (!coordinates) return;

    // Mostrar indicador de carga
    showLoadingIndicator();

    // Realizar petición de información
    fetchFeatureInfo(coordinates, visibleLayers)
      .then(handleFeatureInfoResponse)
      .catch(handleFeatureInfoError);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * Obtiene las capas visibles actuales
 * @returns {string[]} - Array de nombres de capas visibles
 */
function getVisibleLayers() {
  return Object.entries(layers)
    .filter(([key, layer]) => layer.show)
    .map(([key]) => CONFIG.LAYERS[key.toUpperCase()]);
}

/**
 * Obtiene las coordenadas del clic
 * @param {Cesium.Cartesian2} windowPosition - Posición del clic en la pantalla
 * @param {Cesium.Viewer} viewer - Visor de Cesium
 * @returns {Object|null} - Coordenadas o null si no hay punto
 */
function getClickCoordinates(windowPosition, viewer) {
  const cartesian = viewer.camera.pickEllipsoid(windowPosition, viewer.scene.globe.ellipsoid);
  if (!cartesian) return null;

  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  const longitude = Cesium.Math.toDegrees(cartographic.longitude);
  const latitude = Cesium.Math.toDegrees(cartographic.latitude);
  
  // Crear un pequeño buffer alrededor del punto
  const bbox = `${longitude - 0.001},${latitude - 0.001},${longitude + 0.001},${latitude + 0.001}`;
  
  return { longitude, latitude, bbox };
}

/**
 * Muestra indicador de carga
 */
function showLoadingIndicator() {
  Swal.fire({
    title: UI_CONSTANTS.LOADING_TITLE,
    text: UI_CONSTANTS.LOADING_TEXT,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
}

/**
 * Realiza la petición de información a GeoServer
 * @param {Object} coordinates - Coordenadas del clic
 * @param {string[]} visibleLayers - Capas visibles
 * @returns {Promise} - Promesa con la respuesta
 */
function fetchFeatureInfo(coordinates, visibleLayers) {
  // Separar capas: humedad como text/plain, resto como JSON
  const humedadLayer = visibleLayers.filter(layer => layer === CONFIG.LAYERS.HUMEDAD);
  const jsonLayers = visibleLayers.filter(layer => layer !== CONFIG.LAYERS.HUMEDAD);
  
  // Crear promesas para ambos tipos de capas
  const promises = [];
  
  // Petición para capas JSON (incluyendo elevación)
  if (jsonLayers.length > 0) {
    const jsonUrl = `${CONFIG.GEOSERVER_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
      `&LAYERS=${jsonLayers.join(',')}&QUERY_LAYERS=${jsonLayers.join(',')}` +
      `&INFO_FORMAT=application/json&SRS=EPSG:4326` +
      `&BBOX=${coordinates.bbox}&WIDTH=101&HEIGHT=101&X=50&Y=50&FEATURE_COUNT=10`;
    
    console.log('Consultando capas JSON:', jsonUrl);
    
    const jsonPromise = fetch(jsonUrl)
      .then(response => response.json())
      .then(data => {
        // Para identificar capas raster como elevación que vienen como JSON
        if (data.features) {
          data.features = data.features.filter(feature => {
            // Si tiene GRAY_INDEX y no tiene ID, probablemente es elevación
            if (!feature.id && feature.properties && feature.properties.GRAY_INDEX !== undefined) {
              // Marcar como elevación si está en las capas visibles
              if (jsonLayers.includes(CONFIG.LAYERS.ELEVACION)) {
                // Validar rangos para elevación (0-2305 msnm)
                const value = feature.properties.GRAY_INDEX;
                if (value < 0 || value > 2305) {
                  console.log(`Valor de elevación inválido descartado: ${value}`);
                  return false; // Descartar feature
                }
                feature._layerType = 'Elevacion';
              }
            }
            return true; // Mantener el feature
          });
        }
        return { type: 'json', data };
      });
    
    promises.push(jsonPromise);
  }
  
  // Petición para capa de humedad (text/plain)
  if (humedadLayer.length > 0) {
    const humedadUrl = `${CONFIG.GEOSERVER_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
      `&LAYERS=${CONFIG.LAYERS.HUMEDAD}&QUERY_LAYERS=${CONFIG.LAYERS.HUMEDAD}` +
      `&INFO_FORMAT=text/plain&SRS=EPSG:4326` +
      `&BBOX=${coordinates.bbox}&WIDTH=101&HEIGHT=101&X=50&Y=50&FEATURE_COUNT=1`;
    
    console.log('Consultando capa de humedad:', humedadUrl);
    
    const humedadPromise = fetch(humedadUrl)
      .then(response => response.text())
      .then(text => {
        // Extraer el valor del texto (formato típico: "valor = 123")
        let value = null;
        const match = text.match(/\s*([0-9.]+)\s*/);
        if (match) {
          value = parseFloat(match[1]);
          
          // Filtrar valores inválidos para humedad
          // Ajustado según los valores reales: 83-164 son válidos
          if (value === 255 || value < 0 || value > 164) {
            console.log(`Valor de humedad inválido descartado: ${value}`);
            value = null;
          }
        }
        
        // Crear un feature sintético solo si el valor es válido
        return { 
          type: 'raster', 
          layerType: 'Humedad', 
          value,
          rawText: text 
        };
      });
    
    promises.push(humedadPromise);
  }
  
  // Combinar resultados
  return Promise.all(promises).then(results => {
    // Inicializar resultado combinado
    const combinedResult = {
      type: 'FeatureCollection',
      features: []
    };
    
    // Procesar cada resultado
    results.forEach(result => {
      if (result.type === 'json' && result.data.features) {
        // Añadir features JSON normales
        combinedResult.features = combinedResult.features.concat(result.data.features);
      } 
      else if (result.type === 'raster' && result.value !== null) {
        // Crear un feature sintético para datos de humedad
        const rasterFeature = {
          type: 'Feature',
          id: '', // Sin ID
          geometry: null,
          properties: {
            GRAY_INDEX: result.value
          },
          _layerType: result.layerType // Añadir tipo como metadata
        };
        
        combinedResult.features.push(rasterFeature);
      }
    });
    
    console.log('Resultado combinado:', combinedResult);
    return combinedResult;
  });
}
/**
 * Maneja la respuesta de información de capas
 * @param {Object} data - Datos de respuesta
 */
function handleFeatureInfoResponse(data) {
  Swal.close();

  if (!data.features || data.features.length === 0) {
    showNoResultsMessage();
    return;
  }

  // Procesar y mostrar las características
  const featuresByLayer = groupFeaturesByLayer(data.features);
  showFeaturesDialog(featuresByLayer);
}

/**
 * Muestra un mensaje cuando no hay resultados
 */
function showNoResultsMessage() {
  Swal.fire({
    title: UI_CONSTANTS.NO_RESULTS_TITLE,
    text: UI_CONSTANTS.NO_RESULTS_TEXT,
    icon: 'info'
  });
}

/**
 * Maneja errores en la petición
 * @param {Error} error - Error ocurrido
 */
function handleFeatureInfoError(error) {
  console.error('Error al obtener información:', error);
  Swal.fire({
    title: UI_CONSTANTS.ERROR_TITLE,
    text: UI_CONSTANTS.ERROR_TEXT,
    icon: 'error'
  });
}

/**
 * Agrupa características por capa
 * @param {Array} features - Características
 * @returns {Object} - Características agrupadas
 */
function groupFeaturesByLayer(features) {
  const featuresByLayer = {};

  features.forEach(feature => {
    let layerName;
    
    // Caso 1: Features con ID en formato "capa.id"
    if (feature.id && feature.id.includes('.')) {
      layerName = feature.id.split('.')[0];
    } 
    // Caso 2: Features con tipo explícito (raster)
    else if (feature._layerType) {
      layerName = feature._layerType;
    } 
    // Caso 3: Sin identificación clara
    else {
      layerName = 'Capa_Desconocida';
    }
    
    if (!featuresByLayer[layerName]) {
      featuresByLayer[layerName] = [];
    }
    
    featuresByLayer[layerName].push(feature);
  });

  return featuresByLayer;
}

/**
 * Muestra el diálogo con las características encontradas
 * @param {Object} featuresByLayer - Características agrupadas por capa
 */
function showFeaturesDialog(featuresByLayer) {
  const layerNames = Object.keys(featuresByLayer);
  let currentLayerIndex = 0;

  // Crear los elementos de navegación si hay más de una capa
  const navigationHTML = createNavigationHTML(layerNames);
  
  // Establecer estilos personalizados
  const customStyle = createCustomStyle();

  // Mostrar el cuadro de diálogo
  Swal.fire({
    title: UI_CONSTANTS.INFO_TITLE,
    html: customStyle + generateLayerContent(currentLayerIndex, layerNames, featuresByLayer) + navigationHTML,
    showConfirmButton: true,
    confirmButtonText: UI_CONSTANTS.CLOSE_BUTTON_TEXT,
    width: window.innerWidth < 480 ? '90%' : 400,
    padding: '10px',
    customClass: {
      title: 'swal-small-title',
      confirmButton: 'swal-small-button',
      popup: 'responsive-popup'
    },
    didOpen: () => {
      addResponsiveStyles();
      setupNavigationButtons(layerNames, currentLayerIndex, featuresByLayer);
    }
  });
}

/**
 * Crea el HTML para la navegación entre capas
 * @param {string[]} layerNames - Nombres de las capas
 * @returns {string} - HTML para navegación
 */
function createNavigationHTML(layerNames) {
  if (layerNames.length <= 1) return '';
  
  return `
    <div class="layer-navigation">
      <button id="prevLayerBtn" class="nav-btn">
        <i class="fa-solid fa-chevron-left"></i> ${UI_CONSTANTS.PREVIOUS_BUTTON_TEXT}
      </button>
      <span class="layer-counter">${UI_CONSTANTS.LAYER_TEXT} <span id="layerCounter">1</span> ${UI_CONSTANTS.COUNTER_TEXT} ${layerNames.length}</span>
      <button id="nextLayerBtn" class="nav-btn">
        ${UI_CONSTANTS.NEXT_BUTTON_TEXT} <i class="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  `;
}

/**
 * Crea los estilos personalizados para el diálogo
 * @returns {string} - HTML con estilos
 */
function createCustomStyle() {
  return `
    <style>
      .layer-card {
        background-color: #fff;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin: 0 auto;
        max-width: 100%;
        overflow-y: auto;
        max-height: 40vh;
      }
      .layer-header {
        background-color: #3a86ff;
        color: white;
        padding: 6px;
        text-align: center;
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
      }
      .layer-header h4 {
        margin: 0;
        font-size: 14px;
      }
      .layer-content {
        padding: 10px;
        font-size: 12px;
      }
      .layer-navigation {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
        padding: 6px;
        border-top: 1px solid #eee;
      }
      .nav-btn {
        background-color: #3a86ff;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .nav-btn:hover {
        background-color: #2a75ee;
      }
      .nav-btn:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
      }
      .layer-counter {
        font-size: 12px;
        color: #666;
      }
      .feature-separator {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed #ccc;
      }
      .feature-subtitle {
        font-weight: bold;
        margin-bottom: 6px;
        color: #3a86ff;
        font-size: 12px;
      }
      table {
        font-size: 11px !important;
      }
      td {
        padding: 2px 4px !important;
      }
    </style>
  `;
}

/**
 * Añade estilos responsivos para el diálogo
 */
function addResponsiveStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .swal-small-title {
      font-size: 16px !important;
      padding-top: 10px !important;
    }
    .swal-small-button {
      font-size: 12px !important;
      padding: 5px 15px !important;
    }
    .responsive-popup {
      font-size: ${window.innerWidth < 480 ? '12px' : '14px'} !important;
    }
    @media (max-width: 480px) {
      .layer-card {
        max-height: 50vh;
      }
      .nav-btn {
        padding: 8px !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Configura los botones de navegación entre capas
 * @param {string[]} layerNames - Nombres de las capas
 * @param {number} currentLayerIndex - Índice actual
 * @param {Object} featuresByLayer - Características por capa
 */
function setupNavigationButtons(layerNames, currentLayerIndex, featuresByLayer) {
  if (layerNames.length <= 1) return;
  
  let layerIdx = currentLayerIndex;
  
  document.getElementById('prevLayerBtn').addEventListener('click', () => {
    if (layerIdx > 0) {
      layerIdx--;
      updateContent(layerIdx, layerNames, featuresByLayer);
    }
  });
  
  document.getElementById('nextLayerBtn').addEventListener('click', () => {
    if (layerIdx < layerNames.length - 1) {
      layerIdx++;
      updateContent(layerIdx, layerNames, featuresByLayer);
    }
  });
}

/**
 * Actualiza el contenido al navegar entre capas
 * @param {number} layerIdx - Nuevo índice de capa
 * @param {string[]} layerNames - Nombres de las capas
 * @param {Object} featuresByLayer - Características por capa
 */
function updateContent(layerIdx, layerNames, featuresByLayer) {
  document.querySelector('.layer-card').outerHTML = generateLayerContent(layerIdx, layerNames, featuresByLayer);
  document.getElementById('layerCounter').textContent = layerIdx + 1;

  // Actualizar estado de los botones
  if (document.getElementById('prevLayerBtn')) {
    document.getElementById('prevLayerBtn').disabled = layerIdx === 0;
  }
  if (document.getElementById('nextLayerBtn')) {
    document.getElementById('nextLayerBtn').disabled = layerIdx === layerNames.length - 1;
  }
}

/**
 * Genera el contenido HTML para una capa
 * @param {number} layerIndex - Índice de la capa
 * @param {string[]} layerNames - Nombres de las capas
 * @param {Object} featuresByLayer - Características por capa
 * @returns {string} - HTML generado
 */
function generateLayerContent(layerIndex, layerNames, featuresByLayer) {
  const layerName = layerNames[layerIndex];
  const features = featuresByLayer[layerName];

  let content = `
    <div class="layer-card">
      <div class="layer-header">
        <h4>${UI_CONSTANTS.LAYER_TEXT}: ${getNombreAmigable(layerName)}</h4>
      </div>
      <div class="layer-content">
  `;

  features.forEach((feature, index) => {
    content += generateFeatureHTML(feature, index, features.length);
  });

  content += `
      </div>
    </div>
  `;

  return content;
}

/**
 * Genera el HTML para una característica
 * @param {Object} feature - Característica
 * @param {number} index - Índice
 * @param {number} totalFeatures - Total de características
 * @returns {string} - HTML generado
 */
function generateFeatureHTML(feature, index, totalFeatures) {
  const properties = feature.properties || {};
  
  // Determinar el tipo de capa
  let layerName = '';
  
  // Caso 1: Features con ID en formato "capa.id"
  if (feature.id && feature.id.includes('.')) {
    layerName = feature.id.split('.')[0];
  } 
  // Caso 2: Features con tipo explícito (marcados en fetchFeatureInfo)
  else if (feature._layerType) {
    layerName = feature._layerType;
  } 
  // Caso 3: Features con GRAY_INDEX sin _layerType (probablemente elevación)
  else if (!feature.id && properties.GRAY_INDEX !== undefined) {
    layerName = 'Elevacion'; // Por defecto asumir elevación
  }
  // Caso 4: Sin identificación clara
  else {
    layerName = 'Capa_Desconocida';
  }
  
  let html = `<div class="feature-info ${index > 0 ? 'feature-separator' : ''}">`;

  if (totalFeatures > 1) {
    html += `<div class="feature-subtitle">${UI_CONSTANTS.ELEMENT_TEXT} ${index + 1}</div>`;
  }

  html += '<table style="width:100%; border-collapse: collapse;">';

  // Mostrar cada propiedad
  Object.entries(properties).forEach(([key, value]) => {
    // Excluir propiedades técnicas o vacías
    if (!key.startsWith('_') && value !== null && value !== "" && 
        !(key.toLowerCase() === 'cat' && 
          (layerName === 'vulnerabilidad' || layerName.toLowerCase().includes('vulnerabilidad') || 
           layerName.toLowerCase().includes('clasificacion')))
       ) {
      const formattedValue = formatPropertyValue(key, value, layerName);
      html += `<tr>
        <td style="padding:4px; border-bottom:1px solid #eee; font-weight:bold;">${formatPropertyName(key)}</td>
        <td style="padding:4px; border-bottom:1px solid #eee;">${formattedValue}</td>
      </tr>`;
    }
  });;

  html += '</table></div>';
  
  return html;
}

// Iniciar el manejador de eventos
setupFeatureInfoHandler(viewer);
