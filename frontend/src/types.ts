export interface Service {
  id: number;
  tag: string;
  title: string;
  shortDesc: string;
  quote: string;
  longDesc: string;
  pills: string[];
  gradient: string;
  color: string;
  icon: 'agents' | 'automation' | 'products' | 'design';
}

export interface HeadingWord {
  text: string;
  active: boolean;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface CapturedLead {
  name: string;
  email: string;
  service: string | null;
}

export interface ScheduledCall {
  humanLabel: string;
  start: string;
  end: string;
  /** Only present once the call is confirmed, when n8n returns the Google Meet link. */
  meetLink?: string | null;
}
