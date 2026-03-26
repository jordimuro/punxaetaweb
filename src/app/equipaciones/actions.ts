"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEquipacio,
  deleteEquipacio,
  parseEquipmentFormData,
  saveEquipmentMedia,
  updateEquipacio,
  type EquipmentFormState,
} from "@/lib/equipacions";

function slugConflictError(state: EquipmentFormState) {
  return {
    ...state,
    errors: {
      ...state.errors,
      slug: "Ja hi ha una equipació amb aquest slug.",
    },
  };
}

export async function saveEquipacioAction(
  _prevState: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  const parsed = parseEquipmentFormData(formData);
  const imageFiles = formData
    .getAll("imageFiles")
    .filter((file): file is File => file instanceof File && file.size > 0);
  const videoFiles = formData
    .getAll("videoFiles")
    .filter((file): file is File => file instanceof File && file.size > 0);
  const removeImagePaths = formData
    .getAll("removeImagePaths")
    .map((value) => String(value))
    .filter(Boolean);
  const removeVideoPaths = formData
    .getAll("removeVideoPaths")
    .map((value) => String(value))
    .filter(Boolean);
  const orderedImagePaths = formData
    .getAll("orderedImagePaths")
    .map((value) => String(value))
    .filter(Boolean);
  const orderedVideoPaths = formData
    .getAll("orderedVideoPaths")
    .map((value) => String(value))
    .filter(Boolean);

  if (Object.keys(parsed.errors).length > 0) {
    return parsed;
  }

  if (!parsed.values.id && imageFiles.length === 0) {
    return {
      ...parsed,
      formError: "Cal pujar almenys una imatge.",
    };
  }

  let item;

  try {
    item = parsed.values.id
      ? await updateEquipacio(parsed.values)
      : await createEquipacio(parsed.values);
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
      formError: "No s'ha pogut guardar l'equipació.",
    };
  }

  const hasMediaActivity =
    imageFiles.length > 0 ||
    videoFiles.length > 0 ||
    removeImagePaths.length > 0 ||
    removeVideoPaths.length > 0 ||
    orderedImagePaths.length > 0 ||
    orderedVideoPaths.length > 0;

  if (hasMediaActivity) {
    const updated = await saveEquipmentMedia(item.slug, imageFiles, videoFiles, {
      removeImagePaths,
      removeVideoPaths,
      orderedImagePaths,
      orderedVideoPaths,
    });
    if (updated) {
      item = updated;
    }
  }

  revalidatePath("/");
  revalidatePath("/equipaciones");
  revalidatePath(`/equipaciones/${item.slug}`);

  if (parsed.values.originalSlug && parsed.values.originalSlug !== item.slug) {
    revalidatePath(`/equipaciones/${parsed.values.originalSlug}`);
  }

  redirect(`/equipaciones/${item.slug}`);
}

export async function deleteEquipacioAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();

  if (!slug) {
    return;
  }

  await deleteEquipacio(slug);
  revalidatePath("/");
  revalidatePath("/equipaciones");
  redirect("/equipaciones");
}
