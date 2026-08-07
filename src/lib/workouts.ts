import type { Exercise, PlanWeek, WorkoutSession } from "@/types";

export function workoutHref(weekNumber: number, day: number): string {
  return `/plan/week/${weekNumber}/workout/${day}`;
}

export function getWorkoutFromWeek(
  week: PlanWeek,
  day: number,
): WorkoutSession | null {
  return week.workouts.find((w) => w.day === day) ?? null;
}

export function youtubeQueryForWorkout(session: WorkoutSession): string {
  if (session.youtubeQuery?.trim()) return session.youtubeQuery.trim();
  return `${session.title} home workout ${session.focus}`;
}

export function youtubeQueryForExercise(
  exercise: Exercise,
  session: WorkoutSession,
): string {
  if (exercise.youtubeQuery?.trim()) return exercise.youtubeQuery.trim();
  return `${exercise.name} home exercise ${session.focus}`;
}

export function formatExerciseMeta(exercise: Exercise): string {
  return [
    exercise.sets ? `${exercise.sets} sets` : null,
    exercise.reps ? `${exercise.reps} reps` : null,
    exercise.durationSec ? `${exercise.durationSec}s` : null,
    exercise.restSec ? `${exercise.restSec}s rest` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
