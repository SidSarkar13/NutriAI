import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

app.post("/extract", async (req, res) => {
  const { rawText } = req.body;

  const prompt = `You are extracting nutrition data for a restaurant dish tracking app.
Given the raw text below, extract:
- dish_name
- restaurant_name
- is_veg (true/false, best guess if not stated)
- allergens (array from: gluten, dairy, soy, nuts, egg — only if clearly indicated)
- protein_g, carbs_g, fibre_g (numbers, per single serving as described)
- confidence ("high" if numbers are explicitly stated, "low" if estimated/inferred)
- source_note (one sentence on where these numbers came from)

Return ONLY valid JSON, no other text:
{"dish_name": "", "restaurant_name": "", "is_veg": true, "allergens": [], "protein_g": 0, "carbs_g": 0, "fibre_g": 0, "confidence": "", "source_note": ""}

Raw text:
${rawText}`;

  try {
    const result = await model.generateContent(prompt);
    console.log("Raw Gemini response:", JSON.stringify(result.response, null, 2));
    const text = result.response.text().trim();
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "extraction failed" });
  }
});

app.post("/swap", async (req, res) => {
  const { currentDish, alternative, remaining } = req.body;

  const prompt = `A user is picking a meal to hit their remaining daily macro goals.
Remaining goals: ${remaining.protein}g protein, ${remaining.fibre}g fibre, ${remaining.carbs}g carbs.
They currently have: ${currentDish.name} (${currentDish.protein_g}g protein, ${currentDish.fibre_g}g fibre, ${currentDish.carbs_g}g carbs).
A similar alternative is available: ${alternative.name} (${alternative.protein_g}g protein, ${alternative.fibre_g}g fibre, ${alternative.carbs_g}g carbs).

In one short, casual sentence, tell the user whether swapping to the alternative helps them hit their goals better, and why. Be direct and specific with numbers.`;

  try {
    const result = await model.generateContent(prompt);
    res.json({ explanation: result.response.text().trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "swap generation failed" });
  }
});

app.post("/recipe", async (req, res) => {
  const { remaining, equipment, skill } = req.body;

  const prompt = `A gym-goer wants to cook a meal at home to hit their remaining daily macros.
Remaining today: ${remaining.protein}g protein, ${remaining.fibre}g fibre, ${remaining.carbs}g carbs.
Equipment available: ${equipment}.
Cooking skill: ${skill}.

Create ONE simple recipe suited to their equipment and skill that gets reasonably close to those remaining macros without wildly overshooting.

Return ONLY valid JSON, no other text, in this exact shape:
{
  "recipe_name": "",
  "steps": ["short step 1", "short step 2"],
  "ingredients": [
    {"name": "", "quantity": "", "protein_g": 0, "carbs_g": 0, "fibre_g": 0}
  ]
}

Give per-ingredient macro estimates for the actual quantity listed (not per 100g) so they can be summed into a total.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "recipe generation failed" });
  }
});

app.listen(3001, () => console.log("Server running on port 3001"));