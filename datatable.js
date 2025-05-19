// Variable para almacenar la entidad seleccionada actualmente
let selectedEntityId = null;

// Función para obtener los datos WFS de inundaciones
function fetchInundacionesData() {
  const wfsUrl = 'https://geoserver.vg18011.me/geoserver/wfs';
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: 'ProyectoSGG:vista_inundaciones_con_ubicacion', // Usar la nueva vista
    outputFormat: 'application/json'
  });

  return fetch(`${wfsUrl}?${params}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      return response.json();
    });
}

// Función para abrir el modal con la tabla de inundaciones
function openInundacionesTable() {
  // Mostrar indicador de carga
  Swal.fire({
    title: 'Cargando datos...',
    text: 'Obteniendo registros de inundaciones',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // Obtener los datos
  fetchInundacionesData()
    .then(data => {
      if (!data.features || data.features.length === 0) {
        Swal.fire({
          title: 'Sin datos',
          text: 'No se encontraron registros de inundaciones',
          icon: 'info'
        });
        return;
      }

      // Procesar los datos para la tabla
      const tableData = processInundacionesData(data.features);
      
      // Mostrar el modal con la tabla
      showInundacionesTableModal(tableData, data.features);
    })
    .catch(error => {
      console.error('Error al obtener datos de inundaciones:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los datos de inundaciones',
        icon: 'error'
      });
    });
}

// Función para procesar los datos de inundaciones con campos limitados
function processInundacionesData(features) {
  return features.map((feature, index) => {
    const properties = feature.properties || {};
    
    return {
      id: feature.id || `inundacion-${index}`,
      fecha: properties.fecha || 'Fecha no disponible',
      ubicacion: properties.ubicacion || 'Ubicación no disponible',
      municipio: properties.municipio || 'No disponible',
      departamento: properties.departamento || 'No disponible',
      coordenadas: feature.geometry ? 
        `${feature.geometry.coordinates[0].toFixed(4)}, ${feature.geometry.coordinates[1].toFixed(4)}` : 
        'No disponible',
      _coordinates: feature.geometry ? feature.geometry.coordinates : null
    };
  });
}

// Función para mostrar el modal con la tabla
function showInundacionesTableModal(tableData, originalFeatures) {
  // Variables para paginación
  const itemsPerPage = 10;
  let currentPage = 1;
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  
  // Crear la estructura HTML de la tabla con paginación
  const tableHtml = `
    <div class="data-table-filter">
      <label for="tableFilter">Filtrar por ubicación:</label>
      <input type="text" id="tableFilter" placeholder="Filtrar por municipio o departamento">
    </div>
    <div class="data-table-container">
      <table class="data-table" id="inundacionesTable">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Detalles</th>
            <th>Municipio</th>
            <th>Departamento</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          <!-- Aquí se cargarán los datos mediante JavaScript -->
        </tbody>
      </table>
    </div>
    <div class="data-table-pagination">
      <button id="prevPage" class="pagination-btn">&laquo; Anterior</button>
      <span id="pageInfo">Página <span id="currentPage">1</span> de <span id="totalPages">${totalPages}</span></span>
      <button id="nextPage" class="pagination-btn">Siguiente &raquo;</button>
    </div>
    <div class="data-table-actions">
      <button id="btnCerrarTabla" class="swal2-styled swal2-cancel">Cerrar</button>
      <button id="btnVerSeleccion" class="swal2-styled swal2-confirm" disabled>Ver en mapa</button>
    </div>
  `;

  // Mostrar el modal con la tabla (tamaño reducido)
  Swal.fire({
    title: '<i class="fa fa-book" style="color:#3a86ff;"></i> <span style="font-size: 20px; color:#1e1e1e;">Registro <strong style="color:#3a86ff;">Histórico</strong> de Inundaciones <span style="font-weight:normal;">2019</span></span>',

    html: tableHtml,
    width: '50%', // Ligeramente más ancho para acomodar la nueva columna
    showConfirmButton: false,
    showCloseButton: true,
    customClass: {
    popup: 'swal2-popup'  // evita conflictos
  },
    didOpen: (modal) => {
      modal.setAttribute("data-custom", "tabla-inundaciones");
      const tableBody = modal.querySelector('#tableBody');
      const filterInput = modal.querySelector('#tableFilter');
      const btnVerSeleccion = modal.querySelector('#btnVerSeleccion');
      const btnCerrarTabla = modal.querySelector('#btnCerrarTabla');
      const prevPageBtn = modal.querySelector('#prevPage');
      const nextPageBtn = modal.querySelector('#nextPage');
      const currentPageElement = modal.querySelector('#currentPage');
      const totalPagesElement = modal.querySelector('#totalPages');
      
      // Variable para almacenar datos filtrados
      let filteredData = [...tableData];
      
      // Función para actualizar la página actual
      function updatePage() {
        // Calcular índices para la página actual
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, filteredData.length);
        
        // Limpiar tabla
        tableBody.innerHTML = '';
        
        // Si no hay resultados
        if (filteredData.length === 0) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; padding: 20px;">
                No se encontraron resultados que coincidan con el filtro
              </td>
            </tr>
          `;
          return;
        }
        
        // Agregar filas para la página actual
        for (let i = startIdx; i < endIdx; i++) {
          const row = filteredData[i];
          const originalIndex = tableData.indexOf(row); // Mantener referencia al índice original
          
          const tr = document.createElement('tr');
          tr.dataset.id = row.id;
          tr.dataset.index = originalIndex; // Usar índice original
          
          tr.innerHTML = `
            <td>${row.fecha}</td>
            <td>${row.ubicacion}</td>
            <td>${row.municipio}</td>
            <td>${row.departamento}</td>
          `;
          
          tableBody.appendChild(tr);
        }
        
        // Actualizar información de página
        currentPageElement.textContent = currentPage;
        totalPagesElement.textContent = Math.ceil(filteredData.length / itemsPerPage);
        
        // Habilitar/deshabilitar botones de navegación
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage >= Math.ceil(filteredData.length / itemsPerPage);
      }
      
      // Cargar primera página
      updatePage();
      
      // Evento de clic en una fila de la tabla
      tableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row && row.dataset.index) {
          // Quitar selección anterior
          const selectedRows = tableBody.querySelectorAll('tr.selected');
          selectedRows.forEach(r => r.classList.remove('selected'));
          
          // Añadir selección a la fila actual
          row.classList.add('selected');
          
          // Activar botón de ver en mapa
          btnVerSeleccion.disabled = false;
          
          // Guardar el índice para usarlo al hacer zoom
          btnVerSeleccion.dataset.index = row.dataset.index;
        }
      });
      
      // Evento para el filtro de la tabla
      filterInput.addEventListener('input', () => {
        const filterText = filterInput.value.toLowerCase();
        
        // Filtrar datos
        if (filterText.trim() === '') {
          filteredData = [...tableData]; // Restaurar todos los datos
        } else {
          filteredData = tableData.filter(row => {
            return row.ubicacion.toLowerCase().includes(filterText) || 
                   row.municipio.toLowerCase().includes(filterText) || 
                   row.departamento.toLowerCase().includes(filterText);
          });
        }
        
        // Resetear a la primera página y actualizar
        currentPage = 1;
        updatePage();
      });
      
      // Evento para navegación de páginas
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          updatePage();
        }
      });
      
      nextPageBtn.addEventListener('click', () => {
        if (currentPage < Math.ceil(filteredData.length / itemsPerPage)) {
          currentPage++;
          updatePage();
        }
      });
      
      // Evento para el botón de ver en mapa
      btnVerSeleccion.addEventListener('click', () => {
        const index = parseInt(btnVerSeleccion.dataset.index);
        const feature = originalFeatures[index];
        
        if (feature && feature.geometry) {
          // Cerrar el modal
          Swal.close();
          
          // Hacer zoom al punto seleccionado
          zoomToInundacion(feature);
        }
      });
      
      // Evento para el botón de cerrar
      btnCerrarTabla.addEventListener('click', () => {
        Swal.close();
      });
    }
  });
}

