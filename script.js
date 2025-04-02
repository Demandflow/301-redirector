// Global variables
let oldUrls = [];
let newUrls = [];

// DOM Elements
const domainInput = document.getElementById('domainInput');
const oldCsvInput = document.getElementById('oldCsvInput');
const newCsvInput = document.getElementById('newCsvInput');
const manualUrlInput = document.getElementById('manualUrlInput');
const addManualUrlButton = document.getElementById('addManualUrl');
const oldUrlStatus = document.getElementById('oldUrlStatus');
const newUrlStatus = document.getElementById('newUrlStatus');
const manualUrlStatus = document.getElementById('manualUrlStatus');
const redirectSection = document.getElementById('redirectSection');
const redirectTableBody = document.getElementById('redirectTableBody');
const exportCsvButton = document.getElementById('exportCsv');
const redirectCount = document.getElementById('redirectCount');
const newUrlsContainer = document.getElementById('newUrlsContainer');
const newUrlsList = document.getElementById('newUrlsList');

// New DOM elements for old URL manual entry
const manualOldUrlInput = document.getElementById('manualOldUrlInput');
const addManualOldUrlButton = document.getElementById('addManualOldUrl');
const manualOldUrlStatus = document.getElementById('manualOldUrlStatus');
const oldUrlsContainer = document.getElementById('oldUrlsContainer');
const oldUrlsList = document.getElementById('oldUrlsList');

// Bulk action buttons
const checkAllBtn = document.getElementById('checkAllBtn');
const uncheckAllBtn = document.getElementById('uncheckAllBtn');
const checkUnmappedBtn = document.getElementById('checkUnmappedBtn');
const checkMappedBtn = document.getElementById('checkMappedBtn');

// Event Listeners
oldCsvInput.addEventListener('change', handleOldCsvUpload);
newCsvInput.addEventListener('change', handleNewCsvUpload);
addManualUrlButton.addEventListener('click', addManualUrl);
addManualOldUrlButton.addEventListener('click', addManualOldUrl);
exportCsvButton.addEventListener('click', exportToCsv);

// Add event listeners for bulk action buttons
checkAllBtn.addEventListener('click', checkAll);
uncheckAllBtn.addEventListener('click', uncheckAll);
checkUnmappedBtn.addEventListener('click', checkUnmapped);
checkMappedBtn.addEventListener('click', checkMapped);

// Helper function to extract slug from a URL
function extractSlug(url) {
    if (!url) return '';
    
    const domain = domainInput.value.trim();
    let slug = url.trim();
    
    // If domain is set, try to remove it from the URL
    if (domain) {
        // Remove protocol and domain
        slug = slug.replace(new RegExp(`^https?://${domain.replace(/^https?:\/\//, '').replace(/\./g, '\\.')}`, 'i'), '');
        // Also try without protocol
        slug = slug.replace(new RegExp(`^${domain.replace(/^https?:\/\//, '').replace(/\./g, '\\.')}`, 'i'), '');
    } else {
        // If no domain is set, just try to extract the path
        // First check if it's already a slug (starts with /)
        if (slug.startsWith('/')) {
            // Already a slug, no changes needed
        } else {
            // Try to extract path from a URL
            try {
                const urlObj = new URL(slug);
                slug = urlObj.pathname + urlObj.search + urlObj.hash;
            } catch (e) {
                // If not a valid URL, just use as is
                // Make sure it starts with /
                if (!slug.startsWith('/') && slug !== '') {
                    slug = '/' + slug;
                }
            }
        }
    }
    
    // Ensure slug starts with /
    if (!slug.startsWith('/') && slug !== '') {
        slug = '/' + slug;
    }
    
    return slug;
}

// Parse CSV content
function parseCSV(csvContent) {
    const lines = csvContent.split(/\r\n|\n|\r/).filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Handle commas within quoted values
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        const entry = {};
        for (let j = 0; j < headers.length && j < values.length; j++) {
            entry[headers[j]] = values[j];
        }
        result.push(entry);
    }
    
    return { headers, data: result };
}

