import { NextRequest, NextResponse } from 'next/server';
import { POST as motorTemaPost } from '../motor-tema/route';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return motorTemaPost(req);
}
