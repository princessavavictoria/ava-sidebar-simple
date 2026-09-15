// Configuration par défaut
const DEFAULT_MODEL = 'anthropic/claude-3-haiku';
const DEFAULT_PROMPT = `Tu es Ava, une assistante IA amicale et professionnelle.

Règles importantes :
- Réponds toujours en français sauf si on te demande autrement
- Sois concise mais complète
- Reste professionnelle et respectueuse
- Si tu ne sais pas quelque chose, dis-le honnêtement

Commence la conversation de manière naturelle.`;

// Éléments DOM
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const configBtn = document.getElementById('configBtn');
const errorMsg = document.getElementById('errorMsg');

// Charger la configuration au démarrage
async function loadConfig() {
  const result = await chrome.storage.local.get(['apiKey', 'model']);
  return {
    apiKey: result.apiKey || '',
    model: result.model || DEFAULT_MODEL
  };
}

// Sauvegarder la configuration
async function saveConfig(apiKey, model) {
  await chrome.storage.local.set({ apiKey, model });
}

// Ajouter un message au chat
function addMessage(text, isUser) {
  const div = document.createElement('div');
  div.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
  div.textContent = text;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Envoyer un message à OpenRouter
async function sendMessageToAPI(message, apiKey, model) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'Ava Sidebar'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: DEFAULT_PROMPT },
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur API (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Gérer l'envoi du message
async function handleSend() {
  const message = userInput.value.trim();
  if (!message) return;

  // Charger la config
  const config = await loadConfig();
  
  // Vérifier si la clé API est configurée
  if (!config.apiKey) {
    errorMsg.textContent = '⚠️ Configure ta clé API d\'abord (bouton ⚙️)';
    return;
  }

  // Afficher le message utilisateur
  addMessage(message, true);
  userInput.value = '';
  errorMsg.textContent = '';
  sendBtn.disabled = true;
  sendBtn.textContent = 'Envoi en cours...';

  try {
    // Appeler l'API
    const reply = await sendMessageToAPI(message, config.apiKey, config.model);
    addMessage(reply, false);
  } catch (error) {
    console.error('Erreur:', error);
    errorMsg.textContent = `❌ Erreur: ${error.message}`;
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Envoyer';
  }
}

// Ouvrir la configuration
async function openConfig() {
  const config = await loadConfig();
  
  const apiKey = prompt('Entre ta clé API OpenRouter (commence par sk-or-v1-):', config.apiKey);
  if (apiKey === null) return; // Annulé
  
  const model = prompt('Modèle (ex: anthropic/claude-3-haiku):', config.model);
  if (model === null) return; // Annulé
  
  if (apiKey && model) {
    await saveConfig(apiKey, model);
    alert('✅ Configuration sauvegardée !');
    errorMsg.textContent = '';
  }
}

// Event listeners
sendBtn.addEventListener('click', handleSend);
configBtn.addEventListener('click', openConfig);

// Envoyer avec Ctrl+Enter
userInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    handleSend();
  }
});