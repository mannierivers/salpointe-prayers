import React, { useState, useEffect, useRef } from 'react';
import { Flame, X, Info, Loader2, BookOpen, Clock, User, LogOut, LayoutDashboard, Trash2, Heart, ChevronLeft, ChevronRight, RotateCcw, Settings, Calendar, Save, Sparkles, MessageCircle } from 'lucide-react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from 'firebase/firestore';

// Verified exports from your firebase.js
import { auth, db, appId, googleProvider } from './firebase';

const ADMINS = ['erivers@salpointe.org', 'cptak@salpointe.org'];

// Explicit sequence to ensure "Our Father" (Index 1) and "St. Teresa" (Index 2) are mapped correctly
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
  .candle-glow { filter: drop-shadow(0 0 15px rgba(197, 179, 88, 0.4)); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
  @keyframes softSlowFade { from { opacity: 0; filter: blur(4px); } to { opacity: 1; filter: blur(0); } }
  .animate-soft-motion { animation: softSlowFade 1s ease-in-out forwards; }
  .sanctuary-card { background: radial-gradient(circle at top, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%); }
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
    if (day === 0 || day === 6) day = 1; // Default weekend to Monday

    const startIndex = PRAYER_SEQUENCE.findIndex(p => p.day === day && p.period === period);
    setCurrentPrayerIndex(startIndex);
    setActualNowIndex(startIndex);

    const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const unsubscribeSpecial = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'daily_specials', todayStr), (snap) => {
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
      showToast(`Saved for ${adminDate}`);
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

  // Improved Dynamic Font Sizing for 1080p Screens
  const getDynamicFontSize = (text) => {
    const len = text.length;
    if (len > 550) return 'text-xl lg:text-2xl xl:text-3xl'; // Very long (Anima Christi)
    if (len > 350) return 'text-2xl lg:text-3xl xl:text-4xl'; // Medium (Memorare, St. Teresa)
    return 'text-3xl lg:text-4xl xl:text-6xl'; // Short (Our Father)
  };

  const isAdmin = user && ADMINS.includes(user.email?.toLowerCase());
  const activeSlot = PRAYER_SEQUENCE[currentPrayerIndex];
  const isViewingCurrent = currentPrayerIndex === actualNowIndex;
  const displayPrayer = (isViewingCurrent && specialPrayer) ? specialPrayer : WEEKLY_PRAYERS[activeSlot.day][activeSlot.period];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#1a0a0a] via-slate-950 to-slate-950 opacity-80" />
        <div className="absolute -bottom-48 -right-48 w-[60vw] h-[60vw] bg-[#681818]/5 rounded-full blur-[160px]" />
      </div>

      {/* Nav - Tightened for vertical space */}
      <nav className="relative z-20 w-full p-3 px-8 flex justify-between items-center border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/lancer-75.png" alt="75" className="h-10 w-auto opacity-90" />
            <div className="h-6 w-px bg-white/10" />
            <span className="text-[#e8dcb5] text-xl font-serif italic">Salpointe Prayers</span>
          </div>
          <a href="https://teacher-agenda.vercel.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[9px] uppercase tracking-widest font-bold hover:text-white transition-all">
             Agenda
          </a>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => setIsIntroOpen(true)} className={`transition-all duration-500 p-2 ${isIntroOpen ? 'opacity-0 scale-0' : 'opacity-60 scale-100'}`}>
            <Heart className="w-5 h-5 text-[#e8dcb5]" />
          </button>
          {isAdmin && (
             <button onClick={() => setIsAdminPanelOpen(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C5B358]/10 border border-[#C5B358]/30 text-[#C5B358] text-[9px] uppercase font-bold tracking-widest hover:bg-[#C5B358]/20 transition-all">
               <Settings className="w-3.5 h-3.5" /> Admin
             </button>
          )}
          <button onClick={handleAuth} className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-[#C5B358] transition-colors">
            {user ? "Sign Out" : "Lancer Login"}
          </button>
        </div>
      </nav>

      {/* MAIN SANCTUARY AREA - Optimized vertical spacing */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center p-4 lg:p-6 overflow-hidden">
          <div className="max-w-6xl w-full h-full max-h-[85vh] relative animate-fade-in flex flex-col justify-center">
            
            <div className="group relative sanctuary-card border border-white/10 rounded-[50px] p-8 lg:p-12 shadow-2xl backdrop-blur-sm overflow-hidden flex flex-col w-full h-full justify-between">
              
              {/* Navigation Arrows */}
              <button onClick={() => setCurrentPrayerIndex(prev => prev === 0 ? 9 : prev - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-slate-700 hover:text-[#C5B358] transition-all hidden lg:block bg-black/10 rounded-full">
                <ChevronLeft size={48} />
              </button>
              <button onClick={() => setCurrentPrayerIndex(prev => prev === 9 ? 0 : prev + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-slate-700 hover:text-[#C5B358] transition-all hidden lg:block bg-black/10 rounded-full">
                <ChevronRight size={48} />
              </button>

              <div className="flex flex-col items-center h-full">
                {/* Meta Header */}
                <div className="flex items-center gap-4 mb-4 shrink-0">
                  <div className={`flex items-center gap-2 px-6 py-1.5 rounded-full border ${isViewingCurrent ? 'border-[#C5B358]/40 text-[#C5B358]' : 'border-white/10 text-slate-500'} uppercase tracking-[0.4em] text-[10px] font-bold`}>
                    <Clock size={14} /> {activeSlot.label} {isViewingCurrent && "(Current)"}
                  </div>
                  {!isViewingCurrent && (
                    <button onClick={() => setCurrentPrayerIndex(actualNowIndex)} className="flex items-center gap-2 text-[#C5B358]/60 hover:text-white transition-colors text-[10px] uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                      <RotateCcw size={12} /> Reset
                    </button>
                  )}
                </div>

                <h2 className="text-3xl lg:text-5xl text-[#e8dcb5] font-serif mb-4 italic text-center leading-tight shrink-0">{displayPrayer.title}</h2>
                
                {/* Scrollable Center Area - Fixed Overflow */}
                <div className="flex-grow flex items-center justify-center w-full overflow-hidden px-4 lg:px-12">
                   <p className={`text-slate-200 font-serif leading-[1.35] text-center italic transition-all duration-700 ${getDynamicFontSize(displayPrayer.text)}`}>
                    {displayPrayer.text}
                  </p>
                </div>

                {/* Integrated Refrain */}
                <div className="mt-4 pt-4 border-t border-white/5 w-full max-w-xl text-center shrink-0">
                    <p className="text-[#C5B358] font-serif text-2xl lg:text-3xl italic tracking-wide animate-pulse">
                      "Our Lady of Mount Carmel, pray for us."
                    </p>
                </div>
              </div>
            </div>

            {/* Memorial - Tucked away for space */}
            <div className="mt-4 flex flex-col items-center opacity-30 hover:opacity-100 transition-opacity shrink-0">
              <p className="text-sm text-[#e8dcb5] font-serif italic mb-0.5">"God is good and I can feel His presence."</p>
              <p className="text-[8px] text-slate-600 tracking-[0.4em] uppercase font-semibold">Deacon Scott Pickett • 1960–2024</p>
            </div>
          </div>
      </main>

      {/* ADMIN PANEL - COMMAND CENTER */}
      {isAdminPanelOpen && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAdminPanelOpen(false)} />
          <div className="relative w-full max-w-5xl bg-[#0a0a0a] border-l border-white/10 h-full p-8 shadow-2xl flex flex-col animate-fade-in">
            <button onClick={() => setIsAdminPanelOpen(false)} className="absolute top-6 right-8 text-slate-500 hover:text-white transition-transform active:scale-90"><X size={32}/></button>
            <h2 className="text-2xl text-[#e8dcb5] font-serif italic mb-8 border-b border-white/5 pb-4 flex items-center gap-4">
              <Settings className="text-[#C5B358]" /> Admin Command Center
            </h2>

            <div className="flex flex-grow gap-8 overflow-hidden">
                <div className="w-1/2 flex flex-col overflow-y-auto no-scrollbar">
                  <h3 className="text-[10px] uppercase tracking-widest text-[#C5B358] font-bold mb-4 flex items-center gap-2"><Calendar size={16}/> Schedule Liturgy</h3>
                  <div className="space-y-4 bg-white/[0.03] p-6 rounded-[25px] border border-white/10">
                    <input type="date" value={adminDate} onChange={e => setAdminDate(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm" />
                    <input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-[#e8dcb5] text-lg font-serif" placeholder="Title" />
                    <textarea value={adminText} onChange={e => setAdminText(e.target.value)} rows="6" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm font-serif" placeholder="Prayer text..." />
                    <button onClick={handleAdminLiturgySave} disabled={isSubmitting} className="w-full py-4 bg-[#C5B358] text-black font-bold uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-2 hover:bg-white transition-all">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Liturgy
                    </button>
                  </div>
                </div>

                <div className="w-1/2 flex flex-col overflow-hidden border-l border-white/5 pl-8">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 flex items-center gap-2"><MessageCircle size={16}/> Live Community Intentions</h3>
                  <div className="flex-grow overflow-y-auto pr-4 no-scrollbar space-y-4">
                    {prayers.map(p => (
                      <div key={p.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-start group hover:border-[#681818]/40 transition-all">
                        <div>
                          <p className="text-slate-300 font-serif italic text-lg leading-snug">"{p.text}"</p>
                          <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2 font-semibold">— {p.userName}</p>
                        </div>
                        <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-950/20 text-red-900/40 hover:text-red-500 hover:bg-red-950/40 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* INTRO MODAL */}
      {isIntroOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-8 animate-soft-motion">
          <div className="max-w-3xl w-full bg-[#1e1e1e]/60 border border-[#C5B358]/20 rounded-[50px] shadow-2xl p-12 text-center relative overflow-hidden">
            <Heart className="w-16 h-16 text-[#C5B358] opacity-60 mx-auto mb-8 animate-pulse" />
            <h2 className="text-sm uppercase tracking-[0.5em] text-slate-500 font-bold mb-8 italic">A Message from our President</h2>
            <div className="space-y-8 text-[#e8dcb5] font-serif">
              <p className="text-4xl md:text-5xl leading-tight italic">"Please help strengthen our communication with God by focusing your mind, heart, and spirit in prayer."</p>
              <p className="text-[#C5B358] text-4xl font-semibold italic">"Our Lady of Mount Carmel, pray for us."</p>
            </div>
            <button onClick={() => setIsIntroOpen(false)} className="mt-12 px-20 py-5 bg-[#681818]/30 border border-[#C5B358]/30 text-[#e8dcb5] rounded-full font-serif text-2xl hover:bg-[#681818]/50 transition-all tracking-widest shadow-2xl">Enter the Chapel</button>
            <div className="mt-10 text-[11px] uppercase tracking-widest text-slate-600 font-bold">Jen Harris • President of Salpointe Catholic</div>
          </div>
        </div>
      )}

      {/* ADMIN FAB: Bottom Left */}
      {isAdmin && (
        <div className="fixed bottom-10 left-10 z-50">
          <button onClick={() => setIsModalOpen(true)} className="w-20 h-20 rounded-full bg-[#2a0a0a] border-2 border-[#681818]/50 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform shadow-[0_0_40px_rgba(104,24,24,0.3)]">
            <Flame size={40} className="text-[#C5B358] candle-glow" />
          </button>
        </div>
      )}

      {/* INTENTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[160] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-16 rounded-[40px] w-full max-w-4xl shadow-2xl animate-fade-in text-center">
            <h2 className="text-5xl text-[#e8dcb5] font-serif mb-12 italic tracking-tight">Offer an intention</h2>
            <textarea value={newPrayer} onChange={(e) => setNewPrayer(e.target.value)} rows="4" maxLength={200} className="w-full bg-black/40 border border-white/10 rounded-3xl p-10 text-slate-100 text-4xl font-serif outline-none focus:border-[#C5B358] transition-all no-scrollbar italic leading-relaxed" placeholder="Type here..." />
            <div className="flex justify-between items-center mt-12 px-6">
              <span className="text-slate-500 text-xl tracking-widest font-sans uppercase font-light">{newPrayer.length}/200</span>
              <div className="flex gap-8">
                <button onClick={() => setIsModalOpen(false)} className="px-12 py-5 text-slate-500 uppercase tracking-widest text-sm font-bold hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !newPrayer.trim()} className="bg-[#681818] text-[#e8dcb5] px-24 py-6 rounded-full text-3xl font-serif hover:bg-[#801e1e] transition-all shadow-xl">Amen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      {toast.visible && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-[#2a0a0a] border border-[#C5B358]/40 px-10 py-5 rounded-full text-[#e8dcb5] flex items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in backdrop-blur-md">
          <Info size={32} className="text-[#C5B358]" />
          <span className="text-2xl font-serif italic tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}