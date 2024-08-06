export interface MailContent {
  to: string;
  subject: string;
  template?: string; // optional
  context?: { [key: string]: any }; //  optional
  html?: string; //optional
}