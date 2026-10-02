export class ConsoleTransport {
  write(output: string): void {
    process.stdout.write(output + '\n');
  }
}
