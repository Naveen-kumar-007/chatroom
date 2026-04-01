import { IonContent, IonMenu, IonHeader, IonToolbar, IonTitle, IonList, IonItem, IonLabel, IonAvatar, IonIcon, IonButtons, IonPopover, IonButton } from '@ionic/react';
import { logOutOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { mockContacts } from '../types';
import { useChatStorage } from '../hooks/useChatStorage';

import { useState, useEffect } from 'react';

interface ChatListProps {
  onChatSelect: (id: string) => void;
  currentUser: { name: string, photo: string };
  onLogout: () => void;
  isMobile?: boolean;
}

const ChatList: React.FC<ChatListProps> = ({ onChatSelect, currentUser, onLogout, isMobile }) => {
  const [contacts, setContacts] = useState(mockContacts);
  const [popoverEvent, setPopoverEvent] = useState<any>(null);
  const { isReady, getMessages } = useChatStorage();

  useEffect(() => {
    if (!isReady) return;

    const loadLatest = async () => {
      const updated = await Promise.all(
        mockContacts.map(async (c) => {
          const msgs = await getMessages(c.id);
          if (msgs && msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            return {
              ...c,
              message: lastMsg.text || (lastMsg.imageUri ? '📷 Photo' : lastMsg.audioUri ? '🎵 Audio' : ''),
              timestamp: lastMsg.timestamp,
              time: new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
          }
          return c;
        })
      );
      
      updated.sort((a, b) => b.timestamp - a.timestamp);
      setContacts(updated);
    };

    loadLatest();
    window.addEventListener('chatUpdated', loadLatest);
    
    // Poll securely
    const interval = setInterval(loadLatest, 3000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('chatUpdated', loadLatest);
    };
  }, [isReady]);

  const menuContent = (
    <>
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#f0f2f5', '--padding-bottom': '8px', '--padding-top': '8px' }}>
          <IonTitle style={{ fontSize: '20px', fontWeight: 700, color: '#111b21', textAlign: 'left' }}>Chats</IonTitle>
          <IonButtons slot="end">
             <IonButton fill="clear" color="dark" onClick={(e) => setPopoverEvent(e.nativeEvent)}>
                <IonIcon icon={ellipsisVerticalOutline} />
             </IonButton>
          </IonButtons>
        </IonToolbar>

        <IonPopover
          isOpen={Boolean(popoverEvent)}
          event={popoverEvent}
          onDidDismiss={() => setPopoverEvent(null)}
          style={{ '--width': '180px' }}
          alignment="end"
        >
          <IonList className="ion-no-padding">
            <IonItem lines="full">
               <IonLabel style={{ fontSize: '14px', fontWeight: 600, color: '#111b21' }}>{currentUser.name}</IonLabel>
            </IonItem>
            <IonItem button onClick={() => { onLogout(); setPopoverEvent(null); }}>
              <IonIcon icon={logOutOutline} slot="start" style={{ fontSize: '18px' }} />
              <IonLabel style={{ fontSize: '14px' }}>Logout</IonLabel>
            </IonItem>
          </IonList>
        </IonPopover>
      </IonHeader>
      <IonContent style={{ '--background': '#fff' }}>
        <IonList>
          {contacts.map((contact) => (
            <IonItem key={contact.id} button onClick={() => onChatSelect(contact.id)} detail={false}>
              <IonAvatar slot="start" style={{ width: 48, height: 48 }}>
                <img src={contact.photo || `https://i.pravatar.cc/150?u=${contact.id}`} alt={contact.name} />
              </IonAvatar>
              <IonLabel>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 500, margin: 0 }}>{contact.name}</h2>
                  <span style={{ fontSize: '12px', color: '#667781' }}>{contact.time}</span>
                </div>
                <p style={{ margin: '4px 0 0', color: '#667781', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contact.message}
                </p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </>
  );

  if (isMobile) {
    return <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>{menuContent}</div>;
  }

  return (
    <IonMenu contentId="main" type="overlay">
      {menuContent}
    </IonMenu>
  );
};

export default ChatList;
