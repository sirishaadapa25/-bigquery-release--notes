import os
import re
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__, template_folder='templates', static_folder='static')

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.xml"

def fetch_feed():
    """Fetches the XML feed from the remote URL, falling back to cache if it fails."""
    try:
        response = requests.get(FEED_URL, timeout=8)
        if response.status_code == 200:
            # Save to cache
            with open(CACHE_FILE, 'wb') as f:
                f.write(response.content)
            return response.content
    except Exception as e:
        app.logger.error(f"Failed to fetch remote feed: {e}")
    
    # Try reading from cache
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'rb') as f:
            return f.read()
    
    # Return None if both failed
    return None

def strip_html_tags(text):
    """Strip HTML tags to get plain text, preserving some basic formatting."""
    # First replace tags like <p>, <br>, <li>, <h3>, <h4> with newlines
    text = re.sub(r'<(p|br|li|h3|h4)[^>]*>', '\n', text)
    text = re.sub(r'</(p|li|h3|h4)>', '', text)
    # Strip all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
    # Clean up double newlines
    text = re.compile(r'\n+').sub('\n', text)
    return text.strip()

def parse_updates_from_entry(content_html, date, link):
    """Parses an Atom entry content HTML and splits it into individual updates."""
    updates = []
    
    # Split content by <h3> headers
    matches = list(re.finditer(r'<h3>(.*?)</h3>', content_html))
    
    if not matches:
        plain_text = strip_html_tags(content_html)
        updates.append({
            'date': date,
            'category': 'Update',
            'raw_content': content_html,
            'plain_content': plain_text,
            'link': link
        })
        return updates
    
    for i in range(len(matches)):
        category = matches[i].group(1).strip()
        start_idx = matches[i].end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(content_html)
        update_html = content_html[start_idx:end_idx].strip()
        plain_text = strip_html_tags(update_html)
        
        # Construct a unique ID
        update_id = f"{date}_{category}_{i}".lower().replace(' ', '_').replace(',', '')
        
        updates.append({
            'id': update_id,
            'date': date,
            'category': category,
            'raw_content': update_html,
            'plain_content': plain_text,
            'link': link
        })
        
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    xml_data = fetch_feed()
    if not xml_data:
        return jsonify({'error': 'Unable to fetch release notes and no cached data available.'}), 500
    
    try:
        # Parse XML
        root = ET.fromstring(xml_data)
        # Handle namespaces (Atom namespace)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        all_updates = []
        
        # Iterate through entries
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            date_str = title.text if title is not None else 'Unknown Date'
            
            link_el = entry.find('atom:link', ns)
            link = link_el.attrib.get('href', '') if link_el is not None else ''
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ''
            
            # Extract individual updates from this entry
            updates = parse_updates_from_entry(content_html, date_str, link)
            all_updates.extend(updates)
            
        return jsonify({
            'success': True,
            'updates': all_updates,
            'source_url': FEED_URL
        })
    except Exception as e:
        app.logger.error(f"Error parsing XML: {e}")
        return jsonify({'error': f"Failed to parse release notes: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
