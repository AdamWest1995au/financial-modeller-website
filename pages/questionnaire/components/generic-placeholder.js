// /pages/questionnaire/components/generic-placeholder.js
export class GenericPlaceholder {
    constructor(config = {}) {
        this.sectionName = config.sectionName || 'Section';
        this.description = config.description || 'A standard base model will be provided for this section.';
        this.icon = config.icon || '📊';
    }

    render() {
        const container = document.createElement('div');
        container.className = 'generic-placeholder-container';

        container.innerHTML = `
            <div class="generic-placeholder">
                <div class="generic-placeholder-header">
                    <div class="generic-placeholder-icon">${this.icon}</div>
                    <h3 class="generic-placeholder-title">Generic ${this.sectionName} Model Selected</h3>
                </div>
                
                <div class="generic-placeholder-content">
                    <p class="generic-placeholder-description">${this.description}</p>
                    
                    <div class="generic-placeholder-features">
                        <div class="generic-placeholder-feature">
                            <span class="feature-icon">✓</span>
                            <span class="feature-text">Standard industry framework included</span>
                        </div>
                        <div class="generic-placeholder-feature">
                            <span class="feature-icon">✓</span>
                            <span class="feature-text">Basic formulas and calculations provided</span>
                        </div>
                        <div class="generic-placeholder-feature">
                            <span class="feature-icon">✓</span>
                            <span class="feature-text">Customizable after model generation</span>
                        </div>
                    </div>
                    
                    <div class="generic-placeholder-note">
                        <p><strong>Note:</strong> You can modify and customize this section in your final Excel model to better match your specific business needs.</p>
                    </div>
                </div>
            </div>
        `;

        return container;
    }
}

export default GenericPlaceholder;