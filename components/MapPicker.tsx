
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapPickerProps {
    lat: number;
    lng: number;
    onChange: (lat: number, lng: number) => void;
}

const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, onChange }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapObj = useRef<L.Map | null>(null);
    const markerObj = useRef<L.Marker | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;
        
        if (!mapObj.current) {
            const initialLat = lat || 13.7563;
            const initialLng = lng || 100.5018;
            
            mapObj.current = L.map(mapRef.current).setView([initialLat, initialLng], 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapObj.current);

            markerObj.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapObj.current);
            
            markerObj.current.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng();
                onChange(lat, lng);
            });

            mapObj.current.on('click', (e) => {
                const { lat, lng } = e.latlng;
                if (markerObj.current) markerObj.current.setLatLng([lat, lng]);
                onChange(lat, lng);
            });
            
            // Force resize after mount to prevent grey tiles
            setTimeout(() => { mapObj.current?.invalidateSize(); }, 500);
        }
    }, []);

    // Update marker if props change externally
    useEffect(() => {
        if (markerObj.current && lat && lng) {
            const cur = markerObj.current.getLatLng();
            if (cur.lat !== lat || cur.lng !== lng) {
                markerObj.current.setLatLng([lat, lng]);
                mapObj.current?.setView([lat, lng], mapObj.current.getZoom());
            }
        }
    }, [lat, lng]);

    return <div ref={mapRef} className="w-full h-64 rounded-lg border border-gray-300 z-0" />;
};

export default MapPicker;
