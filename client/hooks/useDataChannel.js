import { useState, useEffect } from 'react';
import { log, logImportant } from '../services/logger';

export default function useDataChannel(dataChannel, setIsSessionActive) {
  const [events, setEvents] = useState([]);

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
        if (event.type === "session.created" || 
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
  }, [dataChannel, setIsSessionActive]);

  // Send a message to the model
  const sendClientEvent = (message) => {
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
  };

  return {
    events,
    sendClientEvent
  };
} 