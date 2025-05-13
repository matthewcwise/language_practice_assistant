import { useRef, useState } from 'react';
import { log, logImportant } from '../services/logger';
import { fetchSessionToken, sendSDPOffer } from '../services/api';

export default function useWebRTC() {
  const [dataChannel, setDataChannel] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  // Start WebRTC session
  const startSession = async () => {
    logImportant("Starting language practice session...");
    
    // Get a session token for OpenAI Realtime API
    const data = await fetchSessionToken();
    const EPHEMERAL_KEY = data.client_secret.value;
    
    log("Session token obtained");

    // Create a peer connection
    const pc = new RTCPeerConnection();
    log("WebRTC peer connection created");

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => {
      log("Audio track received from model");
      audioElement.current.srcObject = e.streams[0];
    };

    // Add local audio track for microphone input in the browser
    try {
      log("Requesting microphone access...");
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      log("Microphone access granted");
      pc.addTrack(ms.getTracks()[0]);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }

    // Set up data channel for sending and receiving events
    log("Creating data channel for events");
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    log("Creating WebRTC offer");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const model = "gpt-4o-realtime-preview-2024-12-17";
    
    log(`Sending SDP offer to Realtime API (model: ${model})`);
    const sdpAnswerText = await sendSDPOffer(offer.sdp, EPHEMERAL_KEY, model);

    const answer = {
      type: "answer",
      sdp: sdpAnswerText,
    };
    
    log("Received SDP answer, setting remote description");
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
    logImportant("WebRTC connection established");
  };

  // Stop current session, clean up peer connection and data channel
  const stopSession = () => {
    logImportant("Stopping session...");
    
    if (dataChannel) {
      log("Closing data channel");
      dataChannel.close();
    }

    if (peerConnection.current) {
      log("Stopping all tracks");
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      
      log("Closing peer connection");
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    logImportant("Session stopped");
  };

  return {
    dataChannel,
    isSessionActive,
    startSession,
    stopSession,
    setIsSessionActive
  };
} 