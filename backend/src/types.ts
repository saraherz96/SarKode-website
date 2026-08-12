export interface ContactRequestBody {
  name: string;
  email: string;
  message: string;
  service?: string | null;
}

export interface StoredContact extends ContactRequestBody {
  id: string;
  receivedAt: string;
}
