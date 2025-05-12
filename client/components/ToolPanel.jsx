import { useEffect, useState } from "react";

// Languages and difficulty levels available
const LANGUAGES = [
  { id: "English", label: "English", flag: "🇺🇸" },
  { id: "Spanish", label: "Spanish", flag: "🇪🇸" },
  { id: "Chinese", label: "Chinese", flag: "🇨🇳" }
];

const LEVELS = [
  { id: "Beginner", label: "Beginner" },
  { id: "Intermediate", label: "Intermediate" },
  { id: "Advanced", label: "Advanced" }
];

const functionDescription = `
Call this function when a user asks for a color palette.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_color_palette",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            theme: {
              type: "string",
              description: "Description of the theme for the color scheme.",
            },
            colors: {
              type: "array",
              description: "Array of five hex color codes based on the theme.",
              items: {
                type: "string",
                description: "Hex color code",
              },
            },
          },
          required: ["theme", "colors"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { theme, colors } = JSON.parse(functionCallOutput.arguments);

  const colorBoxes = colors.map((color) => (
    <div
      key={color}
      className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
        {color}
      </p>
    </div>
  ));

  return (
    <div className="flex flex-col gap-2">
      <p>Theme: {theme}</p>
      {colorBoxes}
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [selectedLevel, setSelectedLevel] = useState(LEVELS[0]);
  const [settingsApplied, setSettingsApplied] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  // Apply language settings to the model
  const applyLanguageSettings = () => {
    if (!isSessionActive) return;
    
    console.log(`===== LANGUAGE SETTINGS =====`);
    console.log(`Language: ${selectedLanguage.id} (${selectedLanguage.label})`);
    console.log(`Level: ${selectedLevel.id}`);
    
    // Create instructions for the model
    const instructions = `
      You are a language tutor helping the user practice ${selectedLanguage.id} at ${selectedLevel.id} level.
      You should ONLY speak in ${selectedLanguage.id}.
      
      For ${selectedLevel.id} level:
      ${selectedLevel.id === "Beginner" ? "Use simple vocabulary and basic sentence structures. Speak slowly and clearly. Correct basic mistakes gently." : ""}
      ${selectedLevel.id === "Intermediate" ? "Use moderate vocabulary and varied sentences. Introduce some idioms and expressions. Correct errors when they hinder understanding." : ""}
      ${selectedLevel.id === "Advanced" ? "Use advanced vocabulary, complex sentences, idioms, and cultural references. Correct subtle errors and discuss nuances of language." : ""}
      
      Start by introducing yourself as a ${selectedLanguage.id} language tutor and suggest a topic to discuss in ${selectedLanguage.id}.
    `;
    
    console.log(`Instructions being sent to model:`);
    console.log(instructions);
    
    // Send the instruction to the model
    sendClientEvent({
      type: "response.create",
      response: {
        instructions: instructions,
      },
    });
    
    setSettingsApplied(true);
  };

  // Reset settings when session ends
  useEffect(() => {
    if (!isSessionActive) {
      setSettingsApplied(false);
    }
  }, [isSessionActive]);

  // When language or level changes, reset the applied status
  useEffect(() => {
    if (settingsApplied) {
      setSettingsApplied(false);
    }
  }, [selectedLanguage, selectedLevel]);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "display_color_palette"
        ) {
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                ask for feedback about the color palette - don't repeat 
                the colors, just ask if they like the colors.
              `,
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  // Log events for debugging
  useEffect(() => {
    if (!events || events.length === 0) return;
    
    const mostRecentEvent = events[0];
    
    // Log when we receive responses from the model
    if (mostRecentEvent && (mostRecentEvent.type === "response.chunk" || mostRecentEvent.type === "response.done")) {
      console.log(`Received model response [${mostRecentEvent.type}]`);
      if (mostRecentEvent.response && mostRecentEvent.response.output) {
        console.log(`Model output:`, mostRecentEvent.response.output);
      }
    }
  }, [events]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold mb-4">Language Practice Settings</h2>
        
        {/* Language Selection */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Select Language:</h3>
          <div className="flex flex-col gap-2">
            {LANGUAGES.map(language => (
              <div 
                key={language.id}
                className={`p-3 rounded-md cursor-pointer flex items-center ${
                  selectedLanguage.id === language.id 
                    ? "bg-blue-100 border border-blue-400" 
                    : "bg-white border border-gray-200 hover:bg-gray-100"
                }`}
                onClick={() => {
                  console.log(`Language selected: ${language.id}`);
                  setSelectedLanguage(language);
                }}
              >
                <span className="mr-2 text-xl">{language.flag}</span>
                <span>{language.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Difficulty Selection */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Select Difficulty:</h3>
          <div className="flex flex-col gap-2">
            {LEVELS.map(level => (
              <div 
                key={level.id}
                className={`p-3 rounded-md cursor-pointer ${
                  selectedLevel.id === level.id 
                    ? "bg-blue-100 border border-blue-400" 
                    : "bg-white border border-gray-200 hover:bg-gray-100"
                }`}
                onClick={() => {
                  console.log(`Level selected: ${level.id}`);
                  setSelectedLevel(level);
                }}
              >
                {level.label}
              </div>
            ))}
          </div>
        </div>
        
        {/* Apply Settings Button */}
        <div className="mt-4">
          <button
            onClick={applyLanguageSettings}
            disabled={!isSessionActive || settingsApplied}
            className={`w-full py-2 px-4 rounded-md ${
              !isSessionActive 
                ? "bg-gray-300 cursor-not-allowed" 
                : settingsApplied 
                  ? "bg-green-500 text-white" 
                  : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {!isSessionActive 
              ? "Start session first" 
              : settingsApplied 
                ? "Settings Applied" 
                : "Apply Language Settings"}
          </button>
        </div>
        
        {/* Current Settings Display */}
        {settingsApplied && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm font-medium">Currently practicing:</p>
            <div className="flex items-center mt-2">
              <span className="text-xl mr-2">{selectedLanguage.flag}</span>
              <span className="font-bold">{selectedLanguage.id}</span>
              <span className="mx-2">•</span>
              <span>{selectedLevel.id} level</span>
            </div>
          </div>
        )}
        
        {!isSessionActive && (
          <p className="text-sm text-gray-500 mt-4">Start the session to begin practicing languages.</p>
        )}
      </div>
    </section>
  );
}
