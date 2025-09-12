// EXACT COPY of your working demo - no modifications
console.log('🎯 Loading EXACT copy of your working demo...');

function initializeLogo() {
    const dotGrid = document.getElementById('dotGrid');
    const logo = document.getElementById('logo');
    
    if (!dotGrid || !logo) return;

    // Clear existing dots
    dotGrid.innerHTML = '';
    
    const rows = 8;
    const cols = 12;
    
    // EXACT copy from your demo
    for (let i = 0; i < rows * cols; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        
        // Calculate position for wave effect
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        // Create wave pattern - dots in middle columns are larger/more opaque
        const wavePosition = col / cols;
        const rowOffset = row / rows;
        
        // Calculate wave height based on column position
        const waveHeight = Math.sin(wavePosition * Math.PI) * Math.sin(rowOffset * Math.PI);
        const scale = 0.5 + (waveHeight * 0.8);
        const opacity = 0.2 + (waveHeight * 0.8);
        
        // Apply gradient effect based on position
        if (col < cols / 3) {
            dot.style.background = '#6d28d9';
        } else if (col < (cols * 2) / 3) {
            dot.style.background = '#8b5cf6';
        } else {
            dot.style.background = '#a78bfa';
        }
        
        dot.style.setProperty('--scale', scale);
        dot.style.setProperty('--opacity', opacity);
        dot.style.setProperty('--delay', (col * 0.05 + row * 0.02));
        
        // Hide dots that are too far from the wave center
        if (waveHeight < 0.2) {
            dot.style.opacity = '0.1';
            dot.style.transform = 'scale(0.3)';
        }
        
        dotGrid.appendChild(dot);
    }

    // Interactive wave effect on mouse move
    let mouseX = 0;
    let mouseY = 0;

    logo.addEventListener('mousemove', (e) => {
        const rect = dotGrid.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        
        const dots = dotGrid.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            const dotX = (col + 0.5) * (rect.width / cols);
            const dotY = (row + 0.5) * (rect.height / rows);
            
            const distance = Math.sqrt(
                Math.pow(mouseX - dotX, 2) + 
                Math.pow(mouseY - dotY, 2)
            );
            
            const maxDistance = Math.sqrt(
                Math.pow(rect.width, 2) + 
                Math.pow(rect.height, 2)
            );
            
            const influence = 1 - (distance / maxDistance);
            const wavePosition = col / cols;
            const rowOffset = row / rows;
            const waveHeight = Math.sin(wavePosition * Math.PI) * Math.sin(rowOffset * Math.PI);
            
            const scale = (0.5 + (waveHeight * 0.8)) + (influence * 0.5);
            const opacity = (0.2 + (waveHeight * 0.8)) + (influence * 0.3);
            
            dot.style.transform = `scale(${scale})`;
            dot.style.opacity = Math.min(opacity, 1);
        });
    });

    logo.addEventListener('mouseleave', () => {
        const dots = dotGrid.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const wavePosition = col / cols;
            const rowOffset = row / rows;
            const waveHeight = Math.sin(wavePosition * Math.PI) * Math.sin(rowOffset * Math.PI);
            
            if (waveHeight < 0.2) {
                dot.style.opacity = '0.1';
                dot.style.transform = 'scale(0.3)';
            } else {
                const scale = 0.5 + (waveHeight * 0.8);
                const opacity = 0.2 + (waveHeight * 0.8);
                dot.style.transform = `scale(${scale})`;
                dot.style.opacity = opacity;
            }
        });
    });

    console.log('✅ Exact demo copy loaded!');
}

// Simple initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLogo);
} else {
    initializeLogo();
}

window.initializeLogo = initializeLogo;