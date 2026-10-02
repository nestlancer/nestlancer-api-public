export class TtlStrategy {
  constructor(private readonly defaultTtl: number = 300) {}
  getTtl(key: string): number {
    if (key.includes('portfolio') || key.includes('blog')) return 3600;
    if (key.includes('user:profile')) return 300;
    return this.defaultTtl;
  }
}
