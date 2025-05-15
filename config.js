const CONFIG = {
  GEOSERVER_URL: 'http://168.138.75.16:8080/geoserver/wms',
  CESIUM_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlOTk1NjFiNi0yYTIxLTQ3MjMtYjhmNS02YzI0YjljODMyYTkiLCJpZCI6MzAxMTgyLCJpYXQiOjE3NDY4NTE1MzF9.SkANfE61s0IRlgIL7Fxh7bucq7Q4iHEvkZ6ouLwWg1k',
  LAYERS: {
    ELEVACION: 'ProyectoSGG:Elevacion',
    HUMEDAD: 'ProyectoSGG:Humedad',
    MUNICIPIOS: 'ProyectoSGG:vista_municipios',
    RIOS: 'ProyectoSGG:vista_rios',
    CARRETERAS: 'ProyectoSGG:vista_carreteras',
    INUNDACIONES: 'ProyectoSGG:vista_inundaciones_liviana',
    DEPARTAMENTOS: 'ProyectoSGG:vista_departamentos',
    CLASIFICACION: 'ProyectoSGG:clasificacion_vulnerabilidad'
  }
};

Cesium.Ion.defaultAccessToken = CONFIG.CESIUM_TOKEN;
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: Cesium.WorldTerrain,
  baseLayerPicker: true
});

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-88.9, 13.5, 1000000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-90),
    roll: 0
  }
});

viewer.scene.screenSpaceCameraController.enableInputs = true;
