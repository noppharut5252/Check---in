
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppData, User, CheckInLog } from '../types';
import { getCheckInLogs, getAllUsers } from '../services/api';
import { 
    FileText, Check, Sparkles, BarChart3, TrendingUp, Users, MapPin, 
    Loader2, School, Zap, Target, Clock, Download, PieChart, 
    Building, Copy, BrainCircuit, X, Search, Filter, PlayCircle, PauseCircle, Maximize2, Minimize2, Info, RefreshCw
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    BarChart, Bar, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';
import SearchableSelect from './SearchableSelect';

interface SummaryGeneratorProps {
  data: AppData;
  user?: User | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7300', '#a4de6c'];

const SummaryGenerator: React.FC<SummaryGeneratorProps> = ({ data, user }) => {
  const [logs, setLogs] = useState<CheckInLog[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'schools' | 'locations' | 'time' | 'prompts'>('overview');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // --- New Features State ---
  const [selectedCluster, setSelectedCluster] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<'All' | 'Morning' | 'Afternoon'>('All');
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [selectedSchool, setSelectedSchool] = useState<{ name: string, participants: { name: string, time: string, activity: string }[] } | null>(null);

  const isAdmin = user?.Role === 'admin' || user?.level === 'admin';

  // Fetch Function
  const fetchData = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      try {
          const [logsRes, usersRes] = await Promise.all([
              getCheckInLogs(),
              getAllUsers()
          ]);
          if (logsRes) setLogs(logsRes);
          if (usersRes) setAllUsers(usersRes);
      } catch (e) {
          console.warn("Could not fetch detailed data", e);
      } finally {
          if (!isBackground) setLoading(false);
      }
  };

  // 1. Initial Fetch
  useEffect(() => {
      fetchData();
  }, []);

  // 2. Auto Refresh Interval
  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isAutoRefresh && isAdmin) {
          interval = setInterval(() => {
              fetchData(true); // Silent refresh
          }, 30000); // 30 seconds
      }
      return () => clearInterval(interval);
  }, [isAutoRefresh, isAdmin]);

  // --- Filtering Logic ---
  const filteredLogs = useMemo(() => {
      return logs.filter(log => {
          // 1. Cluster Filter
          if (selectedCluster !== 'All') {
              const u = allUsers.find(user => user.UserID === log.UserID);
              let userCluster = '';
              if (u) {
                  // Try direct cluster or lookup via school
                  userCluster = u.Cluster || '';
                  if (!userCluster && u.SchoolID) {
                      const s = data.schools.find(sch => sch.SchoolID === u.SchoolID || sch.SchoolName === u.SchoolID);
                      if (s) userCluster = s.SchoolCluster;
                  }
              }
              // Match by ID
              if (userCluster !== selectedCluster) return false;
          }

          // 2. Time Filter
          if (timeFilter !== 'All') {
              const hour = new Date(log.Timestamp).getHours();
              if (timeFilter === 'Morning' && hour >= 12) return false;
              if (timeFilter === 'Afternoon' && hour < 12) return false;
          }

          return true;
      });
  }, [logs, allUsers, selectedCluster, timeFilter, data.schools]);

  // --- Analytics Processing (Using filteredLogs) ---

  // 1. Overview Stats
  const overviewStats = useMemo(() => {
      const totalCheckIns = filteredLogs.length;
      const uniqueUsers = new Set(filteredLogs.map(l => l.UserID)).size;
      
      const totalCapacity = data.checkInActivities.reduce((acc, act) => acc + (act.Capacity || 0), 0);
      const totalRegisteredUsers = allUsers.length || 1;

      // Engagement Rate Calculation
      const utilizationRate = totalCapacity > 0 
          ? ((totalCheckIns / totalCapacity) * 100)
          : ((uniqueUsers / totalRegisteredUsers) * 100);

      const topActivities = [...data.checkInActivities]
          .map(a => {
              // Recalculate count based on filtered logs
              const count = filteredLogs.filter(l => l.ActivityID === a.ActivityID).length;
              return { 
                  name: a.Name, 
                  value: count, 
                  location: data.checkInLocations.find(l=>l.LocationID===a.LocationID)?.Name 
              };
          })
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

      return { 
          totalCheckIns, 
          uniqueUsers, 
          utilizationRate: utilizationRate.toFixed(1), 
          topActivities,
          isCapacityBased: totalCapacity > 0
      };
  }, [filteredLogs, data.checkInActivities, data.checkInLocations, allUsers]);

  // 2. School Participation
  const schoolStats = useMemo(() => {
      if (filteredLogs.length === 0 || allUsers.length === 0) return [];
      
      const schoolMap: Record<string, { count: number, participants: Map<string, { name: string, time: string, activity: string }> }> = {};
      
      filteredLogs.forEach(log => {
          const u = allUsers.find(user => user.UserID === log.UserID);
          let schoolName = 'บุคคลทั่วไป (General)';
          
          if (u?.SchoolID) {
              const s = data.schools.find(sch => sch.SchoolID === u.SchoolID || sch.SchoolName === u.SchoolID);
              schoolName = s?.SchoolName || u.SchoolID;
          }

          if (!schoolMap[schoolName]) {
              schoolMap[schoolName] = { count: 0, participants: new Map() };
          }

          if (!schoolMap[schoolName].participants.has(log.UserID)) {
              schoolMap[schoolName].count++;
              schoolMap[schoolName].participants.set(log.UserID, {
                  name: log.UserName || 'Unknown',
                  time: log.Timestamp,
                  activity: log.ActivityName || '-'
              });
          }
      });

      return Object.entries(schoolMap)
          .map(([name, data]) => ({ 
              name, 
              count: data.count, 
              participants: Array.from(data.participants.values()) 
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15);
  }, [filteredLogs, allUsers, data.schools]);

  // 3. Location Hotspots
  const locationStats = useMemo(() => {
      const locCounts: Record<string, number> = {};
      filteredLogs.forEach(log => {
          const locName = log.LocationName || 'Unknown';
          locCounts[locName] = (locCounts[locName] || 0) + 1;
      });
      return Object.entries(locCounts)
          .map(([name, count]) => ({ name, value: count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
  }, [filteredLogs]);

  // 4. Time Analysis
  const timeData = useMemo(() => {
      if (filteredLogs.length === 0) return [];
      const hourCounts: Record<string, number> = {};
      filteredLogs.forEach(log => {
          const hour = new Date(log.Timestamp).getHours();
          const label = `${String(hour).padStart(2, '0')}:00`;
          hourCounts[label] = (hourCounts[label] || 0) + 1;
      });
      return Object.entries(hourCounts)
          .map(([time, count]) => ({ time, count }))
          .sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredLogs]);

  // --- Helper Functions ---
  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen();
          setIsFullscreen(true);
      } else {
          document.exitFullscreen();
          setIsFullscreen(false);
      }
  };

  const handleExportCSV = () => {
      const headers = ['Date', 'Time', 'Name', 'School', 'Activity', 'Location', 'Status'];
      const csvRows = [headers.join(',')];

      filteredLogs.forEach(log => {
          const u = allUsers.find(user => user.UserID === log.UserID);
          const school = data.schools.find(s => s.SchoolID === u?.SchoolID || s.SchoolName === u?.SchoolID)?.SchoolName || u?.SchoolID || '-';
          const date = new Date(log.Timestamp);
          
          csvRows.push([
              `"${date.toLocaleDateString('th-TH')}"`,
              `"${date.toLocaleTimeString('th-TH')}"`,
              `"${log.UserName}"`,
              `"${school}"`,
              `"${log.ActivityName}"`,
              `"${log.LocationName}"`,
              `"${log.SurveyStatus || 'Pending'}"`
          ].join(','));
      });

      const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `checkin_report_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const generatePrompt = (type: 'summary' | 'school' | 'traffic') => {
      const today = new Date().toLocaleDateString('th-TH');
      let text = `ข้อมูลสรุปกิจกรรมประจำวันที่ ${today}\n`;
      text += `ยอดเช็คอินรวม: ${overviewStats.totalCheckIns} ครั้ง\n`;
      
      if (type === 'summary') {
          text += `\nไฮไลท์สำคัญ:\n`;
          text += `- ผู้เข้าร่วมงาน (ไม่ซ้ำคน): ${overviewStats.uniqueUsers} คน\n`;
          text += `- อัตราการมีส่วนร่วม (Engagement): ${overviewStats.utilizationRate}%\n`;
          text += `- กิจกรรมยอดนิยม: ${overviewStats.topActivities.slice(0,3).map(a => `${a.name} (${a.value})`).join(', ')}\n`;
          text += `\nคำสั่ง AI: "เขียนข่าวประชาสัมพันธ์สรุปความสำเร็จของงาน โดยเน้นตัวเลขผู้เข้าร่วมและความคึกคักของกิจกรรม"\n`;
      } else if (type === 'traffic') {
          text += `\nพื้นที่ยอดนิยม (Hotspots):\n`;
          locationStats.slice(0, 3).forEach(l => text += `- ${l.name}: ${l.value} ครั้ง\n`);
          text += `\nคำสั่ง AI: "วิเคราะห์พฤติกรรมผู้เข้าร่วมงานตามโซนพื้นที่ เพื่อเสนอแนะการจัดวางผังงานในปีถัดไป"\n`;
      } else if (type === 'school') {
          text += `\nหน่วยงานที่เข้าร่วมสูงสุด 5 อันดับแรก:\n`;
          schoolStats.slice(0,5).forEach((s, i) => text += `${i+1}. ${s.name}: ${s.count} คน\n`);
          text += `\nคำสั่ง AI: "ร่างหนังสือขอบคุณโรงเรียนที่ให้ความร่วมมือส่งบุคลากรเข้าร่วมกิจกรรมมากที่สุด"\n`;
      }
      return text;
  };

  const copyToClipboard = (text: string, key: string) => {
      navigator.clipboard.writeText(text);
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 2000);
  };

  // --- Components ---
  const ParticipantModal = () => {
      if (!selectedSchool) return null;
      return (
          <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-gray-800">{selectedSchool.name}</h3>
                          <p className="text-xs text-gray-500">จำนวนผู้เข้าร่วม: {selectedSchool.participants.length} คน</p>
                      </div>
                      <button onClick={() => setSelectedSchool(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                      {selectedSchool.participants.length > 0 ? (
                          <div className="space-y-3">
                              {selectedSchool.participants.map((p, idx) => (
                                  <div key={idx} className="flex items-center p-2 bg-gray-50 rounded-lg border border-gray-100">
                                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                                          {p.name.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="font-bold text-sm text-gray-800 truncate">{p.name}</div>
                                          <div className="text-xs text-gray-500 truncate">ล่าสุด: {p.activity}</div>
                                      </div>
                                      <div className="text-[10px] text-gray-400 whitespace-nowrap">
                                          {new Date(p.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center text-gray-400 py-10">ไม่พบรายชื่อ</div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div ref={containerRef} className={`space-y-6 animate-in fade-in duration-500 ${isFullscreen ? 'fixed inset-0 z-[1000] bg-gray-50 overflow-y-auto p-6' : 'pb-24 relative'}`}>
        <ParticipantModal />

        {/* Control Bar (Filters & Presentation) */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-20">
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                <div className="flex items-center text-blue-800 font-bold">
                    <BarChart3 className="w-6 h-6 mr-2" />
                    <span className="hidden md:inline">Dashboard</span>
                </div>
                
                {/* Cluster Filter (Searchable) */}
                <div className="w-full md:w-64">
                    <SearchableSelect 
                        options={[{ label: 'ทุกสังกัด (All Clusters)', value: 'All' }, ...data.clusters.map(c => ({ label: c.ClusterName, value: c.ClusterID }))]}
                        value={selectedCluster}
                        onChange={(val) => setSelectedCluster(val)}
                        placeholder="เลือกสังกัด..."
                        icon={<Filter className="w-4 h-4" />}
                    />
                </div>

                {/* Time Filter */}
                <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <select 
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer w-40"
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value as any)}
                    >
                        <option value="All">ทุกช่วงเวลา</option>
                        <option value="Morning">ช่วงเช้า (AM)</option>
                        <option value="Afternoon">ช่วงบ่าย (PM)</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Auto Refresh Toggle - Admin Only */}
                {isAdmin && (
                    <button 
                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                        className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all ${isAutoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        title="Auto Refresh every 30s"
                    >
                        {isAutoRefresh ? <PauseCircle className="w-4 h-4 mr-2 animate-pulse" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                        {isAutoRefresh ? 'Auto ON (30s)' : 'Auto OFF'}
                    </button>
                )}

                {/* Fullscreen Toggle */}
                <button 
                    onClick={toggleFullscreen}
                    className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>

                <button 
                   onClick={handleExportCSV} 
                   className="p-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
                   title="Export CSV"
               >
                   <Download className="w-5 h-5" />
               </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit overflow-x-auto">
            {[
                { id: 'overview', label: 'ภาพรวม (Overview)', icon: Target },
                { id: 'schools', label: 'การมีส่วนร่วม (Participants)', icon: Users },
                { id: 'locations', label: 'จุดยอดนิยม (Hotspots)', icon: MapPin },
                { id: 'time', label: 'ช่วงเวลา (Time)', icon: Clock },
                { id: 'prompts', label: 'AI Assistant', icon: BrainCircuit },
            ].map(t => (
                <button
                    key={t.id}
                    onClick={() => setTab(t.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all whitespace-nowrap ${tab === t.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    <t.icon className="w-4 h-4 mr-2" /> {t.label}
                </button>
            ))}
        </div>

        {/* Tab Content */}
        {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
                <p>กำลังประมวลผลข้อมูลสารสนเทศ...</p>
            </div>
        ) : (
            <>
                {/* 1. Overview */}
                {tab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-3"><Target className="w-8 h-8"/></div>
                            <h3 className="text-3xl font-black text-gray-800">{overviewStats.totalCheckIns.toLocaleString()}</h3>
                            <p className="text-sm text-gray-500">จำนวนการเช็คอิน (ครั้ง)</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-full mb-3"><Users className="w-8 h-8"/></div>
                            <h3 className="text-3xl font-black text-gray-800">{overviewStats.uniqueUsers.toLocaleString()}</h3>
                            <p className="text-sm text-gray-500">ผู้เข้าร่วม (คน)</p>
                        </div>
                        
                        {/* Engagement Rate Card with Tooltip */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative group">
                            <div className="absolute top-2 right-2 text-gray-400 hover:text-blue-500 cursor-help" title={overviewStats.isCapacityBased ? "คำนวณจาก (เช็คอิน/ความจุ) * 100" : "คำนวณจาก (ผู้เข้าร่วม/สมาชิกทั้งหมด) * 100"}>
                                <Info className="w-4 h-4" />
                            </div>
                            <div className="absolute top-8 right-2 w-48 bg-gray-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                {overviewStats.isCapacityBased 
                                    ? "Engagement = (จำนวนเช็คอิน / ความจุรวมกิจกรรม) * 100" 
                                    : "Engagement = (จำนวนผู้เข้าร่วมที่ไม่ซ้ำ / จำนวนผู้ลงทะเบียนทั้งหมด) * 100"}
                            </div>

                            <div className="p-3 bg-orange-100 text-orange-600 rounded-full mb-3"><TrendingUp className="w-8 h-8"/></div>
                            <h3 className="text-3xl font-black text-gray-800">{overviewStats.utilizationRate}%</h3>
                            <p className="text-sm text-gray-500">อัตราการเข้าร่วม (Engagement)</p>
                        </div>
                        
                        <div className="md:col-span-2 lg:col-span-4 lg:row-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-700 mb-6 flex items-center text-lg">
                                <Zap className="w-6 h-6 mr-2 text-yellow-500"/> 10 อันดับกิจกรรมยอดนิยม (Top Activities)
                            </h4>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={overviewStats.topActivities.slice(0, 10)} layout="vertical" margin={{left: 20, right: 30}}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={200} tick={{fontSize: 12}} />
                                        <Tooltip 
                                            cursor={{fill: 'transparent'}}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl text-xs">
                                                            <p className="font-bold text-gray-800 mb-1">{d.name}</p>
                                                            <p className="text-gray-500 mb-2">{d.location}</p>
                                                            <p className="text-blue-600 font-bold text-lg">{d.value.toLocaleString()} คน</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={24}>
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

                {/* 2. Schools / Participation */}
                {tab === 'schools' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center">
                                <Building className="w-6 h-6 mr-2 text-indigo-500"/> โรงเรียน/หน่วยงานที่มีส่วนร่วมสูงสุด
                            </h3>
                            <div className="space-y-3">
                                {schoolStats.map((sc, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => setSelectedSchool(sc)}
                                        className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all group"
                                    >
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4 ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-white border text-gray-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{sc.name}</div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                <div 
                                                    className="h-full bg-indigo-500 rounded-full group-hover:bg-blue-500" 
                                                    style={{ width: `${(sc.count / (schoolStats[0]?.count || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <span className="text-xl font-black text-indigo-600 group-hover:text-blue-600">{sc.count}</span>
                                            <span className="text-xs text-gray-500 block">คน</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-4">* คลิกที่ชื่อโรงเรียนเพื่อดูรายชื่อผู้เข้าร่วม</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center">
                                <PieChart className="w-6 h-6 mr-2 text-pink-500"/> สัดส่วนผู้เข้าร่วม
                            </h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={schoolStats.slice(0, 5)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="count"
                                            onClick={(data) => {
                                                const found = schoolStats.find(s => s.name === data.name);
                                                if (found) setSelectedSchool(found);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            {schoolStats.slice(0, 5).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-4">แสดงเฉพาะ 5 อันดับแรก</p>
                        </div>
                    </div>
                )}

                {/* 3. Location Hotspots (New Tab) */}
                {tab === 'locations' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center">
                                <MapPin className="w-6 h-6 mr-2 text-red-500"/> จุดเช็คอินยอดนิยม (Location Hotspots)
                            </h3>
                        </div>
                        
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={locationStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} interval={0} angle={-15} textAnchor="end" height={60} />
                                    <YAxis />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl text-xs">
                                                        <p className="font-bold text-gray-800 mb-1">{payload[0].payload.name}</p>
                                                        <p className="text-red-500 font-bold text-lg">{payload[0].value} ครั้ง</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#FF8042" radius={[4, 4, 0, 0]} barSize={40}>
                                        {locationStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-4">แสดงจำนวนการเช็คอินแยกตามสถานที่ เพื่อดูความหนาแน่นในแต่ละจุด</p>
                    </div>
                )}

                {/* 4. Time Analysis */}
                {tab === 'time' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center">
                                <Clock className="w-6 h-6 mr-2 text-blue-500"/> ความหนาแน่นตามช่วงเวลา (Traffic Analysis)
                            </h3>
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
                                        <Tooltip 
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-xl text-xs">
                                                            <p className="font-bold text-gray-700 mb-1">{label} น.</p>
                                                            <p className="text-blue-600 font-bold text-lg">
                                                                {payload[0].value.toLocaleString()} check-ins
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
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
                        <p className="text-center text-xs text-gray-400 mt-4">กราฟแสดงจำนวนการเช็คอินในแต่ละช่วงเวลาของวัน เพื่อวิเคราะห์ช่วง Peak Time</p>
                    </div>
                )}

                {/* 5. AI Prompts */}
                {tab === 'prompts' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { id: 'summary', title: 'สรุปภาพรวม (Overview)', icon: FileText, color: 'blue' },
                            { id: 'traffic', title: 'วิเคราะห์คนเข้างาน (Traffic)', icon: TrendingUp, color: 'green' },
                            { id: 'school', title: 'ความสนใจ (Interests)', icon: BrainCircuit, color: 'purple' }
                        ].map((item) => (
                            <div key={item.id} className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-${item.color}-300 transition-all group`}>
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
