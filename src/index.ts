import path from 'node:path'

import ffmpeg from 'fluent-ffmpeg'
import ffmpegBin from '@ffmpeg-installer/ffmpeg'
import ffprobeBin from '@ffprobe-installer/ffprobe'

ffmpeg.setFfmpegPath(ffmpegBin.path)
ffmpeg.setFfprobePath(ffprobeBin.path)

type Track = {
  index: number
  title: string
}

type TracksList = Record<'video' | 'audio' | 'subtitle', Array<Track>>

const getTracks = async (videoPath: string) => new Promise<TracksList>((resolve, reject) => {
  ffmpeg
    .ffprobe(videoPath, (err, metadata) => {
      if (err)
        return reject(err)

      const rawVideoTracks = metadata.streams.filter(stream => stream.codec_type === 'video')
      const rawAudioTracks = metadata.streams.filter(stream => stream.codec_type === 'audio')
      const rawSubtitleTracks = metadata.streams.filter(stream => stream.codec_type === 'subtitle')

      const tracksCount = {
        video: rawVideoTracks.length,
        audio: rawAudioTracks.length,
        subtitle: rawSubtitleTracks.length
      }

      const videoTracks = rawVideoTracks
        .filter(stream => !!stream.tags)
        .map(stream => ({
          index: stream.index,
          title: stream.tags.title || 'unknown'
        }))

      const audioTracks = rawAudioTracks
        .filter(stream => !!stream.tags)
        .map(stream => ({
          index: stream.index - tracksCount.video,
          title: stream.tags.title || 'unknown'
        }))

      const subtitleTracks = rawSubtitleTracks
        .filter(stream => !!stream.tags)
        .map(stream => ({
          index: stream.index - tracksCount.video - tracksCount.audio,
          title: stream.tags.title || 'unknown'
        }))

      const tracksList = {
        video: videoTracks,
        audio: audioTracks,
        subtitle: subtitleTracks
      }

      return resolve(tracksList)
    })
})

const main = async () => {
  const videoPathArg = process.argv[2]
  if (!videoPathArg)
    throw new Error('No video path provided')

  const videoPath = path.resolve(process.cwd(), videoPathArg)

  const tracks = await getTracks(videoPath)
  console.log(JSON.stringify(tracks, null, 2))
}

main()
