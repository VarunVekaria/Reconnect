import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});
/**
 * Gets a CLIP embedding for a local image buffer.
 * @param buf Buffer of image bytes (jpg, png, etc)
 * @returns Promise<number[]> embedding vector (usually 768 or 512 dims)
 */
export async function getClipImageEmbedding(buf: Buffer): Promise<number[]> {
  // Change this URL to your deployed CLIP endpoint
  const output = await replicate.run("openai/clip", { input: { image: buf } });
  console.log("CLIP output:", output);

  // If output is an object, extract the embedding array
  // Adjust this according to the actual output structure
//   const embedding = Array.isArray(output) ? output : output?.embedding;
// //   console.log("Extracted embedding:", embedding);
//   if (!Array.isArray(embedding)) {
//     throw new Error("CLIP output does not contain a valid embedding array.");
//   }
    
  return output as number[];
}
