import React, { useState, useEffect, useRef } from 'react';
import { Flame, X, Info, Loader2, BookOpen, Clock, User, LogOut, LayoutDashboard, Trash2 } from 'lucide-react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

// Verified exports from your firebase.js
import { auth, db, appId, googleProvider } from './firebase';

const ADMINS = ['erivers@salpointe.org', 'cptak@salpointe.org'];

const WEEKLY_PRAYERS = {
  1: { 
    morning: { title: "Morning Offering", text: "O Jesus, through the Immaculate Heart of Mary, I offer you my prayers, works, joys, and sufferings of this day in union with the holy sacrifice of the Mass throughout the world. Amen." }, 
    afternoon: { title: "Our Father", text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come, thy will be done, on earth as it is in heaven. Give us this day our daily bread and forgive us our trespasses. Amen." } 
  },
  2: { 
    morning: { title: "St. Teresa of Avila Prayer", text: "Grant that in all things, great and small, today and all the days of my life, I may do whatever You require of me. Help me respond to the slightest prompting of Your Grace. Amen." }, 
    afternoon: { title: "Glory Be", text: "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen." } 
  },
  3: { 
    morning: { title: "Memorare", text: "Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thy intercession was left unaided. Amen." }, 
    afternoon: { title: "Hail Mary", text: "Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women and blessed is the fruit of thy womb, Jesus. Holy Mary, mother of God, pray for us. Amen." } 
  },
  4: { 
    morning: { title: "Prayer to Our Guardian Angel", text: "Angel of God, my guardian dear, to whom God’s love commits me here, ever this day be at my side to light and guard, to rule and guide. Amen." }, 
    afternoon: { title: "Fatima Prayer", text: "O my Jesus, forgive us our sins, save us from the fires of hell. Lead all souls to Heaven, especially those who are most in need of Your mercy. Amen." } 
  },
  5: { 
    morning: { title: "Serenity Prayer", text: "O God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference. Amen." }, 
    afternoon: { title: "Anima Christi", text: "Soul of Christ, make me holy. Body of Christ, save me. Blood of Christ, fill me with love. Water from Christ’s side, wash me. Passion of Christ, strengthen me. Amen." } 
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
`;

export default function App() {
  const [user, setUser] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPrayer, setNewPrayer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [dailyPrayer, setDailyPrayer] = useState(null);

  const toastTimerRef = useRef(null);

  // --- Auth & Initial Logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && u.email?.toLowerCase().endsWith('@salpointe.org')) {
        setUser(u);
      } else if (u) {
        signOut(auth);
        showToast("Please use your @salpointe.org email.");
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

  // --- Firestore Subscription ---
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
      console.error("Firestore Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appId]);

  // --- Helpers ---
  const showToast = (msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message: String(msg), visible: true });
    toastTimerRef.current = setTimeout(() => setToast({ message: '', visible: false }), 4000);
  };

  const handleAuth = async () => {
    if (user) {
      await signOut(auth);
    } else {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (e) {
        showToast("Sign in failed. Check school account.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this intention?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prayers', id));
      showToast("Intention removed.");
    } catch (e) {
      showToast("Delete failed. Admin required.");
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
      console.error("Submit Error:", e);
      showToast(`Error: ${e.code || "Check login"}`);
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

      <nav className="relative z-20 w-full p-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <img 
              src="/lancer-75.png" 
              alt="75" 
              className="h-10 w-auto opacity-90" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
            <div className="h-6 w-px bg-white/10" />
            <span className="text-[#e8dcb5] text-xl font-serif italic tracking-wide">Salpointe Prayers</span>
          </div>
          <a 
            href="https://teacher-agenda.vercel.app" 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] uppercase tracking-widest font-semibold hover:text-white transition-all"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Agenda
          </a>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-[#e8dcb5]/60 text-xs font-serif italic">{user.displayName}</span>}
          <button 
            onClick={handleAuth} 
            className="text-[10px] tracking-widest uppercase text-slate-500 hover:text-white transition-colors"
          >
            {user ? "Sign Out" : "Lancer Sign In"}
          </button>
        </div>
      </nav>

      <main className="relative z-10 flex-grow flex overflow-hidden p-8 gap-8">
        <div className="w-1/2 flex flex-col justify-between">
          <div className="animate-fade-in">
            <h1 className="text-4xl text-slate-100 font-serif font-light mb-2">Intentions</h1>
            <p className="text-slate-500 font-serif italic text-lg mb-8">Our Lady of Mount Carmel, pray for us.</p>
            {dailyPrayer && (
              <div className="p-10 rounded-2xl bg-white/5 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2 text-[#C5B358] mb-6 uppercase tracking-widest text-xs font-bold">
                  <Clock className="w-4 h-4" /> {dailyPrayer.period}
                </div>
                <h2 className="text-3xl text-[#e8dcb5] font-serif mb-6 italic">{dailyPrayer.title}</h2>
                <p className="text-slate-200 font-serif text-2xl leading-relaxed first-letter:text-5xl first-letter:text-[#C5B358] first-letter:mr-2">
                  {dailyPrayer.text}
                </p>
              </div>
            )}
          </div>
          <div className="border-t border-white/10 pt-6 opacity-40 hover:opacity-100 transition-opacity duration-1000">
            <p className="text-sm text-[#e8dcb5] font-serif italic mb-1">"God is good and I can feel His presence."</p>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase">In Loving Memory of Deacon Scott Pickett</p>
          </div>
        </div>

        <div className="w-1/2 flex flex-col overflow-hidden bg-black/20 rounded-2xl border border-white/5">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold">Community Intentions</h3>
            <span className="w-2 h-2 rounded-full bg-[#C5B358] animate-pulse" />
          </div>
          <div className="flex-grow overflow-y-auto p-8 no-scrollbar space-y-10">
            {loading ? (
              <div className="h-full flex items-center justify-center opacity-30"><Loader2 className="animate-spin" /></div>
            ) : prayers.length === 0 ? (
              <p className="text-center text-slate-600 font-serif italic mt-20">The chapel is quiet. Be the first to share.</p>
            ) : (
              prayers.map((p, i) => (
                <div key={p.id} className="flex gap-6 animate-fade-in group">
                  <div className="w-2 h-2 rounded-full bg-[#C5B358]/60 mt-2" />
                  <div className="flex flex-col flex-grow">
                    <p className="text-slate-300 font-serif text-2xl italic leading-snug">"{p.text}"</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#C5B358]/80 font-serif italic">— {p.userName}</span>
                        <span className="text-[9px] text-slate-700 uppercase tracking-widest">
                          {p.timestamp ? p.timestamp.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Just now"}
                        </span>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          className="text-red-900/40 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-10 right-10 z-50">
        <button 
          onClick={() => { user ? setIsModalOpen(true) : handleAuth(); }} 
          className="w-20 h-20 rounded-full bg-[#2a0a0a] border-2 border-[#681818]/50 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        >
          <Flame className="w-10 h-10 text-[#C5B358] candle-glow" />
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-12 rounded-3xl w-full max-w-2xl shadow-2xl animate-fade-in">
            <h2 className="text-3xl text-[#e8dcb5] font-serif mb-8 text-center italic">Offer your intention</h2>
            <textarea 
              value={newPrayer} 
              onChange={(e) => { setNewPrayer(e.target.value); }} 
              rows="4" 
              maxLength={200} 
              className="w-full bg-black/40 border border-white/10 rounded-xl p-6 text-slate-100 text-2xl font-serif outline-none focus:border-[#C5B358] transition-all resize-none" 
              placeholder="..." 
            />
            <div className="flex justify-between items-center mt-8">
              <span className="text-slate-500 text-sm tracking-widest">{newPrayer.length}/200</span>
              <div className="flex gap-4">
                <button 
                  onClick={() => { setIsModalOpen(false); }} 
                  className="px-8 py-3 text-slate-500 uppercase tracking-widest text-xs hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !newPrayer.trim()} 
                  className="bg-[#681818] text-[#e8dcb5] px-12 py-3 rounded-full text-xl font-serif disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? "..." : "Amen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-[#2a0a0a] border border-[#C5B358]/30 px-8 py-4 rounded-full text-[#e8dcb5] flex items-center gap-4 shadow-2xl animate-fade-in">
          <Info className="w-5 h-5 text-[#C5B358]" />
          <span className="text-lg font-serif italic">{toast.message}</span>
        </div>
      )}
    </div>
  );
}