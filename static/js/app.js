document.addEventListener('DOMContentLoaded', () => {
  // Global App State
  let allReleases = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let selectedRelease = null;

  // DOM Elements
  const feedContainer = document.getElementById('releases-feed');
  const searchInput = document.getElementById('search-input');
  const filterPills = document.querySelectorAll('.filter-pill');
  const btnRefresh = document.getElementById('btn-refresh');
  
  // Stats Elements
  const statTotal = document.getElementById('stat-total');
  const statFeatures = document.getElementById('stat-features');
  const statAnnouncements = document.getElementById('stat-announcements');
  const statAlerts = document.getElementById('stat-alerts');

  // Modal Elements
  const modalOverlay = document.getElementById('tweet-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const tweetTextarea = document.getElementById('tweet-textarea');
  const charCounter = document.getElementById('char-counter');
  const btnPost = document.getElementById('btn-post');

  // SVGs for Injection
  const SVGS = {
    calendar: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    external: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
    twitter: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>`
  };

  // 1. Fetch releases from API
  async function fetchReleases() {
    showSkeletons();
    btnRefresh.classList.add('loading');
    btnRefresh.disabled = true;

    try {
      const response = await fetch('/api/releases');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      if (data.success) {
        allReleases = data.updates;
        updateStats();
        renderReleases();
      } else {
        showError(data.error || 'Failed to fetch release notes.');
      }
    } catch (error) {
      console.error('Error fetching releases:', error);
      showError('Could not connect to the server or fetch feed. Showing cached version if available.');
    } finally {
      btnRefresh.classList.remove('loading');
      btnRefresh.disabled = false;
    }
  }

  // 2. Render Loading Skeletons
  function showSkeletons() {
    feedContainer.innerHTML = Array(4).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-shimmer"></div>
        <div class="skeleton-header">
          <div class="skeleton-tag skeleton-line"></div>
          <div class="skeleton-date skeleton-line"></div>
        </div>
        <div class="skeleton-content">
          <div class="skeleton-body-1 skeleton-line"></div>
          <div class="skeleton-body-2 skeleton-line"></div>
          <div class="skeleton-body-3 skeleton-line"></div>
        </div>
        <div class="skeleton-footer skeleton-line"></div>
      </div>
    `).join('');
  }

  // 3. Render Error Message
  function showError(message) {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>An Error Occurred</h3>
        <p style="margin-top: 0.5rem; color: var(--text-muted);">${message}</p>
        <button class="btn-refresh" style="margin-top: 1.5rem; display: inline-flex;" id="btn-error-retry">Retry</button>
      </div>
    `;
    
    document.getElementById('btn-error-retry')?.addEventListener('click', fetchReleases);
  }

  // 4. Update Overview Stats
  function updateStats() {
    const total = allReleases.length;
    const features = allReleases.filter(r => r.category.toLowerCase() === 'feature').length;
    const announcements = allReleases.filter(r => r.category.toLowerCase() === 'announcement').length;
    const alerts = allReleases.filter(r => 
      r.category.toLowerCase() === 'issue' || 
      r.category.toLowerCase() === 'breaking'
    ).length;

    statTotal.textContent = total;
    statFeatures.textContent = features;
    statAnnouncements.textContent = announcements;
    statAlerts.textContent = alerts;
  }

  // 5. Filter & Search Logic
  function getFilteredReleases() {
    return allReleases.filter(release => {
      // Category Filter Match
      let matchesCategory = true;
      const cat = release.category.toLowerCase();
      
      if (currentFilter === 'features') {
        matchesCategory = (cat === 'feature');
      } else if (currentFilter === 'announcements') {
        matchesCategory = (cat === 'announcement');
      } else if (currentFilter === 'changes') {
        matchesCategory = (cat === 'change');
      } else if (currentFilter === 'breaking') {
        matchesCategory = (cat === 'issue' || cat === 'breaking');
      }

      // Search Match
      let matchesSearch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchesSearch = 
          release.plain_content.toLowerCase().includes(query) ||
          release.category.toLowerCase().includes(query) ||
          release.date.toLowerCase().includes(query);
      }

      return matchesCategory && matchesSearch;
    });
  }

  // 6. Render Release Cards
  function renderReleases() {
    const filtered = getFilteredReleases();
    
    if (filtered.length === 0) {
      feedContainer.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No releases found</h3>
          <p style="margin-top: 0.5rem; color: var(--text-muted);">Try adjusting your search query or category filters.</p>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = filtered.map((release, index) => {
      const badgeClass = `badge-${release.category.toLowerCase()}`;
      
      return `
        <div class="release-card" style="animation-delay: ${Math.min(index * 0.05, 0.4)}s">
          <div class="release-header">
            <div class="meta-info">
              <span class="category-badge ${badgeClass}">${release.category}</span>
              <span class="release-date">
                ${SVGS.calendar}
                ${release.date}
              </span>
            </div>
            <div class="card-actions-top">
              <button class="action-btn-small btn-card-tweet" data-id="${release.id}" title="Tweet this update">
                ${SVGS.twitter}
              </button>
            </div>
          </div>
          
          <div class="release-body">
            ${release.raw_content}
          </div>
          
          <div class="release-footer">
            <a href="${release.link}" target="_blank" rel="noopener noreferrer" class="feed-source-link">
              View official Google Cloud Release Notes ${SVGS.external}
            </a>
            
            <div class="card-actions-row">
              <button class="btn-action btn-tweet" data-id="${release.id}">
                ${SVGS.twitter}
                Tweet Update
              </button>
              <a href="${release.link}" target="_blank" rel="noopener" class="btn-action">
                View Docs
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach Tweet Button Click Handlers
    document.querySelectorAll('.btn-tweet, .btn-card-tweet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const release = allReleases.find(r => r.id === id);
        if (release) openTweetModal(release);
      });
    });
  }

  // 7. Tweet Modal Logic
  function openTweetModal(release) {
    selectedRelease = release;
    
    // Calculate space in tweet
    // Let's compose a default tweet text
    const header = `📢 BigQuery Update (${release.date}):\n\n`;
    const hashtags = `\n\n#GoogleCloud #BigQuery`;
    const link = `\n🔗 ${release.link}`;
    
    const maxTextLength = 280 - header.length - hashtags.length - link.length;
    
    let bodyText = release.plain_content;
    if (bodyText.length > maxTextLength) {
      bodyText = bodyText.substring(0, maxTextLength - 4) + '...';
    }

    const defaultTweet = `${header}${bodyText}${hashtags}${link}`;
    
    tweetTextarea.value = defaultTweet;
    updateCharCount();
    
    modalOverlay.classList.add('active');
    tweetTextarea.focus();
  }

  function closeTweetModal() {
    modalOverlay.classList.remove('active');
    selectedRelease = null;
  }

  function updateCharCount() {
    const length = tweetTextarea.value.length;
    charCounter.textContent = `${length} / 280`;

    // Visual Warn states
    charCounter.classList.remove('warning', 'danger');
    if (length > 280) {
      charCounter.classList.add('danger');
      btnPost.disabled = true;
    } else if (length > 250) {
      charCounter.classList.add('warning');
      btnPost.disabled = false;
    } else {
      btnPost.disabled = false;
    }
  }

  // 8. Event Listeners
  btnRefresh.addEventListener('click', fetchReleases);

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderReleases();
  });

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      renderReleases();
    });
  });

  closeModalBtn.addEventListener('click', closeTweetModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeTweetModal();
  });

  tweetTextarea.addEventListener('input', updateCharCount);

  btnPost.addEventListener('click', () => {
    if (tweetTextarea.value.length > 280) return;
    
    const tweetText = tweetTextarea.value;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    
    closeTweetModal();
  });

  // Esc key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
      closeTweetModal();
    }
  });

  // Initial load
  fetchReleases();
});
