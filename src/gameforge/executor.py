import os
import subprocess
from pathlib import Path
from typing import Optional
import logging
from .parser import GameForgeAction, ActionType

logger = logging.getLogger(__name__)

class GameForgeExecutor:
    def __init__(self, work_dir: Optional[str] = None):
        # Convert to absolute path if relative path provided
        if work_dir:
            self.work_dir = os.path.abspath(work_dir)
        else:
            self.work_dir = os.path.abspath(os.path.join(
                os.path.dirname(__file__), 
                "../.."
            ))
        
        # Ensure ai_output directory exists in work_dir
        self.output_dir = os.path.join(self.work_dir, "ai_output")
        os.makedirs(self.output_dir, exist_ok=True)
        
    def execute_action(self, action: GameForgeAction) -> None:
        """Execute a gameforge action (file or shell command)"""
        try:
            if action.type == ActionType.FILE:
                self._handle_file_action(action)
            elif action.type == ActionType.SHELL:
                self._handle_shell_action(action)
        except Exception as e:
            logger.error(f"Failed to execute action: {e}")
            raise
    
    def _handle_file_action(self, action: GameForgeAction) -> None:
        """Handle file creation/update actions"""
        if not action.file_path:
            logger.error("No file path provided for file action")
            return

        # Ensure file path is relative to ai_output directory
        full_path = os.path.join(self.output_dir, action.file_path)
        
        # Create directories if they don't exist
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        try:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(action.content)
            logger.info(f"Created/updated file: {full_path}")
        except Exception as e:
            logger.error(f"Failed to write file {full_path}: {str(e)}")
    
    def _handle_shell_action(self, action: GameForgeAction) -> None:
        """Execute shell commands with error handling and environment setup"""
        # Split multiple commands and execute them separately
        commands = action.content.strip().split('\n')
        
        for cmd in commands:
            cmd = cmd.strip()
            if not cmd:
                continue
                
            try:
                # Use shell=True to support command chaining and environment variables
                result = subprocess.run(
                    cmd,
                    shell=True,
                    cwd=self.work_dir,
                    capture_output=True,
                    text=True,
                    env={**os.environ}  # Use current environment
                )
                
                if result.stdout:
                    logger.info(f"Command output: {result.stdout}")
                
                if result.returncode != 0:
                    logger.error(f"Command failed: {cmd}")
                    logger.error(f"Error output: {result.stderr}")
                    # Continue execution instead of raising error
                    continue
                    
            except Exception as e:
                logger.error(f"Failed to execute command '{cmd}': {str(e)}")
                # Continue with next command instead of stopping
                continue