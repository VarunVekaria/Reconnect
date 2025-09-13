export type PersonTag = { name: string; relation?: string };

export type MemoryItem = {
  id: string;
  patientId: string;
  storagePath: string;      // e.g. "/memory/uuid.jpg" (public URL under /public)
  event?: string;           // "Birthday", "Anniversary dinner"
  eventDate?: string;       // ISO date "2019-06-12"
  place?: string;           // "Central Park, NYC"
  people?: PersonTag[];     // [{name:"Priya", relation:"Daughter"}]
  caption?: string;          // AI-generated detailed caption
  embedding?: number[];      // text-embedding-3-small (length 1536)
  createdAt: string;        // ISO datetime
  type?: "person" | "memory";
  faceEmbedding?: number[];  // Add this!
  name?: string;
  relation?: string;
  contactNumber?: string;
};

export type MemoryDB = Record<string, MemoryItem[]>;
