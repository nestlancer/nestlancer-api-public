export interface TurnstileResult {
  success: boolean;
  challengeTs?: string;
  hostname?: string;
  errorCodes?: string[];
  action?: string;
  cdata?: string;
}
