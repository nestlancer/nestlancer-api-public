export class TagInvalidationStrategy {
  getTagsForKey(key: string): string[] {
    const parts = key.split(':');
    if (parts.length >= 2) return [parts.slice(0, 2).join(':')];
    return [key];
  }
}
