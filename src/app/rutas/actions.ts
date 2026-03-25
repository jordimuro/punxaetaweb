"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createRoute,
  parseRouteFormData,
  updateRoute,
  type RouteFormState,
} from "@/lib/routes";

function slugConflictError(state: RouteFormState) {
  return {
    ...state,
    errors: {
      ...state.errors,
      slug: "Ja hi ha una ruta amb aquest slug.",
    },
  };
}

export async function saveRouteAction(
  _prevState: RouteFormState,
  formData: FormData,
): Promise<RouteFormState> {
  const parsed = parseRouteFormData(formData);

  if (Object.keys(parsed.errors).length > 0) {
    return parsed;
  }

  let route;

  try {
    route = parsed.values.id
      ? await updateRoute(parsed.values)
      : await createRoute(parsed.values);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (
        (error as { code?: string }).code === "P2002" ||
        (error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE"
      )
    ) {
      return slugConflictError(parsed);
    }

    return {
      ...parsed,
      formError: "No s'ha pogut guardar la ruta.",
    };
  }

  revalidatePath("/");
  revalidatePath("/rutas");
  revalidatePath(`/rutas/${route.slug}`);

  if (parsed.values.originalSlug && parsed.values.originalSlug !== route.slug) {
    revalidatePath(`/rutas/${parsed.values.originalSlug}`);
  }

  redirect(`/rutas/${route.slug}`);
}
