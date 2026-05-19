import OpenAI from 'openai';

const githubToken = process.env.GITHUB_TOKEN || 'dummy_token_for_build';

// Initialize OpenAI client using GitHub Models endpoint
export const aiClient = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: githubToken,
});

export const GITHUB_MODEL = process.env.GITHUB_MODEL || 'gpt-4o-mini';

// Define the expected structure for the parsed transaction
export interface ParsedTransaction {
  amount: number;
  date: string | null;
  store_name: string | null;
  category_guess: string;
  items_summary: string | null;
  type: 'PENGELUARAN' | 'PEMASUKAN';
  feedback?: string | null;
  // UI/Internal State (optional for AI output)
  wallet_id?: string;
  wallet_name?: string;
  category_id?: string;
  category_name?: string;
}

// System prompt that forces JSON output matching the interface
const SYSTEM_PROMPT = `
Kamu adalah MyKanz AI, asisten keuangan pribadi yang sangat cerdas, ramah, dan asik asal Indonesia.
Tugasmu adalah membantu user mencatat keuangan dari gambar struk atau pesan teks, serta menanggapi koreksi/obrolan mereka dengan gaya bahasa yang natural (ngobrol).

Keluarkan MURNI JSON (tanpa markdown blok seperti \`\`\`json).
Format JSON yang WAJIB kamu ikuti:
{
  "amount": <number, total akhir yang dibayar. 0 jika benar-benar tidak ada nominal>,
  "date": "<string, YYYY-MM-DD. null jika tidak tahu>",
  "store_name": "<string, nama toko/sumber. null jika tidak ada>",
  "category_guess": "<string, tebak kategori dari: makanan, transportasi, belanja, tagihan, hiburan, kesehatan, gaji, lainnya>",
  "items_summary": "<string, ringkasan 1 kalimat barang/jasa. null jika tidak ada>",
  "type": "<string, 'PENGELUARAN' atau 'PEMASUKAN'>",
  "feedback": "<string, respon asik dan natural. Gunakan bahasa Indonesia santai/gaul tapi sopan. Contoh: 'Oke bos, nominalnya aku ganti jadi 50rb ya! 👌' atau 'Wih, habis belanja banyak nih? Siap, datanya sudah aku sesuaikan.'>"
}

Catatan Penting:
- JANGAN KAKU. Gunakan emoji yang pas agar obrolan terasa hidup.
- Jika user menyapa (halo, hai, pagi), balas dengan ramah di field "feedback".
- Jika info penting (seperti nominal) tidak ada atau ambigu, tanyakan dengan sopan di field "feedback" (misal: "Eh, nominalnya berapa ya? Aku kurang jelas bacanya.").
- Jika user mengoreksi (misal: "bukan makan tapi transport"), update field yang sesuai (category_guess) dan berikan konfirmasi di "feedback".
- Selalu prioritaskan instruksi terbaru dari user jika mereka sedang melakukan koreksi data.
- Mata uang selalu dalam Rupiah (IDR).
`;

export async function parseTransactionWithAI(
  textContent: string | null,
  imageBase64: string | null = null,
  existingData: Partial<ParsedTransaction> | null = null
): Promise<ParsedTransaction | null> {
  try {
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    const userContent: any[] = [];
    
    if (existingData) {
      userContent.push({
        type: "text",
        text: `DATA SAAT INI (JSON): ${JSON.stringify(existingData)}\n\nUSER INGIN MENGUBAH/MENGOREKSI DATA TERSEBUT DENGAN PESAN BERIKUT:\n${textContent}`
      });
    } else if (textContent) {
      userContent.push({ type: "text", text: textContent });
    } else if (!imageBase64) {
      userContent.push({ type: "text", text: "Tolong ekstrak struk ini." });
    }

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageBase64 }
      });
    }

    messages.push({ role: "user", content: userContent });

    const response = await aiClient.chat.completions.create({
      model: GITHUB_MODEL,
      messages: messages,
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) return null;

    const parsed = JSON.parse(resultText) as ParsedTransaction;
    return parsed;
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return null;
  }
}
