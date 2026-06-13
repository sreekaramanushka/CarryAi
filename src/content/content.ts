import { parseConversation } from './parser';
import type { ExtensionMessage } from '../shared/types';

// Observer instance
let mutationObserver: MutationObserver | null = null;
let debounceTimeout: number | null = null;

// Target input selectors by platform
const INPUT_SELECTORS = [
  '#prompt-textarea', // ChatGPT
  'div[contenteditable="true"]', // Claude & Gemini
  'div[role="textbox"]', // Gemini & custom LLMs
  '#chat-textarea', // Open WebUI
  'textarea', // Perplexity, DeepSeek, Poe, generic fallback
  '[data-testid="chat-input"]',
  '[placeholder*="Ask"]',
  '[placeholder*="message"]'
];

/**
 * Focuses and injects text into the active chat input field
 */
function injectTextIntoInput(text: string): boolean {
  let targetInput: HTMLElement | null = null;

  // Find the first matching visible input element
  for (const selector of INPUT_SELECTORS) {
    const el = document.querySelector(selector) as HTMLElement;
    if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
      targetInput = el;
      break;
    }
  }

  if (!targetInput) {
    console.error('CarryAI: Could not find chat input field.');
    return false;
  }

  try {
    targetInput.focus();

    // Use document.execCommand('insertText') which simulates typing and updates React/Vue virtual DOMs natively.
    // It's the most robust method for modern web frameworks.
    const isTextarea = targetInput.tagName.toLowerCase() === 'textarea' || targetInput.tagName.toLowerCase() === 'input';
    
    // Select any existing text to replace it (or just place cursor)
    if (isTextarea) {
      const ta = targetInput as HTMLTextAreaElement;
      ta.select();
    } else {
      // Contenteditable selection clear and focus
      const range = document.createRange();
      range.selectNodeContents(targetInput);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    // Execute insertion
    const success = document.execCommand('insertText', false, text);
    
    if (success) {
      // Dispatch input events just in case
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('CarryAI: Context injected via execCommand.');
      return true;
    }

    // Fallback: Direct value modification
    if (isTextarea) {
      (targetInput as HTMLTextAreaElement).value = text;
    } else {
      targetInput.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    }

    // Explicitly dispatch events to trigger event listeners
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('CarryAI: Context injected via fallback value modification.');
    return true;
  } catch (error) {
    console.error('CarryAI: Failed to inject text:', error);
    return false;
  }
}

/**
 * Scrapes page and broadcasts the update to the extension sidepanel
 */
function sendLiveUpdate() {
  try {
    const conversation = parseConversation(window.location.href, document);
    if (conversation.messages.length > 0) {
      chrome.runtime.sendMessage({
        type: 'LIVE_UPDATE',
        payload: conversation
      });
    }
  } catch (err) {
    console.error('CarryAI: Scraper live update error', err);
  }
}

/**
 * Handles communication from sidepanel
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'SCRAPE_CURRENT_PAGE') {
    try {
      const conversation = parseConversation(window.location.href, document);
      sendResponse({ type: 'SCRAPE_RESPONSE', payload: conversation });
    } catch (error: any) {
      sendResponse({ type: 'SCRAPE_ERROR', payload: { error: error.message } });
    }
    return true; // Keep channel open
  }

  if (message.type === 'INJECT_CAPSULE') {
    const success = injectTextIntoInput(message.payload.prompt);
    sendResponse({ type: 'INJECT_RESPONSE', payload: { success } });
    return true;
  }

  if (message.type === 'START_LIVE_OBSERVER') {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    console.log('CarryAI: Starting conversation live observer.');
    
    // Create a MutationObserver to listen to new chat bubble insertions
    mutationObserver = new MutationObserver(() => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      // Debounce updates by 500ms to avoid locking thread during typing or fast streaming outputs
      debounceTimeout = window.setTimeout(() => {
        sendLiveUpdate();
      }, 500);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Send initial update immediately
    sendLiveUpdate();
    sendResponse({ type: 'LIVE_UPDATE', payload: parseConversation(window.location.href, document) });
    return true;
  }

  if (message.type === 'STOP_LIVE_OBSERVER') {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
      console.log('CarryAI: Live observer stopped.');
    }
    sendResponse({ success: true });
    return true;
  }
});
