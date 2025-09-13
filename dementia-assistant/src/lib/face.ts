import axios from "axios";
import FormData from "form-data";

/**
 * Get face embedding from local Python InsightFace server.
 */
export async function getFaceEmbedding(buf: Buffer): Promise<number[] | null> {
  const form = new FormData();
  form.append("file", buf, { filename: "face.jpg" });

  const res = await axios.post("http://localhost:5006/embed", form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
  });
  if (!res.data || !Array.isArray(res.data.embedding)) return null;
  return res.data.embedding;
}
