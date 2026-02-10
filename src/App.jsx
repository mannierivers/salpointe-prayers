import React, { useState, useEffect, useRef } from 'react';
import { Flame, X, Info, Loader2, BookOpen, Clock, User, LogOut, LayoutDashboard, Trash2, Heart, ChevronLeft, ChevronRight, RotateCcw, Settings, Calendar, Save, Sparkles, MessageCircle } from 'lucide-react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from 'firebase/firestore';

// Verified exports from your firebase.js
import { auth, db, appId, googleProvider } from './firebase';

const ADMINS = ['erivers@salpointe.org', 'cptak@salpointe.org'];

const PRAYER_SEQUENCE = [
  { day: 1, period: 'morning', label: "Mon. Morning" },
  { day: 1, period: 'afternoon', label: "Mon. Afternoon" },
  { day: 2, period: 'morning', label: "Tue. Morning" },
  { day: 2, period: 'afternoon', label: "Tue. Afternoon" },
  { day: 3, period: 'morning', label: "Wed. Morning" },
  { day: 3, period: 'afternoon', label: "Wed. Afternoon" },
  { day: 4, period: 'morning', label: "Thu. Morning" },
  { day: 4, period: 'afternoon', label: "Thu. Afternoon" },
  { day: 5, period: 'morning', label: "Fri. Morning" },
  { day: 5, period: 'afternoon', label: "Fri. Afternoon" }
];

