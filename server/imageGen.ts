import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getSetting } from "./db";

export const imageGenRouter = router({
  generate: protectedProcedure
    .input(z.object({
      siteId: z.number().default(1),
      prompt: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const apiKey = await getSetting("gemini_api_key", input.siteId);
      if (!apiKey) throw new Error("請先設定 Gemini API Key");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input.prompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`圖片生成失敗: HTTP ${response.status} ${err}`);
      }

      const data = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
              inlineData?: { mimeType: string; data: string };
            }>;
          };
        }>;
      };

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(p => p.inlineData);
      if (!imagePart?.inlineData) throw new Error("API 未返回圖片，請換個 prompt 再試");

      return {
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
        dataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      };
    }),
});
