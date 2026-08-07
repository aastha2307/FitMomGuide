import Image from "next/image";
import type { MealSlotKey } from "@/lib/meals";
import { mealImageUrl, mealSlotTone } from "@/lib/meal-images";

export function MealHero({
  slot,
  mealName,
  mealLabel,
  dayLabel,
  calories,
  prepMins,
  servings,
}: {
  slot: MealSlotKey;
  mealName: string;
  mealLabel: string;
  dayLabel: string;
  calories: number;
  prepMins: number;
  servings: number;
}) {
  const imageUrl = mealImageUrl(slot);

  return (
    <section className={`meal-hero ${mealSlotTone(slot)}`}>
      <div className="meal-hero-media">
        <Image
          src={imageUrl}
          alt={mealName}
          fill
          priority
          sizes="(max-width: 560px) 100vw, 560px"
          className="meal-hero-img"
        />
        <div className="meal-hero-overlay" />
      </div>
      <div className="meal-hero-content">
        <p className="meal-hero-eyebrow">
          {dayLabel} · {mealLabel}
        </p>
        <h1 className="meal-hero-title">{mealName}</h1>
        <div className="meal-stat-row">
          <span className="meal-stat">{calories} kcal</span>
          <span className="meal-stat">{prepMins} min</span>
          <span className="meal-stat">
            {servings} serving{servings === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </section>
  );
}