const WEEKLY_PRAYERS = {
  1: { 
    morning: { title: "Morning Offering", text: "O Jesus, through the Immaculate Heart of Mary, I offer you my prayers, works, joys, and sufferings of this day in union with the holy sacrifice of the Mass throughout the world. I offer them for all the intentions of your sacred heart: the salvation of souls, reparation for sin, the reunion of all Christians. I offer them for the intentions of our bishops and of all the apostles of prayer, and in particular for those recommended by our Holy Father this month. Amen." }, 
    afternoon: { title: "Our Father", text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come, thy will be done, on earth as it is in heaven. Give us this day our daily bread and forgive us our trespasses, as we forgive those who trespass against us and lead us not into temptation, but deliver us from evil. Amen." } 
  },
  2: { 
    morning: { title: "St. Teresa of Avila Prayer", text: "Grant that in all things, great and small, today and all the days of my life, I may do whatever You require of me. Help me respond to the slightest prompting of Your Grace, so that I may be Your trustworthy instrument for Your honor. May Your Will be done in time and in eternity by me, in me, and through me. Amen." }, 
    afternoon: { title: "Glory Be", text: "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen." } 
  },
  3: { 
    morning: { title: "Memorare", text: "Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thy intercession was left unaided. Inspired with this confidence, we turn to thee, O Virgin of virgins, our Mother. To thee we come, before thee we stand, sinful and sorrowful. O Mother of the Word Incarnate, do not despise our petitions, but in thy mercy hear and answer us. Amen." }, 
    afternoon: { title: "Hail Mary", text: "Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women and blessed is the fruit of thy womb, Jesus. Holy Mary, mother of God, pray for us sinners now and at the hour of our death. Amen." } 
  },
  4: { 
    morning: { title: "Prayer to Our Guardian Angel", text: "Angel of God, my guardian dear, to whom God’s love commits me here, ever this day be at my side to light and guard, to rule and guide. Amen." }, 
    afternoon: { title: "Fatima Prayer", text: "O my Jesus, forgive us our sins, save us from the fires of hell. Lead all souls to Heaven, especially those who are most in need of Your mercy. Amen." } 
  },
  5: { 
    morning: { title: "Serenity Prayer", text: "O God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference. Amen." }, 
    afternoon: { title: "Anima Christi", text: "Soul of Christ, make me holy. Body of Christ, save me. Blood of Christ, fill me with love. Water from Christ’s side, wash me. Passion of Christ, strengthen me. Good Jesus, hear me. Within your wounds, hide me. Never let me be parted from you. From the evil enemy, protect me. At the hour of my death, call me, and tell me to come to you that with your saints I may praise you through all eternity. Amen." } 
  }
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Inter:wght@300;400;600&display=swap');
  html, body, #root { height: 100vh; width: 100vw; overflow: hidden; margin: 0; background-color: #020617; }
  .font-serif { font-family: 'Cormorant Garamond', serif; }
  .font-sans { font-family: 'Inter', sans-serif; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .candle-glow { filter: drop-shadow(0 0 20px rgba(197, 179, 88, 0.4)); }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
  
  @keyframes softSlowFade { from { opacity: 0; filter: blur(4px); } to { opacity: 1; filter: blur(0); } }
  .animate-soft-motion { animation: softSlowFade 1.2s ease-in-out forwards; }

  .sanctuary-card {
    background: radial-gradient(circle at top, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%);
  }
`;

export default function App() {
  const [user, setUser] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(true);
  const [newPrayer, setNewPrayer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [actualNowIndex, setActualNowIndex] = useState(0);

  // Admin States
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [specialPrayer, setSpecialPrayer] = useState(null);
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminTitle, setAdminTitle] = useState('');
  const [adminText, setAdminText] = useState('');

  const toastTimerRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u && u.email?.toLowerCase().endsWith('@salpointe.org')) {
        setUser(u);
      } else if (u) {
        signOut(auth);
        showToast("Access restricted to @salpointe.org");
      } else {
        setUser(null);
      }
    });

    const introTimer = setTimeout(() => { setIsIntroOpen(false); }, 3500);

    const now = new Date();
    let day = now.getDay();
    const hour = now.getHours();
    const period = hour < 12 ? 'morning' : 'afternoon';
    if (day === 0 || day === 6) day = 1;
    const startIndex = PRAYER_SEQUENCE.findIndex(p => p.day === day && p.period === period);
    setCurrentPrayerIndex(startIndex);
    setActualNowIndex(startIndex);

    const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const specialDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'daily_specials', todayStr);
    const unsubscribeSpecial = onSnapshot(specialDocRef, (snap) => {
      setSpecialPrayer(snap.exists() ? snap.data() : null);
    });

    return () => { unsubscribeAuth(); unsubscribeSpecial(); clearTimeout(introTimer); };
  }, []);

  useEffect(() => {
    if (!db || !appId) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'prayers'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [appId]);

  const showToast = (msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: String(msg), visible: true });
    toastTimerRef.current = setTimeout(() => setToast({ message: '', visible: false }), 4000);
  };

  const handleAuth = async () => {
    if (user) await signOut(auth);
    else { try { await signInWithPopup(auth, googleProvider); } catch (e) { showToast("Sign in failed."); } }
  };

  const handleAdminLiturgySave = async () => {
    if (!adminTitle || !adminText) return;
    setIsSubmitting(true);
    const dateParts = adminDate.split('-');
    const dateId = `${parseInt(dateParts[0])}-${parseInt(dateParts[1])}-${parseInt(dateParts[2])}`;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'daily_specials', dateId), {
        title: adminTitle, text: adminText, updatedBy: user.email, timestamp: serverTimestamp()
      });
      showToast(`Liturgy saved for ${adminDate}`);
      setAdminTitle(''); setAdminText('');
    } catch (e) { showToast("Save failed."); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove intention?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prayers', id)); showToast("Removed."); } 
    catch (e) { showToast("Error."); }
  };

  const handleSubmit = async () => {
    if (!newPrayer.trim() || isSubmitting || !user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'prayers'), {
        text: newPrayer.trim(), uid: user.uid, userName: user.displayName || user.email.split('@')[0], userEmail: user.email, timestamp: serverTimestamp()
      });
      setNewPrayer(''); setIsModalOpen(false); showToast("Intention shared.");
    } catch (e) { showToast("Error."); }
    finally { setIsSubmitting(false); }
  };

  // --- DYNAMIC FONT CALCULATION ---
  const getDynamicFontSize = (text) => {
    const len = text.length;
    if (len > 550) return 'text-2xl lg:text-3xl'; // Long prayers (Anima Christi)
    if (len > 350) return 'text-3xl lg:text-4xl'; // Medium prayers
    return 'text-4xl lg:text-6xl'; // Short prayers
  };

  const isAdmin = user && ADMINS.includes(user.email?.toLowerCase());
  const activeSlot = PRAYER_SEQUENCE[currentPrayerIndex];
  const isViewingCurrent = currentPrayerIndex === actualNowIndex;
  const displayPrayer = (isViewingCurrent && specialPrayer) ? specialPrayer : WEEKLY_PRAYERS[activeSlot.day][activeSlot.period];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#1a0a0a] via-slate-950 to-slate-950 opacity-80" />
        <div className="absolute -bottom-48 -right-48 w-[60vw] h-[60vw] bg-[#681818]/5 rounded-full blur-[160px]" />
      </div>

      {/* Navigation - Ultra Slim */}
      <nav className="relative z-20 w-full p-3 px-8 flex justify-between items-center border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/lancer-75.png" alt="75" className="h-8 w-auto opacity-90" />
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[#e8dcb5] text-lg font-serif italic">Salpointe Prayers</span>
          </div>
          <a href="https://teacher-agenda.vercel.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] uppercase tracking-widest font-bold hover:text-white transition-all">
            Agenda
          </a>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => setIsIntroOpen(true)} className={`transition-all duration-500 ${isIntroOpen ? 'opacity-0' : 'opacity-60'}`}>
            <Heart className="w-5 h-5 text-[#e8dcb5]" />
          </button>
          {isAdmin && (
             <button onClick={() => setIsAdminPanelOpen(true)} className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5B358]/10 border border-[#C5B358]/30 text-[#C5B358] text-[9px] uppercase font-bold tracking-widest">
               Admin
             </button>
          )}
          <button onClick={handleAuth} className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-[#C5B358]">
            {user ? "Sign Out" : "Login"}
          </button>
        </div>
      </nav>

      {/* MAIN SANCTUARY AREA - Height Optimized */}
      <main className="relative z-10 flex-grow flex items-center justify-center p-4 lg:p-8">
          <div className="max-w-[90vw] w-full h-full max-h-[85vh] relative animate-fade-in flex flex-col items-center">
            
            <div className="group relative sanctuary-card border border-white/10 rounded-[50px] p-8 md:p-12 shadow-2xl backdrop-blur-sm overflow-hidden flex flex-col w-full h-full">
              
              {/* Navigation Arrows */}
              <button onClick={() => setCurrentPrayerIndex(prev => prev === 0 ? 9 : prev - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-700 hover:text-[#C5B358] transition-all hidden lg:block">
                <ChevronLeft className="w-12 h-12" />
              </button>
              <button onClick={() => setCurrentPrayerIndex(prev => prev === 9 ? 0 : prev + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-700 hover:text-[#C5B358] transition-all hidden lg:block">
                <ChevronRight className="w-12 h-12" />
              </button>

              {/* Card Meta - Compact */}
              <div className="flex justify-between items-start mb-4 shrink-0 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-1 rounded-full border ${isViewingCurrent ? 'border-[#C5B358]/40 text-[#C5B358]' : 'border-white/10 text-slate-500'} uppercase tracking-[0.3em] text-[10px] font-bold`}>
                      <Clock className="w-3 h-3" /> {activeSlot.label}
                    </div>
                    {!isViewingCurrent && (
                      <button onClick={() => setCurrentPrayerIndex(actualNowIndex)} className="text-[#C5B358]/60 hover:text-white text-[9px] uppercase tracking-widest flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </div>
                  {isViewingCurrent && specialPrayer && <div className="text-[9px] text-[#C5B358] bg-[#C5B358]/10 px-3 py-1 rounded uppercase font-bold tracking-widest border border-[#C5B358]/20">Special Liturgy</div>}
              </div>

              {/* Title - Slimmer */}
              <h2 className="text-3xl lg:text-5xl text-[#e8dcb5] font-serif mb-6 italic text-center leading-none tracking-tight shrink-0">{displayPrayer.title}</h2>
              
              {/* Main Text - Dynamic Scale & Flex Center */}
              <div className="flex-grow flex items-center justify-center text-center px-4 overflow-hidden">
                   <p className={`text-slate-200 font-serif leading-[1.3] italic first-letter:text-[#C5B358] first-letter:font-bold first-letter:mr-4 transition-all duration-500 ${getDynamicFontSize(displayPrayer.text)}`}>
                    {displayPrayer.text}
                  </p>
              </div>

              {/* Refrain - Integrated and Static */}
              <div className="mt-6 shrink-0 text-center opacity-80">
                  <p className="text-[#C5B358] font-serif text-2xl lg:text-4xl italic tracking-wide animate-pulse">
                    "Our Lady of Mount Carmel, pray for us."
                  </p>
              </div>
            </div>

            {/* Memorial - Very Bottom */}
            <div className="mt-4 flex flex-col items-center opacity-30 hover:opacity-100 transition-opacity">
              <p className="text-sm text-[#e8dcb5] font-serif italic">"God is good and I can feel His presence."</p>
              <p className="text-[8px] text-slate-600 tracking-[0.4em] uppercase font-semibold">Deacon Scott Pickett • 1960–2024</p>
            </div>
          </div>
      </main>

      {/* MODALS - ADMIN DASHBOARD, INTRO, etc ... (All logic remains identical but UI optimized) */}
      {isAdminPanelOpen && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAdminPanelOpen(false)} />
          <div className="relative w-full max-w-5xl bg-[#0a0a0a] border-l border-white/10 h-full p-8 shadow-2xl flex flex-col animate-fade-in">
            <button onClick={() => setIsAdminPanelOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24}/></button>
            <h2 className="text-xl text-[#e8dcb5] font-serif italic mb-6 border-b border-white/5 pb-4">Admin Command Center</h2>
            <div className="flex flex-grow gap-8 overflow-hidden">
                <div className="w-1/2 flex flex-col overflow-y-auto no-scrollbar">
                  <h3 className="text-[9px] uppercase tracking-widest text-[#C5B358] font-bold mb-4">Schedule Liturgy</h3>
                  <div className="space-y-4 bg-white/[0.03] p-6 rounded-2xl border border-white/10">
                    <input type="date" value={adminDate} onChange={e => setAdminDate(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white text-xs" />
                    <input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-3 text-[#e8dcb5] font-serif" placeholder="Title" />
                    <textarea value={adminText} onChange={e => setAdminText(e.target.value)} rows="5" className="w-full bg-black border border-white/10 rounded-lg p-3 text-white text-sm font-serif" placeholder="Prayer text..." />
                    <button onClick={handleAdminLiturgySave} disabled={isSubmitting} className="w-full py-3 bg-[#C5B358] text-black font-bold uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-2">
                       {isSubmitting ? "Saving..." : "Save to Board"}
                    </button>
                  </div>
                </div>
                <div className="w-1/2 flex flex-col overflow-hidden border-l border-white/5 pl-6">
                  <h3 className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-4">Community Intentions</h3>
                  <div className="flex-grow overflow-y-auto pr-2 no-scrollbar space-y-3">
                    {prayers.map(p => (
                      <div key={p.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex justify-between items-start group">
                        <p className="text-slate-300 font-serif italic text-sm">"{p.text}" <span className="block text-[8px] text-slate-600 mt-1 uppercase">— {p.userName}</span></p>
                        <button onClick={() => handleDelete(p.id)} className="p-1 text-red-900/40 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {isIntroOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-8 animate-soft-motion">
          <div className="max-w-3xl w-full bg-[#1e1e1e]/60 border border-[#C5B358]/20 rounded-[50px] shadow-2xl p-10 text-center relative">
            <Heart className="w-10 h-10 text-[#C5B358] opacity-60 mx-auto mb-6 animate-pulse" />
            <h2 className="text-[10px] uppercase tracking-[0.5em] text-slate-500 font-bold mb-6 italic">A Message from our President</h2>
            <div className="space-y-6 text-[#e8dcb5] font-serif">
              <p className="text-3xl leading-tight italic">"Please help strengthen our communication with God by focusing your mind, heart, and spirit in prayer."</p>
              <p className="text-[#C5B358] text-4xl font-semibold italic">"Our Lady of Mount Carmel, pray for us."</p>
            </div>
            <button onClick={() => setIsIntroOpen(false)} className="mt-10 px-12 py-4 bg-[#681818]/30 border border-[#681818]/30 text-[#e8dcb5] rounded-full font-serif text-xl hover:bg-[#681818]/50 transition-all shadow-2xl">Enter the Chapel</button>
            <div className="mt-8 text-[9px] uppercase tracking-widest text-slate-600 font-bold">Jen Harris • President</div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="fixed bottom-6 left-6 z-50">
          <button onClick={() => setIsModalOpen(true)} className="w-14 h-14 rounded-full bg-[#2a0a0a] border-2 border-[#681818]/50 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
            <Flame className="w-8 h-8 text-[#C5B358] candle-glow" />
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[160] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-12 rounded-[40px] w-full max-w-3xl shadow-2xl animate-fade-in text-center">
            <h2 className="text-2xl text-[#e8dcb5] font-serif mb-6 italic">Offer an intention</h2>
            <textarea value={newPrayer} onChange={(e) => setNewPrayer(e.target.value)} rows="3" maxLength={200} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-slate-100 text-xl font-serif outline-none focus:border-[#C5B358] transition-all no-scrollbar" placeholder="..." />
            <div className="flex justify-between items-center mt-8">
              <span className="text-slate-500 text-xs tracking-widest uppercase">{newPrayer.length}/200</span>
              <div className="flex gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-500 uppercase tracking-widest text-xs hover:text-white">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !newPrayer.trim()} className="bg-[#681818] text-[#e8dcb5] px-12 py-3 rounded-full text-xl font-serif">Amen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[300] bg-[#2a0a0a] border border-[#C5B358]/40 px-8 py-3 rounded-full text-[#e8dcb5] flex items-center gap-4 shadow-2xl animate-fade-in backdrop-blur-md">
          <Info className="w-5 h-5 text-[#C5B358]" />
          <span className="text-lg font-serif italic tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}