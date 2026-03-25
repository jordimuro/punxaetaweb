"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteRoute,
  createRoute,
  parseRouteFormData,
  saveRouteGpx,
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

export async function deleteRouteAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();

  if (!slug) {
    return;
  }

  await deleteRoute(slug);
  revalidatePath("/");
  revalidatePath("/rutas");
  redirect("/rutas");
}

export async function saveRouteGpxAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const file = formData.get("gpxFile");

  if (!slug || !(file instanceof File) || file.size === 0) {
    redirect(`/rutas/${slug}`);
  }

  await saveRouteGpx(slug, file);
  revalidatePath("/rutas");
  revalidatePath(`/rutas/${slug}`);
  redirect(`/rutas/${slug}`);
}
