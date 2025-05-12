function setLegendImage(containerId, layerName) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<img src="${CONFIG.GEOSERVER_URL}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=${layerName}" alt="Leyenda ${layerName}">`;
  }
}

function setupLegendToggleWithImage(checkboxId, legendId, layerName) {
  const checkbox = document.getElementById(checkboxId);
  const legend = document.getElementById(legendId);

  if (checkbox && legend) {
    // Cargar la imagen de la leyenda desde GeoServer
    setLegendImage(legendId, layerName);

    // Sincronizar estado inicial
    legend.style.display = checkbox.checked ? 'block' : 'none';

    // Agregar evento para manejar cambios
    checkbox.addEventListener('change', () => {
      legend.style.display = checkbox.checked ? 'block' : 'none';
    });
  }
}

// Configurar las leyendas con imágenes para las capas específicas
setupLegendToggleWithImage('chkElevacion', 'leyendaElevacion', CONFIG.LAYERS.ELEVACION);
setupLegendToggleWithImage('chkHumedad', 'leyendaHumedad', CONFIG.LAYERS.HUMEDAD);
setupLegendToggleWithImage('chkClasificacionInundaciones', 'leyendaClasificacionInundaciones', CONFIG.LAYERS.CLASIFICACION);
setupLegendToggleWithImage('chkCarreteras', 'leyendaCarreteras', CONFIG.LAYERS.CARRETERAS);

// Configurar las leyendas sin imágenes para las demás capas
setupLegendToggle('chkMunicipios', 'leyendaMunicipios');
setupLegendToggle('chkRios', 'leyendaRios');
setupLegendToggle('chkInundaciones', 'leyendaInundaciones');
setupLegendToggle('chkDepartamentos', 'leyendaDepartamentos');
setupLegendToggle('chkCarreteras', 'leyendaCarreteras');