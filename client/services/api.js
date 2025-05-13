/**
 * Fetches a session token from the server
 * @returns {Promise<Object>} The token response with client_secret
 */
export const fetchSessionToken = async () => {
  const tokenResponse = await fetch("/token");
  const data = await tokenResponse.json();
  return data;
};

/**
 * Sends an SDP offer to the OpenAI Realtime API
 * @param {string} sdpOffer - The SDP offer to send
 * @param {string} token - The authentication token
 * @param {string} model - The model to use
 * @returns {Promise<string>} The SDP answer text
 */
export const sendSDPOffer = async (sdpOffer, token, model) => {
  const baseUrl = "https://api.openai.com/v1/realtime";
  
  const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
    method: "POST",
    body: sdpOffer,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/sdp",
    },
  });

  return sdpResponse.text();
}; 