import type {
  BodyStats,
  DailyMeals,
  GroceryItem,
  MealRecipe,
  MealSlot,
  MonthlyPlan,
  PlanWeek,
  UserProfile,
  WorkoutSession,
} from "@/types";
import { buildWeekGroceryList } from "@/lib/grocery";
import { formatEquipmentList } from "@/lib/workout-prefs";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function recipeFor(
  name: string,
  ingredients: string[],
  steps: string[],
  mins: { prep: number; cook: number },
): MealRecipe {
  return {
    servings: 1,
    prepMins: mins.prep,
    cookMins: mins.cook,
    ingredients,
    steps,
    tips: "Scale up for leftovers if tomorrow looks busy.",
  };
}

function meal(
  name: string,
  calories: number,
  prepNotes: string,
  recipe: MealRecipe,
): MealSlot {
  return { name, calories, prepNotes, recipe };
}

function mealSet(
  dietType: UserProfile["dietType"],
  cuisine: string,
  week: number,
  day: number,
): DailyMeals {
  const vegBase =
    dietType === "non-veg"
      ? ["Paneer", "Chicken", "Egg", "Fish"][day % 4]
      : dietType === "egg"
        ? ["Paneer", "Egg", "Dal", "Tofu"][day % 4]
        : ["Paneer", "Dal", "Tofu", "Chickpea"][day % 4];

  const calBase = 380 - week * 10;
  const breakfastName = `${cuisine} oats bowl with fruit`;
  const lunchName = `${vegBase} ${cuisine.toLowerCase()} bowl + salad`;
  const dinnerName = `Light ${vegBase.toLowerCase()} stir with veggies`;
  const afternoonSnackName =
    day % 2 === 0 ? "Roasted makhana + tea" : "Banana + almonds";
  const eveningSnackName = day % 2 === 0 ? "Curd + seeds" : "Apple + peanuts";

  return {
    day: day + 1,
    dayLabel: DAY_LABELS[day],
    breakfast: meal(
      breakfastName,
      calBase - 40,
      "10 min overnight or stovetop",
      recipeFor(
        breakfastName,
        [
          "40g rolled oats",
          "200ml milk or water",
          "1/2 cup chopped fruit",
          "1 tsp seeds or nuts",
          "Pinch of cinnamon (optional)",
        ],
        [
          "Combine oats with milk/water in a bowl or jar.",
          "Microwave 2–3 min or soak overnight in the fridge.",
          "Top with fruit and seeds; serve warm or cold.",
        ],
        { prep: 5, cook: 5 },
      ),
    ),
    lunch: meal(
      lunchName,
      calBase + 80,
      "Batch-cook grains on Sunday",
      recipeFor(
        lunchName,
        [
          `120g cooked ${vegBase.toLowerCase()}`,
          "1 cup cooked rice or millets",
          "1 cup mixed salad veggies",
          "1 tsp oil + spices to taste",
          "Lemon wedge",
        ],
        [
          "Warm the protein with light spices in 1 tsp oil.",
          "Plate over grains with raw or quickly sautéed salad veggies.",
          "Finish with lemon; pack leftovers for tomorrow if needed.",
        ],
        { prep: 10, cook: 12 },
      ),
    ),
    afternoonSnack: meal(
      afternoonSnackName,
      140,
      "Quick desk-side snack",
      recipeFor(
        afternoonSnackName,
        day % 2 === 0
          ? ["1 cup makhana", "Pinch of salt", "1 tsp ghee (optional)"]
          : ["1 banana", "6–8 almonds"],
        day % 2 === 0
          ? [
              "Dry-roast makhana in a pan for 2–3 min until crisp.",
              "Season lightly; cool and portion into a small box.",
            ]
          : [
              "Peel or slice the banana.",
              "Pair with almonds for a balanced afternoon bite.",
            ],
        { prep: 3, cook: day % 2 === 0 ? 3 : 0 },
      ),
    ),
    eveningSnack: meal(
      eveningSnackName,
      160,
      "Keep ready in fridge",
      recipeFor(
        eveningSnackName,
        day % 2 === 0
          ? ["150g curd", "1 tsp mixed seeds", "Pinch of salt or fruit"]
          : ["1 apple", "10–12 roasted peanuts"],
        day % 2 === 0
          ? [
              "Spoon curd into a bowl.",
              "Top with seeds and a pinch of salt or chopped fruit.",
              "Eat 30–60 min before dinner.",
            ]
          : [
              "Wash and slice the apple.",
              "Portion peanuts.",
              "Eat together before your light dinner.",
            ],
        { prep: 3, cook: 0 },
      ),
    ),
    dinner: meal(
      dinnerName,
      calBase + 20,
      "One-pan, under 20 min",
      recipeFor(
        dinnerName,
        [
          `100g ${vegBase.toLowerCase()}`,
          "2 cups mixed vegetables",
          "1 tsp oil",
          "Garlic, salt, pepper or garam masala",
        ],
        [
          "Heat oil in a wide pan; sauté garlic 30 seconds.",
          `Add ${vegBase.toLowerCase()} and veggies; stir-fry 8–10 min.`,
          "Season, taste, and serve hot with a side of curd if desired.",
        ],
        { prep: 8, cook: 12 },
      ),
    ),
  };
}

function focusForDay(
  prefs: UserProfile["workoutPrefs"],
  index: number,
): WorkoutSession["focus"] {
  const { workoutStyle } = prefs;
  if (workoutStyle === "cardio") return index % 4 === 3 ? "mixed" : "cardio";
  if (workoutStyle === "core") return index % 4 === 3 ? "mixed" : "core";
  if (workoutStyle === "strength") return index % 4 === 3 ? "mixed" : "strength";
  const rotation: WorkoutSession["focus"][] = [
    "cardio",
    "strength",
    "core",
    "mixed",
  ];
  return rotation[index % rotation.length];
}

