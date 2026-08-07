import type { BodyStats, UserProfile } from "@/types";

export function parseStatsSystemPrompt(): string {
  return `You extract body composition / health stats from a smart-scale report or lab photo.
Return ONLY valid JSON with keys:
age, heightCm, weightKg, goalWeightKg, bodyFatPct, muscleMassKg, visceralFat, bmi, proteinPct, waterPct, activityLevel, notes.
Use null for unknown fields. Numbers only for numeric fields. activityLevel one of: sedentary, light, moderate, active.`;
}

export function monthlyPlanSystemPrompt(): string {
  return `You are FitMomGuide, creating a practical weight-loss and fat-loss plan for Indian working moms.
Return ONLY valid JSON matching this shape:
{
  "summary": string,
  "weeks": [
    {
      "weekNumber": 1-4,
      "focus": string,
      "dailyMeals": [{
        "day": 1-7, "dayLabel": "Mon"...,
        "breakfast": {"name","calories","prepNotes","recipe":{"servings","prepMins","cookMins","ingredients":[string],"steps":[string],"tips"?}},
        "lunch": {"name","calories","prepNotes","recipe":{...}},
        "afternoonSnack": {"name","calories","prepNotes","recipe":{...}},
        "eveningSnack": {"name","calories","prepNotes","recipe":{...}},
        "dinner": {"name","calories","prepNotes","recipe":{...}}
      }],
      "workouts": [{
        "day": number, "dayLabel": string, "title": string, "durationMins": number,
        "focus": "cardio"|"strength"|"core"|"mobility"|"mixed",
        "equipment": [string] (labels of equipment used in session),
        "exercises": [{"name","sets"?,"reps"?,"durationSec"?,"restSec"?,"cue","youtubeQuery"?}],
        "youtubeQuery": string (optional YouTube search for full session)
      }],
      "grocery": [{
        "name","qty","unit","category",
        "options": [
          {"tier":"best"|"budget"|"cleanest","brand","productLabel","blinkitQuery"}
        ]
      }]
    }
  ]
}
Rules:
- Exactly 4 weeks, each with 7 dailyMeals.
- Workouts are HOME-ONLY. Respect workoutPrefs.workoutStyle (cardio, core, strength, or mixed), equipment list, duration, and days-per-week prefs. Progressive weeks 1→4.
- Aim for sustainable deficit for weight + body fat % reduction. No medical claims.
- Meals respect diet type and cuisines; quick prep / leftover friendly.
- Each day has breakfast, afternoonSnack (mid-morning / pre-lunch), lunch, eveningSnack (before dinner), and dinner — all with practical home recipes (ingredients + numbered steps).
- Each grocery item has 2-3 options with tiers best, budget, cleanest and blinkitQuery search terms for India.
- Stop-if-pain cues on exercises.`;
}

export function recipeSystemPrompt(): string {
  return `You write quick home recipes for busy Indian working moms.
Return ONLY valid JSON:
{
  "servings": number,
  "prepMins": number,
  "cookMins": number,
  "ingredients": string[],
  "steps": string[],
  "tips": string
}
Keep it realistic, under ~30 minutes total when possible, and match the meal name / cuisine / diet type.`;
}


export function monthlyPlanUserPrompt(
  profile: UserProfile,
  stats: BodyStats,
): string {
  return JSON.stringify(
    {
      profile: {
        dietType: profile.dietType,
        cuisines: profile.cuisines,
        workoutPrefs: profile.workoutPrefs,
        allergies: profile.allergies ?? [],
        activityLevel: profile.activityLevel ?? stats.activityLevel,
      },
      stats,
    },
    null,
    2,
  );
}
