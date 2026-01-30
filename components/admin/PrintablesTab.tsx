
import React, { useState } from 'react';
import { AppData, CheckInActivity } from '../../types';
import { Printer, FileText, MapPin, QrCode, Download, Loader2 } from 'lucide-react';
import { generatePosterHTML } from '../../services/printUtils';

// Declare html2pdf
declare var html2pdf: any;

interface PrintablesTabProps {
    data: AppData;
}

const PrintablesTab: React.FC<PrintablesTabProps> = ({ data }) => {
    const [posterNote, setPosterNote] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const getActivitiesToPrint = (activityId: string | 'all', locationId?: string) => {
        if (activityId === 'all') {
            return locationId 
                ? data.checkInActivities.filter(a => a.LocationID === locationId)
                : data.checkInActivities;
        } else {
            const act = data.checkInActivities.find(a => a.ActivityID === activityId);
            return act ? [act] : [];
        }
    };

    const handlePrintPoster = async (activityId: string | 'all', locationId?: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert('Pop-up Blocked'); return; }
        const activities = getActivitiesToPrint(activityId, locationId);
        if (activities.length === 0) { printWindow.close(); alert('ไม่มีกิจกรรมที่จะพิมพ์'); return; }
        
        const html = await generatePosterHTML(activities, data.checkInLocations, posterNote);
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleDownloadPDF = async (activityId: string | 'all', locationId?: string) => {
        const activities = getActivitiesToPrint(activityId, locationId);
        if (activities.length === 0) { alert('ไม่มีกิจกรรมที่จะดาวน์โหลด'); return; }
        setIsGenerating(true);
        try {
            const html = await generatePosterHTML(activities, data.checkInLocations, posterNote);
            const element = document.createElement('div');
            element.innerHTML = html;
            const noPrint = element.querySelector('.no-print');
            if (noPrint) noPrint.remove();
            const opt = { margin: 0, filename: `checkin_posters_${Date.now()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            await html2pdf().set(opt).from(element).save();
        } catch (e) { console.error(e); alert('เกิดข้อผิดพลาดในการสร้าง PDF'); } finally { setIsGenerating(false); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
                <div className="flex items-center mb-3">
                    <Printer className="w-6 h-6 mr-3" />
                    <div>
                        <h3 className="font-bold">พิมพ์ป้าย QR Code (Print Posters)</h3>
                        <p className="text-xs mt-1">เลือกพิมพ์ป้ายเพื่อนำไปติดที่จุดเช็คอิน หรือดาวน์โหลดเป็น PDF</p>
                    </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <label className="text-xs font-bold text-gray-500 mb-1 flex items-center">
                        <FileText className="w-3 h-3 mr-1" /> ข้อความเพิ่มเติมในป้าย (Optional)
                    </label>
                    <input 
                        type="text"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="เช่น รหัส Wi-Fi, ชั้น 2, ห้อง 301"
                        value={posterNote}
                        onChange={(e) => setPosterNote(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {data.checkInLocations.map(loc => {
                    const acts = data.checkInActivities.filter(a => a.LocationID === loc.LocationID);
                    if (acts.length === 0) return null;

                    return (
                        <div key={loc.LocationID} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2 justify-between items-center">
                                <h3 className="font-bold text-gray-700 flex items-center">
                                    <MapPin className="w-4 h-4 mr-2" /> {loc.Name}
                                </h3>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleDownloadPDF('all', loc.LocationID)}
                                        className="text-xs bg-white border border-green-600 text-green-600 px-3 py-1.5 rounded-lg flex items-center hover:bg-green-50"
                                    >
                                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <Download className="w-3 h-3 mr-1" />} PDF
                                    </button>
                                    <button 
                                        onClick={() => handlePrintPoster('all', loc.LocationID)}
                                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center hover:bg-blue-700"
                                    >
                                        <Printer className="w-3 h-3 mr-1" /> พิมพ์ทั้งหมด
                                    </button>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {acts.map(act => (
                                    <div key={act.ActivityID} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                                        <div className="flex items-center">
                                            <QrCode className="w-5 h-5 text-gray-400 mr-3" />
                                            <span className="text-sm font-medium text-gray-700">{act.Name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleDownloadPDF(act.ActivityID)}
                                                className="text-gray-400 hover:text-green-600 p-2"
                                                title="ดาวน์โหลด PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handlePrintPoster(act.ActivityID)}
                                                className="text-gray-400 hover:text-blue-600 p-2"
                                                title="พิมพ์เฉพาะรายการนี้"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default PrintablesTab;
