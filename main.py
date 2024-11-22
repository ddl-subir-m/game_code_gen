import asyncio
import os
from dotenv import load_dotenv
import logging
from src.gameforge.prompts import SystemConstraints
from src.gameforge.parser import GameForgeParser, GameForgeAction
from src.gameforge.executor import GameForgeExecutor
from src.gameforge.ai_client import GameForgeAI, GameForgeChat
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_project_root() -> str:
    """Get the absolute path to the project root directory"""
    return os.path.abspath(os.path.dirname(__file__))

async def main():
    try:
        # Load environment variables
        load_dotenv()
        api_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")

        # Read game specification from JSON file
        try:
            with open('game_spec.json', 'r', encoding='utf-8') as f:
                game_data = json.load(f)
                
            game_name = game_data['game_name']
            spec = game_data['spec']
            
            # Construct the complete prompt
            user_input = f"""Create a browser game called {game_name} that is described as follows:\n\n{spec}"""
        except FileNotFoundError:
            raise FileNotFoundError("game_spec.json not found")
        except KeyError as e:
            raise KeyError(f"Missing required key in game_spec.json: {e}")
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON format in game_spec.json")

        # Initialize system constraints and output directory
        project_root = get_project_root()
        output_dir = os.path.join(project_root, "ai_output")
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize components without callbacks
        constraints = SystemConstraints(work_dir=project_root)
        executor = GameForgeExecutor(work_dir=project_root)
        parser = GameForgeParser()
        
        # Initialize AI and chat
        ai = GameForgeAI(
            api_key=api_key,
            system_prompt=constraints.get_system_prompt()
        )
        chat = GameForgeChat(ai, parser, executor)

        print("User:", user_input)
        print("GameForge:", end=" ")
        
        # Get response and save it
        response = await chat.send_message(user_input)
        
        # Save the response
        response_dir = os.path.join(output_dir, "responses")
        os.makedirs(response_dir, exist_ok=True)
        
        response_file = os.path.join(response_dir, f"response_{game_name}.txt")
        with open(response_file, "w", encoding="utf-8") as f:
            f.write(response)
        
        print(f"\nResponse saved to: {response_file}")
        print(response)
        
    finally:
        # Cleanup resources
        if 'chat' in locals():
            if chat.ai and chat.ai.client:
                await chat.ai.client.close()
        
        # Cancel all remaining tasks
        for task in asyncio.all_tasks():
            if task is not asyncio.current_task():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

if __name__ == "__main__":
    asyncio.run(main())