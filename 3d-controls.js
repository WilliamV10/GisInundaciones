/**
 * Sistema de visualización 3D para el GIS de Inundaciones
 * Implementación optimizada con patrón modular y mejor rendimiento
 */

// Módulo principal de controles 3D (IIFE para evitar variables globales)
const Controls3D = (function() {
  // Estado global encapsulado
  const state = {
    enabled: false,
    terrainEnabled: false,
    extrudedFeatures: [],
    activeLayer: null,
    elevationLayer: null,
    colorPalette: [
      Cesium.Color.fromCssColorString('#1a659e'),
      Cesium.Color.fromCssColorString('#7c9fa0'),
      Cesium.Color.fromCssColorString('#f4a261'),
      Cesium.Color.fromCssColorString('#e76f51')
    ],
    elevationRamp: [
      { height: 0, color: Cesium.Color.fromCssColorString('#313695') },
      { height: 100, color: Cesium.Color.fromCssColorString('#4575b4') },
      { height: 250, color: Cesium.Color.fromCssColorString('#74add1') },
      { height: 500, color: Cesium.Color.fromCssColorString('#abd9e9') },
      { height: 750, color: Cesium.Color.fromCssColorString('#fee090') },
      { height: 1000, color: Cesium.Color.fromCssColorString('#fdae61') },
      { height: 1500, color: Cesium.Color.fromCssColorString('#f46d43') },
      { height: 2000, color: Cesium.Color.fromCssColorString('#d73027') },
      { height: 3000, color: Cesium.Color.fromCssColorString('#a50026') }
    ],
    vulnerabilidadColors: {
      1: Cesium.Color.fromCssColorString('#d73027'), // Alta - Rojo
      2: Cesium.Color.fromCssColorString('#ff9900'), // Media - Naranja
      3: Cesium.Color.fromCssColorString('#fee090')  // Baja - Amarillo
    }
  };

  // Configuraciones por tipo de capa (centralizadas)
  const layerConfigs = {
    MUNICIPIOS: {
      height: 2000,
      alpha: 0.7,
      color: '#1a659e',
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      maxFeatures: 50,
      icon: 'fa-building'
    },
    DEPARTAMENTOS: {
      height: 5000,
      alpha: 0.5,
      color: '#4361ee',
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#3a0ca3'),
      outlineWidth: 3,
      maxFeatures: 30,
      icon: 'fa-map'
    },
    RIOS: {
      alpha: 0.9,
      color: Cesium.Color.BLUE,
      width: 3,
      clampToGround: true,
      maxFeatures: 30,
      icon: 'fa-water-ladder'
    },
    INUNDACIONES: {
      alpha: 0.8,
      color: '#023e8a',
      extrudeHeight: 150,
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      maxFeatures: 100,
      icon: 'fa-water'
    },
    CLASIFICACION: {
      alpha: 0.8,
      extrudeHeight: 2000,
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1,
      maxFeatures: 100,
      icon: 'fa-triangle-exclamation'
    },
    ELEVACION: {
      alpha: 0.8,
      brightness: 1.2,
      contrast: 1.1,
      gamma: 1.2,
      colorRamp: true,
      icon: 'fa-mountain'
    },
    DEFAULT: {
      alpha: 0.85,
      brightness: 1.2,
      contrast: 1.1,
      gamma: 1.05,
      clampToGround: true
    }
  };

  // Utilitarios para UI y UX
  const UI = {
    showToast: function(message, type = 'info') {
      Swal.fire({
        text: message,
        icon: type,
        toast: true,
        position: 'top-end',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    },
    
    showLoading: function(title, text) {
      return Swal.fire({
        title: title || 'Cargando...',
        text: text || 'Procesando datos',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    },
    
    updateLoading: function(text) {
      Swal.update({ text });
    },
    
    closeLoading: function() {
      Swal.close();
    },
    
    showError: function(title, text) {
      Swal.fire({
        title: title || 'Error',
        text: text || 'Ha ocurrido un error inesperado',
        icon: 'error'
      });
    }
  };

  // Gestor de datos (obtención, procesamiento)
  const DataManager = {
    getWFSData: async function(layerName, maxFeatures = 50) {
      try {
        if (!CONFIG.LAYERS[layerName]) {
          throw new Error(`Capa ${layerName} no definida en CONFIG.LAYERS`);
        }
        
        const wfsUrl = CONFIG.GEOSERVER_URL.replace('wms', 'wfs');
        const params = new URLSearchParams({
          service: 'WFS',
          version: '2.0.0',
          request: 'GetFeature',
          typeName: CONFIG.LAYERS[layerName],
          outputFormat: 'application/json',
          maxFeatures: maxFeatures
        });

        const response = await fetch(`${wfsUrl}?${params}`);
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.features || data.features.length === 0) {
          throw new Error(`No se encontraron datos para ${layerName}`);
        }
        
        return data.features;
      } catch (error) {
        console.error(`Error al obtener datos para ${layerName}:`, error);
        throw error;
      }
    },
    
    sampleFeatures: function(features, maxCount = 30) {
      if (features.length <= maxCount) return features;
      
      return features
        .sort(() => 0.5 - Math.random())
        .slice(0, maxCount);
    },
    
    calculatePolygonArea: function(geometry) {
      if (!geometry) return 1;
      
      try {
        // Extraer coordenadas
        let coordinates = [];
        if (geometry.type === 'Polygon') {
          coordinates = [geometry.coordinates[0]];
        } else if (geometry.type === 'MultiPolygon') {
          coordinates = geometry.coordinates.map(poly => poly[0]);
        } else {
          return 1;
        }
        
        let totalArea = 0;
        
        // Calcular área para cada anillo
        coordinates.forEach(ring => {
          let area = 0;
          const n = ring.length;
          
          if (n < 3) return;
          
          for (let i = 0; i < n - 1; i++) {
            const x1 = ring[i][0];
            const y1 = ring[i][1];
            const x2 = ring[i+1][0];
            const y2 = ring[i+1][1];
            
            area += (x2 - x1) * (y2 + y1);
          }
          
          totalArea += Math.abs(area / 2);
        });
        
        return totalArea;
      } catch (error) {
        console.error('Error al calcular área:', error);
        return 1;
      }
    },
    
    calculateFeatureHeights: function(features, type) {
      const heights = new Map();
      let minHeight = 5000;
      let maxHeight = 30000;
      
      if (type === 'municipio') {
        const usePopulation = features.some(f => f.properties && 
          (f.properties.population || f.properties.poblacion));
        
        let minValue = Number.MAX_VALUE;
        let maxValue = 0;
        
        features.forEach(feature => {
          let value;
          
          if (usePopulation && feature.properties) {
            value = feature.properties.population || 
                    feature.properties.poblacion || 
                    100000;
          } else {
            value = this.calculatePolygonArea(feature.geometry);
          }
          
          minValue = Math.min(minValue, value);
          maxValue = Math.max(maxValue, value);
          heights.set(feature, value);
        });
        
        features.forEach(feature => {
          const value = heights.get(feature);
          if (value !== undefined) {
            let normalizedHeight;
            if (maxValue === minValue) {
              normalizedHeight = (minHeight + maxHeight) / 2;
            } else {
              normalizedHeight = minHeight + (value - minValue) / (maxValue - minValue) * (maxHeight - minHeight);
            }
            heights.set(feature, normalizedHeight);
          }
        });
      } else if (type === 'inundacion') {
        features.forEach(feature => {
          heights.set(feature, 150);
        });
      } else if (type === 'vulnerabilidad') {
        features.forEach(feature => {
          // Asignar altura según tipo de vulnerabilidad (alta más alta, baja más baja)
          const valor = feature.properties.value || feature.properties.valor || 2;
          let altura;
          
          switch (parseInt(valor)) {
            case 1: // Alta
              altura = 3000;
              break;
            case 2: // Media
              altura = 2000;
              break;
            case 3: // Baja
              altura = 1000;
              break;
            default:
              altura = 1500;
          }
          
          heights.set(feature, altura);
        });
      }
      
      return heights;
    }
  };

  // Renderizador de capas 3D (abstrae la creación de entidades)
  const Renderer3D = {
    createExtrudedPolygon: function(geometry, name, height, color, properties) {
      if (!geometry) return;
      
      try {
        let hierarchies = [];
        
        if (geometry.type === 'Polygon') {
          const positions = geometry.coordinates[0].map(coord => 
            Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
          );
          hierarchies.push(new Cesium.PolygonHierarchy(positions));
          
          if (geometry.coordinates.length > 1) {
            for (let i = 1; i < geometry.coordinates.length; i++) {
              const holePositions = geometry.coordinates[i].map(coord => 
                Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
              );
              hierarchies[0].holes.push(new Cesium.PolygonHierarchy(holePositions));
            }
          }
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach(polygon => {
            const positions = polygon[0].map(coord => 
              Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
            );
            const hierarchy = new Cesium.PolygonHierarchy(positions);
            
            if (polygon.length > 1) {
              for (let i = 1; i < polygon.length; i++) {
                const holePositions = polygon[i].map(coord => 
                  Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
                );
                hierarchy.holes.push(new Cesium.PolygonHierarchy(holePositions));
              }
            }
            
            hierarchies.push(hierarchy);
          });
        }
        
        const alphaValue = typeof color.alpha === 'number' ? color.alpha : 0.7;
        const materialColor = color instanceof Cesium.Color ? 
          color.withAlpha(alphaValue) : 
          Cesium.Color.fromCssColorString(color).withAlpha(alphaValue);
        
        hierarchies.forEach((hierarchy, idx) => {
          const entity = viewer.entities.add({
            name: hierarchies.length > 1 ? `${name} (Parte ${idx+1})` : name,
            polygon: {
              hierarchy: hierarchy,
              material: materialColor,
              extrudedHeight: height,
              outline: true,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 1
            }
          });
          
          if (properties) {
            entity.description = this.createEntityDescription(name, properties);
          }
          
          state.extrudedFeatures.push(entity);
        });
      } catch (error) {
        console.error('Error al crear polígono extruido:', error);
      }
    },
    
    createEntityDescription: function(name, properties) {
      let html = `<h3 style="color:#3a86ff;">${name}</h3>`;
      
      html += '<table style="width:100%;">';
      for (const [key, value] of Object.entries(properties)) {
        if (!key.startsWith('_') && value !== null && value !== "" && 
            !key.toLowerCase().includes('geom') && 
            !key.toLowerCase().includes('the_geom')) {
          const formattedKey = key
            .replace(/_/g, ' ')
            .replace(/^\w/, c => c.toUpperCase());
          
          let formattedValue = value;
          // Formatear valores específicos para vulnerabilidad
          if (key === 'value' || key === 'valor') {
            switch (parseInt(value)) {
              case 1:
                formattedValue = 'Alta';
                break;
              case 2:
                formattedValue = 'Media';
                break;
              case 3:
                formattedValue = 'Baja';
                break;
            }
          }
          
          html += `<tr>
            <td style="padding:3px; font-weight:bold;">${formattedKey}</td>
            <td style="padding:3px;">${formattedValue}</td>
          </tr>`;
        }
      }
      html += '</table>';
      
      return html;
    },
    
    create3DLineFeature: function(feature, config, isRiver = false) {
      if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
        return;
      }
      
      const properties = feature.properties || {};
      const featureType = isRiver ? 'Río' : 'Carretera';
      const name = properties.nombre || properties.name || `${featureType} ${properties.id || ''}`;
      
      try {
        let positions = [];
        const offset = config.verticalOffset || (isRiver ? 5 : 20);
        
        if (feature.geometry.type === 'LineString') {
          positions = feature.geometry.coordinates.map(coord => 
            Cesium.Cartesian3.fromDegrees(coord[0], coord[1], offset)
          );
        } else if (feature.geometry.type === 'MultiLineString') {
          feature.geometry.coordinates.forEach(line => {
            if (positions.length > 0) positions.push(undefined);
            
            const linePositions = line.map(coord => 
              Cesium.Cartesian3.fromDegrees(coord[0], coord[1], offset)
            );
            positions = positions.concat(linePositions);
          });
        }
        
        if (positions.length === 0) return;
        
        // Crear el material según el tipo
        let material;
        
        if (isRiver) {
          material = new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.2,
            color: typeof config.color === 'string' ? 
              Cesium.Color.fromCssColorString(config.color).withAlpha(config.alpha || 0.8) : 
              config.color.withAlpha(config.alpha || 0.8)
          });
        } else {
          material = new Cesium.PolylineDashMaterialProperty({
            color: typeof config.color === 'string' ? 
              Cesium.Color.fromCssColorString(config.color).withAlpha(config.alpha || 0.9) : 
              config.color.withAlpha(config.alpha || 0.9),
            dashLength: 16.0,
            dashPattern: 255
          });
        }
        
        const entity = viewer.entities.add({
          name: name,
          polyline: {
            positions: positions,
            width: config.width || (isRiver ? 3 : 5),
            material: material,
            clampToGround: config.clampToGround !== false
          }
        });
        
        if (properties) {
          entity.description = this.createEntityDescription(name, properties);
        }
        
        state.extrudedFeatures.push(entity);
      } catch (error) {
        console.error(`Error al crear ${featureType} 3D:`, error);
      }
    },
    
    createInundationPoint: function(feature) {
      if (feature.geometry.type !== 'Point') return;
      
      const coords = feature.geometry.coordinates;
      const properties = feature.properties || {};
      
      const name = properties.ubicacion || 'Inundación';
      const fecha = properties.fecha || 'Fecha desconocida';
      const municipio = properties.municipio || '';
      const departamento = properties.departamento || '';
      
      const entity = viewer.entities.add({
        name: name,
        position: Cesium.Cartesian3.fromDegrees(coords[0], coords[1]),
        cylinder: {
          length: 150,
          topRadius: 500,
          bottomRadius: 500,
          material: Cesium.Color.BLUE.withAlpha(0.7),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1
        },
        label: {
          text: municipio,
          font: '14px sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -50),
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
        }
      });
      
      entity.description = this.createEntityDescription('Inundación', properties);
      state.extrudedFeatures.push(entity);
    },
    
    addElevationLayer: function() {
      // Primero, eliminar la capa de elevación anterior si existe
      if (state.elevationLayer) {
        viewer.scene.imageryLayers.remove(state.elevationLayer);
        state.elevationLayer = null;
      }
      
      if (!CONFIG.LAYERS.ELEVACION) {
        UI.showError('Error', 'No se ha definido la capa de elevación en la configuración');
        return;
      }
      
      try {
        // Crear proveedor de imágenes para el DEM
        const provider = new Cesium.WebMapServiceImageryProvider({
          url: CONFIG.GEOSERVER_URL,
          layers: CONFIG.LAYERS.ELEVACION,
          parameters: {
            format: 'image/png',
            transparent: true
          },
          enablePickFeatures: false
        });
        
        // Añadir capa con efectos de altitud (color por elevación)
        state.elevationLayer = viewer.scene.imageryLayers.addImageryProvider(provider);
        
        // Configurar la rampa de color y otros parámetros
        const elevConfig = layerConfigs.ELEVACION;
        state.elevationLayer.alpha = elevConfig.alpha;
        state.elevationLayer.brightness = elevConfig.brightness;
        state.elevationLayer.contrast = elevConfig.contrast;
        state.elevationLayer.gamma = elevConfig.gamma;
        
        return state.elevationLayer;
      } catch (error) {
        console.error('Error al añadir capa de elevación:', error);
        UI.showError('Error', 'No se pudo cargar la capa de elevación');
        return null;
      }
    },
    
    zoomToExtrudedEntities: function() {
      if (state.extrudedFeatures.length === 0) return;
      
      viewer.flyTo(state.extrudedFeatures, {
        duration: 1.5,
        offset: new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(-40),
          0
        )
      });
    },
    
    removeAllEntities: function() {
      state.extrudedFeatures.forEach(entity => {
        viewer.entities.remove(entity);
      });
      
      state.extrudedFeatures = [];
    }
  };

  // Controlador para las capas específicas
  const LayerController = {
    showDepartamentos: async function() {
      Renderer3D.removeAllEntities();
      updateUIForActiveLayer('DEPARTAMENTOS');
      
      const loader = UI.showLoading('Cargando datos...', 'Generando visualización 3D de departamentos');
      
      try {
        const config = layerConfigs.DEPARTAMENTOS;
        const features = await DataManager.getWFSData('DEPARTAMENTOS', config.maxFeatures);
        
        features.forEach((feature, index) => {
          if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
            return;
          }
          
          const properties = feature.properties || {};
          const name = properties.nombre || properties.name || 'Departamento';
          const height = config.height + (index * 500);
          
          Renderer3D.createExtrudedPolygon(
            feature.geometry,
            name,
            height,
            config.color,
            properties
          );
        });
        
        UI.closeLoading();
        UI.showToast('Departamentos en 3D generados', 'success');
        Renderer3D.zoomToExtrudedEntities();
      } catch (error) {
        console.error('Error al generar departamentos 3D:', error);
        UI.closeLoading();
        UI.showError('Error', 'No se pudieron cargar los datos de departamentos para 3D');
      }
    },
    
    showMunicipios: async function() {
      Renderer3D.removeAllEntities();
      updateUIForActiveLayer('MUNICIPIOS');
      
      const loader = UI.showLoading('Cargando datos...', 'Generando visualización 3D de municipios');
      
      try {
        const config = layerConfigs.MUNICIPIOS;
        const features = await DataManager.getWFSData('MUNICIPIOS', config.maxFeatures);
        const heights = DataManager.calculateFeatureHeights(features, 'municipio');
        
        features.forEach((feature, index) => {
          if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
            return;
          }
          
          const properties = feature.properties || {};
          const name = properties.name_2 || properties.name || 'Municipio';
          const height = heights.get(feature) || 5000;
          
          const colorIndex = index % state.colorPalette.length;
          const color = state.colorPalette[colorIndex];
          
          Renderer3D.createExtrudedPolygon(
            feature.geometry,
            name,
            height,
            color,
            properties
          );
        });
        
        UI.closeLoading();
        UI.showToast('Municipios en 3D generados', 'success');
        Renderer3D.zoomToExtrudedEntities();
      } catch (error) {
        console.error('Error al generar municipios 3D:', error);
        UI.closeLoading();
        UI.showError('Error', 'No se pudieron cargar los datos de municipios para 3D');
      }
    },
    
    showRios: async function() {
      Renderer3D.removeAllEntities();
      updateUIForActiveLayer('RIOS');
      
      const loader = UI.showLoading('Cargando datos...', 'Generando visualización 3D de ríos');
      
      try {
        const config = layerConfigs.RIOS;
        let features = await DataManager.getWFSData('RIOS', config.maxFeatures);
        
        if (features.length > 30) {
          features = DataManager.sampleFeatures(features, 30);
          UI.showToast(`Mostrando muestra de 30 ríos de ${features.length} disponibles para mejor rendimiento`, 'info');
        }
        
        features.forEach(feature => {
          Renderer3D.create3DLineFeature(feature, config, true);
        });
        
        UI.closeLoading();
        UI.showToast('Ríos en 3D generados', 'success');
        Renderer3D.zoomToExtrudedEntities();
      } catch (error) {
        console.error('Error al generar ríos 3D:', error);
        UI.closeLoading();
        UI.showError('Error', 'No se pudieron cargar los datos de ríos para 3D');
      }
    },
    
    showInundaciones: async function() {
      Renderer3D.removeAllEntities();
      updateUIForActiveLayer('INUNDACIONES');
      
      const loader = UI.showLoading('Cargando datos...', 'Generando visualización 3D de inundaciones');
      
      try {
        const features = await DataManager.getWFSData('INUNDACIONES', layerConfigs.INUNDACIONES.maxFeatures);
        
        features.forEach(feature => {
          if (feature.geometry.type === 'Point') {
            Renderer3D.createInundationPoint(feature);
          }
        });
        
        UI.closeLoading();
        UI.showToast('Inundaciones en 3D generadas', 'success');
        Renderer3D.zoomToExtrudedEntities();
      } catch (error) {
        console.error('Error al generar inundaciones 3D:', error);
        UI.closeLoading();
        UI.showError('Error', 'No se pudieron cargar los datos de inundaciones para 3D');
      }
    },
    
    showVulnerabilidad: async function() {
      Renderer3D.removeAllEntities();
      updateUIForActiveLayer('CLASIFICACION');
      
      const loader = UI.showLoading('Cargando datos...', 'Generando visualización 3D de áreas de vulnerabilidad');
      
      try {
        const features = await DataManager.getWFSData('CLASIFICACION', layerConfigs.CLASIFICACION.maxFeatures);
        const heights = DataManager.calculateFeatureHeights(features, 'vulnerabilidad');
        
        features.forEach((feature, index) => {
          if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
            return;
          }
          
          const properties = feature.properties || {};
          const name = properties.name || properties.nombre || 'Área de Vulnerabilidad';
          const height = heights.get(feature) || 2000;
          
          // Determinar color según valor de vulnerabilidad
          const valor = parseInt(properties.value || properties.valor || 2);
          let color;
          
          switch (valor) {
            case 1: // Alta - Rojo
              color = state.vulnerabilidadColors[1];
              break;
            case 2: // Media - Amarillo
              color = state.vulnerabilidadColors[2];
              break;
            case 3: // Baja - Azul
              color = state.vulnerabilidadColors[3];
              break;
            default:
              color = Cesium.Color.PURPLE;
          }
          
          Renderer3D.createExtrudedPolygon(
            feature.geometry,
            name,
            height,
            color,
            properties
          );
        });
        
        UI.closeLoading();
        UI.showToast('Áreas de vulnerabilidad en 3D generadas', 'success');
        Renderer3D.zoomToExtrudedEntities();
      } catch (error) {
        console.error('Error al generar áreas de vulnerabilidad 3D:', error);
        UI.closeLoading();
        UI.showError('Error', 'No se pudieron cargar los datos de vulnerabilidad para 3D');
      }
    },
    
    showElevacion: async function() {
      Renderer3D.removeAllEntities();
      updateUIForActiveLayer('ELEVACION');
      
      const loader = UI.showLoading('Cargando datos...', 'Visualizando elevación del terreno en 3D');
      
      try {
        // Exagerar verticalmente el terreno para que se noten más las montañas
        viewer.scene.verticalExaggeration = 2.0; // Multiplica por 2 la altura
        
        // Añadir la capa de elevación como raster clasificado por colores
        const elevationLayer = Renderer3D.addElevationLayer();
        
        if (elevationLayer) {
          // Mejorar los parámetros visuales
          elevationLayer.brightness = 1.3;  // Más brillo
          elevationLayer.contrast = 1.3;    // Más contraste
          elevationLayer.gamma = 1.1;       // Ajuste gamma
          
          // Ajustar la vista para mostrar mejor el relieve
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(-88.9, 13.7, 80000), // Altura más baja
            orientation: {
              heading: Cesium.Math.toRadians(45),  // Vista en ángulo para ver el relieve
              pitch: Cesium.Math.toRadians(-35),   // Más inclinado
              roll: 0
            },
            duration: 2.5
          });
          
          UI.closeLoading();
          UI.showToast('Visualización mejorada de relieve activada', 'success');
        } else {
          throw new Error('No se pudo crear la capa de elevación');
        }
      } catch (error) {
        console.error('Error al visualizar elevación:', error);
        UI.closeLoading();
        UI.showError('Error', 'No se pudo visualizar la capa de elevación');
      }
    }
  };

  // Administrador de UI 
  function initializeUI() {
    addToggle3DButton();
    setupLayerButtons();
    resetTo2DMode();
  }
  
  function addToggle3DButton() {
    // En lugar de crear un botón flotante, añadiremos una sección nueva al panel de control
    const controlsContent = document.getElementById('controlsContent');
    
    if (!controlsContent) {
      console.error('No se encontró el contenedor de controles');
      return;
    }
    
    // Crear una sección de controles 3D
    const section3D = document.createElement('div');
    section3D.className = 'controls-3d-section';
    section3D.style.marginTop = '15px';
    
    // Añadir un encabezado desplegable similar al de las capas
    const header3D = document.createElement('div');
    header3D.className = 'controls-header';
    header3D.innerHTML = '<strong>Visualización 3D</strong><span id="toggle3DIcon"><i class="fa-solid fa-chevron-right"></i></span>';
    
    // Contenido de controles 3D (inicialmente oculto)
    const content3D = document.createElement('div');
    content3D.id = 'controls3DContent';
    content3D.style.display = 'none';
    content3D.className = 'controls-3d';
    
    // Añadir botón de activación 3D al inicio
    const toggle3DBtn = document.createElement('button');
    toggle3DBtn.id = 'btnToggle3D';
    toggle3DBtn.className = 'control-button toggle-3d-button';
    toggle3DBtn.innerHTML = '<i class="fa-solid fa-cube"></i> Activar modo 3D';
    toggle3DBtn.title = 'Alternar entre vista 2D y 3D';
    
    content3D.appendChild(toggle3DBtn);
    
    // Añadir los elementos al DOM
    section3D.appendChild(header3D);
    section3D.appendChild(content3D);
    controlsContent.appendChild(section3D);
    
    // Configurar comportamiento desplegable
    header3D.addEventListener('click', () => {
      if (content3D.style.display === 'none') {
        content3D.style.display = 'block';
        document.getElementById('toggle3DIcon').innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
      } else {
        content3D.style.display = 'none';
        document.getElementById('toggle3DIcon').innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
      }
    });
    
    // Añadir el evento para activar/desactivar 3D
    toggle3DBtn.addEventListener('click', toggleMode);
  }
    
  // Actualizar la función setupLayerButtons para colocar los botones en el panel
  function setupLayerButtons() {
    // Definición de botones para capas específicas
    const layerButtons = [
      { id: 'btnMunicipios3D', title: 'Mostrar municipios en 3D', layer: 'MUNICIPIOS', handler: LayerController.showMunicipios },
      { id: 'btnDepartamentos3D', title: 'Mostrar departamentos en 3D', layer: 'DEPARTAMENTOS', handler: LayerController.showDepartamentos },
      { id: 'btnRios3D', title: 'Mostrar ríos en 3D', layer: 'RIOS', handler: LayerController.showRios },
      { id: 'btnInundaciones3D', title: 'Mostrar inundaciones en 3D', layer: 'INUNDACIONES', handler: LayerController.showInundaciones },
      { id: 'btnVulnerabilidad3D', title: 'Mostrar zonas vulnerables en 3D', layer: 'CLASIFICACION', handler: LayerController.showVulnerabilidad },
      { id: 'btnElevacion3D', title: 'Mostrar elevación del terreno', layer: 'ELEVACION', handler: LayerController.showElevacion }
    ];
    
    // Usar el contenedor dentro del panel de control
    const container = document.querySelector('.controls-3d');
    if (!container) {
      console.error('No se encontró el contenedor de controles 3D');
      return;
    }
    
    // Crear todos los botones
    layerButtons.forEach(btn => {
      createLayerButton(container, btn.id, btn.title, btn.layer, btn.handler);
    });
    
    // Escuchar cambios en el modo 3D para actualizar la UI
    document.addEventListener('mode3DChanged', function(e) {
      const toggle3DBtn = document.getElementById('btnToggle3D');
      if (toggle3DBtn) {
        if (e.detail.enabled) {
          toggle3DBtn.innerHTML = '<i class="fa-solid fa-map"></i> Desactivar 3D';
          // Mostrar los botones de capas 3D solo si está activado el modo 3D
          Array.from(container.querySelectorAll('.control-button:not(#btnToggle3D)')).forEach(btn => {
            btn.style.display = 'block';
          });
        } else {
          toggle3DBtn.innerHTML = '<i class="fa-solid fa-cube"></i> Activar modo 3D';
          // Ocultar los botones de capas 3D cuando se desactiva
          Array.from(container.querySelectorAll('.control-button:not(#btnToggle3D)')).forEach(btn => {
            btn.style.display = 'none';
          });
        }
      }
    });
  }
    
  // Mejorar la creación de botones para el panel de control
  function createLayerButton(container, id, title, layerName, clickHandler) {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'control-button layer-3d-button';
    button.title = title;
    button.dataset.layer = layerName;
    
    // Inicialmente ocultos hasta que se active el modo 3D
    button.style.display = 'none';
    
    // Icono según el tipo de capa
    const config = layerConfigs[layerName] || {};
    const icon = config.icon || 'fa-layer-group';
    
    button.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${layerName.charAt(0) + layerName.slice(1).toLowerCase()}</span>`;
    
    container.appendChild(button);
    
    button.addEventListener('click', function() {
      if (!state.enabled) {
        UI.showToast('Activa primero el modo 3D para usar esta función', 'warning');
        return;
      }
      
      clickHandler();
    });
  }
  
  function updateUIForActiveLayer(layerName) {
    state.activeLayer = layerName;
    
    const buttons = document.querySelectorAll('.controls-3d .control-button');
    buttons.forEach(button => {
      if (button.dataset.layer === layerName) {
        button.classList.add('active');
        button.style.backgroundColor = '#4361ee';
        button.style.color = 'white';
        
        let indicator = button.querySelector('.layer-active-indicator');
        if (!indicator) {
          indicator = document.createElement('span');
          indicator.className = 'layer-active-indicator';
          indicator.textContent = '✓';
          indicator.style.marginLeft = '5px';
          indicator.style.fontWeight = 'bold';
          button.appendChild(indicator);
        }
      } else {
        button.classList.remove('active');
        button.style.backgroundColor = '';
        button.style.color = '';
        
        const indicator = button.querySelector('.layer-active-indicator');
        if (indicator) {
          button.removeChild(indicator);
        }
      }
    });
    
    if (layerName) {
      UI.showToast(`Capa activa: ${layerName}`, 'info');
    }
  }

  // Modos de visualización
  function toggleMode() {
    state.enabled = !state.enabled;
    
    if (state.enabled) {
      enableMode3D();
    } else {
      resetTo2DMode();
    }
    
    // Disparar evento personalizado
    const event = new CustomEvent('mode3DChanged', {
      detail: { enabled: state.enabled }
    });
    document.dispatchEvent(event);
    
    // Actualizar icono
    const button = document.getElementById('btnToggle3D');
    if (button) {
      button.innerHTML = state.enabled ? 
        '<i class="fa-solid fa-map"></i> Desactivar 3D' : 
        '<i class="fa-solid fa-cube"></i> Activar 3D';
      
      button.title = state.enabled ? 
        'Cambiar a vista 2D' : 
        'Cambiar a vista 3D';
    }
    
    // Notificar
    const message = state.enabled ? 
      'Modo 3D activado. Selecciona una capa para visualizarla en 3D.' : 
      'Modo 2D activado. Visualización estándar.';
    
    UI.showToast(message, state.enabled ? 'success' : 'info');
  }
  
  function enableMode3D() {
    try {
      viewer.scene.globe.baseColor = Cesium.Color.WHITE;
      
      try {
        viewer.terrainProvider = Cesium.createWorldTerrain({
          requestWaterMask: true,
          requestVertexNormals: true
        });
      } catch (terrainError) {
        console.error("Error al activar terreno 3D:", terrainError);
        viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
          url: Cesium.IonResource.fromAssetId(1)
        });
      }
      
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = true;
      
      // Ajustar capas existentes
      enhanceWMSLayers(layerConfigs);
      
      // Vista oblicua
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-88.9, 13.7, 200000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0
        },
        duration: 2
      });
      
      state.terrainEnabled = true;
    } catch (error) {
      console.error("Error al habilitar modo 3D:", error);
      resetTo2DMode();
      UI.showToast("Error al activar modo 3D", "error");
    }
  }
  
  function resetTo2DMode() {
    try {
      viewer.scene.verticalExaggeration = 1.0;
      viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.globe.enableLighting = false;
      viewer.scene.globe.baseColor = Cesium.Color.BLUE.withAlpha(0.0);
      
      // Restaurar configuración de todas las capas
      const imageryLayers = viewer.scene.imageryLayers;
      for (let i = 0; i < imageryLayers.length; i++) {
        const layer = imageryLayers.get(i);
        layer.alpha = 1.0;
        layer.brightness = 1.0;
        layer.contrast = 1.0;
        layer.gamma = 1.0;
      }
      
      // Eliminar capa de elevación específica si existe
      if (state.elevationLayer) {
        viewer.scene.imageryLayers.remove(state.elevationLayer);
        state.elevationLayer = null;
      }
      
      // Eliminar leyenda de elevación si existe
      const elevationLegend = document.getElementById('elevation-legend');
      if (elevationLegend) {
        elevationLegend.remove();
      }
      
      Renderer3D.removeAllEntities();
      state.activeLayer = null;
      
      // Restaurar apariencia de los botones
      updateUIForActiveLayer(null);
      
      // Vista superior
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-88.9, 13.7, 400000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0
        },
        duration: 1.5
      });
      
      state.terrainEnabled = false;
    } catch (error) {
      console.error("Error al restablecer modo 2D:", error);
      UI.showToast("Error al restaurar modo 2D", "error");
    }
  }

  // Funciones para capas WMS
  function enhanceWMSLayers(configs) {
    const imageryLayers = viewer.scene.imageryLayers;
    
    for (let i = 0; i < imageryLayers.length; i++) {
      const layer = imageryLayers.get(i);
      const config = configs.DEFAULT;
      
      try {
        layer.alpha = config.alpha;
        layer.brightness = config.brightness;
        layer.contrast = config.contrast;
        layer.gamma = config.gamma;
        
        if (layer.imageryProvider) {
          if (typeof layer.clampToGround !== 'undefined') {
            layer.clampToGround = config.clampToGround;
          }
        }
      } catch (error) {
        console.warn(`Error al configurar capa ${i}:`, error);
      }
    }
  }

  // API pública
  return {
    initialize: initializeUI,
    show: {
      departamentos: LayerController.showDepartamentos,
      municipios: LayerController.showMunicipios,
      rios: LayerController.showRios,
      inundaciones: LayerController.showInundaciones,
      vulnerabilidad: LayerController.showVulnerabilidad,
      elevacion: LayerController.showElevacion
    },
    enableMode3D: enableMode3D,
    resetTo2DMode: resetTo2DMode
  };
})();

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Comprobar que las dependencias existan
  if (typeof Cesium !== 'undefined' && typeof viewer !== 'undefined' && typeof CONFIG !== 'undefined') {
    Controls3D.initialize();
  } else {
    console.error('No se han cargado las dependencias necesarias para los controles 3D');
  }
});