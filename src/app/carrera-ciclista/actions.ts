"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTrofeuEntrada,
  deleteTrofeuEntrada,
  parseTrofeuFormData,
  updateTrofeuEntrada,
  type TrofeuFormState,
} from "@/lib/trofeu";

function slugConflictError(state: TrofeuFormState) {
  return {
    ...state,
    errors: {
      ...state.errors,
      slug: "Ja hi ha una entrada amb aquest slug.",
    },
  };
}

export async function saveTrofeuAction(
  _prevState: TrofeuFormState,
  formData: FormData,
): Promise<TrofeuFormState> {
  const parsed = parseTrofeuFormData(formData);

  if (Object.keys(parsed.errors).length > 0) {
    return parsed;
  }

  let item;

  try {
    item = parsed.values.id
      ? await updateTrofeuEntrada(parsed.values)
      : await createTrofeuEntrada(parsed.values);
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
      formError: "No s'ha pogut guardar l'entrada.",
    };
  }

  revalidatePath("/");
  revalidatePath("/carrera-ciclista");
  revalidatePath(`/carrera-ciclista/${item.slug}`);

  if (parsed.values.originalSlug && parsed.values.originalSlug !== item.slug) {
    revalidatePath(`/carrera-ciclista/${parsed.values.originalSlug}`);
  }

  redirect(`/carrera-ciclista/${item.slug}`);
}

export async function deleteTrofeuAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) {
    return;
  }

  await deleteTrofeuEntrada(slug);
  revalidatePath("/");
  revalidatePath("/carrera-ciclista");
  redirect("/carrera-ciclista");
}
