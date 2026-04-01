export interface Message {
  id: string;
  text?: string;
  imageUri?: string;
  audioUri?: string;
  timestamp: number;
  isSentByMe: boolean;
  waveform?: number[];
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: Message;
  unreadCount: number;
}

export const mockContacts = [
  { id: '1', name: 'Alice Smith', message: 'See you tomorrow!', time: '10:45 AM', timestamp: Date.now() - 1000 * 60 * 60 * 24, photo: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Bob Johnson', message: 'Can you send me the files?', time: '09:20 AM', timestamp: Date.now() - 1000 * 60 * 60 * 48, photo: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Charlie Brown', message: 'Haha that is so funny 😂', time: 'Yesterday', timestamp: Date.now() - 1000 * 60 * 60 * 72, photo: 'https://i.pravatar.cc/150?u=3' },
  { id: '4', name: 'Diana Prince', message: 'Let us meet at the cafe at 5.', time: 'Yesterday', timestamp: Date.now() - 1000 * 60 * 60 * 96, photo: 'https://i.pravatar.cc/150?u=4' },
  { id: '5', name: 'Evan Davis', message: 'Thanks for the help!', time: 'Monday', timestamp: Date.now() - 1000 * 60 * 60 * 120, photo: 'https://i.pravatar.cc/150?u=5' },
];
