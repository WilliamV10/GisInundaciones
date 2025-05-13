// Vista inicial para el botón "Home"
const INITIAL_VIEW = {
  destination: Cesium.Cartesian3.fromDegrees(-88.9, 13.5, 300000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-90),
    roll: 0
  }
};

// Altura mínima segura sobre el terreno (en metros) - REDUCIDA para permitir mayor acercamiento
const MIN_HEIGHT = 200; // Reducido de 5000m a 2000m

function setupNavigationControls(viewer) {
  // Botón de acercar (Zoom In) - CORREGIDO
  document.getElementById('zoomIn').addEventListener('click', function() {
    // Factor más conservador (0.95) - solo 5% de acercamiento por clic para más precisión
    zoomByFactor(viewer, 0.95);
  });
  
  // Botón de alejar (Zoom Out)
  document.getElementById('zoomOut').addEventListener('click', function() {
    // 10% de alejamiento por clic
    zoomByFactor(viewer, 1.10);
  });
  
  // Botón de vista inicial
  document.getElementById('resetView').addEventListener('click', function() {
    viewer.camera.flyTo({
      destination: INITIAL_VIEW.destination,
      orientation: INITIAL_VIEW.orientation,
      duration: 1.5
    });
  });
}

// Función auxiliar para hacer zoom in/out según un factor
function zoomByFactor(viewer, factor) {
  // Obtener la posición actual de la cámara
  const cameraPosition = viewer.camera.position;
  const cameraDirection = viewer.camera.direction;
  
  // Calcular la altura actual sobre el terreno (aproximación)
  const ellipsoid = viewer.scene.globe.ellipsoid;
  const cartographic = ellipsoid.cartesianToCartographic(cameraPosition);
  const currentHeight = cartographic.height;
  
  console.log(`Altura actual: ${currentHeight.toFixed(0)} metros`);
  
  // Para zoom in (factor < 1), nos acercamos
  // Para zoom out (factor > 1), nos alejamos
  const scaleFactor = (factor < 1) ? (1 - factor) : -(1 - 1/factor);
  
  // Si estamos acercando y ya estamos muy cerca, no permitir más zoom
  if (factor < 1 && currentHeight < MIN_HEIGHT) {
    console.log(`Límite de acercamiento alcanzado (${currentHeight.toFixed(0)}m). Mínimo permitido: ${MIN_HEIGHT}m`);
    
    // Mostrar mensaje al usuario
    const infoElement = document.createElement('div');
    infoElement.className = 'zoom-limit-info';
    infoElement.textContent = '¡Límite de acercamiento alcanzado!';
    infoElement.style.position = 'absolute';
    infoElement.style.bottom = '80px';
    infoElement.style.right = '20px';
    infoElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    infoElement.style.padding = '8px 12px';
    infoElement.style.borderRadius = '4px';
    infoElement.style.fontSize = '14px';
    infoElement.style.color = '#333';
    infoElement.style.zIndex = '9999';
    document.body.appendChild(infoElement);
    
    // Eliminar después de 2 segundos
    setTimeout(() => {
      document.body.removeChild(infoElement);
    }, 2000);
    
    return; // No permitir más acercamiento
  }
  
  // Calcular un nuevo punto a una distancia proporcional
  const moveDistance = Cesium.Cartesian3.multiplyByScalar(
    cameraDirection,
    Cesium.Cartesian3.magnitude(cameraPosition) * scaleFactor,
    new Cesium.Cartesian3()
  );
  
  const newPosition = Cesium.Cartesian3.add(
    cameraPosition,
    moveDistance,
    new Cesium.Cartesian3()
  );
  
  // Estimar la nueva altura después del zoom
  const estimatedNewCartographic = ellipsoid.cartesianToCartographic(newPosition);
  const estimatedNewHeight = estimatedNewCartographic.height;
  
  // Si la altura estimada es menor que el mínimo permitido, ajustar la posición
  if (factor < 1 && estimatedNewHeight < MIN_HEIGHT) {
    console.log(`Altura estimada (${estimatedNewHeight.toFixed(0)}m) menor que el límite. Ajustando posición.`);
    
    // Calcular dirección hacia el terreno
    const surfaceNormal = Cesium.Cartesian3.normalize(newPosition, new Cesium.Cartesian3());
    
    // Ajustar la posición para mantener la altura mínima
    const adjustedPosition = Cesium.Cartesian3.multiplyByScalar(
      surfaceNormal,
      Cesium.Cartesian3.magnitude(ellipsoid.cartographicToCartesian(
        new Cesium.Cartographic(estimatedNewCartographic.longitude, estimatedNewCartographic.latitude, MIN_HEIGHT)
      )),
      new Cesium.Cartesian3()
    );
    
    // Usar la posición ajustada
    newPosition.x = adjustedPosition.x;
    newPosition.y = adjustedPosition.y;
    newPosition.z = adjustedPosition.z;
  }
  
  // Animar la cámara hacia la nueva posición
  viewer.camera.flyTo({
    destination: newPosition,
    orientation: {
      heading: viewer.camera.heading,
      pitch: viewer.camera.pitch,
      roll: viewer.camera.roll
    },
    duration: 0.5,
    easingFunction: Cesium.EasingFunction.LINEAR_NONE
  });
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  if (typeof viewer !== 'undefined') {
    setupNavigationControls(viewer);
    
    // Añadir límite de cámara global
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = MIN_HEIGHT;
    
    // Verificar altura periódicamente y corregir si es necesario
    setInterval(() => {
      try {
        const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(viewer.camera.position);
        if (cartographic && cartographic.height < MIN_HEIGHT) {
          console.log('Corrigiendo altura de cámara demasiado baja');
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromRadians(
              cartographic.longitude, 
              cartographic.latitude, 
              MIN_HEIGHT + 500 // Menor margen adicional
            ),
            duration: 0.3
          });
        }
      } catch (e) {
        console.error('Error al verificar altura de la cámara:', e);
      }
    }, 2000);
    
  } else {
    console.error('El viewer de Cesium no está definido. Asegúrate de cargarlo antes que navigation.js');
  }
});