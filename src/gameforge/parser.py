from dataclasses import dataclass
from enum import Enum
from typing import Optional, List, Dict, Callable
import re
import logging

logger = logging.getLogger(__name__)

class ActionType(Enum):
    FILE = "file"
    SHELL = "shell"

@dataclass
class GameForgeAction:
    type: ActionType
    content: str
    file_path: Optional[str] = None

@dataclass
class ArtifactData:
    id: str
    title: str
    message_id: str

@dataclass
class ParsedResponse:
    artifact_id: str
    title: str
    actions: List[GameForgeAction]

class GameForgeParser:
    def __init__(self, callbacks: Dict[str, Callable] = None):
        self.callbacks = callbacks or {}
        self._messages = {}
        self._action_id = 0
        
    def parse(self, message_id: str, input_text: str) -> ParsedResponse:
        """Parse the AI response into structured data"""
        # Extract artifact details using regex
        artifact_match = re.search(
            r'<forgeArtifact id="([^"]+)" title="([^"]+)">', 
            input_text
        )
        if not artifact_match:
            logger.warning("No artifact found in response")
            return ParsedResponse(artifact_id="", title="", actions=[])

        artifact_id = artifact_match.group(1)
        title = artifact_match.group(2)
        
        # Extract actions
        actions = []
        action_matches = re.finditer(
            r'<forgeAction type="(file|shell)"(?:\s+filePath="([^"]+)")?\s*>\n(.*?)\n\s*</forgeAction>',
            input_text,
            re.DOTALL
        )

        for match in action_matches:
            action_type = ActionType(match.group(1))
            file_path = match.group(2)
            content = match.group(3).strip()
            
            actions.append(GameForgeAction(
                type=action_type,
                content=content,
                file_path=file_path
            ))

        return ParsedResponse(
            artifact_id=artifact_id,
            title=title,
            actions=actions
        )