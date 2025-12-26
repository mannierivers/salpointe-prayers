import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { PRAYERS } from './data/prayers';
import { getSaint } from './data/saints';
import { Sun, LogOut, Heart, Trophy, Settings as SettingsIcon, Wand2, Plus, X, Globe, Download, Loader2, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';

function App() {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // UPDATED: Weather is now an object holding current, high, and low
  const [weather, setWeather] = useState(null); 
  
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [classroomCourses, setClassroomCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [settings, setSettings] = useState({ 
    teacherName: 'Teacher', 
    subject: 'Homeroom', 
    xp: 0,
    leaderboard: {},
    roster: '',
    savedClasses: {} 
  });
  
  const [globalCount, setGlobalCount] = useState(0);
  const [intentions, setIntentions] = useState([]);
  const [newIntention, setNewIntention] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- LOGIC ---
  const dayName = format(currentDate, 'EEEE');
  const displayDay = (dayName === 'Saturday' || dayName === 'Sunday') ? 'Monday' : dayName;
  const hour = currentDate.getHours();
  const timeOfDay = hour < 12 ? 'Morning' : 'Afternoon';
  const currentPrayer = PRAYERS[displayDay]?.[timeOfDay] || PRAYERS['Monday']['Morning'];
  const todaySaint = getSaint(currentDate);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- WEATHER LISTENER (Tucson) ---
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Updated URL: Asks for Current Temp AND Daily Max/Min
        const response = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=32.254&longitude=-110.945&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto"
        );
        const data = await response.json();
        
        setWeather({
          current: Math.round(data.current.temperature_2m),
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0])
        });
      } catch (error) {
        console.error("Error fetching weather:", error);
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 900000); // 15 mins
    return () => clearInterval(weatherTimer);
  }, []);

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "teachers", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings({ leaderboard: {}, roster: '', savedClasses: {}, ...docSnap.data() }); 
        } else {
          setSettings({ teacherName: currentUser.displayName, subject: 'Homeroom', xp: 0, leaderboard: {}, roster: '', savedClasses: {} });
          setIsSettingsOpen(true);
        }
      }
    });

    const unsubscribeGlobal = onSnapshot(doc(db, "stats", "school"), (doc) => {
      if (doc.exists()) { setGlobalCount(doc.data().totalPrayers || 0); }
    });
    return () => { unsubscribeAuth(); unsubscribeGlobal(); };
  }, []);

  // --- HANDLERS ---
  const handleLogin = async () => {
    try {
      googleProvider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
      googleProvider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) setAccessToken(credential.accessToken);
    } catch (e) { console.error(e); }
  };

  const fetchClassroomCourses = async () => {
    if (!accessToken) { alert("Please Sign Out and Sign In again to authorize Classroom access."); return; }
    setLoadingCourses(true);
    try {
        const response = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.courses) setClassroomCourses(data.courses);
        else alert("No active courses found.");
    } catch (error) { console.error(error); alert("Failed to connect to Google Classroom."); }
    setLoadingCourses(false);
  };

  const importStudentsFromCourse = async (courseId, courseName) => {
    setLoadingCourses(true);
    try {
        const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await response.json();
        
        if (data.students) {
            const studentNames = data.students.map(s => s.profile.name.fullName).join(', ');
            const updatedClasses = { ...settings.savedClasses, [courseId]: { name: courseName, students: studentNames } };
            setSettings({ ...settings, savedClasses: updatedClasses, roster: studentNames, subject: courseName });
            setClassroomCourses([]); 
        } else {
            alert("No students found in this class.");
        }
    } catch (error) { console.error(error); }
    setLoadingCourses(false);
  };

  const loadSavedClass = (courseId) => {
    const savedClass = settings.savedClasses[courseId];
    if (savedClass) {
      setSettings({ ...settings, roster: savedClass.students, subject: savedClass.name });
    }
  };

  const handleAmen = async () => {
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.7 }, colors: ['#97233F', '#FBBF39', '#0098DB', '#FFFFFF'] });
    const globalRef = doc(db, "stats", "school");
    try { await updateDoc(globalRef, { totalPrayers: increment(1) }); } catch (e) { await setDoc(globalRef, { totalPrayers: 1 }); }

    if (user) {
      const newXP = (settings.xp || 0) + 10;
      let newLeaderboard = { ...settings.leaderboard };
      if (leaderName.trim()) {
        const cleanName = leaderName.trim();
        newLeaderboard[cleanName] = (newLeaderboard[cleanName] || 0) + 1;
      }
      const newSettings = { ...settings, xp: newXP, leaderboard: newLeaderboard };
      setSettings(newSettings);
      await setDoc(doc(db, "teachers", user.uid), newSettings, { merge: true });
      setLeaderName('');
    }
  };

  const addIntention = (e) => {
    e.preventDefault();
    if (newIntention.trim()) { setIntentions([...intentions, newIntention.trim()]); setNewIntention(''); }
  };
  const removeIntention = (index) => setIntentions(intentions.filter((_, i) => i !== index));

  const pickRandomStudent = () => {
    if (!settings.roster) return alert("Please add student names in Settings first!");
    const names = settings.roster.split(',').map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return;
    const random = names[Math.floor(Math.random() * names.length)];
    setLeaderName(random);
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (user) {
      await setDoc(doc(db, "teachers", user.uid), settings, { merge: true });
      setIsSettingsOpen(false);
    }
  };

  const topLeaders = Object.entries(settings.leaderboard || {}).sort(([, a], [, b]) => b - a).slice(0, 4);

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] text-white overflow-hidden font-sans selection:bg-[#97233F] selection:text-white">
      <div className="grid grid-cols-12 grid-rows-6 h-full p-4 gap-4 md:p-6 md:gap-6">

        {/* 1. TOP HEADER */}
        <div className="col-span-12 row-span-1 flex justify-between items-center bg-[#2d2d2d] rounded-2xl p-4 md:p-6 shadow-xl border-l-8 border-[#FBBF39]">
          
          <div className="flex items-center gap-6">
            <img 
                src="/SC-LOGO-RGB.png" 
                alt="Salpointe Logo" 
                className="h-20 w-auto object-contain drop-shadow-lg hidden md:block" 
            />
            
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#FBBF39] tracking-wider drop-shadow-md">{format(currentDate, 'h:mm a')}</h1>
              <div className="flex items-center gap-3 mt-1">
                  <p className="text-gray-400 text-lg md:text-xl font-medium">{format(currentDate, 'EEEE, MMMM do')}</p>
                  <span className="hidden md:inline text-gray-600">•</span>
                  <p className="hidden md:block text-[#FBBF39]/80 italic font-serif">Feast of {todaySaint}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            
            {/* UPDATED WEATHER DISPLAY */}
            <div className="hidden lg:flex flex-col items-end mr-4">
               {weather ? (
                 <>
                   <div className="flex items-center gap-2 text-[#FBBF39]">
                      <Sun size={32} />
                      <span className="text-4xl font-bold text-white tracking-tight">{weather.current}°</span>
                   </div>
                   <div className="flex gap-3 text-xs font-bold mt-1">
                      <span className="text-[#FBBF39] flex items-center gap-1"><ArrowUp size={12}/> H: {weather.high}°</span>
                      <span className="text-[#0098DB] flex items-center gap-1"><ArrowDown size={12}/> L: {weather.low}°</span>
                   </div>
                 </>
               ) : (
                 <div className="flex items-center gap-2 text-[#FBBF39]">
                    <Sun size={32} />
                    <Loader2 className="animate-spin text-white" />
                 </div>
               )}
            </div>

            {user ? (
              <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 bg-[#97233F] hover:bg-[#780A1E] px-4 py-2 md:px-6 md:py-3 rounded-xl transition shadow-lg border border-[#FBBF39]/30">
                {user.photoURL && <img src={user.photoURL} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#FBBF39]" alt="Profile" />}
                <div className="text-left hidden lg:block">
                  <div className="font-bold text-[#FBBF39] leading-tight">{settings.teacherName}</div>
                  <div className="text-xs text-white/80">Class XP: {settings.xp}</div>
                </div>
                <SettingsIcon size={20} className="text-[#FBBF39] ml-2" />
              </button>
            ) : (
              <button onClick={handleLogin} className="bg-[#97233F] hover:bg-[#780A1E] text-[#FBBF39] px-6 py-3 rounded-xl font-bold text-lg md:text-xl border-2 border-[#FBBF39]">Login</button>
            )}
          </div>
        </div>

        {/* 2. MAIN PRAYER CARD */}
        <div className="col-span-12 md:col-span-8 row-span-4 md:row-span-5 bg-gradient-to-br from-[#97233F] to-[#780A1E] rounded-3xl p-6 md:p-10 flex flex-col shadow-2xl relative border-4 border-[#2d2d2d]">
          <div className="absolute top-8 left-8 bg-[#FBBF39] text-[#780A1E] text-sm md:text-base font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg">
            {displayDay} {timeOfDay}
          </div>

          <div className="flex-1 flex flex-col justify-center items-center w-full text-center mt-8">
            <h2 className="text-3xl md:text-5xl font-serif mb-6 text-[#FBBF39] drop-shadow-lg">{currentPrayer.title}</h2>
            <p className="text-lg md:text-3xl leading-relaxed text-white font-medium drop-shadow-md max-w-4xl">"{currentPrayer.text}"</p>
          </div>

          <div className="mt-4 flex flex-col md:flex-row gap-6 items-end justify-between w-full">
            <div className="flex-1 w-full md:w-auto">
               <div className="flex flex-wrap gap-2 mb-2">
                 {intentions.map((intent, i) => (
                    <span key={i} className="bg-white/10 text-xs px-3 py-1 rounded-full flex items-center gap-2 animate-in fade-in zoom-in">
                        {intent} <button onClick={() => removeIntention(i)}><X size={12}/></button>
                    </span>
                 ))}
               </div>
               <form onSubmit={addIntention} className="relative">
                  <input type="text" placeholder="Add prayer intention..." value={newIntention} onChange={(e) => setNewIntention(e.target.value)}
                    className="w-full bg-black/20 text-sm border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 outline-none focus:border-[#FBBF39]" />
                  <button type="submit" className="absolute right-2 top-2 text-[#FBBF39]"><Plus size={16}/></button>
               </form>
            </div>

            <div className="flex-1 flex flex-col gap-3 w-full md:w-auto max-w-md">
                <div className="relative flex gap-2">
                  <input type="text" placeholder="Leader" value={leaderName} onChange={(e) => setLeaderName(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 focus:border-[#FBBF39] rounded-full py-2 px-4 text-white placeholder-white/50 text-center font-bold outline-none" />
                  <button onClick={pickRandomStudent} className="bg-[#FBBF39] p-2 rounded-full text-[#780A1E] hover:bg-white hover:scale-110 transition" title="Pick Random Student">
                      <Wand2 size={20} />
                  </button>
                </div>
                <button onClick={handleAmen} className="w-full bg-[#FBBF39] hover:bg-white text-[#780A1E] text-2xl font-black py-3 rounded-full shadow-lg transform hover:scale-105 transition-all active:scale-95">AMEN</button>
            </div>
          </div>
        </div>

        {/* 3. SIDEBAR */}
        <div className="hidden md:flex col-span-4 row-span-5 flex-col gap-4">
          <div className="bg-[#2d2d2d] rounded-2xl p-6 flex-[1] border-t-4 border-[#0098DB] shadow-lg flex flex-col justify-center relative overflow-hidden">
             <Globe className="absolute right-4 top-4 text-white/5 w-24 h-24" />
             <h3 className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-1 z-10">School-Wide Unity</h3>
             <div className="text-5xl font-bold text-[#0098DB] z-10">{globalCount.toLocaleString()}</div>
             <div className="text-sm text-gray-500 z-10">Prayers said at Salpointe since Jan 7, 2026</div>
          </div>

          <div className="bg-[#2d2d2d] rounded-2xl p-6 flex-[2] border-t-4 border-[#FBBF39] shadow-lg flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="text-[#FBBF39]" size={24} />
              <h3 className="text-gray-300 uppercase text-sm font-bold tracking-widest">Class Leaders</h3>
            </div>
            <div className="space-y-3 overflow-y-auto">
                {topLeaders.map(([name, count], index) => (
                  <div key={name} className="flex items-center justify-between bg-[#1a1a1a] p-2 px-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3"><span className={`font-bold w-4 text-center ${index === 0 ? 'text-[#FBBF39]' : 'text-gray-500'}`}>#{index + 1}</span><span className="text-white font-medium">{name}</span></div>
                    <div className="text-[#0098DB] font-bold">{count}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-[#2d2d2d] rounded-2xl p-6 flex-[1] flex flex-col justify-center text-center border-t-4 border-[#97233F] shadow-lg relative overflow-hidden group">
            <Heart className="absolute -right-4 -bottom-4 text-[#97233F]/20 w-32 h-32 transform -rotate-12 group-hover:scale-110 transition duration-700" fill="currentColor" />
            <div className="relative z-10">
              <h3 className="text-[#FBBF39] uppercase text-xs font-bold tracking-widest mb-1">In Loving Memory Of</h3>
              <p className="text-xl font-serif text-white">Deacon Scott Pickett</p>
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#2d2d2d] p-8 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Classroom Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={saveSettings}>
              {/* SAVED CLASSES */}
              <div className="mb-6">
                 <h3 className="text-xs text-[#FBBF39] font-bold uppercase tracking-wider mb-2">My Classes</h3>
                 <div className="grid grid-cols-2 gap-2 mb-3">
                    {Object.entries(settings.savedClasses || {}).map(([id, cls]) => (
                        <button 
                           key={id} type="button" onClick={() => loadSavedClass(id)}
                           className={`p-2 rounded text-sm font-bold text-left truncate flex justify-between items-center ${settings.subject === cls.name ? 'bg-[#FBBF39] text-[#780A1E]' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                           <span>{cls.name}</span>
                           {settings.subject === cls.name && <Check size={14} />}
                        </button>
                    ))}
                 </div>
                 
                 {/* GOOGLE IMPORT */}
                 <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 mb-3 text-gray-400 font-bold text-xs uppercase tracking-wider">
                        <Download size={14} /> Import New Class
                    </div>
                    {classroomCourses.length === 0 ? (
                        <button type="button" onClick={fetchClassroomCourses} disabled={!accessToken || loadingCourses}
                          className="w-full bg-[#0098DB]/20 text-[#0098DB] hover:bg-[#0098DB]/40 py-2 rounded-lg text-sm font-bold transition flex justify-center items-center gap-2">
                            {loadingCourses ? <Loader2 className="animate-spin" size={16} /> : "Find My Classes"}
                        </button>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {classroomCourses.map(course => (
                                <button key={course.id} type="button" onClick={() => importStudentsFromCourse(course.id, course.name)}
                                  className="text-left bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm text-white truncate">
                                    {course.name}
                                </button>
                            ))}
                        </div>
                    )}
                 </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-[#FBBF39] font-bold mb-1">Display Name</label>
                <input type="text" value={settings.teacherName} onChange={(e) => setSettings({...settings, teacherName: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-3 text-white outline-none focus:border-[#FBBF39]" />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-[#FBBF39] font-bold mb-1">Current Subject</label>
                <input type="text" value={settings.subject} onChange={(e) => setSettings({...settings, subject: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-3 text-white outline-none focus:border-[#FBBF39]" />
              </div>
              <div className="mb-6">
                <label className="block text-sm text-[#FBBF39] font-bold mb-1">Current Roster</label>
                <textarea rows="3" value={settings.roster} onChange={(e) => setSettings({...settings, roster: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-3 text-white outline-none focus:border-[#FBBF39]" />
              </div>
              <button type="submit" className="w-full py-4 bg-[#FBBF39] text-[#780A1E] font-bold text-xl rounded-xl hover:bg-white transition mb-4">Save</button>
            </form>
            <button onClick={() => signOut(auth) && setIsSettingsOpen(false)} className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 py-3 rounded-xl hover:bg-red-900/20 transition">
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;