// Handle Old CSV Upload
function handleOldCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvContent = e.target.result;
            const { headers, data } = parseCSV(csvContent);
            
            // Find the column with URL information (typically "Address")
            const urlColumn = headers.find(h => 
                h.toLowerCase().includes('address') || 
                h.toLowerCase().includes('url') || 
                h.toLowerCase() === 'page');
            
            if (!urlColumn) {
                oldUrlStatus.textContent = 'Error: Could not find a URL column in the CSV. Please use a Screaming Frog export with an "Address" column.';
                oldUrlStatus.className = 'status-message error';
                return;
            }
            
            // Find status code column if it exists
            const statusCodeColumn = headers.find(h => 
                h.toLowerCase().includes('status code') || 
                h.toLowerCase() === 'code');
            
            // Filter the data to exclude 301 and 404 status codes
            const filteredData = statusCodeColumn ? 
                data.filter(row => {
                    const statusCode = row[statusCodeColumn];
                    return statusCode !== "301" && statusCode !== "404";
                }) : data;
            
            // Get excluded count
            const excludedCount = data.length - filteredData.length;
            
            // Store existing URLs before adding new ones
            const existingUrls = [...oldUrls];
            
            // Add new old URLs from the CSV, avoiding duplicates
            filteredData.forEach(row => {
                const fullUrl = row[urlColumn];
                const slug = extractSlug(fullUrl);
                
                // Check if URL already exists
                const isDuplicate = existingUrls.some(url => url.slug === slug);
                if (!isDuplicate && slug) {
                    oldUrls.push({
                        fullUrl,
                        slug: slug,
                        originalData: row // Store the original row data for reference
                    });
                }
            });
            
            let successMessage = `Success! Loaded ${oldUrls.length} URLs.`;
            if (excludedCount > 0) {
                successMessage += ` (Excluded ${excludedCount} URLs with status codes 301 or 404)`;
            }
            
            oldUrlStatus.textContent = successMessage;
            oldUrlStatus.className = 'status-message success';
            
            // Display old URLs list
            displayOldUrls();
            
            // Update the redirects table
            updateRedirectTable();
        } catch (error) {
            oldUrlStatus.textContent = `Error: ${error.message}`;
            oldUrlStatus.className = 'status-message error';
        }
    };
    reader.readAsText(file);
}

// Handle New CSV Upload
function handleNewCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvContent = e.target.result;
            const { headers, data } = parseCSV(csvContent);
            
            // Find the column with URL information
            const urlColumn = headers.find(h => 
                h.toLowerCase().includes('address') || 
                h.toLowerCase().includes('url') || 
                h.toLowerCase() === 'page');
            
            if (!urlColumn) {
                newUrlStatus.textContent = 'Error: Could not find a URL column in the CSV.';
                newUrlStatus.className = 'status-message error';
                return;
            }
            
            // Store existing URLs before adding new ones
            const existingUrls = [...newUrls];
            
            // Add new URLs from the CSV
            const newUrlsFromCsv = data.map(row => {
                const fullUrl = row[urlColumn];
                return {
                    fullUrl,
                    slug: extractSlug(fullUrl),
                    originalData: row // Store the original row data for reference
                };
            });
            
            // Filter out duplicates
            newUrlsFromCsv.forEach(newUrl => {
                const isDuplicate = existingUrls.some(url => url.slug === newUrl.slug);
                if (!isDuplicate && newUrl.slug) {
                    newUrls.push(newUrl);
                }
            });
            
            newUrlStatus.textContent = `Success! Added ${newUrlsFromCsv.length} new URLs.`;
            newUrlStatus.className = 'status-message success';
            
            // Update UI
            displayNewUrls();
            updateRedirectTable();
        } catch (error) {
            newUrlStatus.textContent = `Error: ${error.message}`;
            newUrlStatus.className = 'status-message error';
        }
    };
    reader.readAsText(file);
}

// Add manually entered URL
function addManualUrl() {
    const urlValue = manualUrlInput.value.trim();
    if (!urlValue) {
        manualUrlStatus.textContent = 'Please enter a URL or slug.';
        manualUrlStatus.className = 'status-message error';
        return;
    }
    
    const slug = extractSlug(urlValue);
    
    // Check for duplicates
    if (newUrls.some(url => url.slug === slug)) {
        manualUrlStatus.textContent = 'This URL already exists in your list.';
        manualUrlStatus.className = 'status-message error';
        return;
    }
    
    newUrls.push({
        fullUrl: urlValue,
        slug: slug
    });
    
    manualUrlInput.value = '';
    manualUrlStatus.textContent = `Added: ${slug}`;
    manualUrlStatus.className = 'status-message success';
    
    // Update UI
    displayNewUrls();
    updateRedirectTable();
}

