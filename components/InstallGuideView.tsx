
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Monitor, Share, PlusSquare, MoreVertical, Download, Menu, CheckCircle2 } from 'lucide-react';

const InstallGuideView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('ios');

  return (
    <div className="min-h-screen bg-gray-50 font-kanit pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">วิธีการติดตั้งแอป</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* Intro */}
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-lg font-bold mb-2">ติดตั้งไว้ที่หน้าจอหลัก</h2>
                <p className="text-blue-100 text-sm leading-relaxed">
                    เพิ่ม UprightSchool ลงในหน้าจอโฮมของคุณเพื่อการใช้งานที่สะดวก รวดเร็ว และทำงานได้เต็มหน้าจอเหมือนแอปพลิเคชันทั่วไป
                </p>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Download className="w-32 h-32" />
            </div>
        </div>

        {/* Device Tabs */}
        <div className="bg-gray-200 p-1 rounded-xl flex">
            <button 
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'ios' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Smartphone className="w-4 h-4" /> iOS
            </button>
            <button 
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'android' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Smartphone className="w-4 h-4" /> Android
            </button>
            <button 
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'desktop' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Monitor className="w-4 h-4" /> PC
            </button>
        </div>

        {/* Instructions Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* iOS Content */}
            {activeTab === 'ios' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 text-gray-800 font-bold border-b border-gray-100 pb-3">
                        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                        เปิดใน Safari
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 flex flex-col items-center">
                                <div className="h-full w-0.5 bg-gray-200"></div>
                            </div>
                            <div className="flex-1 pb-6">
                                <p className="text-sm text-gray-600 mb-2">แตะที่ไอคอน <span className="font-bold text-gray-800">แชร์ (Share)</span> ด้านล่างของหน้าจอ</p>
                                <div className="bg-gray-100 p-4 rounded-xl flex justify-center">
                                    <Share className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-8 flex flex-col items-center">
                                <div className="h-full w-0.5 bg-gray-200"></div>
                            </div>
                            <div className="flex-1 pb-6">
                                <p className="text-sm text-gray-600 mb-2">เลื่อนลงมาแล้วเลือกเมนู <span className="font-bold text-gray-800">"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</span></p>
                                <div className="bg-gray-100 p-3 rounded-xl flex items-center gap-3">
                                    <div className="bg-gray-300 p-1 rounded text-gray-600"><PlusSquare className="w-5 h-5" /></div>
                                    <span className="text-sm font-medium">Add to Home Screen</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-8 flex flex-col items-center pt-1">
                                <CheckCircle2 className="w-6 h-6 text-green-500 bg-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 mb-2">กดปุ่ม <span className="font-bold text-blue-600">เพิ่ม (Add)</span> มุมขวาบน เป็นอันเสร็จสิ้น</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Android Content */}
            {activeTab === 'android' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 text-gray-800 font-bold border-b border-gray-100 pb-3">
                        <span className="bg-green-100 text-green-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                        เปิดใน Google Chrome
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 flex flex-col items-center">
                                <div className="h-full w-0.5 bg-gray-200"></div>
                            </div>
                            <div className="flex-1 pb-6">
                                <p className="text-sm text-gray-600 mb-2">แตะที่ไอคอน <span className="font-bold text-gray-800">เมนู (3 จุด)</span> มุมขวาบน</p>
                                <div className="bg-gray-100 p-4 rounded-xl flex justify-end">
                                    <MoreVertical className="w-6 h-6 text-gray-600" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-8 flex flex-col items-center">
                                <div className="h-full w-0.5 bg-gray-200"></div>
                            </div>
                            <div className="flex-1 pb-6">
                                <p className="text-sm text-gray-600 mb-2">เลือกเมนู <span className="font-bold text-gray-800">"ติดตั้งแอป" (Install App)</span> หรือ "เพิ่มลงในหน้าจอหลัก"</p>
                                <div className="bg-gray-100 p-3 rounded-xl flex items-center gap-3">
                                    <div className="bg-white p-1 rounded-full text-gray-600 border border-gray-200"><Download className="w-4 h-4" /></div>
                                    <span className="text-sm font-medium">Install App</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-8 flex flex-col items-center pt-1">
                                <CheckCircle2 className="w-6 h-6 text-green-500 bg-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 mb-2">กดยืนยันการติดตั้ง ระบบจะเพิ่มไอคอนไว้ที่หน้าจอ</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Content */}
            {activeTab === 'desktop' && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3 text-gray-800 font-bold border-b border-gray-100 pb-3">
                        <span className="bg-purple-100 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                        Google Chrome / Edge
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 flex flex-col items-center">
                                <div className="h-full w-0.5 bg-gray-200"></div>
                            </div>
                            <div className="flex-1 pb-6">
                                <p className="text-sm text-gray-600 mb-2">มองหาไอคอน <span className="font-bold text-gray-800">ดาวน์โหลด</span> ที่แถบ Address Bar ด้านบนขวา</p>
                                <div className="bg-gray-100 p-3 rounded-xl border border-gray-300 flex items-center justify-between">
                                    <span className="text-gray-400 text-xs bg-white px-2 py-1 rounded border">checkin-app.com</span>
                                    <div className="flex gap-2 text-gray-500">
                                        <Download className="w-5 h-5 text-gray-800 animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-8 flex flex-col items-center pt-1">
                                <CheckCircle2 className="w-6 h-6 text-green-500 bg-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 mb-2">คลิกและกด <span className="font-bold text-blue-600">Install</span> เพื่อติดตั้งลงในเครื่อง</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
        
        {/* Footer Note */}
        <div className="text-center mt-8 px-6">
            <p className="text-xs text-gray-400">
                * การติดตั้งอาจแตกต่างกันไปตามเวอร์ชันของระบบปฏิบัติการ
            </p>
        </div>
      </div>
    </div>
  );
};

export default InstallGuideView;
