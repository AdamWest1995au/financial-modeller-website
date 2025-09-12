// Complete Logo Script with 3D Pane Animation - Save as: pages/assets/js/logo.js

console.log('Logo script starting to load...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing logo animations...');
    
    // Initialize all components
    initializeLogo();
    initializeAnimatedPanes();
    initializeFloatingStats();
    initializeMouseTracking();
    
    console.log('All logo components initialized');
});

// Logo dot grid generation
function initializeLogo() {
    console.log('Initializing logo...');
    
    const dotGrid = document.getElementById('dotGrid');
    if (!dotGrid) {
        console.error('Logo dot grid element not found');
        return;
    }
    
    // Clear existing content
    dotGrid.innerHTML = '';
    
    // Create 96 dots (12 columns × 8 rows)
    for (let i = 0; i < 96; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        
        // Set CSS custom properties for wave animation
        const column = (i % 12) + 1;
        const row = Math.floor(i / 12) + 1;
        dot.style.setProperty('--delay', `${(column + row) * 0.05}s`);
        
        dotGrid.appendChild(dot);
    }
    
    console.log('Logo: Created 96 dots successfully');
}

// Animated panes functionality with 3D movement
function initializeAnimatedPanes() {
    console.log('Initializing animated panes...');
    
    const panes = document.querySelectorAll('.model-pane');
    const paneStack = document.getElementById('paneStack');
    
    console.log('Found elements:', {
        panes: panes.length,
        paneStack: !!paneStack
    });
    
    if (panes.length === 0) {
        console.error('No model panes found');
        return;
    }
    
    let currentIndex = 0;
    let intervalId = null;
    let isHovered = false;
    
    // Define 3D positions for each layer
    const positions = [
        { x: 0, y: 0, z: 40, opacity: 1, zIndex: 4 },      // Front position
        { x: -35, y: -22, z: 20, opacity: 0.9, zIndex: 3 }, // Second position  
        { x: -70, y: -44, z: 0, opacity: 0.7, zIndex: 2 },  // Third position
        { x: -105, y: -66, z: -20, opacity: 0.5, zIndex: 1 } // Back position
    ];
    
    function showPaneContent(index) {
        console.log(`Showing pane ${index + 1} of ${panes.length} as front pane`);
        
        panes.forEach((pane, i) => {
            const bullets = pane.querySelectorAll('.bullet-point');
            const content = pane.querySelector('.pane-content');
            
            // Calculate which visual position this pane should be in
            // The active pane (index) goes to position 0 (front)
            // Other panes are positioned relative to the active one
            let visualPosition = (i - index + panes.length) % panes.length;
            const pos = positions[visualPosition];
            
            console.log(`Pane ${i} moving to visual position ${visualPosition}:`, pos);
            
            // Apply 3D transform to move the pane
            pane.style.transform = `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px) rotateY(5deg) rotateX(2deg)`;
            pane.style.opacity = pos.opacity;
            pane.style.zIndex = pos.zIndex;
            pane.style.transition = 'all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)';
            
            // Show content only for the front pane (position 0)
            if (visualPosition === 0) {
                console.log(`Activating front pane ${i}: ${bullets.length} bullets, content: ${!!content}`);
                
                // Delay content animation to let pane move first
                setTimeout(() => {
                    if (content) {
                        content.style.opacity = '1';
                        content.style.transition = 'opacity 0.5s ease';
                    }
                    
                    bullets.forEach((bullet, bulletIndex) => {
                        setTimeout(() => {
                            bullet.style.opacity = '1';
                            bullet.style.transform = 'translateY(0)';
                            bullet.style.transition = 'all 0.4s ease';
                        }, bulletIndex * 150);
                    });
                }, 200);
                
            } else {
                // Hide content for non-front panes immediately
                if (content) {
                    content.style.opacity = '0';
                    content.style.transition = 'opacity 0.2s ease';
                }
                
                bullets.forEach(bullet => {
                    bullet.style.opacity = '0';
                    bullet.style.transform = 'translateY(10px)';
                    bullet.style.transition = 'all 0.2s ease';
                });
            }
        });
    }
    
    function nextPane() {
        if (isHovered) {
            console.log('Skipping pane change - mouse is hovering');
            return;
        }
        
        currentIndex = (currentIndex + 1) % panes.length;
        console.log(`Moving to pane ${currentIndex + 1} as front pane`);
        showPaneContent(currentIndex);
    }
    
    function startAnimation() {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(nextPane, 5000); // Increased to 5s to see movement better
        console.log('Pane animation started (5s intervals)');
    }
    
    function stopAnimation() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        console.log('Pane animation stopped');
    }
    
    // Initialize first pane
    showPaneContent(0);
    startAnimation();
    
    // Add hover controls
    if (paneStack) {
        paneStack.addEventListener('mouseenter', () => {
            console.log('Mouse entered pane stack - pausing animation');
            isHovered = true;
            stopAnimation();
        });
        
        paneStack.addEventListener('mouseleave', () => {
            console.log('Mouse left pane stack - resuming animation');
            isHovered = false;
            startAnimation();
        });
    }
    
    console.log('Animated panes initialized successfully with 3D movement');
}

