import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

const WEIGHTS = { protein: 1.5, fibre: 1.1, carbs: 0.6 };
const COLORS = { protein: "#C6FF3D", fibre: "#34E4A0", carbs: "#FF6B4A" };

function scoreDish(dish, remaining) {
  let score = 0;
  const macros = dish.fibre === null ? ["protein", "carbs"] : ["protein", "fibre", "carbs"];
  for (const macro of macros) {
    const target = remaining[macro];
    const value = dish[macro];
    const w = WEIGHTS[macro];
    if (target <= 0) {
      score -= value * w * 0.4;
      continue;
    }
    const ratio = value / target;
    score += ratio <= 1 ? ratio * w : w * Math.max(0, 2 - ratio);
  }
  return score;
}

function passesFilters(dish, diet, allergies) {
  if (diet === "veg" && !dish.isVeg) return false;
  if (allergies.some((a) => dish.allergens.includes(a))) return false;
  return true;
}

function App() {
  const [protein, setProtein] = useState(120);
  const [fibre, setFibre] = useState(30);
  const [carbs, setCarbs] = useState(200);
  const [diet, setDiet] = useState("any");
  const [allergies, setAllergies] = useState([]);
  const [cart, setCart] = useState([]);
  const [screen, setScreen] = useState("onboarding");
  const [dishes, setDishes] = useState([]);

  useEffect(() => {
    async function loadDishes() {
      const { data, error } = await supabase
        .from("dishes")
        .select("id, name, is_veg, allergens, protein_g, carbs_g, fibre_g, fibre_verified, restaurants(name)");
      if (error) { console.error(error); return; }
      setDishes(
        data.map((d) => ({
          id: d.id, name: d.name, restaurant: d.restaurants.name, isVeg: d.is_veg,
          allergens: d.allergens, protein: d.protein_g, carbs: d.carbs_g,
          fibre: d.fibre_g, fibreVerified: d.fibre_verified,
        }))
      );
    }
    loadDishes();
  }, []);

  function toggleAllergen(name) {
    setAllergies((prev) => prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]);
  }

  const remaining = useMemo(() => {
    const eaten = cart.reduce((acc, d) => ({
      protein: acc.protein + d.protein, fibre: acc.fibre + (d.fibre || 0), carbs: acc.carbs + d.carbs,
    }), { protein: 0, fibre: 0, carbs: 0 });
    return { protein: protein - eaten.protein, fibre: fibre - eaten.fibre, carbs: carbs - eaten.carbs };
  }, [cart, protein, fibre, carbs]);

  const ranked = useMemo(() => {
    return dishes.filter((d) => passesFilters(d, diet, allergies))
      .map((d) => ({ ...d, _score: scoreDish(d, remaining) }))
      .sort((a, b) => b._score - a._score);
  }, [dishes, remaining, diet, allergies]);

  if (screen === "onboarding") {
    return <Onboarding {...{ protein, setProtein, fibre, setFibre, carbs, setCarbs, diet, setDiet, allergies, toggleAllergen }} onDone={() => setScreen("picks")} />;
  }
  return <Picks {...{ protein, fibre, carbs, remaining, ranked, cart, setCart }} onBack={() => setScreen("onboarding")} />;
}

function Stepper({ label, value, onChange, color, step = 5 }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/10">
      <span style={{ color }} className="font-['Space_Grotesk'] font-bold text-lg">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(0, value - step))}
          className="w-9 h-9 rounded-full bg-white/10 text-white text-xl font-bold active:scale-90 transition-transform">–</button>
        <span className="font-mono font-bold text-xl w-14 text-center text-white">{value}<span className="text-white/40 text-sm">g</span></span>
        <button onClick={() => onChange(value + step)} style={{ backgroundColor: color }}
          className="w-9 h-9 rounded-full text-black text-xl font-bold active:scale-90 transition-transform">+</button>
      </div>
    </div>
  );
}

