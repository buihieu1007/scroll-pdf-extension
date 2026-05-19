# Continuous PDF Capture Extension

A powerful Chrome extension that bypasses standard print limitations to capture webpages—or specific isolated regions—as **single, continuous PDF files**. 

Unlike standard "Print to PDF" or screenshot tools, this extension generates a seamless, high-fidelity vector PDF with selectable text, without any awkward page breaks that cut images or paragraphs in half.

## Features

- **Continuous 1-Page Output:** Generates a single, infinitely tall PDF file matching the exact height of your content. No more page breaks.
- **Region of Interest (ROI) Selection:** Includes a DevTools-style "Select Region" mode. Click on any specific article container or column to completely isolate it from the rest of the webpage (removing sidebars, navigation, etc.).
- **Automatic Sticky Header Removal:** Bypasses sticky headers to ensure clean captures.
- **Selectable Text & Vector Graphics:** Because it utilizes Chrome's native print engine instead of taking image screenshots, all text remains selectable and scalable.
- **No External Dependencies:** Operates entirely locally using Chrome DevTools Protocol (`Page.printToPDF`). No heavy PDF merging libraries required.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button and select the directory containing this extension.

## Usage

### Method 1: Capture the Whole Page
1. Scroll down to the exact point on the page where you want the PDF capture to begin. *(Note: If the page contains lazy-loaded images, scroll to the bottom quickly to load them first, then scroll back up to your starting point).*
2. Open the extension popup.
3. Click **"Save Page as PDF"**.
4. The extension will automatically calculate the full height of the document, generate a continuous PDF, and download it instantly.

### Method 2: Capture a Specific Region (Focus Mode)
1. Open the extension popup.
2. Click **"Select Region (Optional)"**.
3. Your mouse will turn into a crosshair. Hover over the webpage to highlight different containers in blue.
4. Click on the container you want to isolate (e.g., the main article text).
5. Open the extension popup again and click **"Save Page as PDF"**. The extension will completely eradicate all outside sidebars and headers, and generate a continuous PDF of *only* your selected region.

## How It Works (The Hack)
Standard `window.print()` is constrained by fixed paper dimensions (like US Letter or A4) and applies unpredictable scaling and automatic page-break gaps. 

This extension injects dynamic `@media print` CSS into the page right before capturing, forcing the PDF "paper size" to dynamically match the exact pixel dimensions of the webpage's content area (e.g., `@page { size: 1000px 15000px }`). It then uses Chrome's hidden `Page.printToPDF` API to execute the capture, resulting in a perfect 1:1 vector snapshot of the scrollable content.
