import React, { useState, useEffect, useRef } from 'react';
import { Flame, X, Info, Loader2, BookOpen, Clock, User, LogOut, LayoutDashboard, Trash2, Heart, ChevronLeft, ChevronRight, RotateCcw, Settings, Calendar, Save, Sparkles } from 'lucide-react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc } from 'firebase/firestore';

// Verified exports from your firebase.js
import { auth, db, appId, googleProvider } from './firebase';

const ADMINS = ['erivers@salpointe.org', 'cptak@salpointe.org'];

const PRAYER_SEQUENCE = [
  { day: 1, period: 'morning', label: "Monday Morning" },
  { day: 1, period: 'afternoon', label: "Monday Afternoon" },
  { day: 2, period: 'morning', label: "Tuesday Morning" },
  { day: 2, period: 'afternoon', label: "Tuesday Afternoon" },
  { day: 3, period: 'morning', label: "Wednesday Morning" },
  { day: 3, period: 'afternoon', label: "Wednesday Afternoon" },
  { day: 4, period: 'morning', label: "Thursday Morning" },
  { day: 4, period: 'afternoon', label: "Thursday Afternoon" },
  { day: 5, period: 'morning', label: "Friday Morning" },
  { day: 5, period: 'afternoon', label: "Friday Afternoon" }
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
  .candle-glow { filter: drop-shadow(0 0 15px rgba(197, 179, 88, 0.7)); }
  
  /* Multi-column layout for long prayers */
  .prayer-columns {
    column-count: 2;
    column-gap: 4rem;
    column-fill: auto;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
  
  @keyframes softSlowFade { from { opacity: 0; filter: blur(4px); } to { opacity: 1; filter: blur(0); } }
  .animate-soft-motion { animation: softSlowFade 1.2s ease-in-out forwards; }
`;

export default function App() {
  const [user, setUser] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(true);
  const [isIntentionsExpanded, setIsIntentionsExpanded] = useState(false);
  const [newPrayer, setNewPrayer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false });
  
  // Navigation & Time
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [actualNowIndex, setActualNowIndex] = useState(0);

  // Admin Dashboard States
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

    // Auto-close Intro after 3 seconds
    const introTimer = setTimeout(() => {
      setIsIntroOpen(false);
    }, 4500);

    // Initial Time Detection
    const now = new Date();
    let day = now.getDay();
    const hour = now.getHours();
    const period = hour < 12 ? 'morning' : 'afternoon';
    if (day === 0 || day === 6) day = 1;
    const startIndex = PRAYER_SEQUENCE.findIndex(p => p.day === day && p.period === period);
    setCurrentPrayerIndex(startIndex);
    setActualNowIndex(startIndex);

    // Listen for "Today's" Special Liturgy
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
    // adminDate comes from input as YYYY-MM-DD
    const dateParts = adminDate.split('-');
    const dateId = `${parseInt(dateParts[0])}-${parseInt(dateParts[1])}-${parseInt(dateParts[2])}`;
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'daily_specials', dateId), {
        title: adminTitle,
        text: adminText,
        updatedBy: user.email,
        timestamp: serverTimestamp()
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

  const isAdmin = user && ADMINS.includes(user.email?.toLowerCase());
  const activeSlot = PRAYER_SEQUENCE[currentPrayerIndex];
  const isViewingCurrent = currentPrayerIndex === actualNowIndex;
  const displayPrayer = (isViewingCurrent && specialPrayer) ? specialPrayer : WEEKLY_PRAYERS[activeSlot.day][activeSlot.period];

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#2a0a0a] to-transparent opacity-60" />
        <div className="absolute -bottom-24 -right-24 w-1/2 h-1/2 bg-[#681818]/10 rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-20 w-full p-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <img src="/lancer-75.png" alt="75" className="h-10 w-auto opacity-90" />
            <div className="h-6 w-px bg-white/10" />
            <span className="text-[#e8dcb5] text-xl font-serif italic tracking-wide">Salpointe Prayers</span>
          </div>
          <a href="https://teacher-agenda.vercel.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] uppercase tracking-widest font-semibold hover:text-white transition-all">
            <LayoutDashboard className="w-3.5 h-3.5" /> Agenda
          </a>
        </div>

        <div className="flex items-center gap-6">
          {/* President's Message Recall */}
          <button onClick={() => setIsIntroOpen(true)} className="p-2 text-[#e8dcb5] hover:text-white transition-colors" title="Message from Jen Harris">
            <Heart className={`w-5 h-5 ${isIntroOpen ? 'opacity-0' : 'opacity-60'}`} />
          </button>

          {/* Admin Dashboard Trigger */}
          {isAdmin && (
             <button onClick={() => setIsAdminPanelOpen(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C5B358]/20 border border-[#C5B358]/40 text-[#C5B358] text-[10px] uppercase font-bold tracking-widest hover:bg-[#C5B358]/30 transition-all">
               <Settings className="w-3 h-3" /> Command Center
             </button>
          )}

          {user && <span className="text-[#e8dcb5]/60 text-xs font-serif italic hidden md:inline">{user.displayName}</span>}
          <button onClick={handleAuth} className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-white transition-colors">
            {user ? "Sign Out" : "Sign In"}
          </button>
        </div>
      </nav>

      {/* MAIN SANCTUARY AREA */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center p-8 transition-all duration-1000">
          <div className="max-w-7xl w-full relative">
            
            <div className="text-center mb-10 animate-fade-in">
              <h1 className="text-6xl text-slate-100 font-serif font-light mb-4 italic tracking-tight">Intentions</h1>
              <p className="text-slate-500 font-serif italic text-2xl">Our Lady of Mount Carmel, pray for us.</p>
            </div>
            
            <div className="group relative">
              <button onClick={() => setCurrentPrayerIndex(prev => prev === 0 ? 9 : prev - 1)} className="absolute -left-20 top-1/2 -translate-y-1/2 p-6 text-slate-600 hover:text-[#C5B358] transition-all opacity-0 group-hover:opacity-100 hidden lg:block">
                <ChevronLeft className="w-16 h-16" />
              </button>
              <button onClick={() => setCurrentPrayerIndex(prev => prev === 9 ? 0 : prev + 1)} className="absolute -right-20 top-1/2 -translate-y-1/2 p-6 text-slate-600 hover:text-[#C5B358] transition-all opacity-0 group-hover:opacity-100 hidden lg:block">
                <ChevronRight className="w-16 h-16" />
              </button>

              {/* DUAL COLUMN PRAYER CARD */}
              <div className="p-16 md:p-20 rounded-[40px] bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-md animate-fade-in relative flex flex-col min-h-[55vh]">
                <div className="flex flex-col items-center gap-4 mb-10 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-3 px-6 py-2 rounded-full border ${isViewingCurrent ? 'border-[#C5B358]/40 text-[#C5B358]' : 'border-white/10 text-slate-500'} uppercase tracking-[0.4em] text-xs font-bold`}>
                      <Clock className="w-4 h-4" /> {activeSlot.label} {isViewingCurrent && "(Today)"}
                    </div>
                    {isViewingCurrent && specialPrayer && <div className="flex items-center gap-1 text-[10px] text-[#C5B358] animate-pulse bg-[#C5B358]/10 px-3 py-1 rounded uppercase font-bold tracking-tighter border border-[#C5B358]/20"><Sparkles className="w-3 h-3"/> Special Liturgy</div>}
                  </div>
                  {!isViewingCurrent && (
                    <button onClick={() => setCurrentPrayerIndex(actualNowIndex)} className="flex items-center gap-2 text-[#C5B358] hover:text-white transition-colors text-xs uppercase tracking-widest bg-[#C5B358]/10 px-4 py-1.5 rounded-full border border-[#C5B358]/20">
                      <RotateCcw className="w-4 h-4" /> Return to Today
                    </button>
                  )}
                </div>

                <h2 className="text-5xl text-[#e8dcb5] font-serif mb-12 italic text-center leading-tight shrink-0">{displayPrayer.title}</h2>
                
                {/* Column layout ensures full visibility without scrolling */}
                <div className="flex-grow prayer-columns text-slate-200 font-serif text-3xl leading-relaxed italic first-letter:text-8xl first-letter:text-[#C5B358] first-letter:font-bold first-letter:mr-5">
                   {displayPrayer.text}
                </div>
              </div>
            </div>

            <div className="mt-16 text-center opacity-40 hover:opacity-100 transition-opacity duration-1000">
              <p className="text-lg text-[#e8dcb5] font-serif italic mb-1">"God is good and I can feel His presence."</p>
              <p className="text-xs text-slate-500 tracking-[0.3em] uppercase">In Loving Memory of Deacon Scott Pickett</p>
            </div>
          </div>
      </main>

      {/* ADMIN DRAWER: Command Center */}
      {isAdminPanelOpen && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAdminPanelOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#0a0a0a] border-l border-white/10 h-full p-12 shadow-2xl animate-fade-in overflow-y-auto">
            <button onClick={() => setIsAdminPanelOpen(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X /></button>
            <h2 className="text-3xl text-[#e8dcb5] font-serif italic mb-10 flex items-center gap-4 border-b border-white/5 pb-6">
              <Settings className="text-[#C5B358]" /> Admin Command Center
            </h2>

            {/* Liturgy Scheduler */}
            <section className="mb-12">
              <h3 className="text-xs uppercase tracking-widest text-[#C5B358] font-bold mb-6 flex items-center gap-2"><Calendar className="w-4 h-4"/> Schedule Future Liturgy</h3>
              <div className="space-y-6 bg-white/[0.03] p-8 rounded-2xl border border-white/10">
                <div>
                  <label className="text-[10px] uppercase text-slate-500 block mb-2 font-bold tracking-widest">Select Date</label>
                  <input type="date" value={adminDate} onChange={e => setAdminDate(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-[#C5B358] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-500 block mb-2 font-bold tracking-widest">Prayer Title</label>
                  <input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:border-[#C5B358] outline-none" placeholder="e.g. St. Teresa Feast Day" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-500 block mb-2 font-bold tracking-widest">Prayer Text</label>
                  <textarea value={adminText} onChange={e => setAdminText(e.target.value)} rows="8" className="w-full bg-black border border-white/10 rounded-lg p-4 text-white focus:border-[#C5B358] outline-none resize-none no-scrollbar" placeholder="Enter the full prayer text..." />
                </div>
                <button onClick={handleAdminLiturgySave} disabled={isSubmitting} className="w-full py-4 bg-[#C5B358] text-black font-bold uppercase tracking-widest text-xs rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />} Save Liturgy for Classroom Display
                </button>
              </div>
            </section>

            {/* Intentions Manager */}
            <section>
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-6 flex items-center gap-2"><Flame className="w-4 h-4"/> Manage Community Intentions</h3>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-4 no-scrollbar">
                {prayers.map(p => (
                  <div key={p.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex justify-between items-center group">
                    <div>
                      <p className="text-slate-300 font-serif italic text-lg">"{p.text}"</p>
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">— {p.userName}</p>
                    </div>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-red-900/40 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* INTRO: Jen Harris Message */}
      {isIntroOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-12 animate-soft-motion">
          <div className="max-w-3xl w-full bg-[#1e1e1e]/60 border border-[#C5B358]/20 rounded-[50px] shadow-2xl p-16 text-center">
            <Heart className="w-12 h-12 text-[#C5B358] opacity-60 mx-auto mb-10" />
            <h2 className="text-xs uppercase tracking-[0.5em] text-slate-500 font-bold mb-10 italic">A Message from our President</h2>
            <div className="space-y-10 text-[#e8dcb5] font-serif">
              <p className="text-4xl leading-relaxed italic">"Please help strengthen our communication with God by focusing your mind, heart, and spirit in prayer for the intentions of the Salpointe community."</p>
              <p className="text-slate-400 text-xl leading-relaxed">You might have your own prayer tradition or want to begin by reading the intentions, keeping those intentions in mind as you recite the daily prayer, and finishing with:</p>
              <p className="text-[#C5B358] text-4xl font-semibold italic">"Our Lady of Mt. Carmel, pray for us."</p>
            </div>
            <button onClick={() => setIsIntroOpen(false)} className="mt-16 px-16 py-5 bg-[#681818]/30 border border-[#C5B358]/30 text-[#e8dcb5] rounded-full font-serif text-2xl hover:bg-[#681818]/50 transition-all tracking-widest">Enter the Chapel</button>
            <div className="mt-12 text-[10px] uppercase tracking-widest text-slate-600 font-bold">Jen Harris • President</div>
          </div>
        </div>
      )}

      {/* FAB: Admin Add Intention */}
      {isAdmin && (
        <div className="fixed bottom-10 left-10 z-50">
          <button onClick={() => setIsModalOpen(true)} className="w-20 h-20 rounded-full bg-[#2a0a0a] border-2 border-[#681818]/50 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95">
            <Flame className="w-10 h-10 text-[#C5B358] candle-glow" />
          </button>
        </div>
      )}

      {/* Modal: Admin Add Intention */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[160] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-16 rounded-[40px] w-full max-w-3xl shadow-2xl animate-fade-in">
            <h2 className="text-4xl text-[#e8dcb5] font-serif mb-10 text-center italic">Offer a Community Intention</h2>
            <textarea value={newPrayer} onChange={(e) => setNewPrayer(e.target.value)} rows="5" maxLength={200} className="w-full bg-black/40 border border-white/10 rounded-2xl p-8 text-slate-100 text-3xl font-serif outline-none focus:border-[#C5B358] transition-all" placeholder="Enter intention..." />
            <div className="flex justify-between items-center mt-10">
              <span className="text-slate-500 text-lg tracking-widest uppercase">{newPrayer.length}/200</span>
              <div className="flex gap-6">
                <button onClick={() => setIsModalOpen(false)} className="px-10 py-4 text-slate-500 uppercase tracking-widest text-xs hover:text-white">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !newPrayer.trim()} className="bg-[#681818] text-[#e8dcb5] px-16 py-4 rounded-full text-2xl font-serif hover:bg-[#801e1e] transition-all">Amen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-[#2a0a0a] border border-[#C5B358]/30 px-10 py-5 rounded-full text-[#e8dcb5] flex items-center gap-4 shadow-2xl animate-fade-in">
          <Info className="w-6 h-6 text-[#C5B358]" />
          <span className="text-xl font-serif italic">{toast.message}</span>
        </div>
      )}
    </div>
  );
}