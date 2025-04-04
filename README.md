# 301 Redirect Manager

A simple, user-friendly web application for managing 301 redirects from Screaming Frog CSV exports.

## Key Features

- **Intuitive Interface**: Easily manage redirects from old URLs to new URLs with a clean, spreadsheet-like interface.
- **CSV Import**: Import URLs directly from Screaming Frog CSV exports.
- **Smart Matching**: Automatically identifies exact URL matches between old and new sites.
- **Conflict Detection**: Automatically identifies and warns about potential redirect loops and conflicts.
- **Existing Redirects Support**: Import your current redirects to ensure new ones don't create conflicts.
- **Intelligent URL Selection**: Dropdown autocomplete for selecting target URLs from your new site, ensuring redirects only point to valid pages.
- **URL Filtering**: Automatically excludes URLs with 301, 404, or 502 status codes from both old and new site imports.
- **Bulk Management**: Quickly check or uncheck multiple URLs at once.
- **Visual Feedback**: Clear visual cues for matched, unmatched, and mapped URLs.
- **CSV Export**: Generate a clean CSV with source and target URLs for implementing redirects.

## Usage

1. **Import Existing Redirects**: (Optional) Upload any redirects already implemented on your site to prevent conflicts.
2. **Import Old URLs**: Upload a Screaming Frog CSV export from your old site. URLs with status codes 301, 404, or 502 will be automatically filtered out.
3. **Import New URLs**: Upload a Screaming Frog CSV export from your new site. URLs with status codes 301, 404, or 502 will also be automatically filtered out.
4. **Map Redirects**: For each old URL:
   - The system will automatically match identical URLs
   - For unmatched URLs, use the dropdown to select from available new URLs
   - The dropdown will filter as you type to help find relevant matches
   - Pay attention to any conflict warnings that appear
5. **Review Conflicts**: The tool will automatically detect and warn about:
   - Direct redirect loops (A → B, B → A)
   - Self-redirects (A → A)
   - Conflicts with existing redirects
   - Chains of redirects that could be simplified
6. **Manage Bulk Actions**: Use the buttons to check/uncheck redirects in bulk.
7. **Export**: Generate a clean CSV file with your redirect mappings. The tool will provide a final warning if critical conflicts remain.

## Technical Details

- Built with vanilla JavaScript, HTML, and CSS.
- No server-side processing - everything happens in your browser.
- No external dependencies required.
- Works with standard Screaming Frog CSV exports.

## Tips

- URLs with status codes 301, 404, or 502 are automatically filtered out from both old and new site imports.
- Matched URLs are grayed out and moved to the bottom for clarity.
- Unmapped URLs remain at the top, making it easy to focus on what needs attention.
- You can use the "Skip" option for URLs you don't want to redirect.
- Target URLs can only be selected from your new site list, preventing broken redirects.
- Red warnings indicate critical conflicts that will create redirect loops.
- Yellow warnings indicate potential issues that may not be problematic but should be reviewed.

## Conflict Detection

The tool detects several types of redirect conflicts:

1. **Self-Redirects**: When a URL redirects to itself (A → A)
2. **Direct Loops**: When two URLs redirect to each other (A → B, B → A)
3. **Different Targets**: When an existing redirect points to a different target (Existing: A → B, New: A → C)
4. **Chained Redirects**: When the target of a redirect is itself being redirected (B → C, A → B)
5. **Target Moved**: When other URLs redirect to a URL you're now redirecting elsewhere

## CSV Format for Existing Redirects

The tool expects a CSV with source and target columns for existing redirects:

```
source,target
/old-page,/new-page
/another-old-page,/another-new-page
```

You can also use columns named "from/to" or "old/new" and the tool will automatically detect them.

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge).

## Features

- Upload a CSV from Screaming Frog containing old URLs
- Manually add individual old URLs without requiring a CSV
- Upload a CSV with new URLs or manually add new URLs
- Automatically match old URLs against new URLs
- Easily identify which URLs need redirects
- Intuitive visual feedback when mapping URLs
- Bulk actions to quickly manage multiple redirects
- Modern spreadsheet-like interface similar to Airtable
- Export a CSV file with source and target URLs for implementing redirects
- Automatically filters out URLs with status codes 301, 404, or 502 from both old and new site imports
- Prioritizes URLs that need attention by placing them at the top
- Moves matched URLs to the bottom and grays them out for clarity

