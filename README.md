# BigQuery Release Explorer & Share

A responsive, high-fidelity web application built with **Python Flask** on the backend and **vanilla HTML, JavaScript, and CSS** on the frontend. It fetches, parses, and visualizes the live Google Cloud BigQuery release notes Atom feed and enables sharing of individual updates to X (Twitter).

## 🚀 Features

*   **Live Feeds & Caching**: Fetches updates from the official Google Cloud BigQuery feed. Implements an automatic local fallback cache (`feed_cache.xml`) to guarantee high availability and sub-second page loads.
*   **Granular Update Splitting**: Splits multi-topic daily release entries into clean, individual, categorized update cards.
*   **Real-time Searching & Filtering**: Instantly search updates by keywords, features, or dates, and filter them using interactive category pills (Features, Announcements, Changes, Issues & Breaking).
*   **Tweet Composer**: Select any release card to open a custom composer modal. It pre-populates a tweet draft within the 280-character limit, adds tags (`#GoogleCloud #BigQuery`), includes the source link, and monitors character counts.
*   **Sleek Dark Mode Aesthetics**: Uses high-end glassmorphism, background radial glowing circles, vibrant visual badges, custom fonts, and shimmer loaders.

## 🛠️ Tech Stack

*   **Backend**: Python 3, Flask, standard XML parsing (ElementTree), Requests
*   **Frontend**: HTML5, Vanilla CSS (CSS Custom Variables, Flexbox, CSS Grid), Vanilla JavaScript

## 📦 Getting Started

### Prerequisites

*   Python 3.x
*   Pip

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/sirishaadapa25/-bigquery-release--notes.git
    cd -bigquery-release--notes
    ```

2.  **Install dependencies**:
    ```bash
    pip install Flask requests
    ```

3.  **Run the application**:
    ```bash
    python app.py
    ```

4.  **Open in your browser**:
    Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000)

## 📁 Project Structure

```text
├── app.py                  # Flask application backend (server, parser, and caching)
├── README.md               # Project documentation
├── .gitignore              # Git ignore configuration
├── templates/
│   └── index.html          # Core page layout and composer modal
└── static/
    ├── css/
    │   └── style.css       # Custom styles, transitions, and dark themes
    └── js/
        └── app.js          # Live search/filtering, statistics counters, and Twitter logic
```
