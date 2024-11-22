# Game Code Generator

An AI-powered game development system that generates complete, playable browser-based games using Claude 3.5 Sonnet. The system can create various classic arcade-style games with full game mechanics, graphics, and controls. Sample games are included in the `src/games` directory.

## Features

- AI-powered game code generation
- Outputs complete HTML5 Canvas games
- Generates full game mechanics and controls
- Includes scoring systems and game states
- Creates responsive and playable browser games

## Prerequisites

- Python 3.11 or higher
- Poetry for dependency management
- Anthropic API key

## Installation

1. Clone the repository
2. Install dependencies using Poetry:
```bash
poetry install
```
3. Create a `.env` file in the project root with your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

1. Create a `game_spec.json` file in the project root with your game specification:
```json
{
    "game_name": "YourGameName",
    "spec": "Detailed description of your game..."
}
```
See sample game specifications in `src/games/specs`

2. Run the main script:
```bash
poetry run python main.py
```

The generated game files will be created in the `ai_output` directory.

## Project Structure

- `main.py`: Entry point for the game generation system
- `src/gameforge/`: Core game generation modules
- `ai_output/`: Directory where generated game files are saved
- `game_spec.json`: Game specification file

## Example Games

The system can generate various types of games, including:
- Block falling puzzle games
- Platform rescue games
- Treasure hunting games


