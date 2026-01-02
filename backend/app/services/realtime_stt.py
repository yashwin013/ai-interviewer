"""
Real-time Speech-to-Text service using Deepgram or AssemblyAI streaming APIs.
Handles audio streaming and returns transcriptions in real-time.
"""

import asyncio
import json
from typing import Optional, Callable, AsyncIterator
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)
from app.config import settings


class RealtimeSTTService:
    """Service for real-time speech-to-text transcription."""
    
    def __init__(self):
        self.provider = settings.STT_PROVIDER
        self.deepgram_client = None
        self.connection = None
        
        if self.provider == "deepgram":
            if not settings.DEEPGRAM_API_KEY:
                raise ValueError("DEEPGRAM_API_KEY not configured in .env")
            
            config = DeepgramClientOptions(
                options={"keepalive": "true"}
            )
            self.deepgram_client = DeepgramClient(settings.DEEPGRAM_API_KEY, config)
        
        elif self.provider == "assemblyai":
            if not settings.ASSEMBLYAI_API_KEY:
                raise ValueError("ASSEMBLYAI_API_KEY not configured in .env")
            # AssemblyAI implementation would go here
            raise NotImplementedError("AssemblyAI streaming not yet implemented")
        
        else:
            raise ValueError(f"Unknown STT provider: {self.provider}")
    
    async def start_streaming(
        self,
        on_transcript: Callable[[str, bool, bool], None],
        on_error: Optional[Callable[[str], None]] = None
    ):
        """
        Start streaming STT session.
        
        Args:
            on_transcript: Callback for transcription results (text, is_final, speech_final)
            on_error: Optional callback for errors
        """
        if self.provider == "deepgram":
            await self._start_deepgram_streaming(on_transcript, on_error)
    
    async def _start_deepgram_streaming(
        self,
        on_transcript: Callable[[str, bool, bool], None],
        on_error: Optional[Callable[[str], None]] = None
    ):
        """Start Deepgram streaming connection."""
        try:
            # Configure Deepgram options
            options = LiveOptions(
                model="nova-2-conversationalai",  # Optimized for voice interviews and conversations
                language="en-US",
                smart_format=True,
                interim_results=True,
                utterance_end_ms="2000",  # Wait 2 seconds of silence (reduced from 3s for faster response)
                vad_events=True,
                encoding="linear16",
                sample_rate=16000,
                channels=1
            )
            
            print("[STT] Deepgram configured with 3-second utterance detection")
            
            # Create connection
            self.connection = self.deepgram_client.listen.asyncwebsocket.v("1")
            
            # Set up event handlers
            async def on_message(self_inner, result, **kwargs):
                try:
                    sentence = result.channel.alternatives[0].transcript
                    
                    if len(sentence) == 0:
                        return
                    
                    is_final = result.is_final
                    speech_final = result.speech_final  # True when speech segment ends
                    
                    print(f"[STT] {'FINAL' if is_final else 'INTERIM'} (speech_final={speech_final}): {sentence}")
                    
                    # Call the callback with speech_final info
                    if on_transcript:
                        try:
                            # Pass is_final and speech_final to properly detect when speech ends
                            await on_transcript(sentence, is_final, speech_final)
                            print(f"[STT] Callback executed successfully")
                        except Exception as callback_error:
                            print(f"[STT ERROR] Callback failed: {str(callback_error)}")
                            import traceback
                            traceback.print_exc()
                except Exception as e:
                    print(f"[STT ERROR] on_message failed: {str(e)}")
                    import traceback
                    traceback.print_exc()
            
            async def on_metadata(self_inner, metadata, **kwargs):
                try:
                    print(f"[STT] Metadata: {metadata}")
                except Exception as e:
                    print(f"[STT ERROR] on_metadata failed: {str(e)}")
            
            async def on_speech_started(self_inner, speech_started, **kwargs):
                try:
                    print("[STT] Speech started")
                except Exception as e:
                    print(f"[STT ERROR] on_speech_started failed: {str(e)}")
            
            async def on_utterance_end(self_inner, utterance_end, **kwargs):
                try:
                    print("[STT] Utterance ended")
                except Exception as e:
                    print(f"[STT ERROR] on_utterance_end failed: {str(e)}")
            
            async def on_error_event(self_inner, error, **kwargs):
                try:
                    print(f"[STT ERROR] Deepgram error: {error}")
                    if on_error:
                        await on_error(str(error))
                except Exception as e:
                    print(f"[STT ERROR] on_error_event failed: {str(e)}")
            
            async def on_close(self_inner, close, **kwargs):
                try:
                    print("[STT] Connection closed")
                except Exception as e:
                    print(f"[STT ERROR] on_close failed: {str(e)}")
            
            # Register event handlers
            self.connection.on(LiveTranscriptionEvents.Transcript, on_message)
            self.connection.on(LiveTranscriptionEvents.Metadata, on_metadata)
            self.connection.on(LiveTranscriptionEvents.SpeechStarted, on_speech_started)
            self.connection.on(LiveTranscriptionEvents.UtteranceEnd, on_utterance_end)
            self.connection.on(LiveTranscriptionEvents.Error, on_error_event)
            self.connection.on(LiveTranscriptionEvents.Close, on_close)
            
            # Start connection
            if await self.connection.start(options):
                print("[STT] Successfully connected to Deepgram")
            else:
                raise Exception("Failed to connect to Deepgram")
                
        except Exception as e:
            print(f"[STT ERROR] Failed to start Deepgram streaming: {str(e)}")
            import traceback
            traceback.print_exc()
            if on_error:
                await on_error(str(e))
            raise
    
    async def send_audio(self, audio_data: bytes):
        """Send audio data to the STT service."""
        if not self.connection:
            raise Exception("STT connection not established")
        
        try:
            await self.connection.send(audio_data)
        except Exception as e:
            print(f"[STT ERROR] Failed to send audio: {str(e)}")
            raise
    
    async def stop(self):
        """Stop the STT service and close connection."""
        if self.connection:
            try:
                await self.connection.finish()
                print("[STT] Connection closed successfully")
            except Exception as e:
                print(f"[STT ERROR] Error closing connection: {str(e)}")
            finally:
                self.connection = None
    
    def is_connected(self) -> bool:
        """Check if STT service is connected."""
        return self.connection is not None
