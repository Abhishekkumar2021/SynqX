import proj4 from 'proj4';

/**
 * Synqx OSDU Spatial Utility - Enhanced Robustness
 * Standardized logic for extracting, normalizing, and calculating 
 * geospatial data from OSDU technical records.
 */

// Configure standard Proj4 definitions
proj4.defs('EPSG:4326', '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');

export interface SpatialDataResult {
  geoJSON: any | null;
  point: { lon: number; lat: number } | null;
  isShape: boolean;
  source: string;
  geometryType: string;
  nodeCount: number;
  warnings?: string[];
}

/**
 * Normalizes a longitude to the -180 to 180 range.
 */
export const normalizeLongitude = (lon: number): number => {
  if (!isFinite(lon)) return 0;
  let normalized = lon % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
};

/**
 * Validates if a coordinate pair is likely geographic (WGS84) vs Projected.
 */
export const isWGS84 = (lon: number, lat: number): boolean => {
  if (!isFinite(lon) || !isFinite(lat)) return false;
  
  const validLon = (lon >= -180 && lon <= 180) || (lon > 180 && lon <= 360);
  const validLat = lat >= -90 && lat <= 90;
  
  return (
    validLon && 
    validLat && 
    (Math.abs(lon) > 0.00001 || Math.abs(lat) > 0.00001)
  );
};

/**
 * Safely parses JSON with fallback to raw string
 */
