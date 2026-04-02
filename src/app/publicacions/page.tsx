import { PhotoFeed } from "@/components/photo-feed";

export const dynamic = "force-dynamic";

export default function PublicacionsPage() {
  return (
    <div className="page">
      <PhotoFeed />
    </div>
  );
}
