"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth";
import styles from "./photo-feed.module.css";

type Post = {
  id: string;
  title: string;
  author: string;
  images: string[];
  createdAt: string;
};

type PhotosResponse = {
  posts: Post[];
};

type CreatePostResponse = {
  post: Post;
};

type UpdatePostResponse = {
  post: Post;
};

type EditNewImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type EditDraft = {
  postId: string;
  title: string;
  dateInput: string;
  images: string[];
  newImages: EditNewImage[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(
  touchA: { clientX: number; clientY: number },
  touchB: { clientX: number; clientY: number },
) {
  const dx = touchA.clientX - touchB.clientX;
  const dy = touchA.clientY - touchB.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

async function uploadPhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/media-upload?folder=fotos", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("No s'ha pogut pujar una de les imatges.");
  }

  const data = (await response.json()) as { url: string };
  return data.url;
}

function formatCreatedAt(date: string) {
  return new Intl.DateTimeFormat("ca-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function toDateInputValue(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function toCreatedAtIso(dateInput: string) {
  return new Date(`${dateInput}T12:00:00.000Z`).toISOString();
}

function revokeDraftObjectUrls(draft: EditDraft | null) {
  if (!draft) {
    return;
  }

  draft.newImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
}

export function PhotoFeed() {
  const { ready, isAuthenticated, username } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [slideByPost, setSlideByPost] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [lightbox, setLightbox] = useState<{
    postId: string;
    imageIndex: number;
  } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });

  const pinchDistanceRef = useRef<number | null>(null);
  const pinchScaleRef = useRef<number>(1);
  const panStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const editDraftRef = useRef<EditDraft | null>(null);
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const displayAuthor = useMemo(() => username ?? "Admin", [username]);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/fotos/posts", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No s'han pogut carregar les publicacions.");
        }

        const data = (await response.json()) as PhotosResponse;
        if (!active) {
          return;
        }

        setPosts(data.posts);
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Error carregant publicacions.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    editDraftRef.current = editDraft;
  }, [editDraft]);

  useEffect(
    () => () => {
      revokeDraftObjectUrls(editDraftRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!lightbox) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightbox(null);
        setLightboxZoom(1);
        setLightboxPan({ x: 0, y: 0 });
      }
      if (event.key === "ArrowRight") {
        setLightbox((current) => {
          if (!current) {
            return current;
          }
          const post = posts.find((item) => item.id === current.postId);
          if (!post || post.images.length === 0) {
            return current;
          }
          const nextIndex = (current.imageIndex + 1 + post.images.length) % post.images.length;
          setLightboxZoom(1);
          setLightboxPan({ x: 0, y: 0 });
          return { ...current, imageIndex: nextIndex };
        });
      }
      if (event.key === "ArrowLeft") {
        setLightbox((current) => {
          if (!current) {
            return current;
          }
          const post = posts.find((item) => item.id === current.postId);
          if (!post || post.images.length === 0) {
            return current;
          }
          const nextIndex = (current.imageIndex - 1 + post.images.length) % post.images.length;
          setLightboxZoom(1);
          setLightboxPan({ x: 0, y: 0 });
          return { ...current, imageIndex: nextIndex };
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox, posts]);

  async function handleCreatePost(files: FileList | null) {
    if (!files || files.length === 0 || saving) {
      return;
    }

    const title = newPostTitle.trim() || `Publicació ${posts.length + 1}`;
    setSaving(true);
    setErrorMessage("");

    try {
      const imageUrls = await Promise.all(Array.from(files).map(uploadPhoto));

      const response = await fetch("/api/fotos/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          author: displayAuthor,
          images: imageUrls,
        }),
      });

      if (!response.ok) {
        throw new Error("No s'ha pogut crear la publicació.");
      }

      const data = (await response.json()) as CreatePostResponse;
      setPosts((prev) => [data.post, ...prev]);
      setSlideByPost((prev) => ({ ...prev, [data.post.id]: 0 }));
      setNewPostTitle("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error creant la publicació.");
    } finally {
      setSaving(false);
    }
  }

  function startEditPost(post: Post) {
    revokeDraftObjectUrls(editDraft);
    setEditDraft({
      postId: post.id,
      title: post.title,
      dateInput: toDateInputValue(post.createdAt),
      images: [...post.images],
      newImages: [],
    });
  }

  function cancelEditPost() {
    revokeDraftObjectUrls(editDraft);
    setEditDraft(null);
  }

  function removeExistingImage(index: number) {
    setEditDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        images: prev.images.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  function addEditFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setEditDraft((prev) => {
      if (!prev) {
        return prev;
      }

      const nextNewImages = Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      return {
        ...prev,
        newImages: [...prev.newImages, ...nextNewImages],
      };
    });
  }

  function removeNewImage(newImageId: string) {
    setEditDraft((prev) => {
      if (!prev) {
        return prev;
      }

      const target = prev.newImages.find((item) => item.id === newImageId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return {
        ...prev,
        newImages: prev.newImages.filter((item) => item.id !== newImageId),
      };
    });
  }

  async function saveEditPost() {
    if (!editDraft || saving) {
      return;
    }

    const nextTitle = editDraft.title.trim();
    if (!nextTitle) {
      setErrorMessage("Cal indicar un títol.");
      return;
    }

    if (!editDraft.dateInput) {
      setErrorMessage("Cal indicar una data de publicació.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const uploadedNewImages = await Promise.all(editDraft.newImages.map((item) => uploadPhoto(item.file)));
      const mergedImages = [...editDraft.images, ...uploadedNewImages];

      if (mergedImages.length === 0) {
        throw new Error("Cal almenys una imatge en la publicació.");
      }

      const response = await fetch(`/api/fotos/posts/${editDraft.postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle,
          createdAt: toCreatedAtIso(editDraft.dateInput),
          images: mergedImages,
        }),
      });

      if (!response.ok) {
        throw new Error("No s'ha pogut guardar l'edició.");
      }

      const data = (await response.json()) as UpdatePostResponse;
      setPosts((prev) => prev.map((post) => (post.id === data.post.id ? data.post : post)));
      revokeDraftObjectUrls(editDraft);
      setEditDraft(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error guardant la publicació.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (saving) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/fotos/posts/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("No s'ha pogut eliminar la publicació.");
      }

      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setSlideByPost((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });

      if (editDraft?.postId === postId) {
        cancelEditPost();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error eliminant la publicació.");
    } finally {
      setSaving(false);
    }
  }

  function handleCarouselScroll(postId: string, container: HTMLDivElement) {
    const width = container.clientWidth || 1;
    const nextIndex = Math.round(container.scrollLeft / width);

    setSlideByPost((prev) =>
      prev[postId] === nextIndex
        ? prev
        : {
            ...prev,
            [postId]: nextIndex,
          },
    );
  }

  function goToSlide(postId: string, slideIndex: number) {
    const container = document.getElementById(`carousel-${postId}`) as HTMLDivElement | null;
    if (!container) {
      return;
    }

    container.scrollTo({
      left: container.clientWidth * slideIndex,
      behavior: "smooth",
    });

    setSlideByPost((prev) => ({
      ...prev,
      [postId]: slideIndex,
    }));
  }

  function openLightbox(postId: string, imageIndex: number) {
    setLightbox({ postId, imageIndex });
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
  }

  function closeLightbox() {
    setLightbox(null);
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    pinchDistanceRef.current = null;
    panStartRef.current = null;
  }

  function moveLightbox(step: number) {
    if (!lightbox) {
      return;
    }

    const post = posts.find((item) => item.id === lightbox.postId);
    if (!post || post.images.length === 0) {
      return;
    }

    const nextIndex = (lightbox.imageIndex + step + post.images.length) % post.images.length;
    setLightbox({ postId: lightbox.postId, imageIndex: nextIndex });
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
  }

  function handleLightboxWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setLightboxZoom((prev) => clamp(prev - event.deltaY * 0.0012, 1, 4));
  }

  function handleLightboxTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      const distance = getTouchDistance(event.touches[0], event.touches[1]);
      pinchDistanceRef.current = distance;
      pinchScaleRef.current = lightboxZoom;
      panStartRef.current = null;
      return;
    }

    if (event.touches.length === 1 && lightboxZoom > 1) {
      panStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        startX: lightboxPan.x,
        startY: lightboxPan.y,
      };
    }
  }

  function handleLightboxTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2 && pinchDistanceRef.current) {
      event.preventDefault();
      const nextDistance = getTouchDistance(event.touches[0], event.touches[1]);
      const factor = nextDistance / pinchDistanceRef.current;
      const nextScale = clamp(pinchScaleRef.current * factor, 1, 4);
      setLightboxZoom(nextScale);
      return;
    }

    if (event.touches.length === 1 && panStartRef.current && lightboxZoom > 1) {
      event.preventDefault();
      const dx = event.touches[0].clientX - panStartRef.current.x;
      const dy = event.touches[0].clientY - panStartRef.current.y;
      setLightboxPan({
        x: panStartRef.current.startX + dx,
        y: panStartRef.current.startY + dy,
      });
    }
  }

  function handleLightboxTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const now = Date.now();
      const previousTap = lastTapRef.current;

      if (!previousTap) {
        lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
      } else {
        const elapsed = now - previousTap.time;
        const dx = touch.clientX - previousTap.x;
        const dy = touch.clientY - previousTap.y;
        const moved = Math.sqrt(dx * dx + dy * dy);

        if (elapsed <= 300 && moved <= 26) {
          setLightboxZoom((prev) => {
            const nextZoom = prev > 1 ? 1 : 2.5;
            if (nextZoom === 1) {
              setLightboxPan({ x: 0, y: 0 });
            }
            return nextZoom;
          });
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
        }
      }
    }

    if (lightboxZoom <= 1) {
      setLightboxPan({ x: 0, y: 0 });
    }

    if (pinchDistanceRef.current) {
      pinchScaleRef.current = lightboxZoom;
    }

    if (lightboxZoom <= 1) {
      pinchDistanceRef.current = null;
      panStartRef.current = null;
    }
  }

  return (
    <section className={`section ${styles.feedSection}`}>
      <div className="container">
        <header className={`page-head page-head--split ${styles.feedHeader}`}>
          <div>
            <span className="eyebrow">Fotos</span>
            <h1>Fotos</h1>
          </div>

          {ready && isAuthenticated ? (
            <div className={styles.authActions}>
              <div className={styles.createPanel}>
                <label className={styles.newPostLabel} htmlFor="new-post-title">
                  Títol de la publicació
                </label>
                <input
                  id="new-post-title"
                  className={styles.titleInput}
                  type="text"
                  placeholder="Ex: Font roja, Eixida de diumenge..."
                  value={newPostTitle}
                  onChange={(event) => setNewPostTitle(event.target.value)}
                />
              </div>
              <button
                type="button"
                className={`button button--primary ${styles.newButton}`}
                onClick={() => createInputRef.current?.click()}
                disabled={saving}
              >
                {saving ? "Guardant..." : "Crear"}
              </button>
              <input
                ref={createInputRef}
                className={styles.hiddenInput}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  void handleCreatePost(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          ) : null}
        </header>

        {errorMessage ? <p className={styles.statusMessage}>{errorMessage}</p> : null}

        {loading ? (
          <p className={styles.statusMessage}>Carregant publicacions...</p>
        ) : (
          <div className={styles.feedList}>
            {posts.map((post) => {
              const activeSlide = slideByPost[post.id] ?? 0;
              const isEditing = editDraft?.postId === post.id;

              return (
                <article className={styles.postCard} key={post.id}>
                  {ready && isAuthenticated ? (
                    <div className={styles.postControls}>
                      <button
                        type="button"
                        className={styles.cornerButton}
                        onClick={() => startEditPost(post)}
                        aria-label={`Editar ${post.title}`}
                        title="Editar"
                        disabled={saving}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.cornerButton}
                        onClick={() => void handleDeletePost(post.id)}
                        aria-label={`Eliminar ${post.title}`}
                        title="Eliminar"
                        disabled={saving}
                      >
                        Del
                      </button>
                    </div>
                  ) : null}

                  <div className={styles.postText}>
                    {isEditing && editDraft ? (
                      <div className={styles.inlineEdit}>
                        <input
                          className={styles.editInput}
                          type="text"
                          value={editDraft.title}
                          onChange={(event) =>
                            setEditDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                          }
                          disabled={saving}
                        />
                        <input
                          className={styles.editDateInput}
                          type="date"
                          value={editDraft.dateInput}
                          onChange={(event) =>
                            setEditDraft((prev) => (prev ? { ...prev, dateInput: event.target.value } : prev))
                          }
                          disabled={saving}
                        />

                        <div className={styles.editMediaPanel}>
                          <div className={styles.editMediaHeader}>Imatges de la publicació</div>
                          <div className={styles.editMediaGrid}>
                            {editDraft.images.map((image, index) => (
                              <div key={`${post.id}-old-${index}`} className={styles.editMediaItem}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={image} alt={`${post.title} - existent ${index + 1}`} />
                                <button
                                  type="button"
                                  className={styles.removeMediaButton}
                                  onClick={() => removeExistingImage(index)}
                                  disabled={saving}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {editDraft.newImages.map((item) => (
                              <div key={item.id} className={styles.editMediaItem}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.previewUrl} alt="Nova imatge pendent" />
                                <button
                                  type="button"
                                  className={styles.removeMediaButton}
                                  onClick={() => removeNewImage(item.id)}
                                  disabled={saving}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className={styles.editMediaActions}>
                            <button
                              type="button"
                              className={styles.smallAction}
                              onClick={() => editInputRef.current?.click()}
                              disabled={saving}
                            >
                              Afegir fotos
                            </button>
                            <input
                              ref={editInputRef}
                              className={styles.hiddenInput}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(event) => {
                                addEditFiles(event.target.files);
                                event.currentTarget.value = "";
                              }}
                            />
                            <button
                              type="button"
                              className={styles.smallAction}
                              onClick={() => void saveEditPost()}
                              disabled={saving}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className={styles.smallAction}
                              onClick={cancelEditPost}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2>{post.title}</h2>
                        <p>
                          Publicat per {post.author} · {formatCreatedAt(post.createdAt)}
                        </p>
                      </>
                    )}
                  </div>

                  <div
                    id={`carousel-${post.id}`}
                    className={styles.carousel}
                    role="region"
                    aria-label={`Carrusel de ${post.title}`}
                    onScroll={(event) => handleCarouselScroll(post.id, event.currentTarget)}
                  >
                    {post.images.map((src, index) => (
                      <figure className={styles.carouselItem} key={`${post.id}-${index}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={`${post.title} - foto ${index + 1}`}
                          loading="lazy"
                          onClick={() => openLightbox(post.id, index)}
                        />
                      </figure>
                    ))}
                  </div>

                  {post.images.length > 1 ? (
                    <div className={styles.carouselDots}>
                      {post.images.map((_, index) => (
                        <button
                          key={`${post.id}-dot-${index}`}
                          type="button"
                          className={`${styles.dot} ${activeSlide === index ? styles.dotActive : ""}`}
                          onClick={() => goToSlide(post.id, index)}
                          aria-label={`Anar a la foto ${index + 1}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {lightbox ? (
        <div className={styles.lightbox} role="dialog" aria-modal="true">
          <button
            type="button"
            className={styles.lightboxBackdrop}
            aria-label="Tancar visor"
            onClick={closeLightbox}
          />
          <div className={styles.lightboxInner}>
            <div className={styles.lightboxTop}>
              <button type="button" className={styles.lightboxAction} onClick={closeLightbox}>
                Tancar
              </button>
              <div className={styles.lightboxNav}>
                <button type="button" className={styles.lightboxAction} onClick={() => moveLightbox(-1)}>
                  ←
                </button>
                <button type="button" className={styles.lightboxAction} onClick={() => moveLightbox(1)}>
                  →
                </button>
              </div>
            </div>
            <div
              className={styles.lightboxBody}
              onWheel={handleLightboxWheel}
              onTouchStart={handleLightboxTouchStart}
              onTouchMove={handleLightboxTouchMove}
              onTouchEnd={handleLightboxTouchEnd}
            >
              {(() => {
                const post = posts.find((item) => item.id === lightbox.postId);
                if (!post) {
                  return null;
                }
                const imageSrc = post.images[lightbox.imageIndex];
                return (
                  <div className={styles.lightboxImageShell}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt={`${post.title} - ampliada`}
                      className={styles.lightboxImage}
                      style={{
                        transform: `translate(${lightboxPan.x}px, ${lightboxPan.y}px) scale(${lightboxZoom})`,
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