## Project Structure

The application is organized into three files:
- `index.html` - The HTML structure of the application
- `styles.css` - The CSS styles for the application
- `script.js` - The JavaScript functionality

## How to Use

1. Download all three files (`index.html`, `styles.css`, and `script.js`) to the same directory on your computer
2. Open the `index.html` file with any modern web browser (Chrome, Firefox, Safari, Edge)
3. *Optional:* Enter your domain (e.g., `https://www.example.com`) if your URLs include the full domain - this helps extract just the slug portion
   - If your URLs are already in slug format (e.g., "/path/to/page"), you can skip this step
4. Add your old URLs using one or both of these methods:
   - Upload a Screaming Frog CSV containing your old URLs (URLs with status codes 301, 404, or 502 are automatically filtered out)
   - Manually add individual old URLs using the form below the upload
   - **Important:** If your site already has existing redirects in place, manually add these as old URLs to ensure they're included in your redirect management
5. Add your new URLs using one or both of these methods:
   - Upload a CSV with new URLs (URLs with status codes 301, 404, or 502 are automatically filtered out)
   - Manually add individual new URLs
6. Review the table of old URLs and:
   - URLs needing attention are highlighted at the top with empty target fields
   - Enter a target URL for each unmapped URL (the field will turn green with visual feedback)
   - The status will change from "No match - needs mapping" to "Mapped" once entered
   - URLs with exact matches are grayed out and moved to the bottom
   - You can set a URL's status to "Skip" from the dropdown (it will be crossed out)
7. Use the bulk action buttons to manage multiple redirects at once:
   - "Set All to Redirect" - Sets all URLs to be redirected
   - "Set All to Skip" - Sets all URLs to be skipped
   - "Redirect Unmapped" - Only sets unmapped URLs to be redirected
   - "Redirect Mapped" - Only sets mapped URLs to be redirected
8. Click "Export to CSV" to download a file containing source and target URLs for all redirects

## Visual Mapping Workflow

The application provides clear visual cues to guide you through the mapping process:

1. **Needs Mapping (Red)**: URLs without matches have empty target fields with red borders
2. **Mapped (Green)**: Once you enter a target URL, the field turns green and the status changes to "Mapped"
3. **Skipped (Strikethrough)**: Setting a URL's status to "Skip" will cross it out, indicating it won't be included in export
4. **Exact Match (Gray)**: URLs with exact matches are automatically grayed out and moved to the bottom

## Bulk Management

For large datasets, the bulk action buttons provide efficient ways to manage redirects:

- **Set All to Redirect**: Quickly select all URLs for redirection
- **Set All to Skip**: Mark all URLs to be skipped (useful when you want to start fresh)
- **Redirect Unmapped**: Only select URLs that still need mapping for redirection
- **Redirect Mapped**: Only select URLs that have already been mapped for redirection

## CSV Format

### Input CSV Format (Screaming Frog)
The tool expects a Screaming Frog CSV with an "Address" column containing full URLs. It will also look for a "Status Code" column to filter out URLs with status codes 301, 404, and 502.

Example:
```
Address,Status Code,Status,Indexability
https://www.example.com/,200,OK,Indexable
https://www.example.com/old-page,200,OK,Indexable
https://www.example.com/redirect-page,301,Moved Permanently,Not Indexable
https://www.example.com/not-found,404,Not Found,Not Indexable
https://www.example.com/server-error,502,Bad Gateway,Not Indexable
```

### Output CSV Format
The tool generates a CSV with two columns: source and target.

Example:
```
source,target
/old-page,/new-page
```

## Customization

With the code now split into separate files, it's easier to customize:

- Modify `styles.css` to change the appearance
- Edit `script.js` to add new features or change how URLs are processed
- Update `index.html` to change the structure or add new UI elements

## Limitations

- The tool extracts URL slugs based on the domain you provide. Make sure to enter your domain correctly.
- The CSV parser handles basic CSV formats. For complex CSVs with special characters, you might need to pre-process your files.
- There's a limit to how large a CSV file can be processed in the browser. Very large files (tens of thousands of rows) might cause performance issues.