// Add manually entered old URL
function addManualOldUrl() {
    const urlValue = manualOldUrlInput.value.trim();
    if (!urlValue) {
        manualOldUrlStatus.textContent = 'Please enter a URL or slug.';
        manualOldUrlStatus.className = 'status-message error';
        return;
    }
    
    const slug = extractSlug(urlValue);
    
    // Check for duplicates
    if (oldUrls.some(url => url.slug === slug)) {
        manualOldUrlStatus.textContent = 'This URL already exists in your list.';
        manualOldUrlStatus.className = 'status-message error';
        return;
    }
    
    oldUrls.push({
        fullUrl: urlValue,
        slug: slug
    });
    
    manualOldUrlInput.value = '';
    manualOldUrlStatus.textContent = `Added old URL: ${slug}`;
    manualOldUrlStatus.className = 'status-message success';
    
    // Update UI
    displayOldUrls();
    updateRedirectTable();
}

// Display list of new URLs
function displayNewUrls() {
    if (newUrls.length > 0) {
        newUrlsContainer.classList.remove('hidden');
        newUrlsList.innerHTML = newUrls.map(url => 
            `<div title="${url.slug}">${url.slug}</div>`
        ).join('');
    } else {
        newUrlsContainer.classList.add('hidden');
    }
}

// Display list of old URLs
function displayOldUrls() {
    if (oldUrls.length > 0) {
        oldUrlsContainer.classList.remove('hidden');
        oldUrlsList.innerHTML = oldUrls.map(url => 
            `<div title="${url.slug}">${url.slug}</div>`
        ).join('');
    } else {
        oldUrlsContainer.classList.add('hidden');
    }
}

// Update redirect table based on old and new URLs
function updateRedirectTable() {
    if (oldUrls.length === 0) {
        redirectSection.classList.add('hidden');
        return;
    }
    
    redirectSection.classList.remove('hidden');
    redirectTableBody.innerHTML = '';
    
    // Group URLs: unmatched first, matched at the bottom
    const unmatchedUrls = [];
    const matchedUrls = [];
    
    oldUrls.forEach((oldUrl, index) => {
        const matchingNewUrl = newUrls.find(newUrl => newUrl.slug === oldUrl.slug);
        if (matchingNewUrl) {
            matchedUrls.push({ oldUrl, index, matchingNewUrl });
        } else {
            unmatchedUrls.push({ oldUrl, index });
        }
    });
    
    // Add unmatched URLs to the table first
    unmatchedUrls.forEach(({ oldUrl, index }) => {
        const row = createTableRow(oldUrl, index, null);
        redirectTableBody.appendChild(row);
    });
    
    // Then add matched URLs
    matchedUrls.forEach(({ oldUrl, index, matchingNewUrl }) => {
        const row = createTableRow(oldUrl, index, matchingNewUrl);
        redirectTableBody.appendChild(row);
    });
    
    updateRedirectCount();
}

