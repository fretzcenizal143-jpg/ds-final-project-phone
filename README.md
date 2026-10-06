# Data Structures Final Project
## File Zipper and Snake Game Applications

This project contains two applications that demonstrate the use of different data structures and algorithms:

1. **File Zipper** – Lossless file compression and decompression using Huffman Coding.
2. **Snake Game** – A grid-based game that uses data structures to manage the snake, movement input, and collision detection.

## Applications

### 1. File Zipper – Huffman Coding

The File Zipper compresses files using Huffman Coding. Frequently occurring bytes are given shorter codes, while less frequent bytes are given longer codes.

#### Data Structures Used
- Frequency table
- Min-Heap (Priority Queue)
- Binary Huffman Tree

#### Compression Process
1. Read the selected file.
2. Count the frequency of each byte.
3. Insert the bytes into a min-heap.
4. Build the Huffman tree by combining the two lowest-frequency nodes.
5. Generate Huffman codes from the tree.
6. Encode the file using the generated codes.
7. Pack the encoded bits into bytes and create the compressed file.

#### Decompression Process
1. Read and validate the compressed file.
2. Rebuild the Huffman tree using the stored frequency information.
3. Read the encoded bits.
4. Traverse the Huffman tree to recover the original bytes.
5. Stop when the original file size is reached.

The goal is for the decompressed file to be identical to the original file.

### 2. Snake Game

The Snake Game is played on a grid. The snake moves around the board, eats food, grows in length, and ends when it hits a wall or itself.

#### Data Structures Used
- Deque / Doubly Linked List – stores the snake body
- Queue – stores buffered player inputs
- Hash Set – checks for snake body collisions

#### Game Features
- Arrow key and WASD controls
- Food and snake growth
- Score tracking
- High score tracking
- Pause and restart functions
- Wall and self-collision detection

## How to Run

This project is a web-based application and does not require additional software or libraries.

### Option 1: Run Locally

1. Download or clone this repository.
2. Make sure these files are in the same folder:
   - `index.html`
   - `style.css`
   - `app.js`
3. Open `index.html` in a web browser.
4. Select either **Snake Game** or **File Zipper** using the tabs.

### Option 2: GitHub Pages

The project can also be accessed through GitHub Pages after the repository is published.

## Technologies Used

- HTML
- CSS
- JavaScript
- Canvas API
- Huffman Coding

## Project Structure

```text
ds-final-project/
│
├── index.html
├── style.css
├── app.js
└── README.md