// Función para hacer zoom a una inundación seleccionada
function zoomToInundacion(feature) {
  // Asegurarse de que la capa de inundaciones esté visible
  const checkbox = document.getElementById('chkInundaciones');
  if (checkbox && !checkbox.checked) {
    checkbox.checked = true;
    if (layers.inundaciones) {
      layers.inundaciones.show = true;
    }
  }
  
  // Remover entidad seleccionada anterior
  if (selectedEntityId) {
    viewer.entities.removeById(selectedEntityId);
    selectedEntityId = null;
  }
  
  // Obtener coordenadas
  const coords = feature.geometry.coordinates;
  
  // Extraer datos de propiedades
  const fecha = feature.properties.fecha || 'Fecha no disponible';
  const ubicacion = feature.properties.ubicacion || 'Ubicación no disponible';
  const municipio = feature.properties.municipio || 'Municipio no disponible';
  const departamento = feature.properties.departamento || 'Departamento no disponible';
  
  // Añadir un marcador en la ubicación
  const entity = viewer.entities.add({
    id: 'selected-inundacion-' + Date.now(),
    position: Cesium.Cartesian3.fromDegrees(coords[0], coords[1]),
    point: {
      pixelSize: 15,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    },
    label: {
      text: `${municipio}, ${departamento}\n(${fecha})`,
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      outlineColor: Cesium.Color.BLACK,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -10),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });
  
  // Guardar el ID de la entidad seleccionada
  selectedEntityId = entity.id;
  
  // Hacer zoom a la ubicación (vista más directa, menos inclinada)
  viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(coords[0], coords[1], 8000), // Altura mejorada
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-90),  // Vista totalmente desde arriba
    roll: 0
  },
  duration: 2
});


  
  // Mostrar un tooltip con información básica
  Swal.fire({
    title: 'Inundación seleccionada',
    html: `
      <div style="text-align: left;">
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Detalles:</strong> ${ubicacion}</p>
        <p><strong>Municipio:</strong> ${municipio}</p>
        <p><strong>Departamento:</strong> ${departamento}</p>
      </div>
    `,
    icon: 'info',
    position: 'top-end',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    toast: true,
    width: 300
  });
  // Eliminar automáticamente después de 20 segundos
setTimeout(() => {
  viewer.entities.remove(entity);
  selectedEntityId = null;
}, 10000); // 10,000 milisegundos = 20 segundos
}

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
  const btnVerTablaInundaciones = document.getElementById('btnVerTablaInundaciones');
  if (btnVerTablaInundaciones) {
    btnVerTablaInundaciones.addEventListener('click', openInundacionesTable);
  }
});