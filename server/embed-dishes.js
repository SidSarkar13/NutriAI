import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function run() {
  const { data: dishes, error } = await supabase
    .from("dishes")
    .select("id, name, is_veg, protein_g, carbs_g, fibre_g, restaurants(name)");

  if (error) {
    console.error("Supabase error:", error);
    return;
  }

  if (!dishes || dishes.length === 0) {
    console.log("No dishes found — check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env");
    return;
  }

  console.log(`Found ${dishes.length} dishes`);

  for (const dish of dishes) {
    const description = `${dish.name}, ${dish.is_veg ? "vegetarian" : "non-vegetarian"}, from ${dish.restaurants.name}, ${dish.protein_g}g protein, ${dish.carbs_g}g carbs, ${dish.fibre_g}g fibre`;

    const result = await embedModel.embedContent(description);
    const embedding = result.embedding.values;

    await supabase.from("dishes").update({ embedding }).eq("id", dish.id);
    console.log(`Embedded: ${dish.name}`);
  }

  console.log("Done!");
}

run();