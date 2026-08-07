import type {
  BodyStats,
  DailyMeals,
  GroceryItem,
  MonthlyPlan,
  PlanWeek,
  UserProfile,
  WorkoutSession,
} from "@/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mealSet(
  dietType: UserProfile["dietType"],
  cuisine: string,
  week: number,
  day: number,
): DailyMeals {
  const vegBase =
    dietType === "non-veg"
      ? ["Paneer", "Chicken", "Egg", "Fish"][day % (dietType === "non-veg" ? 4 : 2)]
      : dietType === "egg"
        ? ["Paneer", "Egg", "Dal", "Tofu"][day % 4]
        : ["Paneer", "Dal", "Tofu", "Chickpea"][day % 4];

  const calBase = 380 - week * 10;
  return {
    day: day + 1,
    dayLabel: DAY_LABELS[day],
    breakfast: {
      name: `${cuisine} oats bowl with fruit`,
      calories: calBase - 40,
      prepNotes: "10 min overnight or stovetop",
    },
    lunch: {
      name: `${vegBase} ${cuisine.toLowerCase()} bowl + salad`,
      calories: calBase + 80,
      prepNotes: "Batch-cook grains on Sunday",
    },
    dinner: {
      name: `Light ${vegBase.toLowerCase()} stir with veggies`,
      calories: calBase + 20,
      prepNotes: "One-pan, under 20 min",
    },
    snacks: [
      {
        name: day % 2 === 0 ? "Curd + seeds" : "Apple + peanuts",
        calories: 160,
        prepNotes: "Keep ready in fridge",
      },
    ],
  };
}

function workoutsForWeek(
  week: number,
  prefs: UserProfile["workoutPrefs"],
): WorkoutSession[] {
  const focuses: WorkoutSession["focus"][] = [
    "strength",
    "cardio",
    "mobility",
    "mixed",
    "strength",
    "cardio",
  ];
  const count = prefs.daysPerWeek;
  return Array.from({ length: count }, (_, i) => {
    const focus = focuses[i % focuses.length];
    const sets = prefs.comfortLevel === "beginner" ? 2 : 3;
    const reps =
      prefs.comfortLevel === "intermediate" ? "12-15" : "10-12";
    return {
      day: i + 1,
      dayLabel: DAY_LABELS[i],
      title: `Week ${week} · ${focus} at home`,
      durationMins: prefs.minutesPerSession,
      focus,
      equipment: prefs.equipment,
      exercises: [
        {
          name: "March in place warm-up",
          durationSec: 120,
          restSec: 20,
          cue: "Easy pace, loosen shoulders",
        },
        {
          name: prefs.equipment === "basics" ? "Band rows" : "Wall push-ups",
          sets,
          reps,
          restSec: 40,
          cue: "Slow lower, stop if wrist/shoulder pain",
        },
        {
          name: "Bodyweight squats or chair squats",
          sets,
          reps,
          restSec: 45,
          cue: "Knees track toes; use chair if needed",
        },
        {
          name: focus === "cardio" ? "Step touches" : "Glute bridge",
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
          tier: "best",
          brand: dietType === "veg" ? "Amul" : "Licious",
          productLabel: `${protein} (premium)`,
          blinkitQuery:
            dietType === "veg" ? "Amul paneer" : dietType === "egg" ? "farm eggs" : "chicken breast",
        },
        {
          tier: "budget",
          brand: "Local / store",
          productLabel: `${protein} value pack`,
          blinkitQuery: protein.toLowerCase(),
        },
        {
          tier: "cleanest",
          brand: dietType === "veg" ? "Organic" : "Hormone-free",
          productLabel: `Clean-label ${protein}`,
          blinkitQuery: `organic ${protein.toLowerCase()}`,
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
          tier: "best",
          brand: "Quaker",
          productLabel: "Rolled oats",
          blinkitQuery: "Quaker oats",
        },
        {
          tier: "budget",
          brand: "Saffola",
          productLabel: "Oats",
          blinkitQuery: "Saffola oats",
        },
        {
          tier: "cleanest",
          brand: "Yoga Bar",
          productLabel: "Wholegrain oats",
          blinkitQuery: "Yoga Bar oats",
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
          tier: "best",
          brand: "Fresh",
          productLabel: "Farm veggies pack",
          blinkitQuery: "fresh vegetables",
        },
        {
          tier: "budget",
          brand: "Local",
          productLabel: "Seasonal veggies",
          blinkitQuery: "vegetables",
        },
        {
          tier: "cleanest",
          brand: "Organic",
          productLabel: "Organic veggies",
          blinkitQuery: "organic vegetables",
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
          tier: "best",
          brand: "Epigamia",
          productLabel: "Greek yogurt",
          blinkitQuery: "Epigamia greek yogurt",
        },
        {
          tier: "budget",
          brand: "Mother Dairy",
          productLabel: "Curd",
          blinkitQuery: "Mother Dairy curd",
        },
        {
          tier: "cleanest",
          brand: "Two Brothers",
          productLabel: "A2 curd",
          blinkitQuery: "A2 curd",
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
  const weeks: PlanWeek[] = [1, 2, 3, 4].map((week) => ({
    weekNumber: week,
    focus:
      week === 1
        ? "Habit reset · gentle fat-loss base"
        : week === 2
          ? "Consistency · protein-forward plates"
          : week === 3
            ? "Progressive home strength"
            : "Lock-in · sustainable deficit",
    dailyMeals: Array.from({ length: 7 }, (_, d) =>
      mealSet(profile.dietType, cuisine, week, d),
    ),
    workouts: workoutsForWeek(week, profile.workoutPrefs),
    grocery: groceryForWeek(week, profile.dietType),
  }));

  const fatNote = stats.bodyFatPct
    ? ` Targeting gradual body-fat reduction from ~${stats.bodyFatPct}%.`
    : "";

  return {
    monthStart: new Date().toISOString().slice(0, 10),
    groundedOnStatsId: statsId,
    summary: `Custom 4-week plan for a ${stats.age}y working mom, ${stats.weightKg}→${stats.goalWeightKg} kg, ${profile.dietType}, ${cuisine} leaning meals, and ${profile.workoutPrefs.minutesPerSession}-min home workouts ${profile.workoutPrefs.daysPerWeek}x/week.${fatNote}`,
    weeks,
    createdAt: new Date().toISOString(),
  };
}
