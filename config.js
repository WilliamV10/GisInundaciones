const CONFIG = {
  GEOSERVER_URL: 'http://localhost:8080/geoserver/wms',
  CESIUM_TOKEN: 'your-cesium-token-here',
  LAYERS: {
    ELEVACION: 'SGG:SLV_msk_alt',
    HUMEDAD: 'SGG:humedad',
    MUNICIPIOS: 'SGG:municipios',
    RIOS: 'SGG:riosl',
    CARRETERAS: 'SGG:carreteras',
    INUNDACIONES: 'SGG:vista_inundaciones_liviana',
    DEPARTAMENTOS: 'SGG:departamentos',
    CLASIFICACION: 'SGG:clasificacion_vulnerabilidad'
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
