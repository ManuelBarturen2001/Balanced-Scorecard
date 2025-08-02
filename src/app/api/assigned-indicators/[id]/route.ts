import { NextRequest, NextResponse } from 'next/server';
import { getCollectionById } from '@/lib/firebase-functions';
import type { AssignedIndicator } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignedIndicator = await getCollectionById<AssignedIndicator>('assigned_indicator', id);
    if (!assignedIndicator) {
      return NextResponse.json({ error: 'Assigned indicator not found' }, { status: 404 });
    }
    return NextResponse.json(assignedIndicator);
  } catch (error) {
    console.error('Error fetching assigned indicator:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 