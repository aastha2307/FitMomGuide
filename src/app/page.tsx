"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/plan");
  }, [loading, user, router]);

  return (
    <div className="app-shell" style={{ paddingBottom: "1.5rem" }}>
      <section className="hero fade-in">
        <div className="hero-content">
          <p className="brand-mark" style={{ fontSize: "1.1rem" }}>
            FitMomGuide
          </p>
          <h1>Meals, moves, and groceries that fit real mom life.</h1>
          <p>
            A custom monthly plan from your stats — home workouts, simple plates,
            and Blinkit-ready shopping.
          </p>
          <div className="btn-row" style={{ marginTop: "0.5rem" }}>
            <Link href="/sign-in" className="btn btn-primary">
              Get started
            </Link>
            <Link href="/sign-in" className="btn btn-secondary">
              I already have an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
