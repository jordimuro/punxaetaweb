"use client";

import { useOptimistic, useTransition } from "react";
import { toggleRouteSharedCalendarAction } from "@/app/rutas/actions";

type RouteCalendarToggleProps = {
  slug: string;
  initialEnabled: boolean;
};

export function RouteCalendarToggle({ slug, initialEnabled }: RouteCalendarToggleProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(initialEnabled);

  return (
    <div className="route-calendar-toggle">
      <label className="route-calendar-toggle__label">
        <input
          type="checkbox"
          checked={optimisticEnabled}
          disabled={isPending}
          onChange={(event) => {
            const nextEnabled = event.currentTarget.checked;
            setOptimisticEnabled(nextEnabled);

            const formData = new FormData();
            formData.set("slug", slug);
            if (nextEnabled) {
              formData.set("enabled", "1");
            }

            startTransition(async () => {
              await toggleRouteSharedCalendarAction(formData);
            });
          }}
        />
        <span>Calendari compartit</span>
      </label>
      <p className="route-calendar-toggle__status">
        {optimisticEnabled ? "Visible al .ics" : "Oculta al .ics"}
      </p>
    </div>
  );
}
