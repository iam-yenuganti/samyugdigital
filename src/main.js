// Samyug Digital Website Logic - Indian Localized Version

document.addEventListener('DOMContentLoaded', () => {
  // --- Core Theme Switcher ---
  const themeToggleBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('samyug-theme') || 'dark';

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  }

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('samyug-theme', isLight ? 'light' : 'dark');
  });

  // --- Mobile Dropdown Menu ---
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenuDropdown = document.querySelector('.mobile-menu-dropdown');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  mobileMenuBtn.addEventListener('click', () => {
    mobileMenuDropdown.classList.toggle('open');
  });

  // Close menu on link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenuDropdown.classList.remove('open');
    });
  });

  // --- Services Interactive Tabs ---
  const tabButtons = document.querySelectorAll('.tab-nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Deactivate all buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // Hide all panes
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Activate clicked button
      button.classList.add('active');
      // Show corresponding pane
      const tabId = button.getAttribute('data-tab');
      const targetPane = document.getElementById(`tab-${tabId}`);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

  // --- ROI Calculator Engine (Indian Rupees ₹) ---
  const rangeTraffic = document.getElementById('range-traffic');
  const rangeConversion = document.getElementById('range-conversion');
  const rangeValue = document.getElementById('range-value');
  const rangeBudget = document.getElementById('range-budget');

  const valTraffic = document.getElementById('val-traffic');
  const valConversion = document.getElementById('val-conversion');
  const valValue = document.getElementById('val-value');
  const valBudget = document.getElementById('val-budget');

  const outLeads = document.getElementById('out-leads');
  const outRevenue = document.getElementById('out-revenue');
  const outRoiPercent = document.getElementById('out-roi-percent');
  const outNetProfit = document.getElementById('out-net-profit');
  const outCpl = document.getElementById('out-cpl');
  const circleStrokeFill = document.getElementById('circle-stroke-fill');

  let activeCalculatorMetrics = {
    traffic: 2000,
    conversion: 3.0,
    value: 2500,
    budget: 10000,
    leads: 60
  };

  // Format Helper for Indian Rupees (₹)
  function formatRupees(number, includeDecimals = false) {
    const formatted = Math.round(number).toLocaleString('en-IN');
    return '₹' + formatted;
  }

  function updateCalculator() {
    const traffic = parseInt(rangeTraffic.value);
    const conversion = parseFloat(rangeConversion.value);
    const value = parseInt(rangeValue.value);
    const budget = parseInt(rangeBudget.value);

    // Update Slider text labels
    valTraffic.textContent = traffic.toLocaleString('en-IN');
    valConversion.textContent = conversion.toFixed(1) + '%';
    valValue.textContent = formatRupees(value);
    valBudget.textContent = formatRupees(budget);

    // Calculations
    const leads = Math.round(traffic * (conversion / 100));
    const revenue = leads * value;
    const netProfit = revenue - budget;
    
    // ROI Calculation
    const roiPercentage = budget > 0 ? Math.round((netProfit / budget) * 100) : 0;
    const cpl = leads > 0 ? (budget / leads) : 0;

    // Cache metrics for form submission attaching
    activeCalculatorMetrics = {
      traffic,
      conversion,
      value,
      budget,
      leads
    };

    // Update display values
    outLeads.textContent = leads.toLocaleString('en-IN');
    outRevenue.textContent = formatRupees(revenue);
    outNetProfit.textContent = formatRupees(netProfit);
    outCpl.textContent = cpl > 0 ? '₹' + cpl.toFixed(2) : '₹0.00';
    outRoiPercent.textContent = roiPercentage.toLocaleString('en-IN') + '%';

    // Update Circular Progress
    // SVG circle circumference is ~264 (2 * PI * r = 2 * 3.14159 * 42 = 263.89)
    // We scale the circle progress visual to max out at 1000% ROI.
    const maxVal = 1000;
    const strokeDash = 264;
    const boundedRoi = Math.max(0, Math.min(roiPercentage, maxVal));
    const dashOffset = strokeDash - (strokeDash * (boundedRoi / maxVal));
    circleStrokeFill.style.strokeDashoffset = dashOffset;
  }

  // Bind input listeners
  [rangeTraffic, rangeConversion, rangeValue, rangeBudget].forEach(input => {
    input.addEventListener('input', updateCalculator);
  });

  // Initialize calculations on load
  updateCalculator();

  // ROI Calculator CTA Autofill Hook
  const calcCtaBtn = document.getElementById('calc-cta-btn');
  const autofillIndicator = document.getElementById('autofill-indicator');
  const attachBudget = document.getElementById('attach-budget');
  const attachLeads = document.getElementById('attach-leads');
  let isCalculatorAttached = false;

  calcCtaBtn.addEventListener('click', () => {
    isCalculatorAttached = true;
    attachBudget.textContent = activeCalculatorMetrics.budget.toLocaleString('en-IN');
    attachLeads.textContent = activeCalculatorMetrics.leads.toLocaleString('en-IN');
    autofillIndicator.style.display = 'flex';
    
    // Smooth scroll to contact form
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // --- Lead Sandbox & CRM Simulator ---
  const leadForm = document.getElementById('lead-capture-form');
  const successOverlay = document.getElementById('form-success-overlay');
  const closeSuccessBtn = document.getElementById('close-success-btn');
  const crmLeadsList = document.getElementById('crm-leads-list');
  const crmSeedBtn = document.getElementById('crm-seed-btn');
  const crmClearBtn = document.getElementById('crm-clear-btn');

  // Success Names
  const successUserName = document.getElementById('success-user-name');
  const successBusinessName = document.getElementById('success-business-name');
  const successUserEmail = document.getElementById('success-user-email');

  // Load leads from storage or array
  let storedLeads = JSON.parse(localStorage.getItem('samyug-leads')) || [];

  function saveLeads() {
    localStorage.setItem('samyug-leads', JSON.stringify(storedLeads));
    renderCRM();
  }

  function renderCRM() {
    if (storedLeads.length === 0) {
      crmLeadsList.innerHTML = `
        <div class="crm-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>No enquiries yet. Fill out the contact form or use the Income Estimator to create a live lead!</span>
        </div>
      `;
      return;
    }

    crmLeadsList.innerHTML = '';
    
    // Sort showing newest first
    const sortedLeads = [...storedLeads].reverse();

    sortedLeads.forEach(lead => {
      const dateStr = new Date(lead.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const row = document.createElement('div');
      row.className = `crm-lead-row ${lead.calculatorData ? 'type-calc' : ''}`;
      
      let metaHtml = '';
      if (lead.calculatorData) {
        metaHtml = `
          <div class="crm-lead-meta">
            <span>Budget: ₹${lead.calculatorData.budget.toLocaleString('en-IN')}/mo</span>
            <span>Est. Enquiries: ${lead.calculatorData.leads}</span>
          </div>
        `;
      }

      row.innerHTML = `
        <div class="crm-lead-header">
          <span>${lead.business} (${lead.name})</span>
          <span class="crm-lead-time">${dateStr}</span>
        </div>
        <div class="crm-lead-body">
          <strong>Goal:</strong> ${lead.serviceName} | <strong>Email:</strong> ${lead.email}
          <div style="margin-top: 4px; font-style: italic; opacity: 0.85;">"${lead.message || 'No description provided.'}"</div>
        </div>
        ${metaHtml}
      `;
      crmLeadsList.appendChild(row);
    });
  }

  // Seed Indian sample leads
  const sampleLeads = [
    {
      id: 'sample-1',
      name: 'Rohan Sharma',
      email: 'rohan@sharmasweets.in',
      business: 'Sharma Sweets & Caterers',
      serviceName: 'Fast Mobile Website',
      message: 'We want a simple website to show our catering menu and let customers book orders directly via WhatsApp.',
      timestamp: Date.now() - 120000,
      calculatorData: {
        budget: 10000,
        leads: 60
      }
    },
    {
      id: 'sample-2',
      name: 'Dr. Ananya Karan',
      email: 'dr.ananya@karanclinic.com',
      business: 'Karan Dental Clinic',
      serviceName: 'Local neighborhood ads',
      message: 'Need local Facebook ads to get patient bookings in Indiranagar, Bangalore. Focus on dental implant packages.',
      timestamp: Date.now() - 3600000,
      calculatorData: {
        budget: 25000,
        leads: 120
      }
    },
    {
      id: 'sample-3',
      name: 'Amit Verma',
      email: 'info@vermabuilders.in',
      business: 'Verma Builders & Interiors',
      serviceName: 'Full Online Setup',
      message: 'Need local inquiries for luxury modular kitchen renovations. Want Google Maps setup and Google ads.',
      timestamp: Date.now() - 7200000,
      calculatorData: null
    }
  ];

  crmSeedBtn.addEventListener('click', () => {
    storedLeads = [...storedLeads, ...sampleLeads];
    saveLeads();
  });

  crmClearBtn.addEventListener('click', () => {
    storedLeads = [];
    saveLeads();
  });

  // Handle Form Submit
  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameVal = document.getElementById('form-name').value.trim();
    const emailVal = document.getElementById('form-email').value.trim();
    const businessVal = document.getElementById('form-business').value.trim();
    const serviceSelect = document.getElementById('form-service');
    const serviceName = serviceSelect.options[serviceSelect.selectedIndex].text;
    const messageVal = document.getElementById('form-message').value.trim();

    // Package data
    const newLead = {
      id: 'lead-' + Date.now(),
      name: nameVal,
      email: emailVal,
      business: businessVal,
      serviceName: serviceName,
      message: messageVal,
      timestamp: Date.now(),
      calculatorData: isCalculatorAttached ? { ...activeCalculatorMetrics } : null
    };

    // Save lead
    storedLeads.push(newLead);
    saveLeads();

    // Show Success Modal
    successUserName.textContent = nameVal;
    successBusinessName.textContent = businessVal.split(' ')[0]; // short name
    successUserEmail.textContent = emailVal;
    successOverlay.classList.add('open');

    // Reset Form & Autofill attachment state
    leadForm.reset();
    isCalculatorAttached = false;
    autofillIndicator.style.display = 'none';
  });

  // Close Success Screen
  closeSuccessBtn.addEventListener('click', () => {
    successOverlay.classList.remove('open');
  });

  // Initial CRM render
  renderCRM();

  // --- Scroll animations using Intersection Observer ---
  const animateOnScroll = () => {
    const fadeElements = document.querySelectorAll('.fade-in-element, .timeline-step');
    
    const observerOptions = {
      root: null,
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Trigger once
        }
      });
    }, observerOptions);

    fadeElements.forEach(element => {
      observer.observe(element);
    });
  };

  animateOnScroll();

  // Initial trigger for hero items loaded instantly
  setTimeout(() => {
    const heroElements = document.querySelectorAll('.hero-content, .hero-graphic');
    heroElements.forEach(el => el.classList.add('visible'));
  }, 100);
});
