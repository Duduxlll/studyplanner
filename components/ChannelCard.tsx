'use client';

interface Channel {
  id: number;
  name: string;
  channel_id: string;
  thumbnail: string;
  description: string;
}

interface Props {
  channel: Channel;
  onDelete: (id: number) => void;
}

export default function ChannelCard({ channel, onDelete }: Props) {
  return (
    <div className="group relative flex flex-col items-center gap-2 cursor-default">
      <div className="relative">
        {/* Anel de brilho externo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-md scale-110" />

        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-700/80 group-hover:border-violet-500/80 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]">
          {channel.thumbnail ? (
            <img
              src={channel.thumbnail}
              alt={channel.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-2xl">
              📺
            </div>
          )}
        </div>

        {/* Botão de remover */}
        <button
          onClick={() => onDelete(channel.id)}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-white text-xs hidden group-hover:flex items-center justify-center hover:bg-red-500 transition-all shadow-[0_0_12px_rgba(239,68,68,0.6)] z-10"
          title="Remover canal"
        >
          ×
        </button>
      </div>

      <span
        className="text-xs text-zinc-500 group-hover:text-zinc-200 transition-colors duration-300 text-center max-w-[80px] truncate font-medium"
        title={channel.name}
      >
        {channel.name}
      </span>
    </div>
  );
}
