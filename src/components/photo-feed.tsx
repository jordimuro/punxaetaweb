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

export function PhotoFeed() {
  const { ready, isAuthenticated, username } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [slideByPost, setSlideByPost] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [lightbox, setLightbox] = useState<{
    postId: string;
    imageIndex: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  function startEditPost(postId: string, currentTitle: string) {
    setEditingPostId(postId);
    setEditingTitle(currentTitle);
  }

  async function saveEditPost(postId: string) {
    const nextTitle = editingTitle.trim();

    if (!nextTitle || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/fotos/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: nextTitle }),
      });

      if (!response.ok) {
        throw new Error("No s'ha pogut actualitzar la publicació.");
      }

      const data = (await response.json()) as UpdatePostResponse;

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                title: data.post.title,
              }
            : post,
        ),
      );

      setEditingPostId(null);
      setEditingTitle("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error actualitzant la publicació.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditPost() {
    setEditingPostId(null);
    setEditingTitle("");
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
  }

  function closeLightbox() {
    setLightbox(null);
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
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                {saving ? "Guardant..." : "Crear"}
              </button>
              <input
                ref={fileInputRef}
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
              const isEditing = editingPostId === post.id;

              return (
                <article className={styles.postCard} key={post.id}>
                  {ready && isAuthenticated ? (
                    <div className={styles.postControls}>
                      <button
                        type="button"
                        className={styles.cornerButton}
                        onClick={() => startEditPost(post.id, post.title)}
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
                    {isEditing ? (
                      <div className={styles.inlineEdit}>
                        <input
                          className={styles.editInput}
                          type="text"
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          disabled={saving}
                        />
                        <button
                          type="button"
                          className={styles.smallAction}
                          onClick={() => void saveEditPost(post.id)}
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
                    ) : (
                      <h2>{post.title}</h2>
                    )}
                    <p>
                      Publicat per {post.author} · {formatCreatedAt(post.createdAt)}
                    </p>
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
            <div className={styles.lightboxBody}>
              {(() => {
                const post = posts.find((item) => item.id === lightbox.postId);
                if (!post) {
                  return null;
                }
                const imageSrc = post.images[lightbox.imageIndex];
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageSrc} alt={`${post.title} - ampliada`} className={styles.lightboxImage} />
                );
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
