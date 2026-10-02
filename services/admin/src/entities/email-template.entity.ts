export class EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  variables: string[];
  active: boolean;
  updatedAt: Date;
  updatedBy?: string | null;
}
