
import React, { useState, useEffect, useRef } from 'react';
import { AppData, CheckInLog } from '../../types';
import { getCheckInLogs } from '../../services/api';
import { Users, Clock, MapPin, Activity, Zap, Maximize2, Minimize2 } from 'lucide-react';

interface LiveMonitorTabProps {
    data: AppData;
}

const LiveMonitorTab: React.FC<LiveMonitorTabProps> = ({ data }) => {
    const [recentLogs, setRecentLogs] = useState<CheckInLog[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0, activeActivities: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastLogIdRef = useRef<string | null>(null);

    // Fetch loop
    useEffect(() => {
        let isMounted = true;
        const fetchLogs = async () => {
            const resLogs = await getCheckInLogs();
            if (!isMounted) return;
            
            // Calculate Stats
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const todayCount = resLogs.filter((l: any) => new Date(l.Timestamp).getTime() >= todayStart).length;
            const activeCount = data.checkInActivities.filter((a: any) => {
                const s = new Date(a.StartDateTime || '').getTime();
                const e = new Date(a.EndDateTime || '').getTime();
                return (!s || s <= now.getTime()) && (!e || e >= now.getTime());
            }).length;

            setStats({
                total: resLogs.length,
                today: todayCount,
                activeActivities: activeCount
            });

            // Flash effect for new logs
            if (resLogs.length > 0 && lastLogIdRef.current && resLogs[0].CheckInID !== lastLogIdRef.current) {
                // Play sound or flash animation here if desired
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(() => {}); // Ignore auto-play errors
            }
            if (resLogs.length > 0) lastLogIdRef.current = resLogs[0].CheckInID;

            setRecentLogs(resLogs.slice(0, 10)); // Top 10 recent
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 5000); // Poll every 5 sec
        return () => { clearInterval(interval); isMounted = false; };
    }, [data.checkInActivities]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div ref={containerRef} className={`bg-slate-900 text-white p-6 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'min-h-[600px]'}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute top-0 right-0"></div>
                        <Activity className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-wider">LIVE MONITOR</h2>
                        <p className="text-slate-400 text-xs font-mono">REAL-TIME CHECK-IN SYSTEM</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-3xl font-black text-green-400 font-mono">{new Date().toLocaleTimeString('th-TH')}</div>
                        <div className="text-slate-500 text-sm">{new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}</div>
                    </div>
                    <button onClick={toggleFullscreen} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300">
                        {isFullscreen ? <Minimize2 /> : <Maximize2 />}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm uppercase font-bold mb-1">Check-ins (Total)</p>
                        <div className="text-4xl font-black text-blue-400">{stats.total.toLocaleString()}</div>
                    </div>
                    <Users className="w-10 h-10 text-slate-600" />
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm uppercase font-bold mb-1">Today's Check-ins</p>
                        <div className="text-4xl font-black text-green-400">{stats.today.toLocaleString()}</div>
                    </div>
                    <Zap className="w-10 h-10 text-slate-600" />
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 backdrop-blur flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm uppercase font-bold mb-1">Active Activities</p>
                        <div className="text-4xl font-black text-purple-400">{stats.activeActivities}</div>
                    </div>
                    <Activity className="w-10 h-10 text-slate-600" />
                </div>
            </div>

            {/* Live Feed */}
            <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-800/80 border-b border-slate-700 font-bold text-slate-300 flex justify-between">
                    <span>Recent Activity Feed</span>
                    <span className="flex items-center text-xs text-green-400"><span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span> Live Updating</span>
                </div>
                <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {recentLogs.map((log, idx) => (
                        <div key={log.CheckInID} className={`flex items-center p-4 rounded-lg border border-slate-700/50 ${idx === 0 ? 'bg-blue-500/10 border-blue-500/50 animate-in slide-in-from-top-5' : 'bg-slate-800/40'}`}>
                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 mr-4 border border-slate-600 shrink-0">
                                {log.PhotoURL ? <img src={log.PhotoURL} className="w-full h-full rounded-full object-cover"/> : <Users className="w-6 h-6"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-white text-lg truncate">{log.UserName}</h4>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">{new Date(log.Timestamp).toLocaleTimeString('th-TH')}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                    <span className="flex items-center text-blue-300 truncate"><Activity className="w-3 h-3 mr-1"/> {log.ActivityName}</span>
                                    <span className="flex items-center truncate"><MapPin className="w-3 h-3 mr-1"/> {log.LocationName}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {recentLogs.length === 0 && (
                        <div className="text-center py-20 text-slate-500">Waiting for incoming data...</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveMonitorTab;
