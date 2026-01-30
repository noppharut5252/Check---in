
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Loader2, User, Trash2, Download, MapPin, Calendar, Filter, X, Eye, Navigation, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { getCheckInLogs, deleteCheckInLog } from '../../services/api';
import { AppData, CheckInLog } from '../../types';
import ConfirmationModal from '../ConfirmationModal';
import L from 'leaflet';

interface LogsTabProps {
    initialSearchQuery?: string;
    data: AppData;
}

// --- Map Modal Component ---
const MapVerificationModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    log: CheckInLog; 
    targetLocation: { lat: number, lng: number, radius: number } | null 
}> = ({ isOpen, onClose, log, targetLocation }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapObj = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!isOpen || !mapRef.current) return;

        // Cleanup existing map
        if (mapObj.current) {
            mapObj.current.remove();
            mapObj.current = null;
        }

        const userLat = log.UserLat || 0;
        const userLng = log.UserLng || 0;
        const hasUserLoc = userLat !== 0 && userLng !== 0;

        const targetLat = targetLocation?.lat || userLat;
        const targetLng = targetLocation?.lng || userLng;

        const map = L.map(mapRef.current).setView([targetLat, targetLng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'OpenStreetMap'
        }).addTo(map);

        const group = new L.FeatureGroup();

        // 1. Target Location (Circle & Marker)
        if (targetLocation) {
            L.circle([targetLocation.lat, targetLocation.lng], {
                color: 'blue',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                radius: targetLocation.radius
            }).addTo(map).addTo(group);

            L.marker([targetLocation.lat, targetLocation.lng], {
                icon: L.divIcon({
                    className: 'bg-blue-600 rounded-full border-2 border-white shadow-md',
                    iconSize: [12, 12]
                })
            }).bindPopup('จุดเช็คอิน (Target)').addTo(map).addTo(group);
        }

        // 2. User Location
        if (hasUserLoc) {
            L.marker([userLat, userLng], {
                icon: L.divIcon({
                    className: 'bg-red-600 rounded-full border-2 border-white shadow-md animate-pulse',
                    iconSize: [12, 12]
                })
            }).bindPopup(`จุดที่ผู้ใช้อยู่ (${log.UserName})`).addTo(map).addTo(group);

            // Line between points
            if (targetLocation) {
                L.polyline([
                    [userLat, userLng],
                    [targetLocation.lat, targetLocation.lng]
                ], { color: 'red', dashArray: '5, 10', weight: 2 }).addTo(map).addTo(group);
            }
        }

        if (group.getLayers().length > 0) {
            map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }

        mapObj.current = map;

    }, [isOpen, log, targetLocation]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh]">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-blue-600" /> ตรวจสอบพิกัด (Map Verification)
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-6 h-6"/></button>
                </div>
                <div className="flex-1 relative bg-gray-100">
                    <div ref={mapRef} className="absolute inset-0 z-0" />
                    
                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-gray-200 z-10 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-500 text-xs">ผู้เช็คอิน</p>
                                <p className="font-bold">{log.UserName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-500 text-xs">ระยะห่าง</p>
                                <p className={`font-bold ${log.Distance && log.Distance > (targetLocation?.radius || 100) ? 'text-red-600' : 'text-green-600'}`}>
                                    {log.Distance ? `${Math.round(log.Distance)} เมตร` : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LogsTab: React.FC<LogsTabProps> = ({ initialSearchQuery = '', data }) => {
    const [searchLogsQuery, setSearchLogsQuery] = useState(initialSearchQuery);
    const [logs, setLogs] = useState<CheckInLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    
    // Filters
    const [dateFilter, setDateFilter] = useState('');
    const [activityFilter, setActivityFilter] = useState('All');

    // Modals & Actions
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; title: string }>({ isOpen: false, id: '', title: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [mapModal, setMapModal] = useState<{ isOpen: boolean, log: CheckInLog | null }>({ isOpen: false, log: null });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        setIsLoadingLogs(true);
        getCheckInLogs().then(data => {
            setLogs(data);
            setIsLoadingLogs(false);
        });
    }, []);

    useEffect(() => {
        if(initialSearchQuery) setSearchLogsQuery(initialSearchQuery);
    }, [initialSearchQuery]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchLogsQuery, dateFilter, activityFilter]);

    const getImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `https://drive.google.com/thumbnail?id=${url}&sz=w1000`;
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = 
                (log.UserName || '').toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
                (log.ActivityName || '').toLowerCase().includes(searchLogsQuery.toLowerCase()) ||
                (log.LocationName || '').toLowerCase().includes(searchLogsQuery.toLowerCase());
            
            const logDate = new Date(log.Timestamp).toISOString().split('T')[0];
            const matchesDate = !dateFilter || logDate === dateFilter;
            
            const matchesActivity = activityFilter === 'All' || log.ActivityID === activityFilter;

            return matchesSearch && matchesDate && matchesActivity;
        });
    }, [logs, searchLogsQuery, dateFilter, activityFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Stats Logic
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayCount = logs.filter(l => l.Timestamp.startsWith(today)).length;
        const uniqueUsers = new Set(filteredLogs.map(l => l.UserID)).size;
        return { total: filteredLogs.length, today: todayCount, uniqueUsers };
    }, [logs, filteredLogs]);

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        await deleteCheckInLog(deleteModal.id);
        setLogs(prev => prev.filter(l => l.CheckInID !== deleteModal.id));
        setIsDeleting(false);
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleExportCSV = () => {
        const headers = ['Timestamp', 'UserName', 'UserID', 'ActivityName', 'LocationName', 'Distance', 'Comment'];
        const csvContent = [
            headers.join(','),
            ...filteredLogs.map(log => [
                `"${new Date(log.Timestamp).toLocaleString('th-TH')}"`,
                `"${log.UserName}"`,
                `"${log.UserID}"`,
                `"${log.ActivityName}"`,
                `"${log.LocationName}"`,
                log.Distance,
                `"${log.Comment || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `logs_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getTargetLocation = (log: CheckInLog) => {
        // Try to find target lat/lng from location ID
        const loc = data.checkInLocations.find(l => l.LocationID === log.LocationID || l.Name === log.LocationName);
        if (loc) {
            return { lat: parseFloat(loc.Latitude), lng: parseFloat(loc.Longitude), radius: parseFloat(loc.RadiusMeters) || 100 };
        }
        return null;
    };

    return (
        <div className="space-y-6 pb-12">
            
            {/* 1. Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-1">Logs ทั้งหมด</div>
                    <div className="text-2xl font-black text-blue-600">{stats.total}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-1">วันนี้</div>
                    <div className="text-2xl font-black text-green-600">{stats.today}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-1">ผู้ใช้ (Unique)</div>
                    <div className="text-2xl font-black text-purple-600">{stats.uniqueUsers}</div>
                </div>
            </div>

            {/* 2. Filters & Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="ค้นหาชื่อ, กิจกรรม..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchLogsQuery}
                        onChange={(e) => setSearchLogsQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="date"
                            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 outline-none bg-white"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                    
                    <div className="relative w-48 shrink-0">
                        <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <select
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 outline-none bg-white appearance-none cursor-pointer"
                            value={activityFilter}
                            onChange={(e) => setActivityFilter(e.target.value)}
                        >
                            <option value="All">ทุกกิจกรรม</option>
                            {data.checkInActivities.map(a => (
                                <option key={a.ActivityID} value={a.ActivityID}>{a.Name}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleExportCSV}
                        className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 flex items-center font-bold text-sm whitespace-nowrap"
                    >
                        <Download className="w-4 h-4 mr-1" /> CSV
                    </button>
                </div>
            </div>

            {/* 3. Data Display (Responsive) */}
            {isLoadingLogs ? (
                <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-gray-400"/></div>
            ) : filteredLogs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <Search className="w-12 h-12 mx-auto text-gray-300 mb-2"/>
                    <p className="text-gray-500">ไม่พบประวัติการเช็คอิน</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ผู้ใช้งาน</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">กิจกรรม</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">หลักฐาน (Photo)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">พิกัด/เวลา</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedLogs.map((log) => (
                                        <tr key={log.CheckInID} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="shrink-0 h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                                                        {log.UserName?.charAt(0) || <User className="w-4 h-4"/>}
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-bold text-gray-900">{log.UserName}</div>
                                                        <div className="text-xs text-gray-500">{log.UserID}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium">{log.ActivityName}</div>
                                                <div className="text-xs text-gray-500 flex items-center mt-1">
                                                    <MapPin className="w-3 h-3 mr-1" /> {log.LocationName}
                                                </div>
                                                {log.Comment && (
                                                    <div className="text-xs text-gray-500 italic mt-1 bg-gray-50 px-2 py-1 rounded inline-block">"{log.Comment}"</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {log.PhotoURL ? (
                                                    <div 
                                                        className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden cursor-zoom-in hover:opacity-80 transition-opacity"
                                                        onClick={() => setPreviewImage(getImageUrl(log.PhotoURL))}
                                                    >
                                                        <img src={getImageUrl(log.PhotoURL)!} className="w-full h-full object-cover" loading="lazy" />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 flex items-center"><ImageIcon className="w-3 h-3 mr-1"/> No Img</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 font-medium">
                                                    {new Date(log.Timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}
                                                </div>
                                                <div className="text-xs text-gray-500 mb-1">
                                                    {new Date(log.Timestamp).toLocaleDateString('th-TH')}
                                                </div>
                                                {log.UserLat ? (
                                                    <button 
                                                        onClick={() => setMapModal({ isOpen: true, log })}
                                                        className={`text-[10px] px-2 py-0.5 rounded border flex items-center w-fit ${log.Distance && log.Distance > 100 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}
                                                    >
                                                        <Navigation className="w-3 h-3 mr-1" /> {log.Distance ? `${Math.round(log.Distance)}m` : 'Map'}
                                                    </button>
                                                ) : <span className="text-xs text-gray-400">No GPS</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button onClick={() => setDeleteModal({ isOpen: true, id: log.CheckInID, title: `ลบประวัติของ "${log.UserName}"?` })} className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {paginatedLogs.map((log) => (
                            <div key={log.CheckInID} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                            {log.UserName?.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-sm">{log.UserName}</div>
                                            <div className="text-xs text-gray-500 flex items-center">
                                                <Calendar className="w-3 h-3 mr-1"/>
                                                {new Date(log.Timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setDeleteModal({ isOpen: true, id: log.CheckInID, title: 'ลบรายการนี้?' })} className="text-gray-300 hover:text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Content Body */}
                                <div className="pl-13 flex gap-3">
                                    {/* Image Thumbnail */}
                                    {log.PhotoURL && (
                                        <div 
                                            className="w-20 h-20 bg-gray-100 rounded-lg shrink-0 overflow-hidden cursor-zoom-in"
                                            onClick={() => setPreviewImage(getImageUrl(log.PhotoURL))}
                                        >
                                            <img src={getImageUrl(log.PhotoURL)!} className="w-full h-full object-cover" loading="lazy" />
                                        </div>
                                    )}
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800 line-clamp-2">{log.ActivityName}</div>
                                        <div className="text-xs text-gray-500 flex items-center mt-1 truncate">
                                            <MapPin className="w-3 h-3 mr-1"/> {log.LocationName}
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {log.UserLat ? (
                                                <button 
                                                    onClick={() => setMapModal({ isOpen: true, log })}
                                                    className={`text-[10px] px-2 py-1 rounded border flex items-center font-bold ${log.Distance && log.Distance > 100 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}
                                                >
                                                    <Navigation className="w-3 h-3 mr-1" /> {log.Distance ? `${Math.round(log.Distance)}m` : 'Map'}
                                                </button>
                                            ) : null}
                                            {log.Comment && (
                                                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600 italic truncate max-w-[150px]">
                                                    "{log.Comment}"
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-2 mt-6">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm text-gray-600 font-medium px-2">
                                {currentPage} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                title={deleteModal.title}
                description="คุณต้องการลบประวัติการเช็คอินนี้ใช่หรือไม่?"
                confirmLabel="ลบข้อมูล"
                confirmColor="red"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                isLoading={isDeleting}
                actionType="delete"
            />

            {previewImage && (
                <div 
                    className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/40">
                        <X className="w-6 h-6" />
                    </button>
                    <img 
                        src={previewImage} 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}

            {mapModal.isOpen && mapModal.log && (
                <MapVerificationModal 
                    isOpen={mapModal.isOpen} 
                    log={mapModal.log} 
                    targetLocation={getTargetLocation(mapModal.log)}
                    onClose={() => setMapModal({ isOpen: false, log: null })}
                />
            )}
        </div>
    );
};

export default LogsTab;
