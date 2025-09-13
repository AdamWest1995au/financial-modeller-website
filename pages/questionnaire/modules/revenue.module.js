// TEMPORARY DEBUG VERSION - Replace your revenue.module.js with this simple version to test

import { MultiSelect } from '../components/multi-select.js';
import { Toggle } from '../components/toggle.js';

export class RevenueModule {
    constructor() {
        this.id = 'revenue-structure';
        this.title = 'Revenue Structure';
        this.description = 'Help us understand how your business generates revenue and your operational setup.';
        this.required = false;
        
        this.components = {};
        this.responses = {
            selectedRevenues: [],
            revenueStaff: 'no'
        };
    }

    render() {
        console.log('🎨 REVENUE MODULE: render() called');
        
        const container = document.createElement('div');
        container.className = 'combined-parameters-container';
        container.style.minHeight = '400px';
        
        // Add a highly visible test section
        const testSection = document.createElement('div');
        testSection.style.cssText = `
            background: linear-gradient(45deg, #8b5cf6, #ec4899);
            color: white;
            padding: 30px;
            margin: 20px 0;
            border-radius: 12px;
            text-align: center;
            border: 3px solid #fbbf24;
        `;
        testSection.innerHTML = `
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">🎯 REVENUE MODULE TEST</h2>
            <p style="margin: 0 0 20px 0; font-size: 16px;">If you can see this colorful box and interact with the controls below, the module is working!</p>
            <div id="testStatus" style="font-weight: bold; font-size: 18px;">Status: Module Loaded ✅</div>
        `;
        container.appendChild(testSection);

        // Add ONE simple component to test
        const simpleSection = document.createElement('div');
        simpleSection.className = 'parameter-section';
        simpleSection.style.cssText = 'padding: 20px; background: rgba(255,255,255,0.1); margin: 20px 0; border-radius: 8px;';

        const title = document.createElement('h3');
        title.style.cssText = 'color: #ffffff; margin-bottom: 15px;';
        title.textContent = 'Revenue Staff Test';

        const toggleContainer = document.createElement('div');
        toggleContainer.style.cssText = 'display: flex; align-items: center; gap: 20px;';

        const label = document.createElement('span');
        label.style.cssText = 'color: #ffffff; font-size: 16px;';
        label.textContent = 'Do you have revenue generating staff?';

        const toggleWrapper = document.createElement('div');

        try {
            const staffToggle = new Toggle({
                id: 'revenueStaffTest',
                labels: ['No', 'Yes'],
                defaultValue: 'no',
                onChange: (value) => {
                    console.log('🔄 REVENUE: Toggle changed to:', value);
                    this.responses.revenueStaff = value;
                    document.getElementById('testStatus').textContent = `Status: User selected "${value}" ✅`;
                    this.onResponseChange();
                }
            });

            this.components.revenueStaff = staffToggle;
            staffToggle.render(toggleWrapper);
            console.log('✅ REVENUE: Toggle component created successfully');

        } catch (error) {
            console.error('❌ REVENUE: Error creating toggle:', error);
            toggleWrapper.innerHTML = `<span style="color: #ef4444;">Error: ${error.message}</span>`;
        }

        toggleContainer.appendChild(label);
        toggleContainer.appendChild(toggleWrapper);

        simpleSection.appendChild(title);
        simpleSection.appendChild(toggleContainer);
        container.appendChild(simpleSection);

        // Add manual next button for testing
        const buttonSection = document.createElement('div');
        buttonSection.style.cssText = 'text-align: center; margin: 30px 0;';
        
        const testButton = document.createElement('button');
        testButton.style.cssText = `
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin: 0 10px;
        `;
        testButton.textContent = 'Test Response Collection';
        testButton.onclick = () => {
            const response = this.getResponse();
            console.log('📋 REVENUE: Collected response:', response);
            alert(`Revenue Module Response:\n${JSON.stringify(response, null, 2)}`);
        };

        buttonSection.appendChild(testButton);
        container.appendChild(buttonSection);

        console.log('🎨 REVENUE MODULE: render() completed successfully');
        return container;
    }

    onResponseChange() {
        console.log('🔄 REVENUE: onResponseChange called');
        if (window.questionnaireEngine && window.questionnaireEngine.validator) {
            window.questionnaireEngine.validator.validateCurrentQuestion();
        }
    }

    getResponse() {
        console.log('📋 REVENUE: getResponse called, current responses:', this.responses);
        return {
            type: 'revenue-combined',
            selectedRevenues: [...this.responses.selectedRevenues],
            revenueStaff: this.responses.revenueStaff,
            timestamp: new Date().toISOString()
        };
    }

    loadResponse(response) {
        console.log('📥 REVENUE: loadResponse called with:', response);
        // Simple load for testing
        if (response) {
            this.responses.revenueStaff = response.revenueStaff || 'no';
        }
    }

    validate() {
        console.log('✅ REVENUE: validate called');
        return {
            isValid: true,
            errors: []
        };
    }

    shouldShow(responses) {
        console.log('🔍 REVENUE: shouldShow called with:', responses);
        return true;
    }

    getDatabaseFields() {
        return {
            revenue_staff: this.responses.revenueStaff
        };
    }

    destroy() {
        console.log('🗑️ REVENUE: destroy called');
        Object.values(this.components).forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components = {};
    }
}

export default RevenueModule;

if (typeof window !== 'undefined') {
    window.RevenueModule = RevenueModule;
}