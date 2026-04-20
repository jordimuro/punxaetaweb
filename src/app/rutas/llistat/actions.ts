"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearRouteTemplates,
  createRouteTemplate,
  deleteRouteTemplate,
  parseRouteTemplateFormData,
  saveRouteTemplateGpx,
  seedRouteTemplatesFromCatalog,
  updateRouteTemplate,
  type RouteTemplateFormState,
} from "@/lib/route-templates";

function slugConflictError(state: RouteTemplateFormState) {
  return {
    ...state,
    errors: {
      ...state.errors,
      slug: "Ja hi ha una ruta base amb aquest slug.",
    },
  };
}

export async function saveRouteTemplateAction(
  _prevState: RouteTemplateFormState,
  formData: FormData,
): Promise<RouteTemplateFormState> {
  const parsed = parseRouteTemplateFormData(formData);
  const gpxFile = formData.get("gpxFile");
  const gpxFileSecondary = formData.get("gpxFileSecondary");

  if (Object.keys(parsed.errors).length > 0) {
    return parsed;
  }

  let template;
  try {
    template = parsed.values.id
      ? await updateRouteTemplate(parsed.values)
      : await createRouteTemplate(parsed.values);

    if (gpxFile instanceof File && gpxFile.size > 0) {
      await saveRouteTemplateGpx(template.slug, gpxFile, "primary");
    }
    if (template.routeType === "cicloturista" && gpxFileSecondary instanceof File && gpxFileSecondary.size > 0) {
      await saveRouteTemplateGpx(template.slug, gpxFileSecondary, "secondary");
    }
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
      formError: "No s'ha pogut guardar la ruta base.",
    };
  }

  revalidatePath("/rutas/llistat");
  revalidatePath(`/rutas/llistat/${template.slug}`);
  revalidatePath("/rutas/nova");
  if (parsed.values.originalSlug && parsed.values.originalSlug !== template.slug) {
    revalidatePath(`/rutas/llistat/${parsed.values.originalSlug}`);
  }

  redirect(`/rutas/llistat/${template.slug}`);
}

export async function deleteRouteTemplateAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) {
    return;
  }

  await deleteRouteTemplate(slug);
  revalidatePath("/rutas/llistat");
  revalidatePath("/rutas/nova");
  redirect("/rutas/llistat");
}

export async function initializeRouteTemplatesSeedAction() {
  const result = await seedRouteTemplatesFromCatalog();
  revalidatePath("/rutas/llistat");
  revalidatePath("/rutas/nova");
  redirect(
    `/rutas/llistat?seed=loaded&inserted=${result.inserted}&skipped=${result.skipped}&total=${result.totalCatalog}`,
  );
}

export async function clearRouteTemplatesAction() {
  const result = await clearRouteTemplates();
  revalidatePath("/rutas/llistat");
  revalidatePath("/rutas/nova");
  redirect(`/rutas/llistat?seed=cleared&deleted=${result.deletedRoutes}&files=${result.removedFiles}`);
}
