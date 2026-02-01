
import React, { useState, useEffect, useRef } from 'react';
import { CheckInLocation } from '../../types';
import { Loader2, Plus, Upload, X, MousePointer2, Save, MapPin, Target, Layers, Building } from 'lucide-react';
import { saveLocation, uploadImage } from '../../services/api';
import { resizeImage } from '../../services/utils';
import MapPicker from '../MapPicker';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: Partial<CheckInLocation>;
    onSuccess: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, initialData, onSuccess }) => {
    const [editLoc, setEditLoc] = useState<Partial<CheckInLocation>>({});
    const [currentLocImages, setCurrentLocImages] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setEditLoc(initialData);
            try {
                if (initialData.Images) {
                    const parsed = JSON.parse(initialData.Images);
                    setCurrentLocImages(Array.isArray(parsed) ? parsed : []);
                } else if (initialData.Image) {
                    setCurrentLocImages([initialData.Image]);
                } else {
                    setCurrentLocImages([]);
                }
            } catch (e) {
                setCurrentLocImages([]);
            }
        }
    }, [isOpen, initialData]);

    const getImageUrl = (idOrUrl: string) => {
        if (!idOrUrl) return '';
        if (idOrUrl.startsWith('http')) return idOrUrl;
        return `https://drive.google.com/thumbnail?id=${idOrUrl}&sz=w1000`;
    };

    const handleSaveLocation = async () => {
        if (!editLoc.Name) return alert('กรุณาระบุชื่อสถานที่');
        if (!editLoc.Latitude || !editLoc.Longitude) return alert('กรุณากำหนดพิกัดบนแผนที่');

        setIsSaving(true);
        const finalLoc = {
            ...editLoc,
            Images: JSON.stringify(currentLocImages),
            Image: currentLocImages.length > 0 ? currentLocImages[0] : ''
        };
        const res = await saveLocation(finalLoc);
        setIsSaving(false);
        if (res.status === 'success') {
            onSuccess();
            onClose();
        } else {
            alert('บันทึกสถานที่ล้มเหลว: ' + (res.message || 'Unknown error'));
        }
    };

    const handleLocationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        try {
            const newImageIds: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const base64 = await resizeImage(file, 800, 600, 0.8);
                const res = await uploadImage(base64, `location_${Date.now()}_${i}.jpg`);
                if (res.status === 'success') newImageIds.push(res.fileId || res.fileUrl);
            }
            setCurrentLocImages(prev => [...prev, ...newImageIds]);
        } catch (err) { console.error(err); alert('Error uploading image'); } 
        finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const handleRemoveLocImage = (indexToRemove: number) => {
        setCurrentLocImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                        {editLoc.LocationID ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-6 h-6 text-gray-400"/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                    {/* Gallery Manager */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">รูปภาพสถานที่ (Gallery)</label>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg flex items-center font-bold hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="w-3 h-3 mr-1" /> เพิ่มรูปภาพ
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {currentLocImages.map((imgId, idx) => (
                                <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100 group shadow-sm">
                                    <img src={getImageUrl(imgId)} className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => handleRemoveLocImage(idx)}
                                        className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-400 group"
                            >
                                {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-blue-500"/> : <Upload className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform"/>}
                                <span className="text-[10px] font-bold">Add Image</span>
                            </div>
                        </div>
                        <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLocationImageUpload} />
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อสถานที่ (Name) *</label>
                            <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="ระบุชื่อสถานที่..." value={editLoc.Name || ''} onChange={e => setEditLoc({...editLoc, Name: e.target.value})} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center"><Layers className="w-3 h-3 mr-1"/> ชั้น (Floor)</label>
                                <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="เช่น ชั้น 1" value={editLoc.Floor || ''} onChange={e => setEditLoc({...editLoc, Floor: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center"><Building className="w-3 h-3 mr-1"/> ห้อง (Room)</label>
                                <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="เช่น ห้อง 201" value={editLoc.Room || ''} onChange={e => setEditLoc({...editLoc, Room: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Map & Coordinates */}
                    <div className="space-y-3 pt-2 border-t border-gray-50">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                                <MousePointer2 className="w-3.5 h-3.5 mr-1.5 text-blue-500"/> 
                                พิกัดสถานที่ (GPS Coordinates)
                            </label>
                            <span className="text-[10px] text-gray-400 italic">เลื่อนหมุดเพื่อปรับตำแหน่ง</span>
                        </div>

                        <MapPicker 
                            lat={parseFloat(editLoc.Latitude || '13.7563')} 
                            lng={parseFloat(editLoc.Longitude || '100.5018')} 
                            radius={parseFloat(editLoc.RadiusMeters || '0')} // Pass radius for live preview
                            onChange={(lat, lng) => setEditLoc({ ...editLoc, Latitude: lat.toFixed(6), Longitude: lng.toFixed(6) })} 
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1">LATITUDE</label>
                                <input className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2 text-xs font-mono" value={editLoc.Latitude || ''} onChange={e => setEditLoc({...editLoc, Latitude: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1">LONGITUDE</label>
                                <input className="w-full border border-gray-300 bg-gray-50 rounded-lg p-2 text-xs font-mono" value={editLoc.Longitude || ''} onChange={e => setEditLoc({...editLoc, Longitude: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-blue-500" />
                                รัศมีเช็คอินที่ยอมรับ (รัศมีเมตร) *
                            </label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="range"
                                    min="10"
                                    max="500"
                                    step="10"
                                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    value={editLoc.RadiusMeters || '100'}
                                    onChange={e => setEditLoc({...editLoc, RadiusMeters: e.target.value})}
                                />
                                <div className="w-20">
                                    <input 
                                        type="number"
                                        className="w-full border border-gray-300 rounded-lg p-2 text-center text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editLoc.RadiusMeters || ''}
                                        onChange={e => setEditLoc({...editLoc, RadiusMeters: e.target.value})}
                                    />
                                </div>
                                <span className="text-xs font-bold text-gray-400">ม.</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">แนะนำ: 50-100 เมตรสำหรับอาคารปกติ</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">คำอธิบาย/จุดสังเกต</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24" 
                            placeholder="เช่น อยู่ข้างตึกอำนวยการ, ใกล้เซเว่น..." 
                            value={editLoc.Description || ''} 
                            onChange={e => setEditLoc({...editLoc, Description: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-bold transition-colors text-sm">ยกเลิก</button>
                    <button 
                        onClick={handleSaveLocation} 
                        disabled={isSaving || isUploading}
                        className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <Save className="w-5 h-5 mr-2"/>} 
                        บันทึกข้อมูล
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationModal;