function Onboarding({ protein, setProtein, fibre, setFibre, carbs, setCarbs, diet, setDiet, allergies, toggleAllergen, onDone }) {
  return (
    <div className="min-h-screen bg-[#0F0F13] text-[#F5F5F0] flex flex-col justify-center px-6 py-10 font-['Space_Grotesk']">
      <div className="max-w-sm mx-auto w-full">
        <h1 className="text-4xl font-extrabold leading-none mb-1">Today's<br/>targets.</h1>
        <p className="text-white/40 text-sm mb-8">Set what you're chasing today.</p>

        <Stepper label="Protein" value={protein} onChange={setProtein} color={COLORS.protein} />
        <Stepper label="Fibre" value={fibre} onChange={setFibre} color={COLORS.fibre} step={2} />
        <Stepper label="Carbs" value={carbs} onChange={setCarbs} color={COLORS.carbs} step={10} />

        <div className="mt-6">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2 font-mono">Diet</p>
          <div className="flex gap-2">
            {[{ id: "any", l: "No restriction" }, { id: "veg", l: "Vegetarian" }].map((o) => (
              <button key={o.id} onClick={() => setDiet(o.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${diet === o.id ? "bg-[#C6FF3D] text-black" : "bg-white/5 text-white/60"}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2 font-mono">Allergies</p>
          <div className="flex flex-wrap gap-2">
            {["gluten", "dairy", "soy", "nuts"].map((a) => (
              <button key={a} onClick={() => toggleAllergen(a)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${allergies.includes(a) ? "bg-[#FF6B4A] text-black" : "bg-white/5 text-white/60"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <button onClick={onDone}
          className="mt-10 w-full bg-[#C6FF3D] text-black py-4 rounded-2xl font-extrabold text-lg active:scale-[0.98] transition-transform">
          See today's picks →
        </button>
      </div>
    </div>
  );
}

function Ring({ pct, color, size = 84, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#ffffff1a" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={c - (clamped / 100) * c} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
}

function MacroRing({ label, remaining, goal, color }) {
  const eaten = goal - remaining;
  const pct = goal > 0 ? (eaten / goal) * 100 : 0;
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Ring pct={pct} color={color} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-bold text-lg text-white">{Math.max(0, remaining)}</span>
          <span className="text-white/30 text-[10px] font-mono">left</span>
        </div>
      </div>
      <span style={{ color }} className="mt-2 text-xs font-bold font-['Space_Grotesk']">{label}</span>
    </div>
  );
}

function DishCard({ dish, onAdd, index }) {
  const macroColor = COLORS.protein;
  return (
    <div
      className="flex items-stretch bg-[#1B1B22] rounded-xl mb-2.5 overflow-hidden opacity-0 animate-[fadeSlide_0.4s_ease_forwards]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div style={{ backgroundColor: macroColor }} className="w-1.5 shrink-0" />
      <div className="flex-1 flex justify-between items-center p-3.5">
        <div>
          <p className="font-['Space_Grotesk'] font-bold text-white text-[15px]">{dish.name}</p>
          <p className="text-white/40 text-xs mb-1">{dish.restaurant}</p>
          <div className="flex gap-3 font-mono text-xs">
            <span style={{ color: COLORS.protein }}>P{dish.protein}</span>
            {dish.fibreVerified ? <span style={{ color: COLORS.fibre }}>F{dish.fibre}</span> : <span className="text-white/30">F —</span>}
            <span style={{ color: COLORS.carbs }}>C{dish.carbs}</span>
          </div>
        </div>
        <button onClick={() => onAdd(dish)}
          className="shrink-0 bg-white text-black font-bold text-sm px-4 py-2 rounded-lg active:scale-90 transition-transform">
          Add
        </button>
      </div>
    </div>
  );
}

function Picks({ protein, fibre, carbs, remaining, ranked, cart, setCart, onBack }) {
  return (
    <div className="min-h-screen bg-[#0F0F13] text-[#F5F5F0] px-5 py-8 font-['Space_Grotesk']">
      <style>{`@keyframes fadeSlide { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }`}</style>
      <button onClick={onBack} className="text-white/40 text-sm mb-6 font-mono">← edit targets</button>

      <div className="flex justify-around mb-8">
        <MacroRing label="Protein" remaining={remaining.protein} goal={protein} color={COLORS.protein} />
        <MacroRing label="Fibre" remaining={remaining.fibre} goal={fibre} color={COLORS.fibre} />
        <MacroRing label="Carbs" remaining={remaining.carbs} goal={carbs} color={COLORS.carbs} />
      </div>

      <p className="text-white/40 text-xs uppercase tracking-wide mb-3 font-mono">Best fit right now</p>
      {ranked.slice(0, 8).map((d, i) => (
        <DishCard key={d.id} dish={d} onAdd={(dish) => setCart([...cart, dish])} index={i} />
      ))}

      {cart.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2 font-mono">In cart ({cart.length})</p>
          {cart.map((d, i) => <CartItem key={i} dish={d} remaining={remaining} />)}
        </div>
      )}
    </div>
  );
}

function CartItem({ dish, remaining }) {
  const [swap, setSwap] = useState(null);
  const [loading, setLoading] = useState(false);

  async function findSwap() {
    setLoading(true);
    setSwap(null);

    const { data: dishRow } = await supabase
      .from("dishes")
      .select("embedding")
      .eq("id", dish.id)
      .single();

    const { data: matches } = await supabase.rpc("match_dishes", {
      query_embedding: dishRow.embedding,
      match_count: 1,
      exclude_id: dish.id,
    });

    if (!matches || matches.length === 0) {
      setSwap({ explanation: "No similar dish found to compare." });
      setLoading(false);
      return;
    }

    const alternative = matches[0];

    const res = await fetch("http://localhost:3001/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentDish: { name: dish.name, protein_g: dish.protein, fibre_g: dish.fibre, carbs_g: dish.carbs },
        alternative: { name: alternative.name, protein_g: alternative.protein_g, fibre_g: alternative.fibre_g, carbs_g: alternative.carbs_g },
        remaining,
      }),
    });
    const data = await res.json();
    setSwap({ name: alternative.name, explanation: data.explanation });
    setLoading(false);
  }

  return (
    <div className="bg-[#1B1B22] rounded-xl p-3 mb-2">
      <p className="text-white/80 text-sm font-medium">{dish.name} — <span className="text-white/40">{dish.restaurant}</span></p>
      <button onClick={findSwap} disabled={loading} className="text-xs font-bold mt-1.5" style={{ color: COLORS.fibre }}>
        {loading ? "checking swaps…" : "see a better swap"}
      </button>
      {swap && (
        <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
          {swap.name ? <b className="text-white/70">{swap.name}:</b> : null} {swap.explanation}
        </p>
      )}
    </div>
  );
}

export default App;