function cardioExerciseName(prefs: UserProfile["workoutPrefs"]): string {
  if (prefs.equipment.includes("treadmill")) return "Treadmill walk intervals";
  if (prefs.equipment.includes("exercise-cycle")) {
    return "Exercise cycle intervals";
  }
  if (prefs.equipment.includes("stepper")) return "Stepper intervals";
  return "Step touches";
}

function workoutsForWeek(
  week: number,
  prefs: UserProfile["workoutPrefs"],
): WorkoutSession[] {
  const count = prefs.daysPerWeek;
  return Array.from({ length: count }, (_, i) => {
    const focus = focusForDay(prefs, i);
    const sets = prefs.comfortLevel === "beginner" ? 2 : 3;
    const reps =
      prefs.comfortLevel === "intermediate" ? "12-15" : "10-12";
    return {
      day: i + 1,
      dayLabel: DAY_LABELS[i],
      title: `Week ${week} · ${focus} at home`,
      durationMins: prefs.minutesPerSession,
      focus,
      equipment: prefs.equipment.length ? [...prefs.equipment] : [],
      exercises: [
        {
          name: "March in place warm-up",
          durationSec: 120,
          restSec: 20,
          cue: "Easy pace, loosen shoulders",
        },
        {
          name: prefs.equipment.includes("resistance-band")
            ? "Band rows"
            : prefs.equipment.includes("flexible-weights")
              ? "Goblet squats with flexible weights"
              : "Wall push-ups",
          sets,
          reps,
          restSec: 40,
          cue: "Slow lower, stop if wrist/shoulder pain",
        },
        {
          name:
            focus === "core"
              ? "Dead bug or modified plank"
              : "Bodyweight squats or chair squats",
          sets,
          reps,
          restSec: 45,
          cue: "Knees track toes; use chair if needed",
        },
        {
          name:
            focus === "cardio" || focus === "mixed"
              ? cardioExerciseName(prefs)
              : "Glute bridge",
          sets: focus === "cardio" ? undefined : sets,
          reps: focus === "cardio" ? undefined : reps,
          durationSec: focus === "cardio" ? 90 : undefined,
          restSec: 30,
          cue: "Breathe steady; stop if sharp pain",
        },
        {
          name: "Child’s pose or seated stretch",
          durationSec: 60,
          cue: "Cool down, soft belly breathing",
        },
      ],
    };
  });
}

function groceryForWeek(week: number, dietType: UserProfile["dietType"]): GroceryItem[] {
  const protein =
    dietType === "non-veg"
      ? "Chicken breast"
      : dietType === "egg"
        ? "Eggs"
        : "Paneer";

  return [
    {
      name: protein,
      qty: dietType === "egg" ? 12 : 500,
      unit: dietType === "egg" ? "pcs" : "g",
      category: "Protein",
      options: [
        {
          tier: "budget",
          brand: "Local / store",
          productLabel: `${protein} value pack`,
          blinkitQuery: protein.toLowerCase(),
        },
      ],
    },
    {
      name: "Oats",
      qty: 1,
      unit: "kg",
      category: "Pantry",
      options: [
        {
          tier: "budget",
          brand: "Saffola",
          productLabel: "Oats",
          blinkitQuery: "Saffola oats",
        },
      ],
    },
    {
      name: "Mixed vegetables",
      qty: 2 + week,
      unit: "kg",
      category: "Produce",
      options: [
        {
          tier: "budget",
          brand: "Local",
          productLabel: "Seasonal veggies",
          blinkitQuery: "vegetables",
        },
      ],
    },
    {
      name: "Greek yogurt / curd",
      qty: 1,
      unit: "kg",
      category: "Dairy",
      options: [
        {
          tier: "budget",
          brand: "Mother Dairy",
          productLabel: "Curd",
          blinkitQuery: "Mother Dairy curd",
        },
      ],
    },
  ];
}

export function buildMockMonthlyPlan(
  profile: UserProfile,
  stats: BodyStats,
  statsId: string,
): MonthlyPlan {
  const cuisine = profile.cuisines[0] || "Indian";
  const weeks: PlanWeek[] = [1, 2, 3, 4].map((week) => {
    const dailyMeals = Array.from({ length: 7 }, (_, d) =>
      mealSet(profile.dietType, cuisine, week, d),
    );
    const partial: PlanWeek = {
      weekNumber: week,
      focus:
        week === 1
          ? "Habit reset · gentle fat-loss base"
          : week === 2
            ? "Consistency · protein-forward plates"
            : week === 3
              ? "Progressive home strength"
              : "Lock-in · sustainable deficit",
      dailyMeals,
      workouts: workoutsForWeek(week, profile.workoutPrefs),
      grocery: groceryForWeek(week, profile.dietType),
    };
    return { ...partial, grocery: buildWeekGroceryList(partial) };
  });

  const fatNote = stats.bodyFatPct
    ? ` Targeting gradual body-fat reduction from ~${stats.bodyFatPct}%.`
    : "";

  return {
    monthStart: new Date().toISOString().slice(0, 10),
    groundedOnStatsId: statsId,
    summary: `Custom 4-week plan for a ${stats.age}y working mom, ${stats.weightKg}→${stats.goalWeightKg} kg, ${profile.dietType}, ${cuisine} leaning meals, ${profile.workoutPrefs.workoutStyle}-leaning ${profile.workoutPrefs.minutesPerSession}-min home workouts ${profile.workoutPrefs.daysPerWeek}x/week (${formatEquipmentList(profile.workoutPrefs.equipment)}).${fatNote}`,
    weeks,
    createdAt: new Date().toISOString(),
  };
}
