import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/database";

export type PhotoPostRecord = {
  id: string;
  title: string;
  author: string;
  images: string[];
  createdAt: string;
};

type PhotoPostRow = {
  id: string;
  title: string;
  author: string;
  createdAt: string;
};

type PhotoImageRow = {
  id: string;
  postId: string;
  imagePath: string;
  position: number;
};

const createPostsTableStatement = db.prepare(`
  CREATE TABLE IF NOT EXISTS photo_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const createImagesTableStatement = db.prepare(`
  CREATE TABLE IF NOT EXISTS photo_post_images (
    id TEXT PRIMARY KEY,
    postId TEXT NOT NULL,
    imagePath TEXT NOT NULL,
    position INTEGER NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(postId) REFERENCES photo_posts(id) ON DELETE CASCADE
  )
`);

createPostsTableStatement.run();
createImagesTableStatement.run();

const countPostsStatement = db.prepare("SELECT COUNT(*) as count FROM photo_posts");
const listPostsStatement = db.prepare(
  "SELECT id, title, author, createdAt FROM photo_posts ORDER BY datetime(createdAt) DESC, title ASC",
);
const listImagesStatement = db.prepare(
  "SELECT id, postId, imagePath, position FROM photo_post_images WHERE postId = ? ORDER BY position ASC, createdAt ASC",
);
const insertPostStatement = db.prepare(`
  INSERT INTO photo_posts (id, title, author)
  VALUES (@id, @title, @author)
`);
const insertImageStatement = db.prepare(`
  INSERT INTO photo_post_images (id, postId, imagePath, position)
  VALUES (@id, @postId, @imagePath, @position)
`);
const updatePostTitleStatement = db.prepare(`
  UPDATE photo_posts
  SET title = @title, updatedAt = CURRENT_TIMESTAMP
  WHERE id = @id
`);
const deletePostStatement = db.prepare("DELETE FROM photo_posts WHERE id = ?");

const insertPostWithImagesTransaction = db.transaction(
  (payload: { id: string; title: string; author: string; images: string[] }) => {
    insertPostStatement.run({
      id: payload.id,
      title: payload.title,
      author: payload.author,
    });

    payload.images.forEach((imagePath, index) => {
      insertImageStatement.run({
        id: randomUUID(),
        postId: payload.id,
        imagePath,
        position: index,
      });
    });
  },
);

const seedRows: Array<Omit<PhotoPostRecord, "id" | "createdAt">> = [
  {
    title: "Font roja",
    author: "Admin",
    images: [
      "/equipacions/01-jersey-frontal.jpeg",
      "/equipacions/02-jersey-trasera.jpeg",
      "/equipacions/03-manguitos.jpeg",
    ],
  },
  {
    title: "Eixida del diumenge",
    author: "Admin",
    images: [
      "/equipacions/07-chaqueta.jpeg",
      "/trofeu/uploads/trofeu-10f7a394-7e4b-4715-8ea1-7f98117202b4.png",
      "/trofeu/uploads/trofeu-64d2c2a8-c589-4a2b-bb5f-5234af65f8d7.png",
    ],
  },
];

function seedIfNeeded() {
  const existing = countPostsStatement.get() as { count: number };

  if (existing.count > 0) {
    return;
  }

  seedRows.forEach((item) => {
    insertPostWithImagesTransaction({
      id: randomUUID(),
      title: item.title,
      author: item.author,
      images: item.images,
    });
  });
}

function toRecord(postRow: PhotoPostRow): PhotoPostRecord {
  const images = listImagesStatement.all(postRow.id) as PhotoImageRow[];

  return {
    id: postRow.id,
    title: postRow.title,
    author: postRow.author,
    images: images.map((image) => image.imagePath),
    createdAt: postRow.createdAt,
  };
}

export async function listPhotoPosts() {
  seedIfNeeded();
  const rows = listPostsStatement.all() as PhotoPostRow[];
  return rows.map(toRecord);
}

export async function createPhotoPost(payload: {
  title: string;
  author: string;
  images: string[];
}) {
  seedIfNeeded();

  const postId = randomUUID();
  insertPostWithImagesTransaction({
    id: postId,
    title: payload.title,
    author: payload.author,
    images: payload.images,
  });

  const row = db
    .prepare("SELECT id, title, author, createdAt FROM photo_posts WHERE id = ? LIMIT 1")
    .get(postId) as PhotoPostRow;

  return toRecord(row);
}

export async function updatePhotoPostTitle(postId: string, title: string) {
  const existing = db
    .prepare("SELECT id, title, author, createdAt FROM photo_posts WHERE id = ? LIMIT 1")
    .get(postId) as PhotoPostRow | undefined;

  if (!existing) {
    return null;
  }

  updatePostTitleStatement.run({ id: postId, title });

  return {
    ...toRecord(existing),
    title,
  };
}

export async function deletePhotoPost(postId: string) {
  const existing = db
    .prepare("SELECT id, title, author, createdAt FROM photo_posts WHERE id = ? LIMIT 1")
    .get(postId) as PhotoPostRow | undefined;

  if (!existing) {
    return null;
  }

  deletePostStatement.run(postId);
  return toRecord(existing);
}
