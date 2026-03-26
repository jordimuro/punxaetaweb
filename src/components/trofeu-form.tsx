"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { AuthOnly } from "@/components/auth";
import { FigureImage, type FigureImageAlign } from "@/components/trofeu-figure-image";
import type { TrofeuFormState, TrofeuFormValues } from "@/lib/trofeu";

type TrofeuFormProps = {
  action: (state: TrofeuFormState, formData: FormData) => Promise<TrofeuFormState>;
  initialValues: TrofeuFormValues;
  title: string;
  submitLabel: string;
};

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="field__error">{message}</p>;
}

async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/media-upload?folder=trofeu", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("No s'ha pogut pujar la imatge.");
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("No s'ha rebut la URL de la imatge.");
  }

  return data.url;
}

function ToolbarButton({ active, disabled, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`editor-toolbar__button ${active ? "editor-toolbar__button--active" : ""}`}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TrofeuRichEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (html: string) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "rich-link",
        },
      }),
      FigureImage,
      ImageExtension.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rich-image",
        },
      }),
    ],
    content: initialContent || "<p><br /></p>",
    editorProps: {
      attributes: {
        class: "rich-editor__surface",
      },
    },
    onCreate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
  });

  const imageIsSelected = Boolean(editor?.isActive("figureImage"));
  const figureAttributes = editor?.getAttributes("figureImage") ?? {};
  const linkValue = editor?.getAttributes("link").href || "";

  if (!editor) {
    return <div className="rich-editor__loading">Carregant editor...</div>;
  }

  const currentEditor = editor;

  function promptAndSetLink() {
    const url = window.prompt("Introdueix la URL de l'enllaç", linkValue);
    if (url === null) {
      return;
    }

    if (!url.trim()) {
      currentEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    currentEditor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function insertImageFromUrl() {
    const url = window.prompt("Introdueix la URL de la imatge");
    if (!url) {
      return;
    }

    const caption = window.prompt("Introdueix el peu de foto (opcional)") ?? "";

    currentEditor
      .chain()
      .focus()
      .insertFigureImage({
        src: url.trim(),
        alt: caption.trim(),
        title: caption.trim(),
        caption: caption.trim(),
        align: "center",
        width: 100,
      })
      .run();
  }

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  async function insertSelectedImages(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    for (const file of Array.from(files)) {
      const url = await uploadImage(file);
      const caption = file.name.replace(/\.[^.]+$/, "");

      currentEditor
        .chain()
        .focus()
        .insertFigureImage({
          src: url,
          alt: caption,
          title: caption,
          caption,
          align: "center",
          width: 100,
        })
        .run();
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function setFigureAlign(align: FigureImageAlign) {
    currentEditor.chain().focus().setFigureImageAlign(align).run();
  }

  function setFigureWidth(width: number) {
    currentEditor.chain().focus().setFigureImageWidth(width).run();
  }

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar" aria-label="Barra d'edició avançada">
        <div className="editor-toolbar__group">
          <ToolbarButton
            active={currentEditor.isActive("bold")}
            label="B"
            onClick={() => currentEditor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            active={currentEditor.isActive("italic")}
            label="I"
            onClick={() => currentEditor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            active={currentEditor.isActive("underline")}
            label="U"
            onClick={() => currentEditor.chain().focus().toggleUnderline().run()}
          />
        </div>

        <div className="editor-toolbar__group">
          <ToolbarButton
            active={currentEditor.isActive("heading", { level: 2 })}
            label="H2"
            onClick={() => currentEditor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            active={currentEditor.isActive("heading", { level: 3 })}
            label="H3"
            onClick={() => currentEditor.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <ToolbarButton
            active={currentEditor.isActive("blockquote")}
            label="Cita"
            onClick={() => currentEditor.chain().focus().toggleBlockquote().run()}
          />
        </div>

        <div className="editor-toolbar__group">
          <ToolbarButton
            active={currentEditor.isActive("bulletList")}
            label="• Llista"
            onClick={() => currentEditor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            active={currentEditor.isActive("orderedList")}
            label="1. Llista"
            onClick={() => currentEditor.chain().focus().toggleOrderedList().run()}
          />
        </div>

        <div className="editor-toolbar__group">
          <ToolbarButton active={currentEditor.isActive("link")} label="Enllaç" onClick={promptAndSetLink} />
          <ToolbarButton label="Penja" onClick={openImagePicker} />
          <ToolbarButton label="URL" onClick={insertImageFromUrl} />
        </div>

        <div className="editor-toolbar__group">
          <ToolbarButton label="Desfer" onClick={() => currentEditor.chain().focus().undo().run()} />
          <ToolbarButton label="Refer" onClick={() => currentEditor.chain().focus().redo().run()} />
          <ToolbarButton
            label="Netejar"
            onClick={() => currentEditor.chain().focus().clearNodes().unsetAllMarks().run()}
          />
        </div>
      </div>

      <div className="rich-editor__figure-controls">
        <span className="rich-editor__hint">
          Les imatges es poden escriure dins del peu de foto i ajustar amb ample i alineació.
        </span>
        <div className="editor-toolbar__group">
          <ToolbarButton
            active={imageIsSelected && figureAttributes.align === "left"}
            disabled={!imageIsSelected}
            label="Esquerra"
            onClick={() => setFigureAlign("left")}
          />
          <ToolbarButton
            active={imageIsSelected && figureAttributes.align === "center"}
            disabled={!imageIsSelected}
            label="Centre"
            onClick={() => setFigureAlign("center")}
          />
          <ToolbarButton
            active={imageIsSelected && figureAttributes.align === "right"}
            disabled={!imageIsSelected}
            label="Dreta"
            onClick={() => setFigureAlign("right")}
          />
        </div>
        <div className="editor-toolbar__group">
          <ToolbarButton
            active={imageIsSelected && Number(figureAttributes.width) === 50}
            disabled={!imageIsSelected}
            label="50%"
            onClick={() => setFigureWidth(50)}
          />
          <ToolbarButton
            active={imageIsSelected && Number(figureAttributes.width) === 75}
            disabled={!imageIsSelected}
            label="75%"
            onClick={() => setFigureWidth(75)}
          />
          <ToolbarButton
            active={imageIsSelected && Number(figureAttributes.width) === 100}
            disabled={!imageIsSelected}
            label="100%"
            onClick={() => setFigureWidth(100)}
          />
        </div>
      </div>

      <EditorContent editor={editor} className="rich-editor__content" />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          void insertSelectedImages(event.currentTarget.files);
        }}
      />

    </div>
  );
}

export function TrofeuForm({ action, initialValues, title, submitLabel }: TrofeuFormProps) {
  const [state, formAction, isPending] = useActionState(action, {
    values: initialValues,
    errors: {},
  });
  const contentInputRef = useRef<HTMLInputElement | null>(null);
  const formKey = useMemo(() => JSON.stringify(state.values), [state.values]);

  return (
    <AuthOnly
      fallback={
        <div className="panel auth-gate">
          <span className="panel__label">Accés privat</span>
          <h2>Inicia sessió per a crear o editar entrades.</h2>
          <p>Les entrades del trofeu només es poden gestionar amb accés autoritzat.</p>
          <div className="form-actions">
            <Link className="button button--secondary" href="/carrera-ciclista">
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
          <span className="eyebrow">Trofeu</span>
          <h1>{title}</h1>
        </div>

        <form key={formKey} action={formAction} className="form-card">
          <input type="hidden" name="id" defaultValue={state.values.id} />
          <input type="hidden" name="originalSlug" defaultValue={state.values.originalSlug} />
          <input
            ref={contentInputRef}
            type="hidden"
            name="content"
            defaultValue={state.values.content}
          />

          {state.formError ? <p className="form__alert">{state.formError}</p> : null}

          <div className="form-grid">
            <label className="field">
              <span>Slug URL</span>
              <input name="slug" defaultValue={state.values.slug} placeholder="entrada-trofeu" />
              <FieldError message={state.errors.slug} />
            </label>

            <label className="field">
              <span>Títol</span>
              <input name="title" defaultValue={state.values.title} placeholder="Segona edició" />
            </label>

            <div className="field field--full">
              <span>Contingut</span>
              <TrofeuRichEditor
                initialContent={state.values.content}
                onChange={(html) => {
                  if (contentInputRef.current) {
                    contentInputRef.current.value = html;
                  }
                }}
              />
              <FieldError message={state.errors.content} />
            </div>
          </div>

          <div className="form-actions">
            <Link className="button button--secondary" href="/carrera-ciclista">
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
