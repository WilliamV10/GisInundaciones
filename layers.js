function createWMSProvider(layer, additionalParams = {}) {
  return new Cesium.WebMapServiceImageryProvider({
    url: CONFIG.GEOSERVER_URL,
    layers: layer,
    parameters: { transparent: true, format: 'image/png', ...additionalParams },
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

// Función para manejar clics en el mapa y mostrar datos en SweetAlert
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
          // Construir el contenido HTML para SweetAlert
          let content = '<div style="text-align:left;">';
          
          data.features.forEach(feature => {
            const properties = feature.properties;
            const layerName = feature.id.split('.')[0]; // Obtener nombre de capa
            
            content += `<h4>Capa: ${layerName}</h4>`;
            content += '<table style="width:100%; border-collapse: collapse;">';
            
            // Mostrar cada propiedad
            Object.entries(properties).forEach(([key, value]) => {
              // Excluir propiedades técnicas o vacías
              if (!key.startsWith('_') && value !== null && value !== "") {
                content += `<tr>
                  <td style="padding:4px; border-bottom:1px solid #eee; font-weight:bold;">${key}</td>
                  <td style="padding:4px; border-bottom:1px solid #eee;">${value}</td>
                </tr>`;
              }
            });
            
            content += '</table><br>';
          });
          
          content += '</div>';
          
          // Mostrar el cuadro de diálogo con la información
          Swal.fire({
            title: 'Información de capas',
            html: content,
            icon: 'info',
            width: 600,
            confirmButtonText: 'Cerrar'
          });
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