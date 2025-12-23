# Pro-Graph-Calculator
# 📉 GraphCalc Pro - Dual Mode Calculator

**GraphCalc Pro** is a powerful, web-based calculator that seamlessly bridges the gap between simple arithmetic and complex mathematical visualization. It features a dual-interface design allowing users to toggle between a standard desktop calculator and a robust 2D/3D graphing engine.

## ✨ Key Features

### 📊 Graphical Mode
* **Smart Plotting:** Automatically detects and renders **2D curves** (e.g., `y = sin(x)`) and **3D surfaces** (e.g., `z = sin(x) * cos(y)`).
* **Real-Time Analysis:** Instantly calculates and displays:
    * **Roots** (x-intercepts)
    * **Y-Intercepts** (`f(0)`)
    * **Arithmetic Results** (if simple math is typed)
* **Media Tools:** Built-in controls to **Take Screenshots** 📸 and **Record Screen Videos** 🎥 of your graphs.
* **Magic Graphs:** A preset menu featuring 10 complex mathematical visualizations (e.g., "The Ripple", "Monkey Saddle") to demonstrate rendering capabilities.
* **Interactive Controls:** Full support for zooming, panning, and resetting the graph view.

### 🧮 Simple Mode
* **Clean Interface:** A distraction-free, traditional calculator layout for quick computations.
* **History Tracking:** Displays the previous calculation steps above the current result.

### 🎨 UI/UX & Theming
* **Dark/Light Mode:** A global theme toggle that adjusts the entire UI (sidebar, keypad, graph background, and grid lines) for optimal visibility in any lighting.
* **Expanded Function Panel:** A masonry-style panel containing advanced functions grouped by category:
    * **Trigonometry** (Normal & Hyperbolic)
    * **Statistics** (Mean, Var, Distributions)
    * **Calculus** (Derivatives, Integrals)
    * **Number Theory** (LCM, GCD, Combinations)

---

## 🛠️ Tech Stack

This project is built using vanilla web technologies and powerful open-source libraries:

* **HTML5 & CSS3:** For structure and styling (utilizing CSS Variables for theming).
* **JavaScript (ES6+):** For application logic and DOM manipulation.
* **[Plotly.js](https://plotly.com/javascript/):** For rendering high-performance 2D and 3D graphs.
* **[Math.js](https://mathjs.org/):** For parsing expressions and performing complex mathematical evaluations.
* **[FontAwesome](https://fontawesome.com/):** For UI icons.

---

## 🚀 How to Run

Since this is a client-side application, no backend server or installation is required.

1.  **Download** the source code.
2.  Ensure you have the following three files in the same directory:
    * `index.html`
    * `style.css`
    * `script.js`
3.  **Open `index.html`** in any modern web browser (Chrome, Firefox, Edge).

---

## 📂 Project Structure

```text
/
├── index.html      # Main structure, library imports, and UI layout
├── style.css       # Styling, responsive design, and Dark/Light theme variables
├── script.js       # Core logic: Plotly rendering, Math.js evaluation, and event handling
└── README.md       # Project documentation
