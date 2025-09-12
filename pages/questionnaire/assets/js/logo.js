// Save this as: pages/assets/js/logo.js

document.addEventListener('DOMContentLoaded', function() {
    // Generate dots for the logo
    const dotGrid = document.getElementById('dotGrid');
    if (dotGrid) {
        // Clear existing content
        dotGrid.innerHTML = '';
        
        // Create 96 dots (12 columns × 8 rows)
        for (let i = 0; i < 96; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            
            // Set CSS custom properties for the dot
            const column = (i % 12) + 1;
            const row = Math.floor(i / 12) + 1;
            
            // Set wave animation delay based on position
            dot.style.setProperty('--delay', `${(column + row) * 0.05}`);
            
            dotGrid.appendChild(dot);
        }
        
        console.log('Logo dots generated successfully');
    } else {
        console.error('Logo dot grid element not found');
    }
    
    // Initialize animated panes
    initializeAnimatedPanes();
    
    // Initialize floating stats background
    initializeFloatingStats();
    
    // Initialize mouse tracking
    initializeMouseTracking();
});

// Animated panes functionality
function initializeAnimatedPanes() {
    const panes = document.querySelectorAll('.model-pane');
    let currentIndex = 0;
    let intervalId;
    
    function showPaneContent(index) {
        panes.forEach((pane, i) => {
            const bullets = pane.querySelectorAll('.bullet-point');
            const content = pane.querySelector('.pane-content');
            
            if (i === index) {
                // Show content for current pane
                content.style.opacity = '1';
                bullets.forEach((bullet, bulletIndex) => {
                    setTimeout(() => {
                        bullet.style.opacity = '1';
                        bullet.style.transform = 'translateY(0)';
                    }, bulletIndex * 200);
                });
            } else {
                // Hide content for other panes
                content.style.opacity = '0';
                bullets.forEach(bullet => {
                    bullet.style.opacity = '0';
                    bullet.style.transform = 'translateY(10px)';
                });
            }
        });
    }
    
    function nextPane() {
        currentIndex = (currentIndex + 1) % panes.length;
        showPaneContent(currentIndex);
    }
    
    // Start the animation cycle
    if (panes.length > 0) {
        showPaneContent(0); // Show first pane initially
        intervalId = setInterval(nextPane, 4000); // Change every 4 seconds
        
        // Pause animation on hover
        const paneStack = document.getElementById('paneStack');
        if (paneStack) {
            paneStack.addEventListener('mouseenter', () => {
                clearInterval(intervalId);
            });
            
            paneStack.addEventListener('mouseleave', () => {
                intervalId = setInterval(nextPane, 4000);
            });
        }
        
        console.log('Animated panes initialized');
    }
}

// Floating stats background
function initializeFloatingStats() {
    const floatingStats = document.getElementById('floatingStats');
    if (!floatingStats) return;
    
    const stats = [
        'ROI: 234%', 'NPV: $2.4M', 'IRR: 18.5%', 'Payback: 2.3 years',
        'EBITDA: $1.2M', 'Revenue: $5.8M', 'Growth: 45%', 'Margin: 23%',
        'CAGR: 15%', 'WACC: 8.5%', 'Beta: 1.2', 'EV/EBITDA: 12x',
        'P/E: 16.8', 'FCF: $890K', 'ROIC: 21%', 'Debt/Equity: 0.4'
    ];
    
    function createFloatingStat() {
        const stat = document.createElement('div');
        stat.className = 'floating-stat';
        stat.textContent = stats[Math.floor(Math.random() * stats.length)];
        
        // Random size
        const sizes = ['small', '', 'large'];
        const sizeClass = sizes[Math.floor(Math.random() * sizes.length)];
        if (sizeClass) stat.classList.add(sizeClass);
        
        // Random direction
        if (Math.random() > 0.5) {
            stat.classList.add('reverse');
        }
        
        // Random horizontal position
        stat.style.left = Math.random() * 100 + '%';
        
        floatingStats.appendChild(stat);
        
        // Remove after animation completes
        setTimeout(() => {
            if (stat.parentNode) {
                stat.parentNode.removeChild(stat);
            }
        }, 20000);
    }
    
    // Create stats periodically
    setInterval(createFloatingStat, 2000);
    
    console.log('Floating stats initialized');
}

// Mouse tracking for illumination effects
function initializeMouseTracking() {
    let mouseX = 0;
    let mouseY = 0;
    let trails = [];
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Update CSS custom properties for mouse position
        document.body.style.setProperty('--mouse-x', mouseX + 'px');
        document.body.style.setProperty('--mouse-y', mouseY + 'px');
        
        // Add mouse active class
        document.body.classList.add('mouse-active');
        
        // Create trail effect
        createTrail(mouseX, mouseY);
        
        // Illuminate floating stats near mouse
        illuminateNearbyStats(mouseX, mouseY);
    });
    
    function createTrail(x, y) {
        // Limit number of trails
        if (trails.length >= 3) {
            const oldTrail = trails.shift();
            if (oldTrail && oldTrail.parentNode) {
                oldTrail.classList.add('fade-out');
                setTimeout(() => {
                    if (oldTrail.parentNode) {
                        oldTrail.parentNode.removeChild(oldTrail);
                    }
                }, 800);
            }
        }
        
        const trail = document.createElement('div');
        trail.className = 'mouse-trail';
        trail.style.setProperty('--trail-x', x + 'px');
        trail.style.setProperty('--trail-y', y + 'px');
        
        document.body.appendChild(trail);
        trails.push(trail);
        
        // Auto-remove trail
        setTimeout(() => {
            if (trail.parentNode) {
                trail.classList.add('fade-out');
                setTimeout(() => {
                    if (trail.parentNode) {
                        trail.parentNode.removeChild(trail);
                    }
                }, 800);
            }
        }, 1000);
    }
    
    function illuminateNearbyStats(x, y) {
        const stats = document.querySelectorAll('.floating-stat');
        stats.forEach(stat => {
            const rect = stat.getBoundingClientRect();
            const statX = rect.left + rect.width / 2;
            const statY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(Math.pow(x - statX, 2) + Math.pow(y - statY, 2));
            
            if (distance < 150) {
                stat.classList.add('illuminated');
            } else {
                stat.classList.remove('illuminated');
            }
        });
    }
    
    // Remove mouse active class when mouse stops
    let mouseTimeout;
    document.addEventListener('mousemove', () => {
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(() => {
            document.body.classList.remove('mouse-active');
        }, 100);
    });
    
    console.log('Mouse tracking initialized');
}