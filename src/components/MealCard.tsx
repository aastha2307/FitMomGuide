import Image from "next/image";
import Link from "next/link";
import type { MealSlotKey } from "@/lib/meals";
import { mealImageUrl, mealSlotTone } from "@/lib/meal-images";
import type { MealSlot } from "@/types";

export function MealCard({
  href,
  slot,
  title,
  meal,
}: {
  href: string;
  slot: MealSlotKey;
  title: string;
  meal: MealSlot;
}) {
  const imageUrl = mealImageUrl(slot, meal.name, {
    imageQuery: meal.recipe?.imageQuery,
    imageUrl: meal.recipe?.imageUrl,
  });
  const prepMins = meal.recipe
    ? meal.recipe.prepMins + meal.recipe.cookMins
    : null;

  return (
    <Link href={href} className={`meal-card ${mealSlotTone(slot)}`}>
      <div className="meal-card-media">
        <Image
          src={imageUrl}
          alt={`${title} — ${meal.name}`}
          fill
          sizes="(max-width: 560px) 120px, 140px"
          className="meal-card-img"
        />
      </div>
      <div className="meal-card-body">
        <span className="meal-slot-badge">{title}</span>
        <strong className="meal-card-title">{meal.name}</strong>
        <p className="meal-card-notes">{meal.prepNotes}</p>
        <div className="meal-card-meta">
          <span>{meal.calories} kcal</span>
          {prepMins ? <span>{prepMins} min</span> : null}
          <span className="meal-card-cta">Recipe →</span>
        </div>
      </div>
    </Link>
  );
}
