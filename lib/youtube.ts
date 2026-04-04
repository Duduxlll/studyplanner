import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export interface ChannelInfo {
  channelId: string;
  name: string;
  thumbnail: string;
  description: string;
}

export interface PlaylistInfo {
  playlistId: string;
  name: string;
  thumbnail: string;
  description: string;
  channelName: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  url: string;
  channelName: string;
  durationMinutes: number;
  thumbnail: string;
}

// Resolve URL ou nome do canal para o channelId do YouTube
export async function resolveChannel(input: string): Promise<ChannelInfo> {
  let channelId = '';

  if (input.includes('youtube.com') || input.includes('youtu.be')) {
    const url = new URL(input.startsWith('http') ? input : 'https://' + input);

    if (url.pathname.startsWith('/channel/')) {
      channelId = url.pathname.replace('/channel/', '').split('/')[0];
    } else if (url.pathname.startsWith('/@') || url.pathname.startsWith('/c/') || url.pathname.startsWith('/user/')) {
      const handle = url.pathname.split('/')[1].replace('@', '');
      const res = await youtube.search.list({
        part: ['snippet'],
        q: handle,
        type: ['channel'],
        maxResults: 1,
        relevanceLanguage: 'pt',
        regionCode: 'BR',
      });
      channelId = res.data.items?.[0]?.snippet?.channelId ?? '';
    }
  } else {
    const res = await youtube.search.list({
      part: ['snippet'],
      q: input,
      type: ['channel'],
      maxResults: 1,
      relevanceLanguage: 'pt',
      regionCode: 'BR',
    });
    channelId = res.data.items?.[0]?.snippet?.channelId ?? '';
  }

  if (!channelId) throw new Error('Canal não encontrado');

  const res = await youtube.channels.list({
    part: ['snippet'],
    id: [channelId],
  });

  const channel = res.data.items?.[0];
  if (!channel) throw new Error('Canal não encontrado');

  return {
    channelId,
    name: channel.snippet?.title ?? '',
    thumbnail: channel.snippet?.thumbnails?.default?.url ?? '',
    description: channel.snippet?.description ?? '',
  };
}

// Resolve URL de playlist do YouTube
export async function resolvePlaylist(url: string): Promise<PlaylistInfo> {
  let playlistId = '';

  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    playlistId = urlObj.searchParams.get('list') ?? '';
  } catch {
    // Se não for URL válida, trata como ID direto
    playlistId = url.trim();
  }

  if (!playlistId) throw new Error('ID de playlist inválido. Use a URL completa da playlist do YouTube.');

  const res = await youtube.playlists.list({
    part: ['snippet'],
    id: [playlistId],
  });

  const playlist = res.data.items?.[0];
  if (!playlist) throw new Error('Playlist não encontrada');

  return {
    playlistId,
    name: playlist.snippet?.title ?? '',
    thumbnail: playlist.snippet?.thumbnails?.default?.url ?? '',
    description: playlist.snippet?.description ?? '',
    channelName: playlist.snippet?.channelTitle ?? '',
  };
}

// Filtra vídeos por tópicos no título (pode ser usado localmente após buscar do cache)
export function filterVideosByTopics(videos: VideoInfo[], topics: string[]): VideoInfo[] {
  if (!topics.length) return videos;
  const keywords = topics.flatMap((t) => t.toLowerCase().split(' ')).filter((w) => w.length > 3);
  if (!keywords.length) return videos;

  const filtered = videos.filter((v) => {
    const title = v.title.toLowerCase();
    return keywords.some((kw) => title.includes(kw));
  });

  return filtered.length >= 5 ? filtered : videos;
}

// Busca TODOS os vídeos de um canal (sem filtro por tópico)
export async function getAllChannelVideos(channelId: string): Promise<VideoInfo[]> {
  const channelRes = await youtube.channels.list({
    part: ['contentDetails'],
    id: [channelId],
  });

  const uploadsPlaylistId = channelRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return [];

  return fetchAllFromPlaylist(uploadsPlaylistId);
}

// Busca vídeos de uma playlist diretamente pelo ID
export async function getPlaylistVideos(playlistId: string): Promise<VideoInfo[]> {
  return fetchAllFromPlaylist(playlistId);
}

// Lógica comum de paginação para buscar vídeos de qualquer playlist
async function fetchAllFromPlaylist(playlistId: string): Promise<VideoInfo[]> {
  const allVideoIds: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  const MAX_PAGES = 2; // ~100 vídeos por canal — rápido e suficiente

  do {
    const playlistRes = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId,
      maxResults: 50,
      pageToken,
    });

    const ids = (playlistRes.data.items ?? [])
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter(Boolean) as string[];

    allVideoIds.push(...ids);
    pageToken = playlistRes.data.nextPageToken ?? undefined;
    pages++;
  } while (pageToken && pages < MAX_PAGES);

  if (!allVideoIds.length) return [];

  // Busca detalhes de todos os batches em PARALELO (antes era sequencial)
  const batches: string[][] = [];
  for (let i = 0; i < allVideoIds.length; i += 50) {
    batches.push(allVideoIds.slice(i, i + 50));
  }
  const results = await Promise.all(batches.map((b) => fetchVideoDetails(b)));
  return results.flat();
}

// Mantido para compatibilidade — usa getAllChannelVideos + filtro local
export async function getChannelVideos(channelId: string, topics: string[]): Promise<VideoInfo[]> {
  const all = await getAllChannelVideos(channelId);
  return filterVideosByTopics(all, topics);
}

async function fetchVideoDetails(videoIds: string[]): Promise<VideoInfo[]> {
  if (!videoIds.length) return [];

  const detailsRes = await youtube.videos.list({
    part: ['snippet', 'contentDetails'],
    id: videoIds,
  });

  return (detailsRes.data.items ?? [])
    .map((video) => ({
      videoId: video.id ?? '',
      title: video.snippet?.title ?? '',
      url: `https://www.youtube.com/watch?v=${video.id}`,
      channelName: video.snippet?.channelTitle ?? '',
      durationMinutes: parseDuration(video.contentDetails?.duration ?? 'PT0S'),
      thumbnail:
        video.snippet?.thumbnails?.medium?.url ??
        `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
    }))
    .filter((v) => v.durationMinutes >= 15);
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? '0');
  const m = parseInt(match[2] ?? '0');
  const s = parseInt(match[3] ?? '0');
  return h * 60 + m + Math.round(s / 60);
}
