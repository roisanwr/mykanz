import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Helper: Validasi webhook secret dari Telegram
export function validateWebhookSecret(req: Request) {
  const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
  if (!process.env.TELEGRAM_WEBHOOK_SECRET) return true; // Bypass in dev if not set
  return secretToken === process.env.TELEGRAM_WEBHOOK_SECRET;
}

// Helper: Kirim Pesan Teks
export async function sendMessage(chatId: string | number, text: string, options: any = {}) {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      ...options
    })
  });
  return response.json();
}

// Helper: Edit Message (berguna untuk update status konfirmasi)
export async function editMessageText(chatId: string | number, messageId: number, text: string, options: any = {}) {
  const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML',
      ...options
    })
  });
  return response.json();
}

// Helper: Delete Message
export async function deleteMessage(chatId: string | number, messageId: number) {
  const response = await fetch(`${TELEGRAM_API_URL}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    })
  });
  return response.json();
}

// Helper: Answer Callback Query (menghilangkan loading spinner di tombol inline)
export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean) {
  const payload: any = { callback_query_id: callbackQueryId };
  if (text) {
    payload.text = text;
    payload.show_alert = !!showAlert;
  }
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// Helper: Download File (untuk gambar struk)
export async function getFile(fileId: string) {
  const response = await fetch(`${TELEGRAM_API_URL}/getFile?file_id=${fileId}`);
  const data = await response.json();
  if (!data.ok) throw new Error('Gagal mendapatkan file_path dari Telegram');
  
  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
  const fileResponse = await fetch(fileUrl);
  const buffer = await fileResponse.arrayBuffer();
  
  // Return base64 string for OpenAI vision
  const mimeType = fileResponse.headers.get('content-type') || 'image/jpeg';
  const base64 = Buffer.from(buffer).toString('base64');
  
  return `data:${mimeType};base64,${base64}`;
}
