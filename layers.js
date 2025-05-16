function createWMSProvider(layer, additionalParams = {}) {
  return new Cesium.WebMapServiceImageryProvider({
    url: CONFIG.GEOSERVER_URL,
    layers: layer,
    parameters: { transparent: true, format: 'image/png', tiled:true, ...additionalParams },
    tilingScheme: new Cesium.GeographicTilingScheme()
  });
}

const layers = {
  elevacion: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.ELEVACION), ),
  humedad: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.HUMEDAD), ),
  clasificacion: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.CLASIFICACION,)),
  municipios: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.MUNICIPIOS), ),
  rios: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.RIOS), ),
  departamentos: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.DEPARTAMENTOS), ),
  carreteras: viewer.imageryLayers.addImageryProvider(createWMSProvider(CONFIG.LAYERS.CARRETERAS),),
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
// Reemplazar la función existente con esta versión
function syncCheckboxWithLayerAndLegend(checkboxId, layerKey, legendId) {
  const checkbox = document.getElementById(checkboxId);

  if (checkbox && layers[layerKey]) {
    // Sincronizar estado inicial
    checkbox.checked = layers[layerKey].show;

    // Agregar evento para manejar cambios
    checkbox.addEventListener('change', () => {
      layers[layerKey].show = checkbox.checked;
      // Nota: Ya no modificamos la visibilidad de la leyenda aquí
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

// Después del código existente

// Deshabilitar el comportamiento predeterminado de selección de entidades de Cesium
viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Función para manejar clics en el mapa y mostrar datos en SweetAlert con navegación entre capas
function setupFeatureInfoHandler(viewer) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  
  handler.setInputAction((click) => {
    // Obtener la posición del clic en coordenadas de pantalla
    const windowPosition = click.position;
    
    // Verificar cuáles capas están visibles
    const visibleLayers = Object.entries(layers)
      .filter(([key, layer]) => layer.show)
      .map(([key]) => CONFIG.LAYERS[key.toUpperCase()]);
    
    if (visibleLayers.length === 0) return;
    
    // Obtener coordenadas geográficas del clic
    const cartesian = viewer.camera.pickEllipsoid(windowPosition, viewer.scene.globe.ellipsoid);
    if (!cartesian) return;
    
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    
    // Crear un pequeño buffer alrededor del punto
    const bbox = `${longitude-0.001},${latitude-0.001},${longitude+0.001},${latitude+0.001}`;
    
    // Crear URL para GetFeatureInfo
    const url = `${CONFIG.GEOSERVER_URL}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo` +
                `&LAYERS=${visibleLayers.join(',')}&QUERY_LAYERS=${visibleLayers.join(',')}` +
                `&INFO_FORMAT=application/json&SRS=EPSG:4326` +
                `&BBOX=${bbox}&WIDTH=101&HEIGHT=101&X=50&Y=50&FEATURE_COUNT=10`;
    
    // Mostrar indicador de carga
    Swal.fire({
      title: 'Cargando...',
      text: 'Obteniendo información de las capas',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Realizar la solicitud a GeoServer
    fetch(url)
      .then(response => response.json())
      .then(data => {
        // Cerrar el indicador de carga
        Swal.close();
        
        // Verificar si hay entidades
        if (data.features && data.features.length > 0) {
          // Agrupar características por capa
          const featuresByLayer = {};
          
          data.features.forEach(feature => {
            const layerName = feature.id.split('.')[0]; // Obtener nombre de capa
            if (!featuresByLayer[layerName]) {
              featuresByLayer[layerName] = [];
            }
            featuresByLayer[layerName].push(feature);
          });
          
          // Obtener las capas como un array para poder navegar entre ellas
          const layerNames = Object.keys(featuresByLayer);
          let currentLayerIndex = 0;
          
          // Función para generar contenido HTML para la capa actual
          function generateLayerContent(layerIndex) {
            const layerName = layerNames[layerIndex];
            const features = featuresByLayer[layerName];
            
            let content = `
              <div class="layer-card">
                <div class="layer-header">
                  <h4>Capa: ${getNombreAmigable(layerName)}</h4>
                </div>
                <div class="layer-content">
            `;
            
            features.forEach((feature, index) => {
              const properties = feature.properties;
              
              content += `<div class="feature-info ${index > 0 ? 'feature-separator' : ''}">`;
              
              if (features.length > 1) {
                content += `<div class="feature-subtitle">Elemento ${index + 1}</div>`;
              }
              
              content += '<table style="width:100%; border-collapse: collapse;">';
              
              // Mostrar cada propiedad
              Object.entries(properties).forEach(([key, value]) => {
                // Excluir propiedades técnicas o vacías
                if (!key.startsWith('_') && value !== null && value !== "") {
                  content += `<tr>
                    <td style="padding:4px; border-bottom:1px solid #eee; font-weight:bold;">${formatPropertyName(key)}</td>
                    <td style="padding:4px; border-bottom:1px solid #eee;">${value}</td>
                  </tr>`;
                }
              });
              
              content += '</table>';
              content += '</div>';
            });
            
            content += `
                </div>
              </div>
            `;
            
            return content;
          }
          
          // Función para obtener nombre amigable de la capa
          function getNombreAmigable(layerName) {
            // Quitar el prefijo (por ejemplo, "SGG:")
            const nameParts = layerName.split(':');
            const baseName = nameParts.length > 1 ? nameParts[1] : layerName;
            
            // Mapeo de nombres técnicos a nombres amigables
            const nameMapping = {
              'vista_municipios': 'Municipios',
              'vista_departamentos': 'Departamentos',
              'vista_riosl': 'Ríos',
              'vista_carreteras': 'Carreteras',
              'Elevacion': 'Elevación',
              'Humedad': 'Humedad del Suelo',
              'clasificacion_vulnerabilidad': 'Clasificación de Vulnerabilidad',
              'vista_inundaciones_liviana': 'Registro de Inundaciones'
            };
            
            return nameMapping[baseName] || baseName;
          }
          
          // Función para formatear nombres de propiedades
          function formatPropertyName(propertyName) {
            // Reemplazar guiones bajos por espacios y capitalizar primera letra
            return propertyName
              .replace(/_/g, ' ')
              .replace(/^\w/, c => c.toUpperCase())
              .replace(/id/i, 'ID')
              .replace(/nombre/i, 'Nombre')
              .replace(/area/i, 'Área')
              .replace(/tipo/i, 'Tipo')
              .replace(/fecha/i, 'Fecha');
          }
          
          // Crear los elementos de navegación
          const navigationHTML = layerNames.length > 1 ? `
            <div class="layer-navigation">
              <button id="prevLayerBtn" class="nav-btn">
                <i class="fa-solid fa-chevron-left"></i> Anterior
              </button>
              <span class="layer-counter">Capa <span id="layerCounter">1</span> de ${layerNames.length}</span>
              <button id="nextLayerBtn" class="nav-btn">
                Siguiente <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          ` : '';
          
          // Estilo personalizado para las tarjetas
                    const customStyle = `
            <style>
              .layer-card {
                background-color: #fff;
                border-radius: 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                margin: 0 auto;
                max-width: 100%;
                overflow-y: auto;
                max-height: 40vh; /* Reducido de 60vh */
              }
              .layer-header {
                background-color: #3a86ff;
                color: white;
                padding: 6px; /* Reducido de 10px */
                text-align: center;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
              }
              .layer-header h4 {
                margin: 0;
                font-size: 14px; /* Reducido de 18px */
              }
              .layer-content {
                padding: 10px; /* Reducido de 15px */
                font-size: 12px; /* Añadido para reducir tamaño de texto */
              }
              .layer-navigation {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 10px;
                padding: 6px; /* Reducido de 10px */
                border-top: 1px solid #eee;
              }
              .nav-btn {
                background-color: #3a86ff;
                color: white;
                border: none;
                border-radius: 3px;
                padding: 5px 10px; /* Reducido de 8px 15px */
                cursor: pointer;
                font-size: 12px; /* Reducido de 14px */
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
                font-size: 12px; /* Reducido de 14px */
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
                font-size: 12px; /* Añadido */
              }
              table {
                font-size: 11px !important; /* Ajuste para tabla */
              }
              td {
                padding: 2px 4px !important; /* Reducido el padding de las celdas */
              }
            </style>
          `;
          
                    // Mostrar el cuadro de diálogo con la información
          // Añadir dentro de la función setupFeatureInfoHandler, en la parte del Swal.fire:

// Modificar la sección de Swal.fire para hacerlo responsive
Swal.fire({
  title: 'Información de capas',
  html: customStyle + generateLayerContent(currentLayerIndex) + navigationHTML,
  showConfirmButton: true,
  confirmButtonText: 'Cerrar',
  width: window.innerWidth < 480 ? '90%' : 400, // Responsive
  padding: '10px',
  customClass: {
    title: 'swal-small-title',
    confirmButton: 'swal-small-button',
    popup: 'responsive-popup' // Clase nueva
  },
  didOpen: () => {
    // Añadir estilo adicional para responsive
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
              if (layerNames.length > 1) {
                // Configurar los botones de navegación
                document.getElementById('prevLayerBtn').addEventListener('click', () => {
                  if (currentLayerIndex > 0) {
                    currentLayerIndex--;
                    updateContent();
                  }
                });
                
                document.getElementById('nextLayerBtn').addEventListener('click', () => {
                  if (currentLayerIndex < layerNames.length - 1) {
                    currentLayerIndex++;
                    updateContent();
                  }
                });
              }
            }
          });
          
          // Función para actualizar el contenido cuando se navega entre capas
          function updateContent() {
            document.querySelector('.layer-card').outerHTML = generateLayerContent(currentLayerIndex);
            document.getElementById('layerCounter').textContent = currentLayerIndex + 1;
            
            // Actualizar estado de los botones
            if (document.getElementById('prevLayerBtn')) {
              document.getElementById('prevLayerBtn').disabled = currentLayerIndex === 0;
            }
            if (document.getElementById('nextLayerBtn')) {
              document.getElementById('nextLayerBtn').disabled = currentLayerIndex === layerNames.length - 1;
            }
          }
          
        } else {
          // Si no hay entidades, mostrar un mensaje
          Swal.fire({
            title: 'Sin resultados',
            text: 'No se encontró información en este punto.',
            icon: 'info'
          });
        }
      })
      .catch(error => {
        console.error('Error al obtener información:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo obtener la información de las capas.',
          icon: 'error'
        });
      });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Iniciar el manejador de eventos
setupFeatureInfoHandler(viewer);