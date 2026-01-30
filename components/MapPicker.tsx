
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, Loader2 } from 'lucide-react';

interface MapPickerProps {
    lat: number;
    lng: number;
    onChange: (lat: number, lng: number) => void;
}

const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, onChange }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapObj = useRef<L.Map | null>(null);
    const markerObj = useRef<L.Marker | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

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
            
            setTimeout(() => { mapObj.current?.invalidateSize(); }, 500);
        }
    }, []);

    useEffect(() => {
        if (markerObj.current && lat && lng) {
            const cur = markerObj.current.getLatLng();
            if (cur.lat !== lat || cur.lng !== lng) {
                markerObj.current.setLatLng([lat, lng]);
                mapObj.current?.setView([lat, lng], mapObj.current.getZoom());
            }
        }
    }, [lat, lng]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                
                if (mapObj.current && markerObj.current) {
                    mapObj.current.setView([newLat, newLng], 16);
                    markerObj.current.setLatLng([newLat, newLng]);
                    onChange(newLat, newLng);
                }
            } else {
                alert('ไม่พบสถานที่');
            }
        } catch (e) {
            console.error(e);
            alert('เกิดข้อผิดพลาดในการค้นหา');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="relative">
            <div className="absolute top-2 left-2 z-[400] bg-white rounded-lg shadow-md flex p-1 w-64 max-w-[80%]">
                <input 
                    type="text" 
                    className="flex-1 px-2 py-1 text-xs outline-none"
                    placeholder="ค้นหาสถานที่ (เช่น Central World)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {isSearching ? <Loader2 className="w-3 h-3 animate-spin"/> : <Search className="w-3 h-3"/>}
                </button>
            </div>
            <div ref={mapRef} className="w-full h-64 rounded-lg border border-gray-300 z-0" />
        </div>
    );
};

export default MapPicker;
