function setLegendImage(containerId, layerName) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<img src="${CONFIG.GEOSERVER_URL}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=${layerName}" alt="Leyenda ${layerName}">`;
  }
}


// SEGUNDA DEFINICIÓN DE LA FUNCIÓN - mantener esta versión
function setupLegendToggleWithImage(checkboxId, legendId, layerName) {
  const checkbox = document.getElementById(checkboxId);
  const legend = document.getElementById(legendId);

  if (checkbox && legend) {
    // Cargar la imagen de la leyenda desde GeoServer
    setLegendImage(legendId, layerName);
  }
}

// Modificar la función setupLegendToggles para usar los nuevos iconos

function setupLegendToggles() {
  const toggleButtons = document.querySelectorAll('.toggle-legend');
  console.log('Botones encontrados:', toggleButtons.length); // Para depurar
  
  toggleButtons.forEach(button => {
    const targetId = button.getAttribute('data-target');
    const legendElement = document.getElementById(targetId);
    
    // Estado inicial - icono de información cuando la leyenda está oculta
    if (legendElement.style.display === 'none') {
      button.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
    } else {
      button.innerHTML = '<i class="fa-regular fa-circle-xmark"></i>';
    }
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Click en botón de leyenda:', targetId); // Para depurar
      
      if (legendElement.style.display === 'none') {
        legendElement.style.display = 'block';
        button.innerHTML = '<i class="fa-regular fa-circle-xmark"></i>'; // Icono X cuando la leyenda está visible
      } else {
        legendElement.style.display = 'none';
        button.innerHTML = '<i class="fa-solid fa-circle-info"></i>'; // Icono de información cuando la leyenda está oculta
      }
    });
  });
}

// Actualizar la función setupControlsPanel para usar iconos de Font Awesome
function setupControlsPanel() {
  const controlsHeader = document.getElementById('controlsHeader');
  const controlsContent = document.getElementById('controlsContent');
  const toggleIcon = document.getElementById('toggleIcon');

  // Establecer icono inicial
  toggleIcon.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

  controlsHeader.addEventListener('click', () => {
    
    if (controlsContent.style.display === 'none') {
      controlsContent.style.display = 'block';
      controlsContent.classList.remove('hidden');
      toggleIcon.innerHTML = '<i class="fa-solid fa-chevron-down"></i>'; // Icono de flecha hacia abajo
    } else {
      controlsContent.style.display = 'none';
      controlsContent.classList.add('hidden');
      toggleIcon.innerHTML = '<i class="fa-solid fa-chevron-right"></i>'; // Icono de flecha hacia la derecha
    }
  });
}

// Inicializar las funciones
document.addEventListener('DOMContentLoaded', () => {
  // Cargar leyendas
  setupLegendToggleWithImage('chkElevacion', 'leyendaElevacion', CONFIG.LAYERS.ELEVACION);
  setupLegendToggleWithImage('chkHumedad', 'leyendaHumedad', CONFIG.LAYERS.HUMEDAD);
  setupLegendToggleWithImage('chkClasificacionInundaciones', 'leyendaClasificacionInundaciones', CONFIG.LAYERS.CLASIFICACION);
  setupLegendToggleWithImage('chkCarreteras', 'leyendaCarreteras', CONFIG.LAYERS.CARRETERAS);
  setupLegendToggleWithImage('chkMunicipios', 'leyendaMunicipios', CONFIG.LAYERS.MUNICIPIOS);
  setupLegendToggleWithImage('chkDepartamentos', 'leyendaDepartamentos', CONFIG.LAYERS.DEPARTAMENTOS);
  setupLegendToggleWithImage('chkRios', 'leyendaRios', CONFIG.LAYERS.RIOS);
  setupLegendToggleWithImage('chkInundaciones', 'leyendaInundaciones', CONFIG.LAYERS.INUNDACIONES);
  
  // Configurar panel desplegable y botones de leyenda
  setupControlsPanel();
  setupLegendToggles();
});