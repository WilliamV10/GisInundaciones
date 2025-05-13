// Vista inicial para el botón "Home"
const INITIAL_VIEW = {
  destination: Cesium.Cartesian3.fromDegrees(-88.9, 13.5, 300000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-90),
    roll: 0
  }
};

function setupNavigationControls(viewer) {
  // Botón de acercar (Zoom In) - CORREGIDO
  document.getElementById('zoomIn').addEventListener('click', function() {
    // Factor más conservador (0.93) - solo 7% de acercamiento por clic
    zoomByFactor(viewer, 0.97);
  });
  
  // Botón de alejar (Zoom Out)
  document.getElementById('zoomOut').addEventListener('click', function() {
    // 15% de alejamiento por clic
    zoomByFactor(viewer, 0.95);
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
  
  // Para zoom in (factor < 1), nos acercamos
  // Para zoom out (factor > 1), nos alejamos
  const scaleFactor = (factor < 1) ? (1 - factor) : -(1 - 1/factor);
  
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
  
  // Prevenir acercamiento excesivo (menos de 1000 metros sobre el terreno)
  if (factor < 1 && currentHeight < 3000 && scaleFactor > 0.03) {
    console.log('Límite de acercamiento alcanzado');
    return; // No permitir más acercamiento
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
  } else {
    console.error('El viewer de Cesium no está definido. Asegúrate de cargarlo antes que navigation.js');
  }
});