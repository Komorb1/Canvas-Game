# Bird Aid

Bird Aid is a browser-based endless runner game made with HTML, CSS, and JavaScript Canvas.

The player runs through a park/forest path, dodges obstacles, and saves falling birds using quick keyboard reactions. The game is inspired by endless runner games such as Subway Surfers and Temple Run, but adds a bird rescue mechanic.

## Game Objective

The objective is to survive as long as possible while saving birds.

The player must:
- switch lanes to avoid obstacles
- jump over ground obstacles
- roll under air obstacles
- save falling birds before they reach the rescue line

## Controls

| Key | Action |
|---|---|
| Left Arrow | Move to left lane |
| Right Arrow | Move to right lane |
| Space / Up Arrow | Jump |
| Down Arrow | Roll |
| Down Arrow while airborne | Fast drop and roll after landing |
| Z | Save left bird |
| X | Save middle bird |
| C | Save right bird |
| M | Return to menu |
| R | Restart after game over |

## Game Features

- 3-lane endless runner movement
- Smooth lane switching
- Jumping and gravity
- Rolling and fast drop mechanic
- Ground obstacles and air obstacles
- Side obstacles such as dogs and frisbees
- Falling bird rescue system
- Birds saved and birds missed counters
- Difficulty phases that increase over time
- Menu screen with map selection
- Two maps: Park and Forest
- Game over and restart system

## Difficulty System

The game becomes harder in phases:

- Phase 1: Lane obstacles only
- Phase 2: Birds are added
- Phase 3: Side obstacles are added
- Phase 4: Speed and spawn rate increase gradually

The difficulty is based on survival time, not on birds saved.

## Graphics Concepts Used

This project uses several basic computer graphics concepts:

- Canvas rendering
- Animation using `requestAnimationFrame`
- Object movement using position and velocity
- Gravity and jumping
- AABB collision detection
- Game states such as menu, playing, and game over
- Drawing backgrounds, objects, UI text, and emoji-based sprites
- Timed spawning of obstacles and birds

## How to Run

Open `index.html` in a web browser.

No external libraries are required.

## Technologies Used

- HTML
- CSS
- JavaScript
- HTML5 Canvas

## Project Status

Core gameplay is implemented. Visual polish and final report preparation are the next steps.