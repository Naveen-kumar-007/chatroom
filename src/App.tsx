import { useState } from 'react';
import { IonApp, IonSplitPane, IonPage, IonContent, setupIonicReact } from '@ionic/react';
import { useEffect } from 'react';
import ChatList from './components/ChatList.tsx';
import ChatRoom from './pages/ChatRoom.tsx';
import Login from './pages/Login.tsx';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

setupIonicReact();

const App = () => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string, photo: string } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveChatId(null);
  };

  const mainContent = (
    <div id="main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>
      {activeChatId ? (
        <ChatRoom 
          chatId={activeChatId} 
          onBack={() => setActiveChatId(null)} 
          currentUser={currentUser}
        />
      ) : (
        <IonContent style={{ '--background': '#f0f2f5' }}>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#667781', borderLeft: isMobile ? 'none' : '1px solid #d1d7db', padding: '20px' }}>
            <div style={{ width: 'min(280px, 70vw)', height: 'min(280px, 70vw)', backgroundColor: '#e9edef', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
              <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h1 style={{ fontWeight: 300, color: '#41525d', fontSize: isMobile ? '24px' : '32px' }}>Select a Chat to Start</h1>
            <p style={{ marginTop: '16px', fontSize: '14px', lineHeight: '24px', maxWidth: '400px' }}>
              Connect with friends and family instantly.<br/>
              Messages are stored locally on your device for privacy.
            </p>
          </div>
        </IonContent>
      )}
    </div>
  );

  return (
    <IonApp>
      {isMobile ? (
        <IonPage>
          {activeChatId ? (
            <ChatRoom 
              chatId={activeChatId} 
              onBack={() => setActiveChatId(null)} 
              currentUser={currentUser}
            />
          ) : (
             /* On mobile, when no chat is selected, we want the ChatList content directly */
             <ChatList onChatSelect={setActiveChatId} currentUser={currentUser} onLogout={handleLogout} isMobile={true} />
          )}
        </IonPage>
      ) : (
        <IonPage>
          <IonSplitPane contentId="main">
            <ChatList onChatSelect={setActiveChatId} currentUser={currentUser} onLogout={handleLogout} />
            {mainContent}
          </IonSplitPane>
        </IonPage>
      )}
    </IonApp>
  );
};

export default App;