// Floating stats background
function initializeFloatingStats() {
    console.log('Initializing floating stats...');
    
    const floatingStats = document.getElementById('floatingStats');
    if (!floatingStats) {
        console.error('Floating stats container not found');
        return;
    }
    
    const stats = [
        'ROI: 234%', 'NPV: $2.4M', 'IRR: 18.5%', 'Payback: 2.3 years',
        'EBITDA: $1.2M', 'Revenue: $5.8M', 'Growth: 45%', 'Margin: 23%',
        'CAGR: 15%', 'WACC: 8.5%', 'Beta: 1.2', 'EV/EBITDA: 12x',
        'P/E: 16.8', 'FCF: $890K', 'ROIC: 21%', 'Debt/Equity: 0.4'
    ];
    
    let statsCount = 0;
    
    function createFloatingStat() {
        const stat = document.createElement('div');
        stat.className = 'floating-stat';
        stat.textContent = stats[Math.floor(Math.random() * stats.length)];
        
        // Random size variations
        const sizes = ['small', '', 'large'];
        const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
        if (randomSize) stat.classList.add(randomSize);
        
        // Random direction
        if (Math.random() > 0.5) {
            stat.classList.add('reverse');
        }
        
        // Random horizontal position
        stat.style.left = Math.random() * 100 + '%';
        
        floatingStats.appendChild(stat);
        statsCount++;
        
        // Clean up after animation
        setTimeout(() => {
            if (stat.parentNode) {
                stat.parentNode.removeChild(stat);
                statsCount--;
            }
        }, 20000);
        
        if (statsCount % 10 === 0) {
            console.log(`Created ${statsCount} floating stats`);
        }
    }
    
    // Create stats every 2 seconds
    setInterval(createFloatingStat, 2000);
    
    console.log('Floating stats initialized - creating stats every 2 seconds');
}

// Mouse tracking and illumination effects
function initializeMouseTracking() {
    console.log('Initializing mouse tracking...');
    
    let mouseX = 0;
    let mouseY = 0;
    let trails = [];
    let mouseActive = false;
    
    function updateMousePosition(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Update CSS custom properties
        document.documentElement.style.setProperty('--mouse-x', mouseX + 'px');
        document.documentElement.style.setProperty('--mouse-y', mouseY + 'px');
        
        // Add active class
        if (!mouseActive) {
            document.body.classList.add('mouse-active');
            mouseActive = true;
        }
        
        // Create trail and illuminate stats
        createTrail(mouseX, mouseY);
        illuminateNearbyStats(mouseX, mouseY);
    }
    
    function createTrail(x, y) {
        // Limit trails to prevent performance issues
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
            const index = trails.indexOf(trail);
            if (index > -1) trails.splice(index, 1);
        }, 1200);
    }
    
    function illuminateNearbyStats(x, y) {
        const stats = document.querySelectorAll('.floating-stat');
        let illuminatedCount = 0;
        
        stats.forEach(stat => {
            const rect = stat.getBoundingClientRect();
            const statX = rect.left + rect.width / 2;
            const statY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(x - statX, 2) + Math.pow(y - statY, 2)
            );
            
            if (distance < 120) {
                stat.classList.add('illuminated');
                illuminatedCount++;
            } else {
                stat.classList.remove('illuminated');
            }
        });
        
        // Optional: log illumination activity
        if (illuminatedCount > 0 && Math.random() < 0.01) {
            console.log(`Illuminating ${illuminatedCount} stats near mouse`);
        }
    }
    
    // Mouse event listeners
    document.addEventListener('mousemove', updateMousePosition);
    
    // Remove mouse active class when mouse stops
    let mouseTimeout;
    document.addEventListener('mousemove', () => {
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(() => {
            document.body.classList.remove('mouse-active');
            mouseActive = false;
        }, 150);
    });
    
    console.log('Mouse tracking initialized');
}

console.log('Logo script fully loaded');