// app/api/gmail/rules/[id]/route.ts
// PUT    → update rule (toggle is_active, ganti kategori, ubah priority, dll.)
// DELETE → hapus rule

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateRule } from '@/lib/gmail/rule-engine';

const VALID_MATCH_TYPES = ['EXACT', 'CONTAINS', 'STARTS_WITH'];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verifikasi rule milik user ini
  const existingRule = await prisma.gmail_category_rules.findFirst({
    where: { id, user_id: session.user.id },
    select: { id: true, condition_type: true },
  });

  if (!existingRule) {
    return NextResponse.json({ error: 'Rule tidak ditemukan.' }, { status: 404 });
  }

  let body: {
    condition_value?: string;
    match_type?: string;
    category_id?: string;
    priority?: number;
    is_active?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (body.condition_value !== undefined) {
    const trimmed = body.condition_value.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Nilai kondisi tidak boleh kosong.' }, { status: 400 });
    }
    const matchType = body.match_type ?? (await prisma.gmail_category_rules.findUnique({
      where: { id },
      select: { match_type: true },
    }))?.match_type ?? 'CONTAINS';

    const validationError = validateRule(existingRule.condition_type, trimmed, matchType);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    updateData.condition_value = trimmed;
  }

  if (body.match_type !== undefined) {
    if (!VALID_MATCH_TYPES.includes(body.match_type)) {
      return NextResponse.json({ error: 'match_type tidak valid.' }, { status: 400 });
    }
    updateData.match_type = body.match_type;
  }

  if (body.category_id !== undefined) {
    const category = await prisma.categories.findFirst({
      where: { id: body.category_id, user_id: session.user.id, deleted_at: null },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }
    updateData.category_id = body.category_id;
  }

  if (body.priority !== undefined) {
    updateData.priority = body.priority;
  }

  if (body.is_active !== undefined) {
    updateData.is_active = body.is_active;
  }

  const updated = await prisma.gmail_category_rules.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      condition_type: true,
      condition_value: true,
      match_type: true,
      priority: true,
      is_active: true,
      updated_at: true,
      categories: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verifikasi rule milik user ini sebelum hapus
  const existingRule = await prisma.gmail_category_rules.findFirst({
    where: { id, user_id: session.user.id },
    select: { id: true },
  });

  if (!existingRule) {
    return NextResponse.json({ error: 'Rule tidak ditemukan.' }, { status: 404 });
  }

  await prisma.gmail_category_rules.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
