const xaiApiKey = import.meta.env.VITE_XAI_API_KEY
const xaiChatModel = import.meta.env.VITE_XAI_CHAT_MODEL || 'grok-4.3'
const xaiVisionModel = import.meta.env.VITE_XAI_VISION_MODEL || 'grok-4'

const sceneFallback = 'Grok did not return a scene description. Please capture the image again and ask me to describe it.'
const textFallback = 'Grok did not return readable text. Please capture the sign again with better lighting.'

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function generateXaiChat(messages, modelName = xaiChatModel) {
  if (!xaiApiKey) {
    throw new Error('Grok API key is missing. Add VITE_XAI_API_KEY to .env.local and restart the dev server.')
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${xaiApiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      stream: false,
      temperature: 0.35,
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Grok request failed: ${details || response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function generateVisionResponse(file, prompt, fallbackText) {
  if (!file) {
    throw new Error('Please upload or capture an image first.')
  }

  const dataUrl = await fileToDataUrl(file)
  const text = await generateXaiChat(
    [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
    xaiVisionModel,
  )

  return { text: text || fallbackText, mode: 'grok' }
}

export function describeScene(file) {
  return generateVisionResponse(
    file,
    'You are an accessibility assistant for a blind user. Describe this scene clearly and briefly. Focus on obstacles, people, vehicles, signs, hazards, and important surroundings. Keep response under 60 words.',
    sceneFallback,
  )
}

export async function describeSurroundingsMulti(files) {
  if (!files || !files.length) {
    throw new Error('No images captured for analysis.')
  }

  const contents = await Promise.all(
    files.map(async (file) => {
      const dataUrl = await fileToDataUrl(file)
      return {
        type: 'image_url',
        image_url: { url: dataUrl, detail: 'low' },
      }
    }),
  )

  contents.push({
    type: 'text',
    text: 'You are an accessibility assistant for a blind user. These images were captured sequentially as the user moved their camera to scan the surroundings. Synthesize these views into one clear, smart description of what is in front of and around them. Focus on people, obstacles, path clarity, and hazards. Keep response under 85 words.',
  })

  const text = await generateXaiChat(
    [
      {
        role: 'user',
        content: contents,
      },
    ],
    xaiVisionModel,
  )

  return { text: text || sceneFallback, mode: 'grok' }
}

export function readVisibleText(file) {
  return generateVisionResponse(
    file,
    'Read all visible text from this image. If it is a sign or notice, explain it simply for a blind user.',
    textFallback,
  )
}

export async function askVoiceAssistant(message, context = {}) {
  const systemPrompt = `You are Drishti, a calm AI voice accessibility assistant for blind users using a browser website.
Answer naturally, briefly, and helpfully.
If the user asks for emergency help, tell them you are activating SOS.
If they ask for navigation, describe what Drishti can do and guide them to speak a destination.
Do not claim you sent real email unless an app action reports it.
Prioritize accessibility, safety, and clear spoken instructions.
Keep answers under 55 words unless safety needs one extra sentence.

User profile: ${context.profileName || 'demo user'}
Guardian configured: ${context.guardianEmail ? 'yes' : 'no'}`

  const text = await generateXaiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ])

  return { text: text || 'I am listening. Please say that again clearly.', mode: 'grok' }
}

export async function planAgentAction(message, context = {}) {
  const systemPrompt = `You are the action planner for Drishti, a voice-only accessibility web app for blind users.
Return only compact JSON. No markdown.

Available actions:
- answer: smart spoken answer only
- open_camera: open webcam on AI vision page
- close_camera: close/stop the webcam camera
- capture_photo: capture current webcam frame
- analyze_surrounding: automatically open camera, capture, and describe what is in front of the user (people, obstacles, etc.)
- describe_scene: run scene description
- read_text: run text/sign reader
- open_navigation: open navigation page
- guide_me: start live GPS turn-by-turn navigation to a destination. Extract destination into "destination" field.
- where_am_i: open location page and read current location
- stop_navigation: stop live navigation
- sos: send emergency guardian email immediately
- email_guardian_start: ask user what message to send to guardian
- email_guardian_send: send the provided message to guardian
- open_settings: open settings
- stop: stop speaking/listening

Rules:
- If user says SOS, emergency, help me, or urgent danger, choose sos.
- If user says stop camera, close camera, or turn off camera, choose close_camera.
- If user says "analyze surroundings", "what is in front of me", "describe my surroundings", or "check surrounding", choose analyze_surrounding.
- If user says "guide me to [place]", "take me to [place]", "navigate to [place]", or "directions to [place]", choose guide_me and extract the destination.
- If user says "stop navigation" or "stop guiding", choose stop_navigation.
- If user says email/message/mail my guardian but gives no message, choose email_guardian_start.
- If user says send email or send a mail without specifying a recipient, choose email_guardian_start (guardian is the default recipient).
- If user says email/message/mail my guardian and includes a message, choose email_guardian_send and extract message.
- If context.pendingEmail is true, treat the entire utterance as the email message body and choose email_guardian_send.
- If user asks general questions, choose answer.
- Use concise spokenResponse suitable for text-to-speech.
- If user says stop, shut up, cancel, or be quiet, choose stop.

Return schema:
{"action":"...", "message":"", "destination":"", "spokenResponse":"..."}

User profile: ${context.profileName || 'demo user'}
Guardian configured: ${context.guardianEmail ? 'yes' : 'no'}
pendingEmail: ${context.pendingEmail ? 'true' : 'false'}`

  const text = await generateXaiChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ])

  try {
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim())
  } catch {
    return {
      action: 'answer',
      spokenResponse: text || 'I heard you, but I could not decide the action. Please say it again.',
    }
  }
}
