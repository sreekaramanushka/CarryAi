import type { Message } from '../shared/types';

/**
 * Compresses chat messages to fit within reasonable context token limits.
 * - Always keeps the first few messages (initial project context/setup).
 * - Always keeps the last few messages (immediate goal and recent context).
 * - Compresses/truncates large intermediate messages.
 */
export function compressConversationMessages(messages: Message[], maxTokensApprox: number = 8000): Message[] {
  if (messages.length <= 8) {
    return messages;
  }

  // Calculate approximate characters (1 token ~ 4 characters)
  const maxChars = maxTokensApprox * 4;
  let totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);

  if (totalChars <= maxChars) {
    return messages;
  }

  console.log(`CarryAI: Compressing conversation from ${totalChars} chars to under ${maxChars} chars.`);

  const firstTurnsCount = 3; // Keep initial setup
  const lastTurnsCount = 5;  // Keep recent context

  const firstMessages = messages.slice(0, firstTurnsCount);
  const lastMessages = messages.slice(-lastTurnsCount);
  const middleMessages = messages.slice(firstTurnsCount, -lastTurnsCount);

  // Compress middle messages: truncate them if they are long
  const compressedMiddle = middleMessages.map((msg) => {
    if (msg.content.length > 500) {
      // Truncate message, keeping a snippet of the start and end of it.
      const snippetStart = msg.content.substring(0, 250);
      const snippetEnd = msg.content.substring(msg.content.length - 150);
      return {
        ...msg,
        content: `${snippetStart}\n\n[... Truncated ${msg.content.length - 400} characters of conversation code/logs ...]\n\n${snippetEnd}`
      };
    }
    return msg;
  });

  const merged = [...firstMessages, ...compressedMiddle, ...lastMessages];
  totalChars = merged.reduce((sum, msg) => sum + msg.content.length, 0);

  // If still too long, recursively drop more middle messages
  if (totalChars > maxChars && compressedMiddle.length > 2) {
    // Drop half of the middle messages
    const skippedMiddle: Message[] = [];
    for (let i = 0; i < compressedMiddle.length; i += 2) {
      skippedMiddle.push(compressedMiddle[i]);
    }
    return [...firstMessages, ...skippedMiddle, ...lastMessages];
  }

  return merged;
}
