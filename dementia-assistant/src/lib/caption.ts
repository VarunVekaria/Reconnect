import { openai } from "./openai";

export async function captionFromBase64(base64: string, mime = "image/jpeg"): Promise<string> {
  // Works in dev because we send base64 directly
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini", // if you hit issues, switch to "gpt-4o"
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You generate a detailed but concise caption for the image. " +
          "Focus on setting and the backdrop primarily and any event context implied by the scene"
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image in one detailed sentence:" },
          { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }
        ]
      }
    ]
  });

  return r.choices[0]?.message?.content?.trim() || "A meaningful family memory photo.";
}
