# WhatsApp Chat to Excel Exporter (with Photo Extraction)

A lightweight, premium, and **100% client-side** web application designed to parse WhatsApp chat logs (`.zip` or `.txt` exports) and convert them into structured Excel (`.xlsx`) files. 

If a WhatsApp chat log is exported **with media**, the tool extracts all sent photos, filters out GIFs, renames the images with clean date-based names (e.g. `Resim_DD_MM_YYYY_1.jpg`), lists them inside the Excel sheet, and packages everything back into a clean `.zip` archive for download.

---

## Key Features

*   **🔒 100% Private & Secure:** All file parsing, unzipping, and Excel generation happen entirely in your local browser. No data is ever uploaded to a server or sent over the internet.
*   **📂 Zip-to-Zip Media Extraction:** Upload a WhatsApp `.zip` export directly. The tool reads the text log, extracts your photos, renames them, and packages a new clean ZIP archive containing both the Excel spreadsheet and a tidy `resimler/` folder.
*   **📅 Date-Preserving Image Renaming:** Heavy, random WhatsApp filenames are converted into a readable format, such as `Resim_01_08_2026_1.jpg`, based on the message timestamp.
*   **🚫 GIF Filtering:** GIF files are automatically detected and filtered out of the final package and spreadsheet, leaving only captured photos.
*   **📱 Smart Multi-OS Parsing:** Automatically handles date, time, and sender layout differences between iOS (iPhone) and Android WhatsApp text logs.
*   **⚡ Offline & USB Ready:** All external libraries (`SheetJS` and `JSZip`) are saved locally in the folder structure. You can drop this project folder into a USB drive and run it on any offline computer without setup.
*   **🎨 Premium Glassmorphic UI:** Features a dark mode interface with responsive layout grids, progress metrics, preview tables, and subtle hover micro-animations.

---

## Directory Structure

This project has been structured cleanly for easy GitHub deployment and workspace organization:

```text
whatsapp_exporter/
├── css/
│   └── styles.css          # WhatsApp dark theme styling
├── js/
│   ├── app.js              # Clean Architecture logic (State, Parser, Exporter, DOM)
│   ├── jszip.min.js        # Local library for client-side ZIP parsing
│   └── xlsx.full.min.js    # Local library for Excel generation
├── index.html              # Main HTML5 entry structure
└── README.md               # English Documentation
```

---

## How to Run

1.  Download or clone this repository.
2.  Open the folder and **double-click `index.html`** to launch it in any modern browser (Chrome, Edge, Firefox, Safari).
3.  *No web server, node_modules installation, or internet connection is required.*

---

## How to Export Your Chat History from WhatsApp

### iOS (iPhone)
1.  Open the chat in WhatsApp and tap the **contact/group name** at the top.
2.  Scroll down to the bottom of the details page and tap **Export Chat**.
3.  Select **Include Media** (if you want photos) or **Without Media** (for text only).
4.  Share/Save the generated `.zip` file to your computer.

### Android
1.  Open the chat in WhatsApp and tap the **three dots (⋮)** in the top right.
2.  Tap **More > Export Chat**.
3.  Select **Without Media** or **Include Media** (if you want photos).
4.  Save the `.zip` or `.txt` file to your computer.

---

## Built With

*   HTML5 & Vanilla CSS3 (Custom grid & flex layout, CSS variables, glassmorphism)
*   Vanilla JavaScript (ES6 Modules, structured Clean Architecture design pattern)
*   [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs) - Client-side spreadsheet generation
*   [JSZip](https://github.com/Stuk/jszip) - Client-side zip file reading/packaging
*   [FontAwesome](https://fontawesome.com/) - Premium interface icons
