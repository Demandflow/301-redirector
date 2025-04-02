# 301 Redirect Manager

A simple, browser-based tool to help manage 301 redirects from Screaming Frog CSV exports.

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
- Automatically filters out URLs with status codes 301 or 404
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
   - Upload a Screaming Frog CSV containing your old URLs (URLs with status codes 301 or 404 are automatically filtered out)
   - Manually add individual old URLs using the form below the upload
   - **Important:** If your site already has existing redirects in place, manually add these as old URLs to ensure they're included in your redirect management
5. Add your new URLs using one or both of these methods:
   - Upload a CSV with new URLs
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
The tool expects a Screaming Frog CSV with an "Address" column containing full URLs. It will also look for a "Status Code" column to filter out 301 and 404 pages.

Example:
```
Address,Status Code,Status,Indexability
https://www.example.com/,200,OK,Indexable
https://www.example.com/old-page,200,OK,Indexable
https://www.example.com/redirect-page,301,Moved Permanently,Not Indexable
```

### Output CSV Format
The tool generates a CSV with two columns: source and target.

Example:
```
source,target
/old-page,/new-page
```

## Technical Details

This is a client-side application built with vanilla HTML, CSS, and JavaScript. It runs entirely in your browser and doesn't send any data to external servers. All processing happens locally on your device.

## Customization

With the code now split into separate files, it's easier to customize:

- Modify `styles.css` to change the appearance
- Edit `script.js` to add new features or change how URLs are processed
- Update `index.html` to change the structure or add new UI elements

## Limitations

- The tool extracts URL slugs based on the domain you provide. Make sure to enter your domain correctly.
- The CSV parser handles basic CSV formats. For complex CSVs with special characters, you might need to pre-process your files.
- There's a limit to how large a CSV file can be processed in the browser. Very large files (tens of thousands of rows) might cause performance issues. # 301-redirector