// Create a table row for a URL
function createTableRow(oldUrl, index, matchingNewUrl) {
    const row = document.createElement('tr');
    
    // Apply a class if it's a matched URL
    if (matchingNewUrl) {
        row.classList.add('matched-row');
    } else {
        row.classList.add('unmatched-row');
    }
    
    // Old URL cell
    const oldUrlCell = document.createElement('td');
    oldUrlCell.textContent = oldUrl.slug;
    // Add title attribute to show full path on hover
    oldUrlCell.title = oldUrl.slug;
    row.appendChild(oldUrlCell);
    
    // Status cell
    const statusCell = document.createElement('td');
    
    if (matchingNewUrl) {
        statusCell.innerHTML = '<span class="match-found">Match found</span>';
    } else {
        statusCell.innerHTML = '<span class="no-match">No match</span>';
    }
    row.appendChild(statusCell);
    
    // New URL (target) cell
    const newUrlCell = document.createElement('td');
    const newUrlInput = document.createElement('input');
    newUrlInput.type = 'text';
    newUrlInput.placeholder = 'Enter target URL';
    
    // Only set a value if there's a matching URL, otherwise leave it empty
    if (matchingNewUrl) {
        newUrlInput.value = matchingNewUrl.slug;
        // Add title attribute to input for full path on hover
        newUrlInput.title = matchingNewUrl.slug;
    } else {
        newUrlInput.value = '';
    }
    
    newUrlInput.dataset.index = index;
    
    // Add event listener to handle input changes
    newUrlInput.addEventListener('input', function(e) {
        updateRedirectCount();
        
        // Update title attribute to match current value
        e.target.title = e.target.value;
        
        // Visual feedback when user inputs a target URL
        const hasValue = e.target.value.trim() !== '';
        const row = e.target.closest('tr');
        
        if (hasValue) {
            // If input has a value, update row status
            e.target.classList.remove('needs-attention');
            e.target.classList.add('has-mapping');
            
            // Update status cell
            const statusCell = row.querySelector('td:nth-child(2)');
            if (statusCell.querySelector('.no-match')) {
                statusCell.innerHTML = '<span class="mapped-status">Mapped</span>';
            }
            
            // Update select to "Redirect" option when there's a mapping
            const statusSelect = row.querySelector('select.status-select');
            statusSelect.value = 'redirect';
            statusSelect.classList.remove('status-skip');
            statusSelect.classList.add('status-redirect');
        } else {
            // If input is empty, revert status
            e.target.classList.add('needs-attention');
            e.target.classList.remove('has-mapping');
            
            // Update status cell back to original state
            const statusCell = row.querySelector('td:nth-child(2)');
            if (statusCell.querySelector('.mapped-status')) {
                statusCell.innerHTML = '<span class="no-match">No match</span>';
            }
        }
    });
    
    // Highlight inputs that need attention
    if (!matchingNewUrl) {
        newUrlInput.classList.add('needs-attention');
    }
    
    newUrlCell.appendChild(newUrlInput);
    row.appendChild(newUrlCell);
    
    // Action cell with select dropdown instead of checkbox
    const actionCell = document.createElement('td');
    const statusSelect = document.createElement('select');
    statusSelect.className = 'status-select';
    statusSelect.dataset.index = index;
    
    // Add options
    const redirectOption = document.createElement('option');
    redirectOption.value = 'redirect';
    redirectOption.textContent = 'Redirect';
    redirectOption.className = 'status-redirect';
    
    const skipOption = document.createElement('option');
    skipOption.value = 'skip';
    skipOption.textContent = 'Skip';
    skipOption.className = 'status-skip';
    
    statusSelect.appendChild(redirectOption);
    statusSelect.appendChild(skipOption);
    
    // Set default value based on match status
    if (!matchingNewUrl) {
        statusSelect.value = 'redirect';
        statusSelect.classList.add('status-redirect');
    } else {
        statusSelect.value = 'redirect';
        statusSelect.classList.add('status-redirect');
    }
    
    // Add event listener for select change
    statusSelect.addEventListener('change', function(e) {
        updateRedirectCount();
        
        const row = e.target.closest('tr');
        if (e.target.value === 'skip') {
            row.classList.add('skipped-row');
            e.target.classList.remove('status-redirect');
            e.target.classList.add('status-skip');
        } else {
            row.classList.remove('skipped-row');
            e.target.classList.remove('status-skip');
            e.target.classList.add('status-redirect');
        }
    });
    
    actionCell.appendChild(statusSelect);
    row.appendChild(actionCell);
    
    return row;
}

// Bulk Action Functions

// Set all to redirect
function checkAll() {
    const selects = document.querySelectorAll('#redirectTableBody select.status-select');
    selects.forEach(select => {
        select.value = 'redirect';
        select.classList.remove('status-skip');
        select.classList.add('status-redirect');
        // Remove skipped-row class if it exists
        const row = select.closest('tr');
        row.classList.remove('skipped-row');
    });
    updateRedirectCount();
    
    // Show feedback
    showBulkActionFeedback('All set to redirect');
}

