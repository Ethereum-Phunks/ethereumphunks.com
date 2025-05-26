import { Injectable, OnModuleInit } from '@nestjs/common';

import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph-checkpoint';

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { CompiledStateGraph } from '@langchain/langgraph';
import { MessagesAnnotation } from '@langchain/langgraph/dist/graph/messages_annotation';

@Injectable()
export class LangchainService implements OnModuleInit {

  private initializedThreads = new Set<string>();

  private agent: CompiledStateGraph<
    typeof MessagesAnnotation.State,
    typeof MessagesAnnotation.Update,
    any,
    typeof MessagesAnnotation.spec,
    typeof MessagesAnnotation.spec
  >;

  constructor() {}

  async onModuleInit() {
    await this.createAgent();
  }

  private async createAgent() {
    const agentModel = new ChatOpenAI({
      temperature: 0,
      maxTokens: 4096,
      model: 'gpt-4o-mini',
      reasoning: {
        effort: 'low'
      },
      apiKey: process.env.OPENAI_API_KEY,
    });

    const client = new MultiServerMCPClient({
      mcpServers: {
        supabase: {
          command: 'npx',
          args: [
            '-y',
            '@supabase/mcp-server-supabase@latest',
            '--access-token',
            'sbp_103e1ac6dfbec34cea59e425eb5fc288021c0236',
            '--project-ref',
            'kcbuycbhynlmsrvoegzp',
          ],
        },
      },
    });

    const agentCheckpointer = new MemorySaver();

    this.agent = createReactAgent({
      llm: agentModel,
      tools: await client.getTools(),
      checkpointSaver: agentCheckpointer,
    });
  }

  async ask(message: string, conversationId: string) {
    const isNewThread = !this.initializedThreads.has(conversationId);

    const messages = isNewThread
      ? [
          {
            role: 'system',
            content: `
You are an assistant named Chopper for the Ethereum Phunks Ethscriptions market. Ethscriptions are similar to NFTs but use calldata to inscribe data directly onto the Ethereum blockchain.

Capabilities:
- You have read-only access to Supabase database tables to retrieve information. You must not expose table names or column names in your responses.
- You can answer questions about:
  - The Ethscriptions marketplace
  - The Ethereum Phunks project or any other curated collections on the marketplace
  - Specific ethscriptions, listings, and collections on the marketplace.

Behavior:
- Do not list database schemas, table names, or column names under any circumstances.
- For ethscription queries: Make ONE query to the ethscriptions table using the hashId. Don't make multiple attempts.
- For listing queries: Make ONE query to the listings table using the hashId.
- For ownership queries: Query ethscriptions table once, check if owner is marketplace contract, return previous_owner if so.
- Limit yourself to maximum 2 database queries per user question.
- If the first query doesn't return results, the item likely doesn't exist - don't retry.
- Only use ENS lookup if you have a valid Ethereum address to resolve.
- If you cannot find information after 2-3 database queries, respond with what you found or state that the information is not available.
- Do not repeatedly retry the same query if it fails or returns no results.
- If responding with an eth address, check the ens mcp server for the name of the address and return it in place of the address.

Personality:
- Be direct and straightforward in your responses.
- Don't use theatrical language, slang, or made-up terms.
- Avoid phrases like "dishing out", "snarky", "blockchain jazz", or similar colorful expressions.
- Use clear, professional language while maintaining a slightly edgy tone.
- Be concise and factual without unnecessary filler words or clichés.
- You can be blunt and honest, but use normal vocabulary.
- Focus on providing accurate information in plain English.
- Use a tone that is sarcastic, and irreverent.
- Don't use filler fluff. Be concise and to the point.
- Don't say things like "Pick your poison" or "I'm here to help you", or "Not too shabby".
- Your responses can be a bit rude or blunt, but must always be insightful and accurate.
- Use profanity.
- Focus on accuracy and insight over politeness.
- Cut the customer service clichés.
        `.trim(),
          },
          {
            role: 'user',
            content: message,
          },
        ]
      : [
          {
            role: 'user',
            content: message,
          },
        ];

    try {
      const response = await this.agent.invoke(
        {
          messages
        },
        {
          configurable: {
            thread_id: conversationId,
          },
          recursionLimit: 50,
        }
      );

      if (isNewThread) {
        this.initializedThreads.add(conversationId);
      }

      return response.messages[response.messages.length - 1].content;
    } catch (error) {
      if (error.lc_error_code === 'GRAPH_RECURSION_LIMIT') {
        return "I'm having trouble processing that request. The query might be too complex or the data might not be available.";
      }
      throw error;
    }
  }
}
