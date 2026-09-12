import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

const WEIGHTS = { protein: 1.5, fibre: 1.1, carbs: 0.6 };

function scoreDish(dish, remaining) {
  let score = 0;
  for (const macro of ["protein", "fibre", "carbs"]) {
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
        .select("id, name, is_veg, allergens, protein_g, carbs_g, fibre_g, restaurants(name)");
      if (error) {
        console.error(error);
        return;
      }
      setDishes(
        data.map((d) => ({
          id: d.id,
          name: d.name,
          restaurant: d.restaurants.name,
          isVeg: d.is_veg,
          allergens: d.allergens,
          protein: d.protein_g,
          carbs: d.carbs_g,
          fibre: d.fibre_g,
        }))
      );
    }
    loadDishes();
  }, []);

  function toggleAllergen(name) {
    setAllergies((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  const remaining = useMemo(() => {
    const eaten = cart.reduce(
      (acc, d) => ({
        protein: acc.protein + d.protein,
        fibre: acc.fibre + d.fibre,
        carbs: acc.carbs + d.carbs,
      }),
      { protein: 0, fibre: 0, carbs: 0 }
    );
    return {
      protein: protein - eaten.protein,
      fibre: fibre - eaten.fibre,
      carbs: carbs - eaten.carbs,
    };
  }, [cart, protein, fibre, carbs]);

  const ranked = useMemo(() => {
    return dishes
      .filter((d) => passesFilters(d, diet, allergies))
      .map((d) => ({ ...d, _score: scoreDish(d, remaining) }))
      .sort((a, b) => b._score - a._score);
  }, [dishes, remaining, diet, allergies]);

  if (screen === "onboarding") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Set today's goals</h1>

        <div className="flex flex-col gap-1 items-center">
          <label>Protein (g)</label>
          <input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))}
            className="bg-white text-black text-xl px-4 py-2 rounded w-32 text-center" />
        </div>

        <div className="flex flex-col gap-1 items-center">
          <label>Fibre (g)</label>
          <input type="number" value={fibre} onChange={(e) => setFibre(Number(e.target.value))}
            className="bg-white text-black text-xl px-4 py-2 rounded w-32 text-center" />
        </div>

        <div className="flex flex-col gap-1 items-center">
          <label>Carbs (g)</label>
          <input type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))}
            className="bg-white text-black text-xl px-4 py-2 rounded w-32 text-center" />
        </div>

        <div className="flex flex-col gap-1 items-center">
          <label>Diet</label>
          <div className="flex gap-2">
            <button onClick={() => setDiet("any")} className={`px-4 py-2 rounded ${diet === "any" ? "bg-white text-black" : "bg-gray-700"}`}>No restriction</button>
            <button onClick={() => setDiet("veg")} className={`px-4 py-2 rounded ${diet === "veg" ? "bg-white text-black" : "bg-gray-700"}`}>Vegetarian</button>
          </div>
        </div>

        <div className="flex flex-col gap-1 items-center">
          <label>Allergies</label>
          <div className="flex gap-2">
            {["gluten", "dairy", "soy", "nuts"].map((a) => (
              <button key={a} onClick={() => toggleAllergen(a)}
                className={`px-3 py-1 rounded-full ${allergies.includes(a) ? "bg-white text-black" : "bg-gray-700"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setScreen("picks")} className="mt-4 bg-white text-black px-6 py-2 rounded font-semibold">
          See today's picks
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <button onClick={() => setScreen("onboarding")} className="text-gray-400 mb-4">← Edit goals</button>

      <h2 className="text-xl font-bold mb-2">Remaining today</h2>
      <p className="mb-6">
        Protein: {remaining.protein}g &nbsp;|&nbsp; Fibre: {remaining.fibre}g &nbsp;|&nbsp; Carbs: {remaining.carbs}g
      </p>

      <h2 className="text-lg font-bold mb-2">Best fit right now</h2>
      {ranked.map((d) => (
        <div key={d.id} className="border border-gray-700 rounded p-3 mb-2 flex justify-between items-center">
          <div>
            <p className="font-medium">{d.name}</p>
            <p className="text-sm text-gray-400">{d.restaurant} — P{d.protein} F{d.fibre} C{d.carbs}</p>
          </div>
          <button onClick={() => setCart([...cart, d])} className="bg-white text-black px-3 py-1 rounded">
            Add
          </button>
        </div>
      ))}

      {cart.length > 0 && (
        <div className="mt-6 border-t border-gray-700 pt-4">
          <h3 className="font-bold mb-2">In cart ({cart.length})</h3>
          {cart.map((d, i) => (
            <p key={i} className="text-gray-300">{d.name} — {d.restaurant}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;