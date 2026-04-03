import { NextRequest, NextResponse } from 'next/server';
import { resolveChannel, resolvePlaylist } from '@/lib/youtube';
import { auth } from '@/auth';

export const runtime = 'nodejs';

function isPlaylistUrl(input: string): boolean {
  return input.includes('list=') && (input.includes('youtube.com/playlist') || input.includes('youtube.com/watch'));
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const input = req.nextUrl.searchParams.get('q');
  if (!input) {
    return NextResponse.json({ error: 'Parâmetro q obrigatório' }, { status: 400 });
  }

  try {
    if (isPlaylistUrl(input)) {
      const playlist = await resolvePlaylist(input);
      return NextResponse.json({ ...playlist, isPlaylist: true });
    }

    const channel = await resolveChannel(input);
    return NextResponse.json({ ...channel, isPlaylist: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
