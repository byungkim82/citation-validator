import { NextRequest, NextResponse } from 'next/server';
import { validateCitations } from '@/lib/validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, useCrossRef = true } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Citation text is required' },
        { status: 400 }
      );
    }

    const results = await validateCitations(text.trim(), useCrossRef);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error during validation' },
      { status: 500 }
    );
  }
}
