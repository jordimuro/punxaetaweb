import { mergeAttributes, Node } from "@tiptap/core";

export type FigureImageAlign = "left" | "center" | "right";

export type InsertFigureImageOptions = {
  src: string;
  alt?: string;
  title?: string;
  align?: FigureImageAlign;
  width?: number;
  caption?: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figureImage: {
      insertFigureImage: (options: InsertFigureImageOptions) => ReturnType;
      setFigureImageAlign: (align: FigureImageAlign) => ReturnType;
      setFigureImageWidth: (width: number) => ReturnType;
    };
  }
}

const clampWidth = (value: number) => Math.min(Math.max(Math.round(value), 25), 100);

export const FigureImage = Node.create({
  name: "figureImage",
  group: "block",
  content: "block*",
  defining: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: "",
      },
      alt: {
        default: "",
      },
      title: {
        default: "",
      },
      align: {
        default: "center",
      },
      width: {
        default: 100,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="figure-image"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.align as FigureImageAlign;
    const width = clampWidth(Number(node.attrs.width ?? 100));
    const style = [
      `width: ${width}%`,
      align === "left" ? "margin-left: 0" : "margin-left: auto",
      align === "right" ? "margin-right: 0" : "margin-right: auto",
    ].join("; ");

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-type": "figure-image",
        "data-align": align,
        style,
      }),
      [
        "img",
        {
          src: node.attrs.src,
          alt: node.attrs.alt || "",
          title: node.attrs.title || "",
          draggable: "false",
        },
      ],
      ["figcaption", 0],
    ];
  },

  addCommands() {
    return {
      insertFigureImage:
        (options: InsertFigureImageOptions) =>
        ({ commands }) => {
          const caption = options.caption?.trim();

          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt ?? caption ?? "",
              title: options.title ?? caption ?? "",
              align: options.align ?? "center",
              width: options.width ?? 100,
            },
            content: [
              {
                type: "paragraph",
                content: caption ? [{ type: "text", text: caption }] : [],
              },
            ],
          });
        },
      setFigureImageAlign:
        (align: FigureImageAlign) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { align }),
      setFigureImageWidth:
        (width: number) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { width: clampWidth(width) }),
    };
  },
});

export default FigureImage;
