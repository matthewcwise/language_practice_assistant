import { useEffect } from "react";
import logo from "/assets/openai-logomark.svg";
import SessionControls from "../components/SessionControls";
import ToolPanel from "../components/ToolPanel";
import useWebRTC from "../hooks/useWebRTC";
import useDataChannel from "../hooks/useDataChannel";

export default function LanguagePracticePage() {
  const {
    dataChannel,
    isSessionActive,
    startSession,
    stopSession,
    setIsSessionActive
  } = useWebRTC();
  
  const {
    events,
    sendClientEvent,
    currentLanguage
  } = useDataChannel(dataChannel, setIsSessionActive);

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
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto border-l border-gray-200 bg-white shadow-lg">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            events={events}
            isSessionActive={isSessionActive}
            currentLanguage={currentLanguage}
          />
        </section>
      </main>
    </>
  );
} 