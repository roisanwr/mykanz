// Tipe data TypeScript global untuk aplikasi

// Contoh tipe-tipe yang mungkin Anda butuhkan:

export interface User {
  id: string;
  email: string;
  name?: string;
  // Tambahkan field lainnya
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description?: string;
  date: Date;
  // Tambahkan field lainnya
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  totalValue: number;
  // Tambahkan field lainnya
}
