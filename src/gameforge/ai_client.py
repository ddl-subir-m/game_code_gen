from dataclasses import dataclass
from typing import List, AsyncIterator, Optional, AsyncGenerator
import anthropic
import asyncio
import json
from .parser import GameForgeParser
from .executor import GameForgeExecutor
import re

@dataclass
class Message:
    role: str  # 'user' or 'assistant'
    content: str

class GameForgeAI:
    def __init__(self, api_key: str, system_prompt: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.system_prompt = system_prompt

    async def close(self):
        """Close the AI client and cleanup resources"""
        if hasattr(self.client, 'close'):
            await self.client.close()

    async def chat(self, messages: List[Message]) -> str:
        """Get complete chat response from the AI"""
        try:
            formatted_messages = [
                {"role": msg.role, "content": msg.content}
                for msg in messages
            ]

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                system=self.system_prompt,
                messages=formatted_messages,
                temperature=0.2,
                top_p=0.2
            )
            
            return response.content[0].text
        except Exception as e:
            print(f"Error in chat: {e}")
            raise

class GameForgeChat:
    def __init__(self, ai: GameForgeAI, parser: GameForgeParser, executor: GameForgeExecutor):
        self.ai = ai
        self.parser = parser
        self.executor = executor
        self.message_history: List[Message] = []

    async def send_message(self, user_message: str) -> str:
        """Send a message and get complete response"""
        self.message_history.append(Message(role="user", content=user_message))
        
        response = await self.ai.chat(self.message_history)
        
        # Check for truncation by looking for unclosed tags or incomplete code blocks
        if self._is_truncated(response):
            # Add continue prompt and get the rest
            continue_response = await self.ai.chat([
                *self.message_history,
                Message(role="assistant", content=response),
                Message(role="user", content="Continue your prior response. IMPORTANT: Immediately begin from where you left off without any interruptions. Do not repeat any content, including artifact and action tags.")
            ])
            response = response + continue_response

        # Parse and execute actions from the complete response
        parsed_response = self.parser.parse(
            message_id=str(len(self.message_history)),
            input_text=response
        )
        
        # Execute any actions from the parsed response
        if parsed_response.actions:
            for action in parsed_response.actions:
                self.executor.execute_action(action)
        
        self.message_history.append(Message(role="assistant", content=response))
        return response

    def _is_truncated(self, response: str) -> bool:
        """Check if response appears to be truncated"""
        # Check for unmatched forge tags
        opening_tags = len(re.findall(r'<forge\w+[^>]*>', response))
        closing_tags = len(re.findall(r'</forge\w+>', response))
        if opening_tags != closing_tags:
            return True

        # Check for unmatched code blocks
        backticks = response.count('```')
        if backticks % 2 != 0:
            return True

        # Check if ends mid-sentence
        if response.rstrip()[-1] not in '.!?}"\'':
            return True

        return False