"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { MealHero } from "@/components/MealHero";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { getMealFromWeek, parseMealSlotKey } from "@/lib/meals";
import { getLatestPlan, getProfile, saveMealRecipe } from "@/lib/user-data";
import type { MealRecipe, MonthlyPlan, UserProfile } from "@/types";

export default function MealRecipePage() {
  return (
    <RequireAuth>
      <RecipeInner />
    </RequireAuth>
  );
}

function RecipeInner() {
  const params = useParams<{ n: string; day: string; slot: string }>();
  const weekNumber = Number(params.n);
  const day = Number(params.day);
  const slot = parseMealSlotKey(params.slot);
  const { user } = useAuth();
  const router = useRouter();

  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipe, setRecipe] = useState<MealRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedGemini, setUsedGemini] = useState<boolean | null>(null);

  const week = useMemo(
    () => plan?.weeks.find((w) => w.weekNumber === weekNumber),
    [plan, weekNumber],
  );

  const resolved =
    week && slot ? getMealFromWeek(week, day, slot) : null;

  useEffect(() => {
    if (!user || !slot || !Number.isFinite(day) || !Number.isFinite(weekNumber)) {
      router.replace("/plan");
      return;
    }

    (async () => {
      const [latest, pref] = await Promise.all([
        getLatestPlan(user.uid),
        getProfile(user.uid),
      ]);
      if (!latest) {
        router.replace("/plan");
        return;
      }
      setPlan(latest);
      setProfile(pref);

      const w = latest.weeks.find((x) => x.weekNumber === weekNumber);
      const found = w ? getMealFromWeek(w, day, slot) : null;
      if (!found) {
        setError("Meal not found in this week’s plan.");
        setLoading(false);
        return;
      }

      if (found.meal.recipe) {
        setRecipe(found.meal.recipe);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/generate-recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meal: {
              name: found.meal.name,
              calories: found.meal.calories,
              prepNotes: found.meal.prepNotes,
            },
            dietType: pref?.dietType,
            cuisines: pref?.cuisines,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load recipe");
        setRecipe(data.recipe);
        setUsedGemini(Boolean(data.gemini));
        await saveMealRecipe({
          uid: user.uid,
          plan: latest,
          weekNumber,
          day,
          slot,
          recipe: data.recipe,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Recipe failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, router, weekNumber, day, slot]);

  return (
    <AppShell>
      <div className="stack fade-in">
        <Link href={`/plan/week/${weekNumber}`} className="muted">
          ← Back to week {weekNumber}
        </Link>

        {loading ? (
          <div className="centered">
            <p className="muted">Loading recipe…</p>
          </div>
        ) : error || !resolved || !recipe || !slot ? (
          <div className="panel">
            <p className="error">{error || "Recipe unavailable"}</p>
          </div>
        ) : (
          <>
            <MealHero
              slot={slot}
              mealName={resolved.meal.name}
              mealLabel={resolved.mealLabel}
              dayLabel={resolved.dayLabel}
              calories={resolved.meal.calories}
              prepMins={recipe.prepMins + recipe.cookMins}
              servings={recipe.servings}
            />

            {resolved.meal.prepNotes ? (
              <p className="muted">{resolved.meal.prepNotes}</p>
            ) : null}

            {usedGemini === false ? (
              <p className="hint">
                Offline recipe — add GEMINI_API_KEY for AI-generated steps.
              </p>
            ) : usedGemini ? (
              <p className="hint">Recipe generated with Gemini.</p>
            ) : null}

            <section className="panel recipe-section">
              <h2 className="recipe-section-head">Ingredients</h2>
              <div className="recipe-ingredient-grid">
                {recipe.ingredients.map((item) => (
                  <div key={item} className="recipe-ingredient-item">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel recipe-section">
              <h2 className="recipe-section-head">Steps</h2>
              <ol className="recipe-step-list">
                {recipe.steps.map((step, index) => (
                  <li key={step} className="recipe-step-item">
                    <span className="recipe-step-num">{index + 1}</span>
                    <p className="recipe-step-text">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            {recipe.tips ? (
              <section className="panel">
                <p className="muted" style={{ margin: 0 }}>
                  Tip: {recipe.tips}
                </p>
              </section>
            ) : null}

            {profile ? (
              <p className="hint">
                Tuned for {profile.dietType}
                {profile.cuisines.length
                  ? ` · ${profile.cuisines.join(", ")}`
                  : ""}
              </p>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
