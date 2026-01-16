import React, { useState, useEffect, useRef } from 'react';
import { Flame, X, Info, Loader2, BookOpen, Clock, User, LogOut, LayoutDashboard, Trash2, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

// Verified exports from your firebase.js
import { auth, db, appId, googleProvider } from './firebase';

const ADMINS = ['erivers@salpointe.org', 'cptak@salpointe.org'];

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
  
  html, body, #root { 
    height: 100vh; 
    width: 100vw; 
    overflow: hidden; 
    margin: 0; 
    background-color: #020617;
  }

  .font-serif { font-family: 'Cormorant Garamond', serif; }
  .font-sans { font-family: 'Inter', sans-serif; }
  
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .candle-glow { filter: drop-shadow(0 0 12px rgba(197, 179, 88, 0.6)); }
  
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }

  @keyframes softSlowFade { from { opacity: 0; filter: blur(4px); } to { opacity: 1; filter: blur(0); } }
  .animate-soft-motion { animation: softSlowFade 1.5s ease-in-out forwards; }

  .transition-width { transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
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
  const [dailyPrayer, setDailyPrayer] = useState(null);

  const toastTimerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.email?.toLowerCase().endsWith('@salpointe.org')) {
        setUser(u);
      } else if (u) {
        signOut(auth);
        showToast("Access restricted to @salpointe.org");
      } else {
        setUser(null);
      }
    });

    const now = new Date();
    const day = now.getDay();
    const isMorning = now.getHours() < 12;

    if (day >= 1 && day <= 5) {
      const todayData = WEEKLY_PRAYERS[day];
      setDailyPrayer({ 
        ...(isMorning ? todayData.morning : todayData.afternoon), 
        period: isMorning ? "Morning" : "Afternoon" 
      });
    } else {
      setDailyPrayer({ 
        title: "Lancer Blessing", 
        text: "May the Lord bless the Salpointe community this weekend. Our Lady of Mount Carmel, pray for us.", 
        period: "Weekend" 
      });
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !appId) return;
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'prayers'), 
      orderBy('timestamp', 'desc'), 
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appId]);

  const showToast = (msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: String(msg), visible: true });
    toastTimerRef.current = setTimeout(() => setToast({ message: '', visible: false }), 4000);
  };

  const handleAuth = async () => {
    if (user) await signOut(auth);
    else {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (e) {
        showToast("Sign in failed.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this intention?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prayers', id));
      showToast("Intention removed.");
    } catch (e) {
      showToast("Delete failed.");
    }
  };

  const handleSubmit = async () => {
    if (!newPrayer.trim() || isSubmitting || !user) return;
    setIsSubmitting(true);
    try {
      const payload = {
        text: newPrayer.trim(),
        uid: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        userEmail: user.email,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'prayers'), payload);
      setNewPrayer('');
      setIsModalOpen(false);
      showToast("Intention shared.");
    } catch (e) {
      showToast("Error sharing intention.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = user && ADMINS.includes(user.email?.toLowerCase());

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#2a0a0a] to-transparent opacity-60" />
        <div className="absolute -bottom-24 -right-24 w-1/2 h-1/2 bg-[#681818]/10 rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 w-full p-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <img src="/lancer-75.png" alt="75" className="h-10 w-auto opacity-90" onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="h-6 w-px bg-white/10" />
            <span className="text-[#e8dcb5] text-xl font-serif italic tracking-wide">Salpointe Prayers</span>
          </div>
          <a href="https://teacher-agenda.vercel.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] uppercase tracking-widest font-semibold hover:text-white">
            <LayoutDashboard className="w-3.5 h-3.5" /> Agenda
          </a>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-[#e8dcb5]/60 text-xs font-serif italic">{user.displayName}</span>}
          <button onClick={handleAuth} className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-white">
            {user ? "Sign Out" : "Sign In"}
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="relative z-10 flex-grow flex overflow-hidden">
        
        {/* CENTER STAGE: Daily Prayer */}
        <div className={`flex-grow flex flex-col items-center justify-center p-8 transition-all duration-700 ${isIntentionsExpanded ? 'pr-8' : 'pr-16'}`}>
          <div className="max-w-4xl w-full">
            <div className="text-center mb-10 animate-fade-in">
              <h1 className="text-5xl text-slate-100 font-serif font-light mb-3 italic">Intentions</h1>
              <p className="text-slate-500 font-serif italic text-xl">Our Lady of Mount Carmel, pray for us.</p>
            </div>
            
            {dailyPrayer && (
              <div className="p-12 md:p-16 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl backdrop-blur-md animate-fade-in">
                <div className="flex items-center justify-center gap-3 text-[#C5B358] mb-8 uppercase tracking-[0.4em] text-sm font-bold opacity-90">
                  <Clock className="w-5 h-5" /> {dailyPrayer.period}
                </div>
                <h2 className="text-4xl text-[#e8dcb5] font-serif mb-8 italic text-center leading-tight">{dailyPrayer.title}</h2>
                
                <div className="overflow-y-auto no-scrollbar max-h-[45vh] px-4">
                  <p className="text-slate-200 font-serif text-3xl leading-relaxed text-center italic first-letter:text-6xl first-letter:text-[#C5B358] first-letter:font-bold first-letter:mr-3">
                    {dailyPrayer.text}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-12 text-center opacity-40 hover:opacity-100 transition-opacity duration-1000">
              <p className="text-sm text-[#e8dcb5] font-serif italic mb-1">"God is good and I can feel His presence."</p>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">In Loving Memory of Deacon Scott Pickett</p>
            </div>
          </div>
        </div>

        {/* SIDEBAR: Intentions (Minimized/Expanded) */}
        <div 
          className={`transition-width border-l border-white/5 bg-black/40 backdrop-blur-xl flex flex-col overflow-hidden relative ${isIntentionsExpanded ? 'w-1/3' : 'w-16'}`}
        >
          {/* Toggle Button */}
          <button 
            onClick={() => setIsIntentionsExpanded(!isIntentionsExpanded)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white/5 hover:bg-white/10 p-1 rounded-r-md border border-l-0 border-white/10 transition-all"
            title={isIntentionsExpanded ? "Collapse" : "Expand Community Intentions"}
          >
            {isIntentionsExpanded ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronLeft className="w-4 h-4 text-[#C5B358]" />}
          </button>

          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
            <span className="w-2 h-2 rounded-full bg-[#C5B358] animate-pulse shrink-0" />
            {isIntentionsExpanded && (
              <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap animate-fade-in">Community Intentions</h3>
            )}
          </div>
          
          {/* List Area */}
          <div className={`flex-grow overflow-y-auto p-6 no-scrollbar space-y-10 ${!isIntentionsExpanded && 'opacity-0'}`}>
            {loading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-700" /></div>
            ) : prayers.map((p, i) => (
              <div key={p.id} className="flex gap-6 animate-fade-in group">
                <div className="w-2 h-2 rounded-full bg-[#C5B358]/60 mt-2 shrink-0" />
                <div className="flex flex-col flex-grow">
                  <p className="text-slate-300 font-serif text-2xl italic leading-snug">"{p.text}"</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#C5B358]/80 font-serif italic">— {p.userName}</span>
                      <span className="text-[9px] text-slate-700 uppercase tracking-widest">
                        {p.timestamp ? p.timestamp.toDate()?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "..."}
                      </span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(p.id)} className="text-red-900/40 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vertical Label (when minimized) */}
          {!isIntentionsExpanded && (
            <div className="absolute inset-0 top-20 flex flex-col items-center pointer-events-none opacity-40">
               <span className="[writing-mode:vertical-lr] uppercase tracking-[0.5em] text-[10px] text-slate-500 font-bold rotate-180">
                 Intentions
               </span>
            </div>
          )}
        </div>
      </main>

      {/* Intro Modal (Jen Harris) */}
      {isIntroOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-6 animate-soft-motion">
          <div className="max-w-2xl w-full bg-[#1e1e1e]/60 border border-[#C5B358]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-10 text-center">
              <Heart className="w-8 h-8 text-[#C5B358] opacity-60 mx-auto mb-6" />
              <h2 className="text-sm uppercase tracking-[0.4em] text-slate-500 font-bold mb-6 italic">A Message from our President</h2>
              <div className="space-y-6">
                <p className="text-[#e8dcb5] font-serif text-2xl leading-relaxed italic">
                  "Please help strengthen our communication with God by focusing your mind, heart, and spirit in prayer for the intentions of the Salpointe community."
                </p>
                <p className="text-slate-400 font-serif text-lg leading-relaxed">
                  You might have your own prayer tradition or want to begin by reading the intentions, keeping those intentions in mind as you recite the daily prayer, and finishing with:
                </p>
                <p className="text-[#C5B358] font-serif text-2xl font-semibold italic">
                  "Our Lady of Mt. Carmel, pray for us."
                </p>
              </div>
              <button 
                onClick={() => setIsIntroOpen(false)}
                className="mt-12 px-12 py-4 bg-[#681818]/20 border border-[#681818]/40 text-[#e8dcb5] rounded-full font-serif text-xl hover:bg-[#681818]/40 transition-all tracking-wide"
              >
                Enter the Chapel
              </button>
              <div className="mt-8 text-[10px] uppercase tracking-widest text-slate-600">Jen Harris • President</div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-10 left-10 z-50">
        <button onClick={() => { user ? setIsModalOpen(true) : handleAuth(); }} className="w-20 h-20 rounded-full bg-[#2a0a0a] border-2 border-[#681818]/50 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
          <Flame className="w-10 h-10 text-[#C5B358] candle-glow" />
        </button>
      </div>

      {/* Composition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-12 rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in">
            <h2 className="text-3xl text-[#e8dcb5] font-serif mb-8 text-center italic">Offer your intention</h2>
            <textarea 
              value={newPrayer} 
              onChange={(e) => setNewPrayer(e.target.value)} 
              rows="4" maxLength={200} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-6 text-slate-100 text-2xl font-serif outline-none focus:border-[#C5B358]" 
              placeholder="..." 
            />
            <div className="flex justify-between items-center mt-8">
              <span className="text-slate-500 text-sm tracking-widest">{newPrayer.length}/200</span>
              <div className="flex gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-slate-500 uppercase tracking-widest text-xs">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !newPrayer.trim()} className="bg-[#681818] text-[#e8dcb5] px-12 py-3 rounded-full text-xl font-serif transition-all disabled:opacity-50">
                  {isSubmitting ? "..." : "Amen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[120] bg-[#2a0a0a] border border-[#C5B358]/30 px-8 py-4 rounded-full text-[#e8dcb5] flex items-center gap-4 shadow-2xl animate-fade-in">
          <Info className="w-5 h-5 text-[#C5B358]" />
          <span className="text-lg font-serif italic">{toast.message}</span>
        </div>
      )}
    </div>
  );
}