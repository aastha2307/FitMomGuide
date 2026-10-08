"use client";

import { RECAPTCHA_CONTAINER_ID } from "@/lib/phone-recaptcha";

export function PhoneRecaptcha() {
  return (
    <div className="recaptcha-panel" aria-label="Security check">
      <div id={RECAPTCHA_CONTAINER_ID} className="recaptcha-widget" />
    </div>
  );
}
