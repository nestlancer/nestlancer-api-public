import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CommentModerationService {
  constructor(private readonly configService: ConfigService) {}

  async checkContent(content: string): Promise<boolean> {
    const threshold = this.configService.get<number>('blog.spamScoreThreshold', 0.7);
    // basic spam check algorithm
    let score = 0;
    const urlCount = (content.match(/http/g) || []).length;
    score += urlCount * 0.2;

    return score < threshold;
  }
}
