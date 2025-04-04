// Global variables
let oldUrls = [];
let newUrls = [];
let existingRedirects = []; // Store existing redirects

// DOM Elements
const oldCsvInput = document.getElementById('oldCsvInput');
const newCsvInput = document.getElementById('newCsvInput');
const existingRedirectsInput = document.getElementById('existingRedirectsInput');
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
const existingRedirectsContainer = document.getElementById('existingRedirectsContainer');
const existingRedirectsList = document.getElementById('existingRedirectsList');
const existingRedirectStatus = document.getElementById('existingRedirectStatus');

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
existingRedirectsInput.addEventListener('change', handleExistingRedirectsUpload);
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
    
    let slug = url.trim();
    
    // Check if it's already a slug (starts with /)
    if (slug.startsWith('/')) {
        // Already a slug, no changes needed
        return slug;
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
    
    // Ensure slug starts with /
    if (!slug.startsWith('/') && slug !== '') {
        slug = '/' + slug;
    }
    
    return slug;
}

// Handle Existing Redirects Upload
function handleExistingRedirectsUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvContent = e.target.result;
            const { headers, data } = parseCSV(csvContent);
            
            // Clear existing redirects
            existingRedirects = [];
            
            // Check if this is a standard source,target format or needs column identification
            const sourceColumn = headers.find(h => 
                h.toLowerCase() === 'source' || 
                h.toLowerCase().includes('old') ||
                h.toLowerCase().includes('from'));
                
            const targetColumn = headers.find(h => 
                h.toLowerCase() === 'target' || 
                h.toLowerCase().includes('new') ||
                h.toLowerCase().includes('to'));
            
            if (!sourceColumn || !targetColumn) {
                existingRedirectStatus.textContent = 'Error: Could not identify source and target columns in the CSV. Please ensure your CSV has "source" and "target" columns.';
                existingRedirectStatus.className = 'status-message error';
                return;
            }
            
            // Add redirects from the CSV
            data.forEach(row => {
                const sourceUrl = extractSlug(row[sourceColumn]);
                const targetUrl = extractSlug(row[targetColumn]);
                
                if (sourceUrl && targetUrl) {
                    existingRedirects.push({
                        source: sourceUrl,
                        target: targetUrl
                    });
                }
            });
            
            // Display success message
            existingRedirectStatus.textContent = `Success! Loaded ${existingRedirects.length} existing redirects.`;
            existingRedirectStatus.className = 'status-message success';
            
            // Display existing redirects
            displayExistingRedirects();
            
            // Update redirect table to check for conflicts
            updateRedirectTable();
        } catch (error) {
            existingRedirectStatus.textContent = `Error: ${error.message}`;
            existingRedirectStatus.className = 'status-message error';
        }
    };
    reader.readAsText(file);
}

// Display list of existing redirects
function displayExistingRedirects() {
    if (existingRedirects.length > 0) {
        existingRedirectsContainer.classList.remove('hidden');
        existingRedirectsList.innerHTML = existingRedirects.map(redirect => 
            `<div title="${redirect.source} → ${redirect.target}">${redirect.source} → ${redirect.target}</div>`
        ).join('');
    } else {
        existingRedirectsContainer.classList.add('hidden');
    }
}

