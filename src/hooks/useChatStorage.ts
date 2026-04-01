import { useState, useEffect } from 'react';
import { Storage } from '@ionic/storage';
import type { Message } from '../types';

// Ensure single instance of storage
const storage = new Storage();
let storageInstance: Storage | null = null;

export function useChatStorage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const initStorage = async () => {
      if (!storageInstance) {
        storageInstance = await storage.create();
      }
      if (isMounted) {
        setIsReady(true);
      }
    };
    initStorage();
    return () => { isMounted = false; };
  }, []);

  const saveMessages = async (chatId: string, messages: Message[]) => {
    if (!storageInstance) return;
    await storageInstance.set(`chat_${chatId}`, messages);
  };

  const getMessages = async (chatId: string): Promise<Message[]> => {
    if (!storageInstance) return [];
    const msgs = await storageInstance.get(`chat_${chatId}`);
    return msgs || [];
  };

  return { isReady, saveMessages, getMessages };
}
