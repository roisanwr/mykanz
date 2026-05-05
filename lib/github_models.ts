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
}

// System prompt that forces JSON output matching the interface
const SYSTEM_PROMPT = `
Kamu adalah asisten pengurai struk belanja dan asisten keuangan pribadi Indonesia.
Tugasmu adalah menganalisis gambar struk ATAU pesan teks, lalu mengekstrak informasi transaksi keuangan.

Keluarkan MURNI JSON (tanpa markdown blok seperti \`\`\`json).
Format JSON yang WAJIB kamu ikuti:
{
  "amount": <number, total akhir yang dibayar. Jika diskon, pakai angka setelah diskon. 0 jika gagal>,
  "date": "<string, YYYY-MM-DD. null jika tidak ada/tidak tahu>",
  "store_name": "<string, nama toko/sumber. null jika tidak ada>",
  "category_guess": "<string, tebak kategori dari: makanan, transportasi, belanja, tagihan, hiburan, kesehatan, gaji, lainnya>",
  "items_summary": "<string, ringkasan 1 kalimat barang/jasa. null jika tidak ada>",
  "type": "<string, 'PENGELUARAN' atau 'PEMASUKAN'>"
}

Catatan Penting:
- Jika menganalisis teks (misal: "beli kopi 50rb" -> amount: 50000, type: PENGELUARAN).
- Jika ada tulisan "gaji", "bonus", "dikasih", kemungkinan besar "PEMASUKAN".
- Mata uang selalu dalam Rupiah (IDR).
- JANGAN mengarang data. Jika tidak yakin, set null.
`;

export async function parseTransactionWithAI(
  textContent: string | null,
  imageBase64: string | null = null
): Promise<ParsedTransaction | null> {
  try {
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    const userContent: any[] = [];
    
    if (textContent) {
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
