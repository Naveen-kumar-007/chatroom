import React, { useState } from 'react';
import { IonContent, IonPage, IonButton } from '@ionic/react';

interface LoginProps {
  onLogin: (user: { name: string, photo: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');

  const handleNext = () => {
    // Simulated login
    onLogin({
      name: email.split('@')[0] || 'User',
      photo: 'https://ionicframework.com/docs/img/demos/avatar.svg'
    });
  };

  return (
    <IonPage>
      <IonContent style={{ '--background': '#fff' }}>
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: '#f0f2f5' 
        }}>
          <div style={{ 
            width: '450px', 
            padding: '48px 40px 36px', 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            border: '1px solid #dadce0',
            textAlign: 'center',
            boxShadow: 'none'
          }}>
            {/* Google G Logo */}
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
               <svg width="48" height="48" viewBox="0 0 24 24">
                 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                 <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z"/>
               </svg>
            </div>
            
            <h1 style={{ color: '#202124', fontSize: '24px', fontWeight: 400, margin: '16px 0 8px' }}>Sign in</h1>
            <p style={{ color: '#202124', fontSize: '16px', fontWeight: 400, marginBottom: '40px' }}>Use your Google Account</p>

            <div style={{ textAlign: 'left' }}>
              <div style={{ 
                border: '1px solid #dadce0', 
                borderRadius: '4px', 
                padding: '13px 15px',
                marginBottom: '8px'
              }}>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or phone" 
                  style={{ 
                    width: '100%', 
                    border: 'none', 
                    outline: 'none', 
                    fontSize: '16px',
                    color: '#202124'
                  }} 
                />
              </div>
              <a href="#" style={{ textDecoration: 'none', color: '#1a73e8', fontWeight: 500, fontSize: '14px' }}>Forgot email?</a>
            </div>

            <p style={{ color: '#5f6368', fontSize: '14px', lineHeight: '20px', margin: '40px 0' }}>
              Not your computer? Use Guest mode to sign in privately. <br/>
              <a href="#" style={{ textDecoration: 'none', color: '#1a73e8', fontWeight: 500 }}>Learn more</a>
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="#" style={{ textDecoration: 'none', color: '#1a73e8', fontWeight: 500, fontSize: '14px' }}>Create account</a>
              <IonButton 
                onClick={handleNext}
                style={{ 
                  '--background': '#1a73e8', 
                  '--border-radius': '4px', 
                  '--box-shadow': 'none',
                  textTransform: 'none',
                  fontWeight: 500,
                  padding: '0 10px'
                }}
              >
                Next
              </IonButton>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
