import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TmsPreviewDialog = ({ file, onClose }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);

  useEffect(() => {
    if (!file) return;
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }
    // TMS-URL (Backend muss Tiles unter /tms/{file.id}/{z}/{x}/{y}.png bereitstellen)
    const tmsUrl = `/api/tms/${file.id}/{z}/{x}/{y}.png`;
    leafletMap.current = L.map(mapRef.current, {
      center: [47.3769, 8.5417], // Zürich als Default
      zoom: 14,
      minZoom: 0,
      maxZoom: 22,
      crs: L.CRS.EPSG3857,
    });
    L.tileLayer(tmsUrl, {
      tms: true,
      maxZoom: 22,
      attribution: 'TMS Preview',
      errorTileUrl: '',
    }).addTo(leafletMap.current);
    // Optional: Fit to bounds, falls Metadaten vorhanden
    // leafletMap.current.fitBounds([[minLat, minLng], [maxLat, maxLng]]);
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [file]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-3xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 z-10"
        >
          ✕
        </button>
        <h2 className="text-lg font-bold mb-2">TMS Vorschau: {file?.name}</h2>
        <div ref={mapRef} className="w-full h-96 rounded border" />
      </div>
    </div>
  );
};

export default TmsPreviewDialog;
