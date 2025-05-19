const CONFIG = {
  GEOSERVER_URL: 'https://geoserver.vg18011.me/geoserver/wms',
  CESIUM_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlOTk1NjFiNi0yYTIxLTQ3MjMtYjhmNS02YzI0YjljODMyYTkiLCJpZCI6MzAxMTgyLCJpYXQiOjE3NDY4NTE1MzF9.SkANfE61s0IRlgIL7Fxh7bucq7Q4iHEvkZ6ouLwWg1k',
  LAYERS: {
    ELEVACION: 'ProyectoSGG:Elevacion',
    HUMEDAD: 'ProyectoSGG:Humedad',
    MUNICIPIOS: 'ProyectoSGG:vista_municipios',
    RIOS: 'ProyectoSGG:vista_rios',
    CARRETERAS: 'ProyectoSGG:vista_carreteras',
    INUNDACIONES: 'ProyectoSGG:vista_inundaciones_con_ubicacion',
    DEPARTAMENTOS: 'ProyectoSGG:vista_departamentos',
    CLASIFICACION: 'ProyectoSGG:vulnerabilidad'
  }
  
};

Cesium.Ion.defaultAccessToken = CONFIG.CESIUM_TOKEN;
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: Cesium.WorldTerrain,
  baseLayerPicker: true
});

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-88.9, 13.7, 400000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-90),
    roll: 0
  }
});

viewer.scene.screenSpaceCameraController.enableInputs = true;