const safeJSONParse = (str: any): any => {
  if (!str) return null;
  if (typeof str === 'object') return str;
  if (typeof str !== 'string') return null;
  
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

/**
 * Attempts to extract a Proj4-compatible definition from OSDU persistableReferenceCrs.
 */
const getProj4Definition = (crsString: any): string | null => {
  if (!crsString) return null;
  
  try {
    // Handle both string and object CRS definitions
    const crs = typeof crsString === 'string' ? safeJSONParse(crsString) : crsString;
    
    if (!crs) {
      // Check if it's a raw WKT string
      if (typeof crsString === 'string' && 
          (crsString.startsWith('PROJCS') || crsString.startsWith('GEOGCS'))) {
        return crsString;
      }
      // Check for simple EPSG format
      if (typeof crsString === 'string' && crsString.match(/^EPSG:\d+$/)) {
        return crsString;
      }
      return null;
    }

    // 1. Check for explicit WKT (multiple possible locations)
    const wkt = crs.wkt || 
                crs.lateBoundCRS?.wkt || 
                crs.singleCT?.wkt ||
                crs.projectedCRS?.wkt ||
                crs.geographicCRS?.wkt;
    if (wkt) return wkt;

    // 2. Check for AuthCode (EPSG) in various locations
    const authCode = crs.authCode || 
                     crs.lateBoundCRS?.authCode ||
                     crs.projectedCRS?.authCode ||
                     crs.geographicCRS?.authCode ||
                     crs.authority;
    
    if (authCode) {
      // Handle both {auth: 'EPSG', code: '4326'} and {name: 'EPSG', code: 4326}
      const auth = authCode.auth || authCode.authority || authCode.name;
      const code = authCode.code || authCode.codeSpace;
      
      if ((auth === 'EPSG' || auth === 'epsg') && code) {
        return `EPSG:${code}`;
      }
    }

    // 3. Check for name-based CRS
    if (crs.name && typeof crs.name === 'string') {
      if (crs.name.match(/EPSG:\d+/)) {
        return crs.name;
      }
      if (crs.name.match(/WGS.*84/i)) {
        return 'EPSG:4326';
      }
    }
  } catch (e) {
    console.warn('Failed to parse CRS definition', e);
  }
  return null;
};

/**
 * Normalizes all coordinates within a GeoJSON structure.
 * Optionally reprojects from a source CRS to WGS84.
 */
export const normalizeGeoJSON = (
  geoJSON: any, 
  sourceCRSDef?: string | null,
  warnings: string[] = []
): any => {
  if (!geoJSON) return null;

  const reproject = sourceCRSDef && sourceCRSDef !== 'EPSG:4326';
  let reprojectionFailed = false;
  
  const processArray = (arr: any[]): any[] => {
    if (!Array.isArray(arr)) return arr;
    
    if (typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      let [lon, lat] = arr;
      
      // Validate coordinates are finite
      if (!isFinite(lon) || !isFinite(lat)) {
        warnings.push(`Invalid coordinate encountered: [${lon}, ${lat}]`);
        return [0, 0, ...arr.slice(2)];
      }
      
      if (reproject && !reprojectionFailed) {
        try {
          [lon, lat] = proj4(sourceCRSDef!, 'EPSG:4326', [lon, lat]);
        } catch (e) {
          reprojectionFailed = true;
          warnings.push(`Reprojection failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
      
      return [normalizeLongitude(lon), lat, ...arr.slice(2)];
    }
    return arr.map(processArray);
  };

  const processFeature = (f: any) => {
    if (!f) return null;
    
    return {
      ...f,
      type: f.type?.replace('AnyCrs', '').replace('anycrs', '') || 'Feature',
      geometry: f.geometry ? {
        ...f.geometry,
        type: f.geometry.type?.replace('AnyCrs', '').replace('anycrs', ''),
        coordinates: f.geometry.coordinates ? processArray(f.geometry.coordinates) : undefined
      } : null
    };
  };

  try {
    if (geoJSON.type?.toLowerCase().includes('featurecollection')) {
      return { 
        type: 'FeatureCollection', 
        features: (geoJSON.features || []).map(processFeature).filter(Boolean)
      };
    }
    if (geoJSON.type?.toLowerCase().includes('feature')) {
      return processFeature(geoJSON);
    }
    if (geoJSON.coordinates) {
      const type = geoJSON.type?.replace('AnyCrs', '').replace('anycrs', '');
      return { 
        type, 
        coordinates: processArray(geoJSON.coordinates) 
      };
    }
  } catch (e) {
    warnings.push(`GeoJSON normalization error: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
  
  return geoJSON;
};

/**
 * Recursively finds the first valid Lon/Lat pair in nested GeoJSON coordinate arrays.
 */
export const findFirstCoordinatePair = (coords: any): [number, number] | null => {
  if (!coords || !Array.isArray(coords)) return null;
  
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    if (isFinite(coords[0]) && isFinite(coords[1])) {
      return [normalizeLongitude(coords[0]), coords[1]];
    }
    return null;
  }
  
  for (const item of coords) {
    const pair = findFirstCoordinatePair(item);
    if (pair) return pair;
  }
  return null;
};

/**
 * Recursively searches for spatial data in nested objects
 */
const findSpatialInObject = (obj: any, path: string[] = []): { data: any; path: string } | null => {
  if (!obj || typeof obj !== 'object') return null;
  
  // Check common spatial property names
  const spatialKeys = [
    'spatial', 'Spatial', 'geometry', 'Geometry', 'coordinates', 'Coordinates',
    'location', 'Location', 'wgs84', 'Wgs84', 'geoJSON', 'GeoJSON'
  ];
  
  for (const key of spatialKeys) {
    if (obj[key] && typeof obj[key] === 'object') {
      if (obj[key].coordinates || obj[key].features || obj[key].type) {
        return { data: obj[key], path: [...path, key].join('.') };
      }
    }
  }
  
  // Recursively search nested objects (limit depth to avoid infinite loops)
  if (path.length < 5) {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        const result = findSpatialInObject(value, [...path, key]);
        if (result) return result;
      }
    }
  }
  
  return null;
};

/**
 * Scans an OSDU record for valid spatial metadata blocks and reprojects if necessary.
 */
export const extractOSDUSpatialData = (record: any): SpatialDataResult | null => {
  if (!record) return null;
  
  const warnings: string[] = [];
  const data = record.details?.data || record.data || record;
  let source = 'Unknown';
  let rawSpatialBlock = null;
  let crsDef: string | null = null;

  // 1. Check Priority Blocks (expanded list)
  const spatialSources = [
    { 
      check: () => record.spatial, 
      name: 'Engine Pre-calculated',
      getCrs: () => null // Usually already in WGS84
    },
    {
      check: () => data.SpatialLocation?.Wgs84Coordinates,
      name: 'Standard OSDU (SpatialLocation)',
      getCrs: () => data.SpatialLocation?.Wgs84Coordinates?.persistableReferenceCrs
    },
    {
      check: () => data.SpatialLocation?.AsIngestedCoordinates,
      name: 'As-Ingested (SpatialLocation)',
      getCrs: () => data.SpatialLocation?.AsIngestedCoordinates?.persistableReferenceCrs
    },
    {
      check: () => data.SpatialArea?.Wgs84Coordinates,
      name: 'OSDU Seismic Area',
      getCrs: () => data.SpatialArea?.Wgs84Coordinates?.persistableReferenceCrs
    },
    {
      check: () => data.SpatialArea?.AsIngestedCoordinates,
      name: 'As-Ingested Area',
      getCrs: () => data.SpatialArea?.AsIngestedCoordinates?.persistableReferenceCrs
    },
    {
      check: () => data.ABCDBinGridSpatialLocation?.Wgs84Coordinates,
      name: 'OSDU BinGrid Location',
      getCrs: () => data.ABCDBinGridSpatialLocation?.Wgs84Coordinates?.persistableReferenceCrs
    },
    {
      check: () => data.SpatialPoint?.Wgs84Coordinates,
      name: 'OSDU Spatial Point',
      getCrs: () => data.SpatialPoint?.Wgs84Coordinates?.persistableReferenceCrs
    },
    {
      check: () => data.SpatialPoint?.AsIngestedCoordinates,
      name: 'As-Ingested Point',
      getCrs: () => data.SpatialPoint?.AsIngestedCoordinates?.persistableReferenceCrs
    },
    {
      check: () => data.ExtensionProperties?.slb?.locationWGS84,
      name: 'SLB Domain Extension',
      getCrs: () => null
    },
    {
      check: () => data.ExtensionProperties?.spatial,
      name: 'Extension Spatial',
      getCrs: () => data.ExtensionProperties?.spatial?.persistableReferenceCrs
    },
    {
      check: () => data.GeoLocation,
      name: 'GeoLocation',
      getCrs: () => data.GeoLocation?.persistableReferenceCrs
    },
    {
      check: () => data.GeographicLocation,
      name: 'GeographicLocation',
      getCrs: () => data.GeographicLocation?.persistableReferenceCrs
    }
  ];

  // Try each source in order
  for (const src of spatialSources) {
    const result = src.check();
    if (result) {
      rawSpatialBlock = result;
      source = src.name;
      crsDef = getProj4Definition(src.getCrs());
      break;
    }
  }

  // 2. If no standard location found, do deep search
  if (!rawSpatialBlock) {
    const deepSearch = findSpatialInObject(data);
    if (deepSearch) {
      rawSpatialBlock = deepSearch.data;
      source = `Deep Search (${deepSearch.path})`;
      crsDef = getProj4Definition(rawSpatialBlock.persistableReferenceCrs);
      warnings.push(`Spatial data found via deep search at: ${deepSearch.path}`);
    }
  }

  if (!rawSpatialBlock) {
    warnings.push('No spatial data found in record');
    return null;
  }

  // 3. Perform Normalization & Reprojection
  const normalizedGeoJSON = normalizeGeoJSON(rawSpatialBlock, crsDef, warnings);
  if (!normalizedGeoJSON) {
    warnings.push('Failed to normalize GeoJSON');
    return null;
  }

  // 4. Extract first coordinate for centering
  const features = normalizedGeoJSON.features || 
                   (normalizedGeoJSON.type === 'Feature' ? [normalizedGeoJSON] : []);
  
  if (features.length === 0 && !normalizedGeoJSON.coordinates) {
    warnings.push('No features or coordinates found in normalized GeoJSON');
    return null;
  }

  const firstCoord = findFirstCoordinatePair(
    features[0]?.geometry?.coordinates || normalizedGeoJSON.coordinates
  );
  
  // Final validation - even after reprojection, we must have geographic numbers
  if (!firstCoord || !isWGS84(firstCoord[0], firstCoord[1])) {
    warnings.push(`Invalid coordinates after processing: ${firstCoord ? `[${firstCoord[0]}, ${firstCoord[1]}]` : 'null'}`);
    return null;
  }

  const isShape = features.some((f: any) => 
    ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(
      f.geometry?.type || f.type
    )
  ) || ['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(
    normalizedGeoJSON.type
  );

  const nodeCount = features.reduce((acc: number, f: any) => {
    const c = f.geometry?.coordinates || f.coordinates;
    if (!c) return acc;
    try {
      return acc + (Array.isArray(c[0]) ? c.flat(Infinity).filter((x: any) => typeof x === 'number').length / 2 : 1);
    } catch {
      return acc;
    }
  }, 0);

  const geoType = features.length > 1 
    ? `Multi-Feature (${features.length})` 
    : (features[0]?.geometry?.type || normalizedGeoJSON.type || 'Unknown');

  return {
    geoJSON: normalizedGeoJSON,
    point: { lon: firstCoord[0], lat: firstCoord[1] },
    isShape,
    source: crsDef ? `${source} (Reprojected from ${crsDef})` : source,
    geometryType: geoType,
    nodeCount,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

/**
 * Calculates the bounding box and center of a GeoJSON object.
 */
export const calculateGeoContext = (geoJSON: any) => {
  if (!geoJSON) return null;
  
  try {
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    let found = false;

    const processCoords = (coords: any[]) => {
      if (!Array.isArray(coords)) return;
      
      if (Array.isArray(coords[0])) {
        coords.forEach(processCoords);
      } else if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        if (!isFinite(coords[0]) || !isFinite(coords[1])) return;
        
        const lon = coords[0]; // Already normalized by normalizeGeoJSON
        const lat = coords[1];
        
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        found = true;
      }
    };

    const features = geoJSON.features || 
                     (geoJSON.type === 'Feature' ? [geoJSON] : 
                      geoJSON.coordinates ? [geoJSON] : []);
    
    features.forEach((f: any) => {
      if (f.geometry?.coordinates) processCoords(f.geometry.coordinates);
      else if (f.coordinates) processCoords(f.coordinates);
    });

    if (found && isFinite(minLat) && isFinite(maxLat) && isFinite(minLon) && isFinite(maxLon)) {
      return {
        centerLat: (minLat + maxLat) / 2,
        centerLon: (minLon + maxLon) / 2,
        bounds: [minLon, minLat, maxLon, maxLat] as [number, number, number, number],
        hasShape: (maxLat - minLat > 0.0001 || maxLon - minLon > 0.0001)
      };
    }
  } catch (e) {
    console.error('Failed to calculate GeoJSON context', e);
  }
  return null;
};