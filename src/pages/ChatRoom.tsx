import { useState, useEffect, useRef } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonButtons, IonButton, IonIcon, IonTextarea, IonAvatar, IonModal
} from '@ionic/react';
import { cameraOutline, sendOutline, micOutline, addOutline, chevronBackOutline, chevronForwardOutline, closeOutline, trashOutline, play, pause, searchOutline, downloadOutline, starOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { CapacitorAudioRecorder as AudioRecorder } from '@capgo/capacitor-audio-recorder';
import { useChatStorage } from '../hooks/useChatStorage';
import type { Message } from '../types';
import { mockContacts } from '../types';
import './ChatRoom.css';

interface ChatRoomProps {
  chatId: string;
  onBack: () => void;
  currentUser: { name: string, photo: string };
}

const WhatsAppAudioPlayer = ({ src, isSentByMe, waveform }: { src: string, isSentByMe: boolean, waveform?: number[] }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const cycleSpeed = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (waveformRef.current && audioRef.current && audioRef.current.duration) {
      const rect = waveformRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickedPercent = x / rect.width;
      audioRef.current.currentTime = clickedPercent * audioRef.current.duration;
    }
  };

  const defaultWave = [3, 5, 8, 10, 14, 18, 12, 8, 15, 20, 18, 12, 10, 6, 14, 20, 15, 12, 8, 5, 3, 6, 9, 12, 10, 8, 5, 4];
  const displayWave = waveform || defaultWave;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', maxWidth: '220px', padding: '4px 0', overflow: 'hidden' }}>
      <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
      
      <div 
        onClick={cycleSpeed}
        style={{ 
          backgroundColor: isSentByMe ? '#b8e3ad' : '#e0e0e0', 
          padding: '2px 6px', 
          borderRadius: '12px', 
          fontSize: '10px', 
          fontWeight: 'bold', 
          color: '#54656f',
          cursor: 'pointer',
          minWidth: '28px',
          textAlign: 'center'
        }}
      >
        {playbackRate}x
      </div>

      <IonButton fill="clear" onClick={togglePlay} style={{ margin: 0, '--padding-start': '2px', '--padding-end': '2px', height: '36px', width: '36px' }}>
        <IonIcon icon={isPlaying ? pause : play} style={{ fontSize: '28px', color: '#54656f' }} />
      </IonButton>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div 
          ref={waveformRef}
          onClick={handleSeek}
          style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '30px', cursor: 'pointer' }}
        >
          {displayWave.map((h, i) => {
            const barPercent = (i / displayWave.length) * 100;
            const isPlayed = barPercent <= progress;
            return (
              <div key={i} style={{ 
                width: '3px', 
                backgroundColor: isPlayed ? (isSentByMe ? '#25d366' : '#00A884') : (isSentByMe ? '#8696a0' : '#8696a0'),
                height: `${h * 1.5}px`,
                borderRadius: '2px',
                transition: 'background-color 0.1s'
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ChatRoom: React.FC<ChatRoomProps> = ({ chatId, onBack, currentUser }) => {
  // const { id } = useParams<{ id: string }>();
  // const chatId = id || '1';

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);
  const [realtimeWaveform, setRealtimeWaveform] = useState<number[]>(new Array(20).fill(2));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordedWaveformRef = useRef<number[]>([]);
  const [cameraMirror, setCameraMirror] = useState(false); // Default to false (Normal)

  const [enlargedMediaId, setEnlargedMediaId] = useState<string | null>(null);
  const [stagedMediaList, setStagedMediaList] = useState<string[]>([]);
  const [stagedMediaIndex, setStagedMediaIndex] = useState(0);
  const [stagedCaption, setStagedCaption] = useState('');
  
  const [showWebCamera, setShowWebCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const contentRef = useRef<HTMLIonContentElement>(null);
  const { isReady, saveMessages, getMessages } = useChatStorage();
  
  const contactName = mockContacts.find(c => c.id === chatId)?.name || `Chat Contact ${chatId}`;

  const scrollToBottom = () => {
    setTimeout(() => {
      contentRef.current?.scrollToBottom(300);
    }, 100);
  };

  const loadMessages = async () => {
    const saved = await getMessages(chatId);
    setMessages(saved);
    scrollToBottom();
  };

  useEffect(() => {
    if (isReady) {
      loadMessages();
    }
  }, [isReady, chatId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (enlargedMediaId) setEnlargedMediaId(null);
        else if (stagedMediaList.length > 0) { setStagedMediaList([]); setStagedCaption(''); }
        else if (showWebCamera) closeWebCamera();
        else if (isRecording) cancelRecording();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [enlargedMediaId, stagedMediaList, showWebCamera, isRecording]);

  const handleSendText = async () => {
    if (!text.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: Date.now(),
      isSentByMe: true
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setText('');
    await saveMessages(chatId, updated);
    window.dispatchEvent(new Event('chatUpdated'));
    scrollToBottom();
  };

  const openWebCamera = async () => {
    setShowWebCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      console.error(e);
      setShowWebCamera(false);
    }
  };

  const captureWebPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
      
      if (context) {
        if (cameraMirror) {
          context.translate(canvasRef.current.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0);
      }
      
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      
      setShowWebCamera(false);
      setStagedMediaList([dataUrl]);
      setStagedMediaIndex(0);
    }
  };

  const closeWebCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    }
    setShowWebCamera(false);
  };

  const handleCamera = async () => {
    if (Capacitor.getPlatform() === 'web') {
      openWebCamera();
    } else {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera
        });

        const finalUri = image.path || image.webPath || '';
        if (finalUri) {
          setStagedMediaList([finalUri]);
          setStagedMediaIndex(0);
        }
      } catch (e) {
        console.error("Camera error:", e);
      }
    }
  };

  const startRecording = async () => {
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const check = await (AudioRecorder as any).hasAudioRecordingPermission();
        if (!check.granted) {
          const req = await (AudioRecorder as any).requestAudioRecordingPermission();
          if (!req.granted) return;
        }
      }

      // Web Audio API for real-time waveform
      if (typeof window !== 'undefined') {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        recordedWaveformRef.current = [];

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateWave = () => {
          analyser.getByteFrequencyData(dataArray);
          // Map to 20 bars
          const newWave: number[] = [];
          for (let i = 0; i < 20; i++) {
            const val = dataArray[i] / 12; // scale for UI height
            newWave.push(Math.max(2, val));
          }
          setRealtimeWaveform(newWave);
          
          // Store samples occasionally for the final message bubble
          if (Math.random() > 0.8) {
            recordedWaveformRef.current.push(...newWave.slice(0, 5));
          }
          
          animationFrameRef.current = requestAnimationFrame(updateWave);
        };
        updateWave();
      }

      await AudioRecorder.startRecording();
      setRecordingTime(0);
      const interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      setTimerInterval(interval);
      setIsRecording(true);
    } catch (e) {
      console.error("Audio recording start error:", e);
    }
  };

  const sendStagedMedia = async () => {
    if (stagedMediaList.length === 0) return;

    const newMessages: Message[] = stagedMediaList.map((uri, idx) => ({
      id: (Date.now() + Math.random()).toString(),
      imageUri: uri,
      text: idx === 0 ? stagedCaption : undefined,
      timestamp: Date.now(),
      isSentByMe: true
    }));

    const updated = [...messages, ...newMessages];
    setMessages(updated);
    await saveMessages(chatId, updated);
    window.dispatchEvent(new Event('chatUpdated'));
    setStagedMediaList([]);
    setStagedCaption('');
    scrollToBottom();
  };

  const handleAttachment = async () => {
    try {
      const result = await Camera.pickImages({
        quality: 90,
        limit: 10
      });

      if (result.photos && result.photos.length > 0) {
        const newImagePaths: string[] = [];
        for (const photo of result.photos) {
          const finalUri = photo.path || photo.webPath || '';
          if (finalUri) {
            newImagePaths.push(finalUri);
          }
        }

        if (newImagePaths.length > 0) {
          setStagedMediaList(newImagePaths);
          setStagedMediaIndex(0);
        }
      }
    } catch (e) {
      console.error("Multi-attachment error:", e);
    }
  };

  const stopRecording = async () => {
    try {
      clearInterval(timerInterval);
      setIsRecording(false);
      
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();

      const result = await AudioRecorder.stopRecording();

      const anyRes = result as unknown as { uri?: string; blob?: Blob; recordDataBase64?: string };
      let fileUriToSave = '';

      if (Capacitor.getPlatform() === 'web') {
        if (anyRes.recordDataBase64) {
          fileUriToSave = `data:audio/aac;base64,${anyRes.recordDataBase64}`;
        } else if (anyRes.blob) {
           const b64 = await new Promise<string>((resolve) => {
             const reader = new FileReader();
             reader.onloadend = () => resolve(reader.result as string);
             reader.readAsDataURL(anyRes.blob!);
           });
           fileUriToSave = b64;
        }
      } else {
        if (anyRes.uri) {
          // Platform returned a file URI (Native)
          const base64Data = await Filesystem.readFile({ path: anyRes.uri });
          const fileName = `audio_${Date.now()}.m4a`;
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data.data,
            directory: Directory.Data
          });
          fileUriToSave = writeResult.uri;
        } else if (anyRes.blob) {
          // Platform returned a blob (Web fallback on Native?)
          const base64Str = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(anyRes.blob as Blob);
          });
          const fileName = `audio_${Date.now()}.m4a`;
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Str,
            directory: Directory.Data
          });
          fileUriToSave = writeResult.uri;
        } else if (anyRes.recordDataBase64) {
          const fileName = `audio_${Date.now()}.m4a`;
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: anyRes.recordDataBase64,
            directory: Directory.Data
          });
          fileUriToSave = writeResult.uri;
        }
      }

      if (fileUriToSave) {
        // Take a condensed version of the recorded waveform for the signature
        const finalWaveform = recordedWaveformRef.current.length > 0 
          ? recordedWaveformRef.current.slice(0, 30) 
          : [4, 8, 12, 10, 15, 8, 12, 6, 18, 14, 10, 5, 12, 16, 9, 20, 11, 7, 14, 10];

        const newMsg: Message = {
          id: Date.now().toString(),
          audioUri: fileUriToSave,
          timestamp: Date.now(),
          isSentByMe: true,
          waveform: finalWaveform
        };
        const updated = [...messages, newMsg];
        setMessages(updated);
        await saveMessages(chatId, updated);
        window.dispatchEvent(new Event('chatUpdated'));
        scrollToBottom();
      }

    } catch (e) {
      console.error("Audio recording stop error:", e);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const cancelRecording = async () => {
    try {
      clearInterval(timerInterval);
      setIsRecording(false);
      await AudioRecorder.stopRecording();
    } catch(e) {}
  };

  const getMediaUrl = (path: string) => {
    if (path.startsWith('data:audio') || path.startsWith('data:image') || path.startsWith('blob:')) return path;
    return Capacitor.convertFileSrc(path);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <IonPage className="chat-room">
      <IonHeader className="ion-no-border">
        <IonToolbar style={{ '--background': '#f0f2f5' }}>
          <IonButtons slot="start">
            <IonButton fill="clear" color="medium" onClick={onBack}>
              <IonIcon icon={chevronBackOutline} slot="icon-only" />
            </IonButton>
            <IonAvatar style={{ width: '40px', height: '40px', marginLeft: '8px' }}>
              <img src={`https://i.pravatar.cc/150?u=${chatId}`} alt="avatar" />
            </IonAvatar>
            <div style={{ marginLeft: '12px' }}>
              <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 500, color: '#111b21' }}>{contactName}</h2>
              <p style={{ fontSize: '13px', margin: 0, color: '#667781' }}>online</p>
            </div>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {showWebCamera && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-start' }}>
             <IonButton fill="clear" color="light" onClick={closeWebCamera}><IonIcon icon={closeOutline} slot="icon-only" /></IonButton>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: '#000' }}>
             <video 
               ref={videoRef} 
               playsInline 
               muted 
               style={{ 
                 width: '100%', 
                 height: '100%', 
                 objectFit: 'cover',
                 transform: cameraMirror ? 'scaleX(-1)' : 'scaleX(1)'
               }} 
             />
             <canvas ref={canvasRef} style={{ display: 'none' }} />
             
             <IonButton 
               fill="clear" 
               color="light" 
               onClick={() => setCameraMirror(!cameraMirror)}
               style={{ position: 'absolute', bottom: '20px', right: '20px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '20px', height: '40px' }}
             >
                <div style={{ padding: '0 12px', fontSize: '13px', textTransform: 'none' }}>Flip View</div>
             </IonButton>
          </div>
          <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', backgroundColor: '#000' }}>
             <div 
               onClick={captureWebPhoto} 
               className="shutter-button"
               style={{ 
                 width: '80px', 
                 height: '80px', 
                 borderRadius: '50%', 
                 border: '4px solid #fff', 
                 backgroundColor: 'transparent', 
                 cursor: 'pointer', 
                 display: 'flex', 
                 justifyContent: 'center', 
                 alignItems: 'center'
               }} 
             >
               <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fff' }} />
             </div>
          </div>
        </div>
      )}

      <IonContent ref={contentRef} style={{ '--background': '#efeae2' }}>
        <div className="messages-container">
          {(() => {
            const result: any[] = [];
            let currentImageGroup: any[] = [];

            messages.forEach((msg, idx) => {
              const nextMsg = messages[idx + 1];
              const isImage = !!msg.imageUri;
              const nextIsImage = nextMsg && nextMsg.imageUri && nextMsg.isSentByMe === msg.isSentByMe;

              if (isImage && (nextIsImage || currentImageGroup.length > 0)) {
                currentImageGroup.push(msg);
                if (!nextIsImage) {
                  result.push({ type: 'collage', images: currentImageGroup, isSentByMe: msg.isSentByMe, timestamp: msg.timestamp, id: `collage-${msg.id}` });
                  currentImageGroup = [];
                }
              } else {
                result.push(msg);
              }
            });

            return result.map((msg) => (
              <div key={msg.id} className={`message-bubble ${msg.isSentByMe ? 'sent' : 'received'} ${msg.type === 'collage' ? 'collage-bubble' : ''}`}>
                {msg.type === 'collage' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: msg.images.length >= 2 ? '1fr 1fr' : '1fr', gap: '2px', borderRadius: '8px', overflow: 'hidden', maxWidth: '450px' }}>
                    {msg.images.slice(0, 4).map((img: any, i: number) => (
                      <div key={img.id} style={{ position: 'relative', height: msg.images.length === 1 ? '400px' : msg.images.length === 2 ? '200px' : '150px' }}>
                        <img 
                          src={getMediaUrl(img.imageUri)} 
                          onClick={() => setEnlargedMediaId(img.id)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                        />
                        {i === 3 && msg.images.length > 4 && (
                          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                            +{msg.images.length - 3}
                          </div>
                        )}
                      </div>
                    ))}
                    {msg.images[0].text && <p className="message-text" style={{ padding: '4px 8px', gridColumn: 'span 2' }}>{msg.images[0].text}</p>}
                  </div>
                ) : msg.imageUri ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <img
                      src={getMediaUrl(msg.imageUri)}
                      alt="sent image"
                      className="message-image"
                      onClick={() => setEnlargedMediaId(msg.id)}
                      style={{ cursor: 'pointer', borderRadius: '8px', width: '100%', minHeight: '300px', maxWidth: '450px', objectFit: 'cover' }}
                    />
                    {msg.text && <p className="message-text" style={{ marginTop: '4px' }}>{msg.text}</p>}
                  </div>
                ) : msg.audioUri ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonAvatar style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                      <img src={msg.isSentByMe ? "https://ionicframework.com/docs/img/demos/avatar.svg" : `https://i.pravatar.cc/150?u=${chatId}`} />
                    </IonAvatar>
                    <WhatsAppAudioPlayer src={getMediaUrl(msg.audioUri)} isSentByMe={msg.isSentByMe} waveform={msg.waveform} />
                  </div>
                ) : (
                  <p className="message-text">{msg.text}</p>
                )}
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>
            ));
          })()}
        </div>
      </IonContent>

      <IonModal isOpen={Boolean(enlargedMediaId)} onDidDismiss={() => setEnlargedMediaId(null)}>
        <div style={{ 
          height: '100%', 
          backgroundColor: '#fff', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* High-Fi Gallery Top Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 24px', 
            borderBottom: '1px solid #eee',
            backgroundColor: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IonAvatar style={{ width: '40px', height: '40px' }}>
                <img src={currentUser?.photo || 'https://ionicframework.com/docs/img/demos/avatar.svg'} alt="you" />
              </IonAvatar>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600, color: '#111b21', fontSize: '15px' }}>
                  {messages.find(m => m.id === enlargedMediaId)?.isSentByMe ? 'You' : contactName}
                </div>
                <div style={{ fontSize: '12px', color: '#667781' }}>
                  {messages.find(m => m.id === enlargedMediaId)?.timestamp && (
                    <>
                      {new Date(messages.find(m => m.id === enlargedMediaId)!.timestamp).toLocaleDateString()} at {formatTime(messages.find(m => m.id === enlargedMediaId)!.timestamp)}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <IonButton fill="clear" color="dark"><IonIcon icon={searchOutline} /></IonButton>
              <IonButton fill="clear" color="dark"><IonIcon icon={starOutline} /></IonButton>
              <IonButton fill="clear" color="dark"><IonIcon icon={downloadOutline} /></IonButton>
              <IonButton fill="clear" color="dark"><IonIcon icon={trashOutline} /></IonButton>
              <IonButton fill="clear" color="dark"><IonIcon icon={ellipsisVerticalOutline} /></IonButton>
              <IonButton fill="clear" color="dark" onClick={() => setEnlargedMediaId(null)}><IonIcon icon={closeOutline} /></IonButton>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5', overflow: 'hidden' }}>
            <IonButton 
              fill="clear" 
              color="dark"
              onClick={(e) => {
                e.stopPropagation();
                const media = messages.filter(m => m.imageUri || m.audioUri);
                const idx = media.findIndex(m => m.id === enlargedMediaId);
                if (idx > 0) setEnlargedMediaId(media[idx-1].id);
              }}
              style={{ position: 'absolute', left: '20px', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: '40px', height: '40px' }}
            >
              <IonIcon icon={chevronBackOutline} style={{ fontSize: '24px' }} />
            </IonButton>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center', overflow: 'hidden' }}>
              {messages.find(m => m.id === enlargedMediaId)?.imageUri ? (
                <img 
                  src={getMediaUrl(messages.find(m => m.id === enlargedMediaId)?.imageUri || '')} 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                   <IonIcon icon={micOutline} style={{ fontSize: '80px', color: '#ffb900' }} />
                   {messages.find(m => m.id === enlargedMediaId)?.audioUri && (
                     <WhatsAppAudioPlayer 
                       src={getMediaUrl(messages.find(m => m.id === enlargedMediaId)!.audioUri!)} 
                       isSentByMe={true} 
                       waveform={messages.find(m => m.id === enlargedMediaId)?.waveform}
                     />
                   )}
                </div>
              )}
              {messages.find(m => m.id === enlargedMediaId)?.text && (
                <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: '#111b21', fontSize: '15px', padding: '8px 24px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  {messages.find(m => m.id === enlargedMediaId)?.text}
                </div>
              )}
            </div>

            <IonButton 
              fill="clear" 
              color="dark"
              onClick={(e) => {
                e.stopPropagation();
                const media = messages.filter(m => m.imageUri || m.audioUri);
                const idx = media.findIndex(m => m.id === enlargedMediaId);
                if (idx < media.length - 1) setEnlargedMediaId(media[idx+1].id);
              }}
              style={{ position: 'absolute', right: '20px', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: '40px', height: '40px' }}
            >
              <IonIcon icon={chevronForwardOutline} style={{ fontSize: '24px' }} />
            </IonButton>
          </div>

          <div style={{ 
            padding: '16px 0', 
            display: 'flex', 
            justifyContent: 'center', 
            backgroundColor: '#fff', 
            borderTop: '1px solid #ddd' 
          }}>
            <div style={{ display: 'flex', gap: '8px', padding: '0 20px', overflowX: 'auto', maxWidth: '100%' }}>
              {messages.filter(m => m.imageUri || m.audioUri).map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => setEnlargedMediaId(m.id)}
                  style={{ 
                    minWidth: '54px', 
                    height: '54px', 
                    border: enlargedMediaId === m.id ? '3px solid #25d366' : '1px solid #eee',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8f9fa',
                    boxSizing: 'border-box'
                  }}
                >
                  {m.imageUri ? (
                    <img src={getMediaUrl(m.imageUri)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ backgroundColor: '#ffb900', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={micOutline} style={{ color: '#fff', fontSize: '18px' }} />
                      <span style={{ color: '#fff', fontSize: '8px', fontWeight: 'bold' }}>1:14</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </IonModal>

      <IonModal isOpen={stagedMediaList.length > 0} onDidDismiss={() => { setStagedMediaList([]); setStagedCaption(''); }}>
        <IonHeader className="ion-no-border">
          <IonToolbar style={{ '--background': '#f0f2f5' }}>
            <IonButtons slot="start">
              <IonButton color="dark" onClick={() => { setStagedMediaList([]); setStagedCaption(''); }}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
            <IonTitle>Preview ({stagedMediaList.length})</IonTitle>
            <IonButtons slot="end">
               {/* Remove "Add More" for camera flow consistency if desired, but keeping it for general file select. 
                   Actually the user said "i dont need multiple images taking on camera presence", 
                   this might mean they want to skip the tray if only 1 image?
               */}
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent style={{ '--background': '#e9edef' }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
              <img 
                src={stagedMediaList[stagedMediaIndex] ? getMediaUrl(stagedMediaList[stagedMediaIndex]) : ''} 
                style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', objectFit: 'contain' }} 
              />
            </div>
            
            {/* Multi-Selection Tray - Only show if multiple images */}
            {stagedMediaList.length > 1 && (
              <div style={{ height: '100px', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', overflowX: 'auto', borderTop: '1px solid #d1d7db' }}>
                {stagedMediaList.map((uri, idx) => (
                  <div key={idx} style={{ position: 'relative', minWidth: '60px', height: '60px', borderRadius: '4px', border: stagedMediaIndex === idx ? '2px solid #00a884' : 'none' }}>
                    <img 
                      src={getMediaUrl(uri)} 
                      onClick={() => setStagedMediaIndex(idx)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', borderRadius: '4px' }} 
                    />
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newList = stagedMediaList.filter((_, i) => i !== idx);
                        setStagedMediaList(newList);
                        if (stagedMediaIndex >= newList.length) setStagedMediaIndex(Math.max(0, newList.length - 1));
                      }}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ×
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </IonContent>
        <IonFooter className="ion-no-border">
          <IonToolbar style={{ '--background': '#f0f2f5', padding: '8px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <IonTextarea
                value={stagedCaption}
                onIonInput={(e) => setStagedCaption(e.detail.value!)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendStagedMedia();
                  }
                }}
                placeholder="Type a message"
                autoGrow
                rows={1}
                style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '0px 16px', '--padding-top': '10px', '--padding-bottom': '10px', margin: '4px 0' }}
              />
              <IonButton 
                shape="round" 
                color="success" 
                style={{ width: '48px', height: '48px', margin: '4px 0', '--border-radius': '50%' }}
                onClick={sendStagedMedia}
              >
                <IonIcon slot="icon-only" icon={sendOutline} />
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      </IonModal>

      <IonFooter className="ion-no-border">
        <IonToolbar style={{ '--background': '#f0f2f5' }}>
          <div className="chat-footer">
            {isRecording ? (
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '4px 8px', justifyContent: 'space-between' }}>
                <IonButton fill="clear" color="danger" onClick={cancelRecording}>
                  <IonIcon slot="icon-only" icon={trashOutline} />
                </IonButton>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'center' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'red', animation: 'blink 1s infinite' }} />
                  <span style={{ fontSize: '16px', color: '#000', minWidth: '40px' }}>{formatRecordingTime(recordingTime)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '24px', flex: 1, overflow: 'hidden', padding: '0 8px' }}>
                    {realtimeWaveform.map((h, i) => (
                      <div key={i} style={{ 
                        width: '3px', 
                        backgroundColor: '#8696a0',
                        height: `${h}px`,
                        borderRadius: '2px',
                        transition: 'height 0.05s ease'
                      }} />
                    ))}
                  </div>
                </div>
                <IonButton 
                  shape="round" 
                  color="success" 
                  onClick={stopRecording} 
                  style={{ width: '40px', height: '40px', '--border-radius': '50%' }}
                >
                  <IonIcon slot="icon-only" icon={sendOutline} />
                </IonButton>
              </div>
            ) : (
              <>
                <IonButton fill="clear" color="medium" onClick={handleAttachment}>
                  <IonIcon slot="icon-only" icon={addOutline} />
                </IonButton>

                <IonTextarea
                  className="chat-input"
                  value={text}
                  onIonInput={(e) => setText(e.detail.value!)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  placeholder="Type a message"
                  autoGrow
                  rows={1}
                  style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '0px 16px', '--padding-top': '10px', '--padding-bottom': '10px', margin: '4px 8px' }}
                />

                <IonButton fill="clear" color="medium" onClick={handleCamera}>
                  <IonIcon slot="icon-only" icon={cameraOutline} />
                </IonButton>

                {text.trim().length > 0 ? (
                  <IonButton fill="clear" color="success" onClick={handleSendText}>
                    <IonIcon slot="icon-only" icon={sendOutline} />
                  </IonButton>
                ) : (
                  <IonButton fill="clear" color="medium" onClick={toggleRecording}>
                    <IonIcon slot="icon-only" icon={micOutline} />
                  </IonButton>
                )}
              </>
            )}
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
};

export default ChatRoom;
