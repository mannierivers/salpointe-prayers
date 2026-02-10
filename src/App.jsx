import React, { useState, useEffect, useRef } from 'react';
import { Flame, X, Info, Loader2, BookOpen, Clock, User, LogOut, LayoutDashboard, Trash2, Heart, ChevronLeft, ChevronRight, RotateCcw, Settings, Calendar, Save, Sparkles, MessageCircle, Undo2 } from 'lucide-react';
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
  @keyframes softSlowFade { from { opacity: 0; filter: blur(4px); } to { opacity: 1; filter: blur(0); } }
  .animate-soft-motion { animation: softSlowFade 1.2s ease-in-out forwards; }
`;

export default function App() {
  const [user, setUser] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(true);
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
    if (day === 0 || day === 6) day = 1;

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
      showToast("Liturgy saved.");
      setAdminTitle(''); setAdminText('');
    } catch (e) { showToast("Save failed."); }
    finally { setIsSubmitting(false); }
  };

  const handleRevertToWeekly = async () => {
    const dateParts = adminDate.split('-');
    const dateId = `${parseInt(dateParts[0])}-${parseInt(dateParts[1])}-${parseInt(dateParts[2])}`;
    if (!window.confirm(`Revert to weekly cycle for ${adminDate}?`)) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'daily_specials', dateId)); showToast("Reverted."); } 
    catch (e) { showToast("Revert failed."); }
  };

  const handleDeleteIntention = async (id) => {
    if (!window.confirm("Remove intention?")) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prayers', id)); showToast("Removed."); } 
    catch (e) { showToast("Error."); }
  };

  const handleSubmitIntention = async () => {
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

  const getDynamicFontSize = (text) => {
    const len = text.length;
    if (len > 550) return { fontSize: 'clamp(1.2rem, 3.5vh, 2.5rem)' }; 
    if (len > 250) return { fontSize: 'clamp(1.8rem, 4.8vh, 3.8rem)' }; 
    return { fontSize: 'clamp(2.5rem, 7.5vh, 6.5rem)' };               
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
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#1a0a0a] via-slate-950 opacity-80" />
        <div className="absolute bottom-0 right-0 w-[40vw] h-[40vw] bg-[#681818]/5 rounded-full blur-[160px]" />
      </div>

      {/* Global Navigation */}
      <nav className="relative z-30 w-full p-4 px-10 flex justify-between items-center border-b border-white/5 bg-slate-950/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/lancer-75.png" alt="75" className="h-10 w-auto opacity-90" />
            <div className="h-6 w-px bg-white/10" />
            <span className="text-[#e8dcb5] text-xl font-serif italic tracking-wide">Salpointe Prayers</span>
          </div>
          <a href="https://teacher-agenda.vercel.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] uppercase tracking-widest font-bold hover:text-white transition-all">
            <LayoutDashboard size={14}/> Teacher Agenda
          </a>
        </div>

        <div className="flex items-center gap-5 bg-white/5 rounded-full px-5 py-2 border border-white/5 shadow-inner">
            <button onClick={() => setCurrentPrayerIndex(prev => prev === 0 ? 9 : prev - 1)} className="hover:text-[#C5B358] transition-colors"><ChevronLeft size={28}/></button>
            <div className="flex flex-col items-center min-w-[140px]">
                <span className="text-[#e8dcb5] text-xl font-serif italic leading-none">{displayPrayer.title}</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">{activeSlot.label} {isViewingCurrent && "• Now"}</span>
            </div>
            <button onClick={() => setCurrentPrayerIndex(prev => prev === 9 ? 0 : prev + 1)} className="hover:text-[#C5B358] transition-colors"><ChevronRight size={28}/></button>
        </div>

        <div className="flex items-center gap-6">
           {!isViewingCurrent && (
            <button onClick={() => setCurrentPrayerIndex(actualNowIndex)} className="text-[#C5B358] hover:text-white transition-colors bg-[#C5B358]/10 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest border border-[#C5B358]/20 flex items-center gap-1">
              <RotateCcw size={14}/> Reset
            </button>
           )}
           {isViewingCurrent && specialPrayer && <div className="text-[10px] text-[#C5B358] animate-pulse bg-[#C5B358]/10 px-3 py-1 rounded-full uppercase font-bold tracking-widest border border-[#C5B358]/20 flex items-center gap-2"><Sparkles size={14}/> Special</div>}
           <button onClick={() => setIsIntroOpen(true)} className={`transition-all duration-500 ${isIntroOpen ? 'opacity-0 scale-0' : 'opacity-60 scale-100'}`}>
            <Heart className="w-6 h-6 text-[#e8dcb5]" />
          </button>
          {isAdmin && (
             <button onClick={() => setIsAdminPanelOpen(true)} className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#C5B358]/20 border border-[#C5B358]/40 text-[#C5B358] text-[11px] uppercase font-bold tracking-widest shadow-lg">
               <Settings size={16} /> Admin
             </button>
          )}
          <button onClick={handleAuth} className="text-[11px] tracking-widest uppercase text-slate-500 hover:text-white transition-colors">
            {user ? "Logout" : "Login"}
          </button>
        </div>
      </nav>

      {/* Main Prayer Stage */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center p-12 lg:p-20 overflow-hidden">
          <div className="max-w-7xl w-full h-full flex flex-col items-center justify-center animate-fade-in relative">
              <p className="text-slate-100 font-serif leading-[1.35] text-center italic transition-all duration-1000" style={getDynamicFontSize(displayPrayer.text)}>
                <span className="text-[#C5B358] font-bold mr-6 text-[1.5em] inline-block align-middle leading-none opacity-80">{displayPrayer.text.charAt(0)}</span>
                {displayPrayer.text.slice(1)}
              </p>
          </div>
      </main>

      {/* Footer Refrain */}
      <footer className="relative z-20 w-full p-8 border-t border-white/5 bg-slate-950/40 backdrop-blur-md text-center shrink-0">
          <p className="text-[#C5B358] font-serif text-4xl lg:text-6xl italic tracking-wide animate-pulse duration-[6000ms]">"Our Lady of Mount Carmel, pray for us."</p>
      </footer>

      {/* SUBTLE JET NOIR LOGO (BOTTOM RIGHT) */}
      <div className="fixed bottom-6 right-6 z-[40] opacity-10 hover:opacity-50 transition-opacity duration-700">
          <a href="https://jetnoir.systems" target="_blank" rel="noopener noreferrer" title="Powered by Jet Noir Systems">
            <img src="/jet-noir-logo-wht.svg" alt="Jet Noir" className="w-8 h-8 grayscale" />
          </a>
      </div>

      {/* Admin Command Center */}
      {isAdminPanelOpen && (
        <div className="fixed inset-0 z-[150] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAdminPanelOpen(false)} />
          <div className="relative w-full max-w-5xl bg-[#0a0a0a] border-l border-white/10 h-full p-10 shadow-2xl flex flex-col animate-fade-in">
            <button onClick={() => setIsAdminPanelOpen(false)} className="absolute top-6 right-8 text-slate-500 hover:text-white transition-transform active:scale-90"><X size={32}/></button>
            <h2 className="text-2xl text-[#e8dcb5] font-serif italic mb-8 border-b border-white/5 pb-4 flex items-center gap-4">
              <Settings className="text-[#C5B358]" /> Admin Dashboard
            </h2>
            <div className="flex flex-grow gap-10 overflow-hidden">
                <div className="w-1/2 flex flex-col overflow-y-auto no-scrollbar">
                  <h3 className="text-[10px] uppercase tracking-widest text-[#C5B358] font-bold mb-4 flex items-center gap-2"><Calendar size={16}/> Scheduler</h3>
                  <div className="space-y-4 bg-white/[0.03] p-6 rounded-[25px] border border-white/10 shadow-xl">
                    <input type="date" value={adminDate} onChange={e => setAdminDate(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-sans" />
                    <input value={adminTitle} onChange={e => setAdminTitle(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-[#e8dcb5] font-serif text-xl" placeholder="Title" />
                    <textarea value={adminText} onChange={e => setAdminText(e.target.value)} rows="8" className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-serif text-lg" placeholder="Prayer text..." />
                    <div className="flex gap-3">
                        <button onClick={handleAdminLiturgySave} disabled={isSubmitting} className="flex-grow py-4 bg-[#C5B358] text-black font-bold uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-2"><Save size={16} /> Save</button>
                        <button onClick={handleRevertToWeekly} className="px-6 py-4 bg-red-950/20 border border-red-900/40 text-red-500 font-bold uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-900/40 transition-all flex items-center gap-2"><Undo2 size={16} /> Revert</button>
                    </div>
                  </div>
                </div>
                <div className="w-1/2 flex flex-col overflow-hidden border-l border-white/5 pl-8">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 flex items-center gap-2"><MessageCircle size={16}/> Community Intentions</h3>
                  <div className="flex-grow overflow-y-auto pr-4 no-scrollbar space-y-4">
                    {prayers.map(p => (
                      <div key={p.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-start group">
                        <div><p className="text-slate-300 font-serif italic text-lg">"{p.text}"</p><p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2 font-bold">— {p.userName}</p></div>
                        <button onClick={() => handleDeleteIntention(p.id)} className="p-2 text-red-900/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Intro Modal */}
      {isIntroOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-12 animate-soft-motion">
          <div className="max-w-4xl w-full bg-[#1e1e1e]/60 border border-[#C5B358]/20 rounded-[60px] shadow-2xl p-20 text-center relative overflow-hidden">
            <Heart className="w-16 h-16 text-[#C5B358] opacity-60 mx-auto mb-10 animate-pulse" />
            <h2 className="text-sm uppercase tracking-[0.6em] text-slate-500 font-bold mb-10 italic">A Message from our President</h2>
            <div className="space-y-10 text-[#e8dcb5] font-serif text-center">
              <p className="text-4xl leading-tight italic">"Please help strengthen our communication with God by focusing your mind, heart, and spirit in prayer."</p>
              <p className="text-[#C5B358] text-4xl font-semibold italic">"Our Lady of Mount Carmel, pray for us."</p>
            </div>
            <button onClick={() => setIsIntroOpen(false)} className="mt-16 px-16 py-5 bg-[#681818]/30 border border-[#C5B358]/30 text-[#e8dcb5] rounded-full font-serif text-2xl hover:bg-[#681818]/50 transition-all tracking-widest shadow-2xl">Enter the Chapel</button>
            <div className="mt-12 text-[11px] uppercase tracking-widest text-slate-600 font-bold text-center w-full">Jen Harris • President of Salpointe Catholic</div>
          </div>
        </div>
      )}

      {/* FAB (Admin Only) */}
      {isAdmin && (
        <div className="fixed bottom-10 left-10 z-50">
          <button onClick={() => setIsModalOpen(true)} className="w-20 h-20 rounded-full bg-[#2a0a0a] border-2 border-[#681818]/50 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform shadow-[0_0_40px_rgba(104,24,24,0.3)]">
            <Flame size={40} className="text-[#C5B358]" />
          </button>
        </div>
      )}

      {/* Intention Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[160] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-16 rounded-[40px] w-full max-w-4xl shadow-2xl animate-fade-in text-center">
            <h2 className="text-4xl text-[#e8dcb5] font-serif mb-12 italic tracking-tight">Offer an intention</h2>
            <textarea value={newPrayer} onChange={(e) => setNewPrayer(e.target.value)} rows="5" maxLength={200} className="w-full bg-black/40 border border-white/10 rounded-3xl p-10 text-slate-100 text-4xl font-serif outline-none focus:border-[#C5B358] no-scrollbar leading-relaxed" placeholder="Type here..." />
            <div className="flex justify-between items-center mt-12 px-6">
              <span className="text-slate-500 text-lg tracking-widest font-sans uppercase font-light">{newPrayer.length}/200</span>
              <div className="flex gap-8">
                <button onClick={() => setIsModalOpen(false)} className="px-12 py-5 text-slate-500 uppercase tracking-widest text-sm font-bold hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSubmitIntention} disabled={isSubmitting || !newPrayer.trim()} className="bg-[#681818] text-[#e8dcb5] px-24 py-6 rounded-full text-3xl font-serif hover:bg-[#801e1e] transition-all">Amen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-[#2a0a0a] border border-[#C5B358]/40 px-10 py-5 rounded-full text-[#e8dcb5] flex items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in backdrop-blur-md">
          <Info size={32} className="text-[#C5B358]" />
          <span className="text-2xl font-serif italic tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}