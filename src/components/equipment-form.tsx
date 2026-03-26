"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { AuthOnly } from "@/components/auth";
import type { EquipmentFormState, EquipmentFormValues } from "@/lib/equipacions";

type EquipmentFormProps = {
  action: (state: EquipmentFormState, formData: FormData) => Promise<EquipmentFormState>;
  initialValues: EquipmentFormValues;
  initialMedia?: {
    images: string[];
    videos: string[];
  };
  title: string;
  submitLabel: string;
};

type MediaPreview = {
  id: string;
  url: string;
  name: string;
  file: File;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="field__error">{message}</p>;
}

function buildPreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

function syncInputFiles(input: HTMLInputElement | null, files: File[]) {
  if (!input) {
    return;
  }

  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  input.files = dataTransfer.files;
}

export function EquipmentForm({
  action,
  initialValues,
  initialMedia = { images: [], videos: [] },
  title,
  submitLabel,
}: EquipmentFormProps) {
  const [state, formAction, isPending] = useActionState(action, {
    values: initialValues,
    errors: {},
  });
  const [removedImages, setRemovedImages] = useState<Set<string>>(() => new Set());
  const [removedVideos, setRemovedVideos] = useState<Set<string>>(() => new Set());
  const [orderedImages, setOrderedImages] = useState<string[]>(() => initialMedia.images);
  const [orderedVideos, setOrderedVideos] = useState<string[]>(() => initialMedia.videos);
  const [newImages, setNewImages] = useState<MediaPreview[]>([]);
  const [newVideos, setNewVideos] = useState<MediaPreview[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const formKey = JSON.stringify(state.values);
  const existingImages = orderedImages.filter((path) => !removedImages.has(path));
  const existingVideos = orderedVideos.filter((path) => !removedVideos.has(path));

  function moveItem(list: string[], setList: (value: string[]) => void, path: string, direction: -1 | 1) {
    const index = list.indexOf(path);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= list.length) {
      return;
    }

    const next = [...list];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setList(next);
  }

  useEffect(
    () => () => {
      [...newImages, ...newVideos].forEach((item) => URL.revokeObjectURL(item.url));
    },
    [newImages, newVideos],
  );

  function appendImages(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const additions = Array.from(files);
    const next = additions.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${globalThis.crypto.randomUUID()}`,
      url: buildPreviewUrl(file),
      name: file.name,
      file,
    }));

    setNewImages((current) => {
      const updated = [...current, ...next];
      syncInputFiles(
        imageInputRef.current,
        updated.map((item) => item.file),
      );
      return updated;
    });
  }

  function appendVideos(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const additions = Array.from(files);
    const next = additions.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${globalThis.crypto.randomUUID()}`,
      url: buildPreviewUrl(file),
      name: file.name,
      file,
    }));

    setNewVideos((current) => {
      const updated = [...current, ...next];
      syncInputFiles(
        videoInputRef.current,
        updated.map((item) => item.file),
      );
      return updated;
    });
  }

  return (
    <AuthOnly
      fallback={
        <div className="panel auth-gate">
          <span className="panel__label">Accés privat</span>
          <h2>Inicia sessió per a crear o editar equipacions.</h2>
          <p>Les targetes i el catàleg només es poden gestionar amb accés autoritzat.</p>
          <div className="form-actions">
            <Link className="button button--secondary" href="/equipaciones">
              Tornar al llistat
            </Link>
            <Link className="button button--primary" href="/login">
              Iniciar sessió
            </Link>
          </div>
        </div>
      }
    >
      <div className="form-shell">
        <div className="page-head page-head--tight">
          <span className="eyebrow">Equipació</span>
          <h1>{title}</h1>
        </div>

        <form key={formKey} action={formAction} className="form-card">
          <input type="hidden" name="id" defaultValue={state.values.id} />
          <input type="hidden" name="originalSlug" defaultValue={state.values.originalSlug} />
          {Array.from(removedImages).map((path) => (
            <input key={path} type="hidden" name="removeImagePaths" value={path} />
          ))}
          {Array.from(removedVideos).map((path) => (
            <input key={path} type="hidden" name="removeVideoPaths" value={path} />
          ))}
          {existingImages.map((path) => (
            <input key={path} type="hidden" name="orderedImagePaths" value={path} />
          ))}
          {existingVideos.map((path) => (
            <input key={path} type="hidden" name="orderedVideoPaths" value={path} />
          ))}

          {state.formError ? <p className="form__alert">{state.formError}</p> : null}

          <div className="form-grid">
            <label className="field">
              <span>Slug URL</span>
              <input name="slug" defaultValue={state.values.slug} placeholder="nom-equipacio" />
              <FieldError message={state.errors.slug} />
            </label>

            <label className="field">
              <span>Títol</span>
              <input name="name" defaultValue={state.values.name} placeholder="Maillot principal" />
              <FieldError message={state.errors.name} />
            </label>

            <label className="field">
              <span>Temporada</span>
              <input type="number" name="year" defaultValue={state.values.year} min="2025" step="1" />
              <FieldError message={state.errors.year} />
            </label>

            <label className="field">
              <span>Preu</span>
              <input type="number" name="price" defaultValue={state.values.price} min="0" step="0.01" />
              <FieldError message={state.errors.price} />
            </label>

            <label className="field field--full">
              <span>Descripció</span>
              <textarea name="description" defaultValue={state.values.description} rows={4} />
              <FieldError message={state.errors.description} />
            </label>

            <label className="field field--full">
              <span>Talles disponibles</span>
              <textarea name="sizes" defaultValue={state.values.sizes} rows={2} placeholder="XS, S, M, L, XL" />
              <FieldError message={state.errors.sizes} />
            </label>

            <div className="field field--full upload-shell upload-shell--media">
              <div className="upload-shell__header">
                <span className="panel__label">Galeria</span>
                <h3>Imatges i vídeos</h3>
                <p>Puja una o diverses peces multimèdia per a completar la fitxa del producte.</p>
              </div>

              {existingImages.length > 0 || existingVideos.length > 0 ? (
                <div className="upload-shell__gallery">
                  {existingImages.length > 0 ? (
                    <div className="upload-shell__gallery-group">
                      <span className="upload-shell__gallery-title">Imatges actuals</span>
                      <div className="upload-shell__preview-grid">
                        {existingImages.map((path) => (
                          <figure key={path} className="upload-shell__preview-card">
                            <div className="upload-shell__preview-media">
                              <Image unoptimized src={path} alt="Imatge actual de l'equipació" fill sizes="180px" />
                            </div>
                            <figcaption className="upload-shell__preview-caption">
                              <span>Imatge guardada</span>
                              <div className="upload-shell__preview-actions">
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={() =>
                                    moveItem(orderedImages, setOrderedImages, path, -1)
                                  }
                                >
                                  Amunt
                                </button>
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={() =>
                                    moveItem(orderedImages, setOrderedImages, path, 1)
                                  }
                                >
                                  Avall
                                </button>
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={() =>
                                    setRemovedImages((current) => {
                                      const next = new Set(current);
                                      next.add(path);
                                      return next;
                                    })
                                  }
                                >
                                  Eliminar
                                </button>
                              </div>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {existingVideos.length > 0 ? (
                    <div className="upload-shell__gallery-group">
                      <span className="upload-shell__gallery-title">Vídeos actuals</span>
                      <div className="upload-shell__preview-grid">
                        {existingVideos.map((path) => (
                          <figure key={path} className="upload-shell__preview-card">
                            <video className="upload-shell__preview-media upload-shell__preview-media--video" controls preload="metadata">
                              <source src={path} />
                            </video>
                            <figcaption className="upload-shell__preview-caption">
                              <span>Vídeo guardat</span>
                              <div className="upload-shell__preview-actions">
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={() =>
                                    moveItem(orderedVideos, setOrderedVideos, path, -1)
                                  }
                                >
                                  Amunt
                                </button>
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={() =>
                                    moveItem(orderedVideos, setOrderedVideos, path, 1)
                                  }
                                >
                                  Avall
                                </button>
                                <button
                                  type="button"
                                  className="text-link"
                                  onClick={() =>
                                    setRemovedVideos((current) => {
                                      const next = new Set(current);
                                      next.add(path);
                                      return next;
                                    })
                                  }
                                >
                                  Eliminar
                                </button>
                              </div>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="upload-shell__media-grid">
                <label className="upload-shell__field">
                  <span>Pujar imatges</span>
                  <input
                    ref={imageInputRef}
                    type="file"
                    name="imageFiles"
                    accept="image/*"
                    multiple
                    onChange={(event) => appendImages(event.currentTarget.files)}
                  />
                </label>

                <label className="upload-shell__field">
                  <span>Pujar vídeos</span>
                  <input
                    ref={videoInputRef}
                    type="file"
                    name="videoFiles"
                    accept="video/*"
                    multiple
                    onChange={(event) => appendVideos(event.currentTarget.files)}
                  />
                </label>
              </div>

              {newImages.length > 0 || newVideos.length > 0 ? (
                <div className="upload-shell__gallery">
                  {newImages.length > 0 ? (
                    <div className="upload-shell__gallery-group">
                      <span className="upload-shell__gallery-title">Imatges a pujar</span>
                      <div className="upload-shell__preview-grid">
                        {newImages.map((item) => (
                          <figure key={item.id} className="upload-shell__preview-card">
                            <div className="upload-shell__preview-media">
                              <Image unoptimized src={item.url} alt={item.name} fill sizes="180px" />
                            </div>
                            <figcaption className="upload-shell__preview-caption">
                              <span>{item.name}</span>
                              <button
                                type="button"
                                className="text-link"
                                onClick={() => {
                                  setNewImages((current) => {
                                    const next = current.filter((preview) => preview.id !== item.id);
                                    syncInputFiles(
                                      imageInputRef.current,
                                      next.map((preview) => preview.file),
                                    );
                                    return next;
                                  });
                                  URL.revokeObjectURL(item.url);
                                }}
                              >
                                Eliminar
                              </button>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {newVideos.length > 0 ? (
                    <div className="upload-shell__gallery-group">
                      <span className="upload-shell__gallery-title">Vídeos a pujar</span>
                      <div className="upload-shell__preview-grid">
                        {newVideos.map((item) => (
                          <figure key={item.id} className="upload-shell__preview-card">
                            <video className="upload-shell__preview-media upload-shell__preview-media--video" controls preload="metadata">
                              <source src={item.url} />
                            </video>
                            <figcaption className="upload-shell__preview-caption">
                              <span>{item.name}</span>
                              <button
                                type="button"
                                className="text-link"
                                onClick={() => {
                                  setNewVideos((current) => {
                                    const next = current.filter((preview) => preview.id !== item.id);
                                    syncInputFiles(
                                      videoInputRef.current,
                                      next.map((preview) => preview.file),
                                    );
                                    return next;
                                  });
                                  URL.revokeObjectURL(item.url);
                                }}
                              >
                                Eliminar
                              </button>
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <p className="upload-shell__hint">Les noves peces s&apos;afegiran a la galeria del producte.</p>
            </div>
          </div>

          <div className="form-actions">
            <Link className="button button--secondary" href="/equipaciones">
              Cancel·lar
            </Link>
            <button className="button button--primary" type="submit" disabled={isPending}>
              {isPending ? "Guardant..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </AuthOnly>
  );
}
