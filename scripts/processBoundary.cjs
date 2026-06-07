// Script to process Taiwan GeoJSON and create inverted mask
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/data/taiwan_raw.geojson');
const outputPath = path.join(__dirname, '../src/data/taiwanBoundary.json');

const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// World bounding box (covers the entire map)
const worldBounds = [
  [-180, -90],
  [-180, 90],
  [180, 90],
  [180, -90],
  [-180, -90]
];

// Extract all polygon coordinates from all features
const taiwanPolygons = [];

rawData.features.forEach(feature => {
  if (feature.geometry.type === 'MultiPolygon') {
    feature.geometry.coordinates.forEach(polygon => {
      // Each polygon is an array of rings (outer ring + holes)
      // We only need the outer ring (first element)
      const outerRing = polygon[0];
      if (outerRing && outerRing.length > 3) {
        taiwanPolygons.push(outerRing);
      }
    });
  } else if (feature.geometry.type === 'Polygon') {
    const outerRing = feature.geometry.coordinates[0];
    if (outerRing && outerRing.length > 3) {
      taiwanPolygons.push(outerRing);
    }
  }
});

console.log(`Extracted ${taiwanPolygons.length} polygons from Taiwan GeoJSON`);

// Create the inverted mask GeoJSON
// The mask is a Polygon with the world as the outer ring and Taiwan regions as holes
const invertedMask = {
  type: "Feature",
  properties: {
    name: "Taiwan Inverted Mask"
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      worldBounds,  // Outer ring (world)
      ...taiwanPolygons  // Inner rings (holes for Taiwan)
    ]
  }
};

// Also create Taiwan outline for the border
const taiwanOutline = {
  type: "FeatureCollection",
  features: taiwanPolygons.map((coords, i) => ({
    type: "Feature",
    properties: { id: i },
    geometry: {
      type: "Polygon",
      coordinates: [coords]
    }
  }))
};

const output = {
  mask: invertedMask,
  outline: taiwanOutline
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Created taiwanBoundary.json with mask and outline`);
