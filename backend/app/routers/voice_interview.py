"""
WebSocket router for real-time voice interviews.
Handles WebSocket connections and audio streaming.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict
import json
import base64

from app.services.voice_session_manager import create_session, get_session, remove_session


router = APIRouter(tags=["Voice Interview"])


# Track active WebSocket connections
active_connections: Dict[str, WebSocket] = {}


@router.websocket("/ws/voice-interview/{session_id}")
async def voice_interview_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time voice interview.
    
    Client sends:
    - {"type": "audio", "data": "<base64-encoded-audio>"}
    - {"type": "start"}
    - {"type": "end"}
    
    Server sends:
    - {"type": "question", "text": "...", "questionNumber": 1}
    - {"type": "complete", "assessment": {...}}
    - {"type": "error", "message": "..."}
    - {"type": "transcript", "text": "...", "isFinal": true/false}
    """
    
    print(f"[WEBSOCKET] ===== ENDPOINT HIT for session {session_id} =====")
    
    await websocket.accept()
    active_connections[session_id] = websocket
    
    print(f"[WEBSOCKET] Client connected for session {session_id}")
    
    try:
        # Create or get session
        session = get_session(session_id)
        if not session:
            session = create_session(session_id)
        
        # Set up callbacks
        async def on_question_ready(question: str, question_number: int):
            """Send next question to client."""
            await websocket.send_json({
                "type": "question",
                "text": question,
                "questionNumber": question_number
            })
        
        async def on_interview_complete(assessment: dict):
            """Send completion message with assessment."""
            await websocket.send_json({
                "type": "complete",
                "assessment": assessment
            })
        
        async def on_error(error_msg: str):
            """Send error message to client."""
            await websocket.send_json({
                "type": "error",
                "message": error_msg
            })
        
        session.on_question_ready = on_question_ready
        session.on_interview_complete = on_interview_complete
        session.on_error = on_error
        
        # Initialize session and get first question
        try:
            first_question = await session.initialize()
            
            # Send first question
            await websocket.send_json({
                "type": "question",
                "text": first_question,
                "questionNumber": 1
            })
            
            # Start STT streaming
            await session.start_stt()
            
            await websocket.send_json({
                "type": "ready",
                "message": "Voice interview ready. Start speaking."
            })
            
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": f"Failed to initialize: {str(e)}"
            })
            await websocket.close()
            return
        
        # Main message loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive()
                
                if "text" in data:
                    # JSON message
                    message = json.loads(data["text"])
                    message_type = message.get("type")
                    
                    if message_type == "audio":
                        # Audio chunk (base64 encoded)
                        audio_b64 = message.get("data")
                        if audio_b64:
                            audio_bytes = base64.b64decode(audio_b64)
                            print(f"[WEBSOCKET] Received audio chunk: {len(audio_bytes)} bytes")
                            await session.process_audio_chunk(audio_bytes)
                    
                    elif message_type == "end":
                        # Client wants to end interview
                        print(f"[WEBSOCKET] Client requested end for session {session_id}")
                        break
                    
                    elif message_type == "ping":
                        # Keepalive ping
                        await websocket.send_json({"type": "pong"})
                
                elif "bytes" in data:
                    # Raw binary audio data
                    audio_bytes = data["bytes"]
                    await session.process_audio_chunk(audio_bytes)
            
            except WebSocketDisconnect:
                print(f"[WEBSOCKET] Client disconnected: {session_id}")
                break
            
            except Exception as e:
                print(f"[WEBSOCKET ERROR] {str(e)}")
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
    
    except Exception as e:
        print(f"[WEBSOCKET ERROR] Unexpected error: {str(e)}")
    
    finally:
        # Cleanup
        active_connections.pop(session_id, None)
        await remove_session(session_id)
        print(f"[WEBSOCKET] Connection closed for session {session_id}")


@router.get("/voice-interview/status/{session_id}")
async def get_voice_interview_status(session_id: str):
    """Get the status of a voice interview session."""
    session = get_session(session_id)
    
    if not session:
        return {
            "sessionId": session_id,
            "active": False,
            "connected": False
        }
    
    return {
        "sessionId": session_id,
        "active": session.is_active,
        "connected": session_id in active_connections,
        "currentQuestionNumber": session.current_question_number
    }
