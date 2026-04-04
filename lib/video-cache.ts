import type { Client } from '@libsql/client';
import { getAllChannelVideos, getPlaylistVideos, VideoInfo } from './youtube';

export const CACHE_DAYS = 7;

export async function getVideosWithCache(
  channelId: string,
  isPlaylist: boolean,
  userId: string,
  db: Client
): Promise<{ videos: VideoInfo[]; fromCache: boolean }> {
  const cached = await db.execute({
    sql: `SELECT video_id as videoId, title, url, channel_name as channelName,
                 duration_minutes as durationMinutes, thumbnail
          FROM channel_videos_cache
          WHERE user_id = ? AND channel_id = ?
          AND fetched_at > datetime('now', '-${CACHE_DAYS} days')`,
    args: [userId, channelId],
  });

  if (cached.rows.length > 0) {
    console.log(`[Cache] ${cached.rows.length} vídeos para ${channelId} (cache válido).`);
    return { videos: cached.rows as unknown as VideoInfo[], fromCache: true };
  }

  const videos = isPlaylist
    ? await getPlaylistVideos(channelId)
    : await getAllChannelVideos(channelId);

  if (videos.length > 0) {
    await db.batch(
      videos.map((v) => ({
        sql: `INSERT OR REPLACE INTO channel_videos_cache
              (user_id, channel_id, video_id, title, url, channel_name, duration_minutes, thumbnail, fetched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [userId, channelId, v.videoId, v.title, v.url, v.channelName, v.durationMinutes, v.thumbnail ?? null],
      })),
      'write'
    );
  }

  console.log(`[Cache] ${videos.length} vídeos para ${channelId} buscados e salvos.`);
  return { videos, fromCache: false };
}
