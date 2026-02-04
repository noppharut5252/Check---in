
import React, { useState, useMemo, useEffect } from 'react';
import { AppData, User, CheckInLog } from '../types';
import { getCheckInLogs } from '../services/api';
import { 
    BrainCircuit, Copy, FileText, Check, Sparkles, MessageSquare, 
    BarChart3, TrendingUp, Filter, Users, MapPin, Loader2, School, 
    Zap, Target, Clock, ArrowUpRight
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

interface SummaryGeneratorProps {
  data: AppData;
  user?: User | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ data, user }) => {
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'time' | 'schools' | 'prompts'>('overview');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // 1. Fetch Data (Client Side Aggregation for Privacy/Performance Balance)
  useEffect(() => {
      const fetchData = async () => {
          setLoading(true);
          try {
              // Try to fetch real logs if possible (Admin/User permissions handled by API)
              // If failed or restricted, we might fallback to aggregated data in `data.checkInActivities`
              const res = await getCheckInLogs();
              if (res) setLogs(res);
          } catch (e) {
              console.warn("Could not fetch detailed logs, using basic stats");
          } finally {
              setLoading(false);
          }
      };
      fetchData();
  }, []);

  // --- Analytics Processing ---

  // 1. Overview Stats
  const overviewStats = useMemo(() => {
      // If we have logs, use them. If not, sum up current counts from activities
      const totalCheckIns = logs.length > 0 
          ? logs.length 
          : data.checkInActivities.reduce((acc, curr) => acc + (curr.CurrentCount || 0), 0);
      
      const uniqueUsers = logs.length > 0 
          ? new Set(logs.map(l => l.UserID)).size 
          : 0; // Can't know unique without logs

      const topActivities = [...data.checkInActivities]
          .sort((a, b) => (b.CurrentCount || 0) - (a.CurrentCount || 0))
          .slice(0, 5)
          .map(a => ({ name: a.Name, value: a.CurrentCount || 0 }));

      return { totalCheckIns, uniqueUsers, topActivities };
  }, [logs, data.checkInActivities]);

  // 2. Time Analysis (Hourly)
  const timeData = useMemo(() => {
      if (logs.length === 0) return [];
      const hourCounts: Record<string, number> = {};
      logs.forEach(log => {
          const hour = new Date(log.Timestamp).getHours();
          const label = `${String(hour).padStart(2, '0')}:00`;
          hourCounts[label] = (hourCounts[label] || 0) + 1;
      });
      return Object.entries(hourCounts)
          .map(([time, count]) => ({ time, count }))
          .sort((a, b) => a.time.localeCompare(b.time));
  }, [logs]);

  // 3. School Participation
  const schoolData = useMemo(() => {
      if (logs.length === 0) return [];
      const schoolCounts: Record<string, Set<string>> = {}; // School -> Set of UserIDs
      
      logs.forEach(log => {
          // Find user to get school
          // Optimization: Create a user map first if large data
          // Here we assume `logs` might contain enriched data or we join with `getAllUsers` (not available in props easily)
          // Fallback: Check if log has UserName, but school is harder. 
          // Let's use the `user` prop if available, or try to infer from data if we had user list.
          // Since we don't have full user list here easily without fetching, we might simulate or skip if no logs.
          // UPDATE: `CheckInLog` doesn't have SchoolID. We need to fetch users or use `data.schools`.
          // For now, let's group by "Activity Category" as a proxy for interest if School is unavailable in logs.
          // Actually, let's map ActivityID back to Activity Category for a "Interest" chart.
          // OR: If we really want Schools, we need to fetch all users. Let's do Activity Category for robustness.
      });

      // Alternative: Most Active Categories
      const catCounts: Record<string, number> = {};
      data.checkInActivities.forEach(act => {
          const cat = act.Category || 'General';
          catCounts[cat] = (catCounts[cat] || 0) + (act.CurrentCount || 0);
      });
      
      return Object.entries(catCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
  }, [logs, data.checkInActivities]);

  // 4. Location Hotspots
  const locationData = useMemo(() => {
      const locCounts: Record<string, number> = {};
      data.checkInActivities.forEach(act => {
          const locName = data.checkInLocations.find(l => l.LocationID === act.LocationID)?.Name || 'Unknown';
          locCounts[locName] = (locCounts[locName] || 0) + (act.CurrentCount || 0);
      });
      return Object.entries(locCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
  }, [data.checkInActivities, data.checkInLocations]);

  // --- Prompts Generation ---
  const generatePrompt = (type: 'summary' | 'school' | 'traffic') => {
      const today = new Date().toLocaleDateString('th-TH');
      let text = `ข้อมูลสรุปกิจกรรมประจำวันที่ ${today}\n`;
      text += `ยอดเช็คอินรวม: ${overviewStats.totalCheckIns} ครั้ง\n`;
      
      if (type === 'summary') {
          text += `\nไฮไลท์สำคัญ:\n`;
          text += `- กิจกรรมยอดนิยม 3 อันดับแรก: ${overviewStats.topActivities.slice(0,3).map(a => `${a.name} (${a.value})`).join(', ')}\n`;
          text += `- หมวดหมู่ที่ได้รับความสนใจสูงสุด: ${schoolData.length > 0 ? schoolData[0].name : '-'}\n`;
          text += `\nคำสั่ง AI: "เขียนข่าวประชาสัมพันธ์สรุปความสำเร็จของงาน โดยเน้นตัวเลขผู้เข้าร่วมและความหลากหลายของกิจกรรม"\n`;
      } else if (type === 'traffic') {
          text += `\nช่วงเวลาที่มีคนหนาแน่น (Peak Time): `;
          if (timeData.length > 0) {
              const peak = [...timeData].sort((a,b) => b.count - a.count)[0];
              text += `${peak.time} น. (${peak.count} คน)\n`;
          } else {
              text += `ยังไม่มีข้อมูลเพียงพอ\n`;
          }
          text += `\nโซนยอดนิยม (Hotspots): ${locationData.slice(0,3).map(l => `${l.name}`).join(', ')}\n`;
          text += `\nคำสั่ง AI: "วิเคราะห์พฤติกรรมการเดินชมงานของผู้เข้าร่วม เพื่อเสนอแนะการจัดการจราจรในปีถัดไป"\n`;
      } else if (type === 'school') {
          // Since we use Categories as proxy for now
          text += `\nความสนใจแยกตามหมวดหมู่:\n`;
          schoolData.forEach((s, i) => text += `${i+1}. ${s.name}: ${s.count}\n`);
          text += `\nคำสั่ง AI: "เขียนรายงานสรุปความสนใจของผู้เข้าร่วมงาน ว่าเน้นไปทางด้านวิชาการใดมากที่สุด"\n`;
      }
      return text;
  };

  const copyToClipboard = (text: string, key: string) => {
      navigator.clipboard.writeText(text);
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 2000);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          return (
              <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-xl text-xs">
                  <p className="font-bold text-gray-700 mb-1">{label}</p>
                  <p className="text-blue-600 font-bold">
                      {payload[0].value.toLocaleString()} check-ins
                  </p>
              </div>
          );
      }
      return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold flex items-center">
                    <BarChart3 className="w-8 h-8 mr-3 text-yellow-300" />
                    Check-in Analytics Dashboard
                </h2>
                <p className="text-indigo-100 text-sm mt-1 max-w-xl">
                    ระบบวิเคราะห์ข้อมูลการเช็คอินแบบ Real-time เพื่อติดตามความสนใจและประเมินผลกิจกรรม
                </p>
            </div>
            
            <div className="flex bg-white/20 p-1 rounded-xl backdrop-blur-md">
               {['overview', 'time', 'schools', 'prompts'].map((t) => (
                   <button
                       key={t}
                       onClick={() => setTab(t as any)}
                       className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${tab === t ? 'bg-white text-indigo-600 shadow' : 'text-white/80 hover:bg-white/10'}`}
                   >
                       {t}
                   </button>
               ))}
            </div>
        </div>

        {/* Tab Content */}
        {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
                <p>กำลังประมวลผลข้อมูล...</p>
            </div>
        ) : (
            <>
                {/* 1. Overview */}
                {tab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-3"><Target className="w-8 h-8"/></div>
                            <h3 className="text-3xl font-black text-gray-800">{overviewStats.totalCheckIns.toLocaleString()}</h3>
                            <p className="text-sm text-gray-500">Total Check-ins</p>
                        </div>
                        {overviewStats.uniqueUsers > 0 && (
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-full mb-3"><Users className="w-8 h-8"/></div>
                                <h3 className="text-3xl font-black text-gray-800">{overviewStats.uniqueUsers.toLocaleString()}</h3>
                                <p className="text-sm text-gray-500">Active Users</p>
                            </div>
                        )}
                        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-700 mb-4 flex items-center"><Zap className="w-5 h-5 mr-2 text-yellow-500"/> Top 5 Activities</h4>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={overviewStats.topActivities} layout="vertical" margin={{left: 0}}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                        <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                                        <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                            {overviewStats.topActivities.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Time Analysis */}
                {tab === 'time' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center">
                                <Clock className="w-6 h-6 mr-2 text-blue-500"/> Time & Traffic Analysis
                            </h3>
                            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Real-time Data</div>
                        </div>
                        
                        {timeData.length > 0 ? (
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" />
                                        <YAxis />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                                <Clock className="w-12 h-12 mb-2 opacity-20"/>
                                <p>ยังไม่มีข้อมูลเพียงพอสำหรับกราฟเวลา</p>
                            </div>
                        )}
                        <p className="text-center text-xs text-gray-400 mt-4">กราฟแสดงจำนวนการเช็คอินในแต่ละช่วงเวลาของวัน</p>
                    </div>
                )}

                {/* 3. Schools & Categories */}
                {tab === 'schools' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center">
                                <School className="w-6 h-6 mr-2 text-indigo-500"/> Category Interest
                            </h3>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={schoolData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="count"
                                        >
                                            {schoolData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center">
                                <MapPin className="w-6 h-6 mr-2 text-red-500"/> Location Hotspots
                            </h3>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={locationData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                        <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                                        <Bar dataKey="count" fill="#FF8042" radius={[0, 4, 4, 0]}>
                                            {locationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. AI Prompts */}
                {tab === 'prompts' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { id: 'summary', title: 'สรุปภาพรวม (Overview)', icon: FileText, color: 'blue' },
                            { id: 'traffic', title: 'วิเคราะห์คนเข้างาน (Traffic)', icon: TrendingUp, color: 'green' },
                            { id: 'school', title: 'ความสนใจ (Interests)', icon: BrainCircuit, color: 'purple' }
                        ].map((item) => (
                            <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 transition-all group">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${item.color}-100 text-${item.color}-600`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
                                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500 font-mono mb-4 h-32 overflow-y-auto border border-gray-200 custom-scrollbar">
                                    {generatePrompt(item.id as any)}
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(generatePrompt(item.id as any), item.id)}
                                    className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${copiedSection === item.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    {copiedSection === item.id ? <Check className="w-4 h-4 mr-2"/> : <Copy className="w-4 h-4 mr-2"/>}
                                    {copiedSection === item.id ? 'คัดลอกแล้ว' : 'คัดลอกคำสั่ง'}
                                </button>
                            </div>
                        ))}
                        
                        <div className="col-span-full mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3">
                            <Sparkles className="w-6 h-6 text-indigo-600 mt-1 shrink-0" />
                            <div>
                                <h4 className="font-bold text-indigo-800 text-sm">วิธีใช้งาน AI Assistant</h4>
                                <p className="text-xs text-indigo-600 mt-1">
                                    คัดลอกข้อความด้านบนแล้วนำไปวางใน ChatGPT, Gemini หรือ Claude เพื่อให้ AI ช่วยเขียนสรุปรายงาน ข่าวประชาสัมพันธ์ หรือวิเคราะห์ข้อมูลเชิงลึกได้ทันที
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default SummaryGenerator;
