// app/api/gmail/rules/route.ts
// GET  → list semua gmail category rules user
// POST → buat rule baru

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateRule } from '@/lib/gmail/rule-engine';

const VALID_CONDITION_TYPES = ['RECIPIENT', 'VA_NUMBER', 'MERCHANT', 'DESCRIPTION', 'SOURCE'];
const VALID_MATCH_TYPES = ['EXACT', 'CONTAINS', 'STARTS_WITH'];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rules = await prisma.gmail_category_rules.findMany({
    where: { user_id: session.user.id },
    orderBy: [{ priority: 'asc' }, { created_at: 'asc' }],
    select: {
      id: true,
      condition_type: true,
      condition_value: true,
      match_type: true,
      priority: true,
      is_active: true,
      created_at: true,
      categories: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    condition_type: string;
    condition_value: string;
    match_type: string;
    category_id: string;
    priority?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { condition_type, condition_value, match_type, category_id, priority } = body;

  // Validasi field wajib
  if (!condition_type || !condition_value || !match_type || !category_id) {
    return NextResponse.json({ error: 'Field tidak lengkap.' }, { status: 400 });
  }

  if (!VALID_CONDITION_TYPES.includes(condition_type)) {
    return NextResponse.json({ error: 'condition_type tidak valid.' }, { status: 400 });
  }

  if (!VALID_MATCH_TYPES.includes(match_type)) {
    return NextResponse.json({ error: 'match_type tidak valid.' }, { status: 400 });
  }

  // Validasi nilai kondisi (min length, VA number format, dll.)
  const validationError = validateRule(condition_type, condition_value, match_type);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Verifikasi kategori milik user ini
  const category = await prisma.categories.findFirst({
    where: { id: category_id, user_id: session.user.id, deleted_at: null },
    select: { id: true },
  });

  if (!category) {
    return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
  }

  const rule = await prisma.gmail_category_rules.create({
    data: {
      user_id: session.user.id,
      condition_type,
      condition_value: condition_value.trim(),
      match_type,
      category_id,
      priority: priority ?? 100,
      is_active: true,
    },
    select: {
      id: true,
      condition_type: true,
      condition_value: true,
      match_type: true,
      priority: true,
      is_active: true,
      created_at: true,
      categories: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
