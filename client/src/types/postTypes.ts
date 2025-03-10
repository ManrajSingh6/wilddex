export interface Post {
  id: number;
  userId: number;
  animal: string;
  notes: string | null;
  conservationNotes: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  upvotes: number;
}
