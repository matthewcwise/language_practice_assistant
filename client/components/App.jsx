import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

// Set to false to reduce console log verbosity
const DEBUG = false;

// Helper function for conditional logging
const log = (message, ...args) => {
  if (DEBUG) console.log(message, ...args);
};

// Only log important events regardless of debug mode
const logImportant = (message, ...args) => {
  console.log(message, ...args);
};

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    logImportant("Starting language practice session...");
    
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
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

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    
    log(`Sending SDP offer to Realtime API (model: ${model})`);
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    
    log("Received SDP answer, setting remote description");
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
    logImportant("WebRTC connection established");
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
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
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      log(`Sending client event:`, { type: message.type, id: message.event_id });
      
      // Log important message details
      if (message.type === "response.create" && message.response && message.response.instructions) {
        logImportant("Sending instructions to model:", message.response.instructions);
      }
      
      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    logImportant(`User message: "${message}"`);
    
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      log("Setting up data channel event listeners");
      
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        // Only log important events or if in debug mode
        if (DEBUG) {
          log(`Server event: ${event.type}`);
        } else if (
          event.type === "session.created" || 
          event.type === "response.done" ||
          (event.type === "response.content_part.added" && event.response?.content)
        ) {
          log(`Server event: ${event.type}`);
        }
        
        // Always log actual speech content
        if (event.type === "response.audio_transcript.delta" && event.text) {
          logImportant(`Model speech: "${event.text}"`);
        }

        setEvents((prev) => [event, ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        logImportant("Session is now active");
        setIsSessionActive(true);
        setEvents([]);
      });
      
      // Handle errors
      dataChannel.addEventListener("error", (error) => {
        console.error("Data channel error:", error);
      });
      
      // Handle close events
      dataChannel.addEventListener("close", () => {
        log("Data channel closed");
      });
    }
  }, [dataChannel]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-blue-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1 className="text-white font-bold">Language Practice Assistant</h1>
          <div className="ml-auto flex gap-2">
            <span className="text-white">🇺🇸</span>
            <span className="text-white">🇪🇸</span>
            <span className="text-white">🇨🇳</span>
          </div>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0 bg-gray-50">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex flex-col justify-end">
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4 bg-white border-t border-gray-200">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto border-l border-gray-200 bg-white shadow-lg">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
          />
        </section>
      </main>
    </>
  );
}
