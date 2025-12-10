import { initEMI } from './emi.js';
// Note: Assuming these exist or will exist later
const initSIP = () => console.log('SIP Init');
const initSWP = () => console.log('SWP Init');

// Configuration: Which function to run for which tab ID
const calculators = {
    'emi-calculator': initEMI,
    'sip-calculator': initSIP,
    'swp-calculator': initSWP
};

// Track what has been initialized so we don't re-run event listeners
const initializedState = {};

function switchTab(targetId) {
    // 1. Update Buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    // 2. Show/Hide Sections
    document.querySelectorAll('.calculator-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === targetId);
    });

    // 3. Initialize the specific calculator if not already done
    // THIS is where the flag prevents re-running the initialization (including listeners)
    if (calculators[targetId] && !initializedState[targetId]) {
        // Execute the calculator's initialization function
        calculators[targetId](); 
        // Mark as initialized
        initializedState[targetId] = true;
    }
}

function setupViewSwitcher() {
    const homeLink = document.getElementById('home-link');
    const homePage = document.getElementById('home-page');
    const calculatorView = document.getElementById('calculator-view');
    const tabButtons = document.querySelectorAll('.calculator-tabs .tab-button');
    
    const showView = (viewElement) => {
        document.querySelectorAll('.main-page-section').forEach(section => {
            section.classList.remove('active');
        });
        viewElement.classList.add('active');
    };

    // 1. Home Link Click Handler
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showView(homePage);
        tabButtons.forEach(btn => btn.classList.remove('active'));
    });

    // 2. Tab Click Handler (Calls switchTab which handles initialization)
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            showView(calculatorView); 
            // Call the consolidated switchTab function
            switchTab(btn.dataset.target); 
        });
    });

    // Initialize: Ensure the calculator view is shown on load
    showView(calculatorView);
}

document.addEventListener('DOMContentLoaded', () => {
    // Setup the Home/Calculator view logic
    setupViewSwitcher();
    
    // Set up the initial EMI tab view and trigger its initialization
    // This is the SINGLE SOURCE OF TRUTH for initialization now.
    switchTab('emi-calculator');
});

// Global Helper for CSS variables
function getCssVariable(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Global Helper for Currency
const toCurrency = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

// Exporting helpers for use in emi.js
export { getCssVariable, toCurrency };