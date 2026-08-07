import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGemini(
  apiKey: string,
  parts: Array<Record<string, unknown>>,
): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    throw new HttpsError("internal", `Gemini error ${res.status}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new HttpsError("internal", "Empty Gemini response");
  return text;
}

function parseJson<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new HttpsError("internal", "Failed to parse AI JSON");
  }
}

export const parseStatsUpload = onCall(
  { secrets: [geminiApiKey], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const { storagePath, mimeType, base64 } = request.data as {
      storagePath?: string;
      mimeType?: string;
      base64?: string;
    };

    let dataBase64 = base64;
    let mime = mimeType || "image/jpeg";

    if (!dataBase64 && storagePath) {
      const bucket = getStorage().bucket();
      const file = bucket.file(storagePath);
      const [buf] = await file.download();
      dataBase64 = buf.toString("base64");
      const [meta] = await file.getMetadata();
      mime = meta.contentType || mime;
    }

    if (!dataBase64) {
      throw new HttpsError("invalid-argument", "Provide base64 or storagePath");
    }

    const text = await callGemini(geminiApiKey.value(), [
      {
        text: `Extract body composition stats from this report. Return ONLY JSON with keys: age, heightCm, weightKg, goalWeightKg, bodyFatPct, muscleMassKg, visceralFat, bmi, waistCm, hipCm, activityLevel, notes. Use null for unknowns.`,
      },
      { inline_data: { mime_type: mime, data: dataBase64 } },
    ]);

    return { stats: parseJson(text) };
  },
);

export const generateMonthlyPlan = onCall(
  { secrets: [geminiApiKey], cors: true, timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const uid = request.auth.uid;
    const { profile, stats, statsId } = request.data as {
      profile?: Record<string, unknown>;
      stats?: Record<string, unknown>;
      statsId?: string;
    };
    if (!profile || !stats || !statsId) {
      throw new HttpsError(
        "invalid-argument",
        "profile, stats, and statsId required",
      );
    }

    const prompt = `You are FitMomGuide. Create a practical weight + body-fat loss month for an Indian working mom.
Return ONLY JSON:
{"summary":string,"weeks":[{"weekNumber":1-4,"focus":string,"dailyMeals":[7 days with breakfast/lunch/dinner/snacks each {name,calories,prepNotes}],"workouts":[{day,dayLabel,title,durationMins,focus,equipment,exercises:[{name,sets?,reps?,durationSec?,restSec?,cue}]}],"grocery":[{name,qty,unit,category,options:[{tier:"best"|"budget"|"cleanest",brand,productLabel,blinkitQuery}]}]}]}
Rules: home-only workouts matching prefs; 4 progressive weeks; diet/cuisine aware; each grocery item 2-3 brand tiers; no medical claims.
User context: ${JSON.stringify({ profile, stats })}`;

    const text = await callGemini(geminiApiKey.value(), [{ text: prompt }]);
    const parsed = parseJson<{
      summary: string;
      weeks: unknown[];
    }>(text);

    const plan = {
      monthStart: new Date().toISOString().slice(0, 10),
      groundedOnStatsId: statsId,
      summary: parsed.summary,
      weeks: parsed.weeks,
      createdAt: FieldValue.serverTimestamp(),
    };

    const db = getFirestore();
    const ref = await db.collection("users").doc(uid).collection("plans").add(plan);
    return { planId: ref.id, plan: { id: ref.id, ...plan, createdAt: new Date().toISOString() } };
  },
);
