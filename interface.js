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
// Función para mostrar el mensaje de bienvenida
function mostrarMensajeBienvenida() {
  // Verificar si es la primera visita
  if (!localStorage.getItem('gisInundacionesBienvenidaMostrada')) {
    // Usar SweetAlert2 con configuración simplificada
    Swal.fire({
      title: '¡Bienvenido al Sistema de Información Geográfica!',
      html: `
        <div class="bienvenida-contenido">
          <p>Este SIG le permite explorar las zonas vulnerables a inundaciones en El Salvador.</p>
          
          <p class="bienvenida-subtitulo">Con esta herramienta usted puede:</p>
          <ul class="bienvenida-lista">
            <li>Visualizar diferentes capas geográficas como departamentos, municipios, ríos y carreteras.</li>
            <li>Consultar la elevación y humedad del suelo de cualquier punto.</li>
            <li>Examinar las áreas con mayor vulnerabilidad a inundaciones.</li>
            <li>Obtener información detallada haciendo clic en cualquier punto del mapa.</li>
            <li>Activar y desactivar capas desde el panel de control.</li>
          </ul>
          
          <div class="bienvenida-instrucciones">
            <p>Utilice los botones de navegación <i class="fa-solid fa-plus"></i> <i class="fa-solid fa-minus"></i> <i class="fa-solid fa-house"></i> en la esquina inferior derecha para navegar por el mapa.</p>
          </div>
          
          <p class="bienvenida-iniciar">Para comenzar a explorar, cierre este mensaje y haga clic en cualquier punto del mapa.</p>
        </div>
      `,
      confirmButtonText: 'Comenzar',
      customClass: {
        container: 'bienvenida-container',
        popup: 'bienvenida-popup',
        title: 'bienvenida-titulo',
        htmlContainer: 'bienvenida-html-container',
        confirmButton: 'bienvenida-boton',
        actions: 'bienvenida-actions'
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      buttonsStyling: false, // Importante: desactivar estilos de botones por defecto
    }).then((result) => {
      // Guardar en localStorage que ya se mostró la bienvenida
      // Solo cuando se hace clic en el botón (no si se cierra de otra manera)
      if (result.isConfirmed) {
        localStorage.setItem('gisInundacionesBienvenidaMostrada', 'true');
        console.log('Modal cerrado correctamente y confirmación registrada.');
      }
    });
  }
}
// Inicializar las funciones
document.addEventListener('DOMContentLoaded', () => {
  // Pequeño retraso para asegurar que todo cargue correctamente
  setTimeout(() => {
    mostrarMensajeBienvenida();
  }, 1000);
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