// Set all to skip
function uncheckAll() {
    const selects = document.querySelectorAll('#redirectTableBody select.status-select');
    selects.forEach(select => {
        select.value = 'skip';
        select.classList.remove('status-redirect');
        select.classList.add('status-skip');
        // Add skipped-row class
        const row = select.closest('tr');
        row.classList.add('skipped-row');
    });
    updateRedirectCount();
    
    // Show feedback
    showBulkActionFeedback('All set to skip');
}

// Set unmapped URLs to redirect
function checkUnmapped() {
    const rows = document.querySelectorAll('#redirectTableBody tr');
    
    rows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(2)');
        const selectField = row.querySelector('select.status-select');
        
        // Check if this is an unmapped row (has no-match class)
        if (statusCell.querySelector('.no-match')) {
            selectField.value = 'redirect';
            selectField.classList.remove('status-skip');
            selectField.classList.add('status-redirect');
            row.classList.remove('skipped-row');
        } else {
            selectField.value = 'skip';
            selectField.classList.remove('status-redirect');
            selectField.classList.add('status-skip');
            row.classList.add('skipped-row');
        }
    });
    
    updateRedirectCount();
    
    // Show feedback
    showBulkActionFeedback('Only unmapped URLs set to redirect');
}

// Set mapped URLs to redirect
function checkMapped() {
    const rows = document.querySelectorAll('#redirectTableBody tr');
    
    rows.forEach(row => {
        const statusCell = row.querySelector('td:nth-child(2)');
        const selectField = row.querySelector('select.status-select');
        const inputField = row.querySelector('input[type="text"]');
        
        // Check if this is a mapped row (has mapped-status class or match-found class) or has a value in the input
        const isMapped = statusCell.querySelector('.mapped-status') || 
                         statusCell.querySelector('.match-found') ||
                         (inputField && inputField.value.trim() !== '');
        
        if (isMapped) {
            selectField.value = 'redirect';
            selectField.classList.remove('status-skip');
            selectField.classList.add('status-redirect');
            row.classList.remove('skipped-row');
        } else {
            selectField.value = 'skip';
            selectField.classList.remove('status-redirect');
            selectField.classList.add('status-skip');
            row.classList.add('skipped-row');
        }
    });
    
    updateRedirectCount();
    
    // Show feedback
    showBulkActionFeedback('Only mapped URLs set to redirect');
}

// Show feedback for bulk actions
function showBulkActionFeedback(message) {
    // Create a temporary message element
    const feedbackElement = document.createElement('div');
    feedbackElement.className = 'bulk-action-feedback';
    feedbackElement.textContent = message;
    
    // Add it to the UI near the bulk actions
    const bulkActions = document.querySelector('.bulk-actions');
    bulkActions.appendChild(feedbackElement);
    
    // Remove it after a short delay
    setTimeout(() => {
        if (feedbackElement.parentNode) {
            feedbackElement.parentNode.removeChild(feedbackElement);
        }
    }, 2000);
}

// Update redirect count and export button state
function updateRedirectCount() {
    const selects = document.querySelectorAll('#redirectTableBody select.status-select');
    const redirectCount = Array.from(selects).filter(select => select.value === 'redirect').length;
    
    document.getElementById('redirectCount').textContent = `${redirectCount} redirect${redirectCount !== 1 ? 's' : ''} selected`;
    exportCsvButton.disabled = redirectCount === 0;
}

// Export to CSV
function exportToCsv() {
    const rows = Array.from(document.querySelectorAll('#redirectTableBody tr'));
    const redirects = rows
        .filter(row => row.querySelector('select.status-select').value === 'redirect')
        .map(row => {
            const sourceSlug = row.querySelector('td:first-child').textContent;
            const targetSlug = row.querySelector('td:nth-child(3) input').value;
            return { source: sourceSlug, target: targetSlug };
        });
    
    if (redirects.length === 0) {
        alert('No redirects selected for export');
        return;
    }
    
    // Validate all redirects have target values
    const emptyTargets = redirects.filter(r => !r.target.trim());
    if (emptyTargets.length > 0) {
        alert(`${emptyTargets.length} redirect(s) are missing target URLs. Please enter target URLs for all selected redirects.`);
        return;
    }
    
    // Create CSV content
    let csvContent = 'source,target\n';
    csvContent += redirects.map(r => `${r.source},${r.target}`).join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'redirects.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
} 