// Check if a redirect would create a loop or conflict
function checkRedirectConflicts(sourceSlug, targetSlug) {
    if (!sourceSlug || !targetSlug) return { hasConflict: false };
    
    // Direct loop: A → A
    if (sourceSlug === targetSlug) {
        return {
            hasConflict: true,
            type: 'self-redirect',
            message: 'Self-redirect: The source and target URLs are the same'
        };
    }
    
    // Check existing redirects for conflicts
    for (const redirect of existingRedirects) {
        // Case 1: Creating a redirect that already exists but with a different target
        // Existing: A → B, New: A → C
        if (redirect.source === sourceSlug && redirect.target !== targetSlug) {
            return {
                hasConflict: true,
                type: 'different-target',
                message: `Conflict: This URL already redirects to ${redirect.target}`
            };
        }
        
        // Case 2: Direct loop with existing redirect
        // Existing: A → B, New: B → A
        if (redirect.source === targetSlug && redirect.target === sourceSlug) {
            return {
                hasConflict: true,
                type: 'direct-loop',
                message: 'Redirect loop: This would create a direct redirect loop'
            };
        }
        
        // Case 3: Redirecting to a URL that is itself being redirected
        // Existing: B → C, New: A → B
        if (redirect.source === targetSlug) {
            return {
                hasConflict: true,
                type: 'chained-redirect',
                message: `Chain warning: The target URL redirects to ${redirect.target}`
            };
        }
        
        // Case 4: Creating a redirect for a URL that already has redirects pointing to it
        // Existing: A → B, New: B → C
        if (redirect.target === sourceSlug) {
            return {
                hasConflict: true,
                type: 'target-moved',
                message: 'Warning: Other URLs redirect to this source'
            };
        }
    }
    
    // Check proposed redirects in the table
    const rows = document.querySelectorAll('#redirectTableBody tr');
    for (const row of rows) {
        const rowSource = row.querySelector('td:first-child').textContent;
        const rowTarget = row.querySelector('td:nth-child(3) input').value;
        
        // Skip empty targets or self
        if (!rowTarget || rowSource === sourceSlug) continue;
        
        // Case 5: Creating a redirect that conflicts with a proposed redirect
        if (rowSource === sourceSlug && rowTarget !== targetSlug) {
            return {
                hasConflict: true,
                type: 'proposed-conflict',
                message: 'Conflict: This URL is already being redirected in the table'
            };
        }
        
        // Case 6: Direct loop with a proposed redirect
        if (rowSource === targetSlug && rowTarget === sourceSlug) {
            return {
                hasConflict: true,
                type: 'proposed-loop',
                message: 'Redirect loop: This would create a loop with another proposed redirect'
            };
        }
    }
    
    return { hasConflict: false };
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
            
            // Filter the data to exclude 301, 404, and 502 status codes
            const filteredData = statusCodeColumn ? 
                data.filter(row => {
                    const statusCode = row[statusCodeColumn];
                    return !["301", "404", "502"].includes(statusCode);
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
                successMessage += ` (Excluded ${excludedCount} URLs with status codes 301, 404, or 502)`;
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
            
            // Find status code column if it exists
            const statusCodeColumn = headers.find(h => 
                h.toLowerCase().includes('status code') || 
                h.toLowerCase() === 'code');
            
            // Filter the data to exclude 301, 404, and 502 status codes
            const filteredData = statusCodeColumn ? 
                data.filter(row => {
                    const statusCode = row[statusCodeColumn];
                    return !["301", "404", "502"].includes(statusCode);
                }) : data;
            
            // Get excluded count
            const excludedCount = data.length - filteredData.length;
            
            // Store existing URLs before adding new ones
            const existingUrls = [...newUrls];
            
            // Add new URLs from the CSV
            const newUrlsFromCsv = filteredData.map(row => {
                const fullUrl = row[urlColumn];
                return {
                    fullUrl,
                    slug: extractSlug(fullUrl),
                    originalData: row // Store the original row data for reference
                };
            });
            
            // Filter out duplicates
            let addedCount = 0;
            newUrlsFromCsv.forEach(newUrl => {
                const isDuplicate = existingUrls.some(url => url.slug === newUrl.slug);
                if (!isDuplicate && newUrl.slug) {
                    newUrls.push(newUrl);
                    addedCount++;
                }
            });
            
            let successMessage = `Success! Added ${addedCount} new URLs.`;
            if (excludedCount > 0) {
                successMessage += ` (Excluded ${excludedCount} URLs with status codes 301, 404, or 502)`;
            }
            
            newUrlStatus.textContent = successMessage;
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
    
    // New URL (target) cell with dropdown
    const newUrlCell = document.createElement('td');
    
    // Create autocomplete container
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'autocomplete-container';
    
    // Create conflict warning element
    const conflictWarning = document.createElement('div');
    conflictWarning.className = 'conflict-warning hidden';
    autocompleteContainer.appendChild(conflictWarning);
    
    // Create input field
    const newUrlInput = document.createElement('input');
    newUrlInput.type = 'text';
    newUrlInput.placeholder = 'Enter or select target URL';
    newUrlInput.className = 'autocomplete-input';
    
    // Only set a value if there's a matching URL, otherwise leave it empty
    if (matchingNewUrl) {
        newUrlInput.value = matchingNewUrl.slug;
        newUrlInput.title = matchingNewUrl.slug;
        
        // Check for conflicts with existing redirects
        const conflict = checkRedirectConflicts(oldUrl.slug, matchingNewUrl.slug);
        if (conflict.hasConflict) {
            conflictWarning.textContent = conflict.message;
            conflictWarning.classList.remove('hidden');
            
            // Add class based on conflict type
            if (conflict.type === 'direct-loop' || conflict.type === 'proposed-loop' || conflict.type === 'self-redirect') {
                conflictWarning.classList.add('conflict-critical');
            } else {
                conflictWarning.classList.add('conflict-warning');
            }
        }
    } else {
        newUrlInput.value = '';
    }
    
    newUrlInput.dataset.index = index;
    
    // Create dropdown for suggestions
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'autocomplete-dropdown';
    
    // Add event listener to handle input changes
    newUrlInput.addEventListener('input', function(e) {
        updateRedirectCount();
        
        // Update title attribute to match current value
        e.target.title = e.target.value;
        
        // Show dropdown with filtered results
        showAutocompleteDropdown(e.target, dropdownContainer);
        
        // Check for conflicts with the entered URL
        const sourceSlug = oldUrl.slug;
        const targetSlug = e.target.value.trim();
        
        // Clear previous conflict warnings
        conflictWarning.textContent = '';
        conflictWarning.className = 'conflict-warning hidden';
        
        if (targetSlug) {
            const conflict = checkRedirectConflicts(sourceSlug, targetSlug);
            if (conflict.hasConflict) {
                conflictWarning.textContent = conflict.message;
                conflictWarning.classList.remove('hidden');
                
                // Add class based on conflict type
                if (conflict.type === 'direct-loop' || conflict.type === 'proposed-loop' || conflict.type === 'self-redirect') {
                    conflictWarning.classList.add('conflict-critical');
                } else {
                    conflictWarning.classList.add('conflict-warning');
                }
            }
        }
        
        // Visual feedback when user inputs a target URL
        const hasValue = targetSlug !== '';
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
    
    // Add focus event to show all suggestions
    newUrlInput.addEventListener('focus', function(e) {
        showAutocompleteDropdown(e.target, dropdownContainer, true);
    });
    
    // Add blur event to hide dropdown (with delay to allow click)
    newUrlInput.addEventListener('blur', function() {
        setTimeout(() => {
            dropdownContainer.innerHTML = '';
            dropdownContainer.classList.remove('show');
        }, 200);
    });
    
    // Highlight inputs that need attention
    if (!matchingNewUrl) {
        newUrlInput.classList.add('needs-attention');
    }
    
    autocompleteContainer.appendChild(newUrlInput);
    autocompleteContainer.appendChild(dropdownContainer);
    newUrlCell.appendChild(autocompleteContainer);
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

// Show autocomplete dropdown with suggestions
function showAutocompleteDropdown(inputElement, dropdownElement, showAll = false) {
    const inputValue = inputElement.value.toLowerCase();
    
    // Clear current dropdown
    dropdownElement.innerHTML = '';
    
    // Filter new URLs based on input
    let filteredUrls = [];
    
    if (showAll || inputValue.length > 0) {
        // If showAll is true or there's input text, filter the URLs
        filteredUrls = newUrls.filter(url => {
            if (showAll && inputValue.length === 0) return true;
            return url.slug.toLowerCase().includes(inputValue);
        });
        
        // Sort the results: exact matches first, then by length
        filteredUrls.sort((a, b) => {
            const aExact = a.slug.toLowerCase() === inputValue;
            const bExact = b.slug.toLowerCase() === inputValue;
            
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            
            return a.slug.length - b.slug.length;
        });
        
        // Limit to first 15 items for performance
        filteredUrls = filteredUrls.slice(0, 15);
        
        // If we have results to show
        if (filteredUrls.length > 0) {
            dropdownElement.classList.add('show');
            
            // Add a suggestion to create a custom entry if it doesn't match exactly
            const exactMatch = filteredUrls.some(url => url.slug.toLowerCase() === inputValue);
            
            // Create dropdown items
            filteredUrls.forEach(url => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = url.slug;
                item.title = url.slug; // For hover on long paths
                
                // Highlight if it's an exact match
                if (url.slug.toLowerCase() === inputValue) {
                    item.classList.add('exact-match');
                }
                
                // Add click handler to select this item
                item.addEventListener('click', function() {
                    inputElement.value = url.slug;
                    inputElement.title = url.slug;
                    dropdownElement.innerHTML = '';
                    dropdownElement.classList.remove('show');
                    
                    // Trigger input event to update UI state
                    inputElement.dispatchEvent(new Event('input'));
                });
                
                dropdownElement.appendChild(item);
            });
            
            // If input has content but no exact match, add option to use custom value
            if (inputValue.length > 0 && !exactMatch) {
                // First add a divider
                const divider = document.createElement('div');
                divider.className = 'autocomplete-divider';
                dropdownElement.appendChild(divider);
                
                // Then add the custom option
                const customItem = document.createElement('div');
                customItem.className = 'autocomplete-item autocomplete-custom';
                customItem.innerHTML = `
                    <span>Use custom value:</span>
                    <strong>${inputValue.startsWith('/') ? inputValue : '/' + inputValue}</strong>
                `;
                
                // Add click handler to use the custom value
                customItem.addEventListener('click', function() {
                    const formattedValue = inputValue.startsWith('/') ? inputValue : '/' + inputValue;
                    inputElement.value = formattedValue;
                    inputElement.title = formattedValue;
                    dropdownElement.innerHTML = '';
                    dropdownElement.classList.remove('show');
                    
                    // Trigger input event to update UI state
                    inputElement.dispatchEvent(new Event('input'));
                });
                
                dropdownElement.appendChild(customItem);
            }
        } else if (inputValue.length > 0) {
            // No matches but has input, show option to create custom value
            dropdownElement.classList.add('show');
            
            const customItem = document.createElement('div');
            customItem.className = 'autocomplete-item autocomplete-custom';
            customItem.innerHTML = `
                <span>Use custom value:</span>
                <strong>${inputValue.startsWith('/') ? inputValue : '/' + inputValue}</strong>
            `;
            
            // Add click handler
            customItem.addEventListener('click', function() {
                const formattedValue = inputValue.startsWith('/') ? inputValue : '/' + inputValue;
                inputElement.value = formattedValue;
                inputElement.title = formattedValue;
                dropdownElement.innerHTML = '';
                dropdownElement.classList.remove('show');
                
                // Trigger input event to update UI state
                inputElement.dispatchEvent(new Event('input'));
            });
            
            dropdownElement.appendChild(customItem);
        } else {
            // No input and not showing all, hide dropdown
            dropdownElement.classList.remove('show');
        }
    } else {
        // Hide dropdown if no input and not showing all
        dropdownElement.classList.remove('show');
    }
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
    
    // Check for critical conflicts
    let hasCriticalConflicts = false;
    const conflictMessages = [];
    
    redirects.forEach(redirect => {
        const conflict = checkRedirectConflicts(redirect.source, redirect.target);
        if (conflict.hasConflict && 
            (conflict.type === 'direct-loop' || 
             conflict.type === 'proposed-loop' || 
             conflict.type === 'self-redirect')) {
            hasCriticalConflicts = true;
            conflictMessages.push(`${redirect.source} → ${redirect.target}: ${conflict.message}`);
        }
    });
    
    if (hasCriticalConflicts) {
        const confirmExport = confirm(`Warning: The following critical conflicts were detected:\n\n${conflictMessages.join('\n')}\n\nThese will cause redirect loops. Do you still want to export?`);
        if (!confirmExport) {
            return;
        }
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