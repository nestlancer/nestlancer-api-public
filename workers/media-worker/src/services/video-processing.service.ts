import * as path from 'path';

import { Injectable } from '@nestjs/common';

import ffmpeg from 'fluent-ffmpeg';

import { MediaMetadata } from '../interfaces/processing-options.interface';

@Injectable()
export class VideoProcessingService {
  async getInfo(inputPath: string): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err: Error | null, metadata: any) => {
        if (err) return reject(err);
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        resolve({
          width: videoStream?.width,
          height: videoStream?.height,
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          codec: videoStream?.codec_name,
        });
      });
    });
  }

  /**
   * Extracts a single frame from the video as a thumbnail.
   * @param inputPath - Full path to the video file
   * @param outputDir - Directory to write the thumbnail (filename will be thumbnail.jpg)
   * @param timeSeconds - Time in seconds to capture the frame (default 1)
   * @returns Full path to the generated thumbnail file
   */
  async extractFrame(inputPath: string, outputDir: string, timeSeconds = 1): Promise<string> {
    const outputFile = path.join(outputDir, 'thumbnail.jpg');
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timeSeconds],
          filename: 'thumbnail.jpg',
          folder: outputDir,
          size: '300x200',
        })
        .on('end', () => resolve(outputFile))
        .on('error', (err: Error) => reject(err));
    });
  }
}
