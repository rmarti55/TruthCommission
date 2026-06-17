export async function extractPdfText(bytes: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(bytes);
  const text = result.text?.replace(/\s+/g, " ").trim() ?? "";

  if (text.length < 50) {
    throw new Error("Extracted PDF text is too short");
  }

  return text;
}
