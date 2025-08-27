export type User = {
  id: string;
  name: string;
  avatar: string;
  lastActivityTs: number;
  isTyping?: boolean;
};

export type ChatMessage = {
  id: string;
  text: string;
  by: User;
  ts: number;
  expiresAt?: number;
  isDeleted?: boolean;
  deletedBy?: User;
  deletedTs?: number;
};
