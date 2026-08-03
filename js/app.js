/**
 * ==========================================================================
 * WHATSAPP EXCEL EXPORTER - CLEAN ARCHITECTURE DESIGN
 * 
 * This application is structured into modular layers to maintain high readability,
 * separation of concerns, and ease of maintenance:
 * 
 * 1. STATE MANAGEMENT: Manages app state and holds mock demo data.
 * 2. CHAT PARSER LAYER (ChatParser): Pure logic for parsing iOS/Android text logs.
 * 3. FILE EXPORTER LAYER (FileExporter): Generates Excel spreadsheets and packages ZIPs.
 * 4. UI & DOM LAYER (DOMManager): Binds events, handles drag & drop, and updates the DOM.
 * ==========================================================================
 */

// ==========================================================================
// 1. STATE MANAGEMENT & STATIC DEMO DATA
// ==========================================================================

const AppState = {
    isZipMode: false,          // True if the uploaded file is a .zip archive
    uploadedZip: null,         // Holds reference to the JSZip instance of the uploaded file
    parsedData: [],            // Holds parsed structured message objects
    renamedImagesMap: {},      // Maps original filenames to safe renamed filenames (e.g. IMG-123.jpg -> Resim_GG_AA_YYYY_X.jpg)
    imageCounter: 0,           // Counter to differentiate multiple images

    /**
     * Resets the application state to prepare for a new file upload
     */
    reset() {
        this.isZipMode = false;
        this.uploadedZip = null;
        this.parsedData = [];
        this.renamedImagesMap = {};
        this.imageCounter = 0;
    }
};

// Realistic mock WhatsApp log with media attachments to easily test the app in the browser
const DEMO_CHAT_DATA = `[01.08.2026, 09:15:30] Ahmet Yılmaz: Günaydın arkadaşlar, proje hakkında konuşmak istiyordum.
[01.08.2026, 09:16:12] Zeynep Kaya: Günaydın Ahmet! Evet, Excel ihracat motoru üzerinde çalışıyordum ben de.
[01.08.2026, 09:17:05] Can Demir: Selamlar, ben de tasarım tarafını hazırlıyorum. Oldukça şık ve modern duruyor.
[01.08.2026, 09:18:22] Ahmet Yılmaz: Süper! Zeynep, Türkçe karakterlerin Excel'de düzgün çıktığından emin olabilir miyiz?
Özellikle "ş, ı, ğ, ç, ö, ü" gibi harfler bazı sistemlerde bozuluyor.
[01.08.2026, 09:19:40] Zeynep Kaya: Kesinlikle. UTF-8 kodlamasını ve SheetJS kütüphanesini kullanıyorum. Excel doğrudan düzgün bir tablo olarak algılayacak.
[01.08.2026, 09:20:10] Can Demir: Harika, dosyayı yüklediğimizde doğrudan tarayıcıda işlenmesi de gizlilik açısından çok iyi oldu.
[01.08.2026, 09:21:00] Ahmet Yılmaz: <ekli: IMG-20260801-WA0001.jpg>
[01.08.2026, 09:21:15] Ahmet Yılmaz: Aynası iştir kişinin lafa bakılmaz :) O zaman kodlamaya devam!
[01.08.2026, 09:22:00] Sistem: Can Demir gruptan ayrıldı.
[01.08.2026, 09:25:00] Zeynep Kaya: Can neden ayrıldı ya? Şaka gibi :)`;


// ==========================================================================
// 2. CHAT PARSER LAYER
// ==========================================================================

const ChatParser = {
    // Android e.g. "20.10.2024 14:32 - Ahmet: Selam" or "10/20/24, 2:32 PM - John: Hello"
    androidRegex: /^(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\s*-\s*([^:]+):\s*(.*)$/i,
    
    // iOS e.g. "[20.10.2024, 14:32:01] Ahmet: Selam" or "[10/20/24, 2:32:01 PM] John: Hello"
    iosRegex: /^\[(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\]\s*([^:]+):\s*(.*)$/i,
    
    // System message matchers (lines with timestamps but having no user-sender colon separator)
    androidSysRegex: /^(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\s*-\s*(.*)$/i,
    iosSysRegex: /^\[(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M)?)\]\s*(.*)$/i,

    /**
     * Main parser that processes raw chat text line-by-line into message objects
     */
    parse(text) {
        const lines = text.split(/\r?\n/);
        const parsedMessages = [];
        let currentMsg = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            let match = line.match(this.iosRegex) || line.match(this.androidRegex);

            if (match) {
                // If we hit a new message, process the previous one and push it to array
                if (currentMsg) {
                    this.processAttachment(currentMsg);
                    parsedMessages.push(currentMsg);
                }
                currentMsg = {
                    date: match[1],
                    time: match[2],
                    sender: match[3].trim(),
                    message: match[4],
                    imageCode: "" // Column field that will show the renamed code in Excel
                };
            } else {
                // Check if it starts with date/time but has no sender (System alert)
                let sysMatch = line.match(this.iosSysRegex) || line.match(this.androidSysRegex);
                if (sysMatch) {
                    if (currentMsg) {
                        this.processAttachment(currentMsg);
                        parsedMessages.push(currentMsg);
                    }
                    currentMsg = {
                        date: sysMatch[1],
                        time: sysMatch[2],
                        sender: "Sistem",
                        message: sysMatch[3],
                        imageCode: ""
                    };
                } else {
                    // Continuation of a multi-line message (append text to previous message)
                    if (currentMsg) {
                        currentMsg.message += "\n" + line;
                    }
                }
            }
        }

        // Push the final message object
        if (currentMsg) {
            this.processAttachment(currentMsg);
            parsedMessages.push(currentMsg);
        }

        return parsedMessages;
    },

    /**
     * Extracts filenames from messages that indicate attachment logs
     */
    extractFilename(message) {
        if (!message) return null;
        
        // 1. iOS: <attached: filename.jpg> or <ekli: filename.jpg>
        let match = message.match(/<(?:attached|ekli):\s*([^>]+)>/i);
        if (match) return match[1].trim();
        
        // 2. Android: filename.jpg (dosya ekte) or filename.jpg (file attached)
        match = message.match(/^([^\(]+?)\s*\((?:dosya ekte|file attached)\)/i);
        if (match) return match[1].trim();

        // 3. Fallback direct match for short text lines ending in image extensions (excludes gifs)
        if (message.length < 150) {
            match = message.match(/([\w\s\-.]+?\.(?:jpe?g|png|webp))/i);
            if (match) return match[1].trim();
        }
        
        return null;
    },

    /**
     * Normalizes date string into safe characters for folder/filenames (e.g. "01.08.2026" -> "01_08_2026")
     */
    cleanDate(dateStr) {
        if (!dateStr) return "tarih_yok";
        let clean = dateStr.replace(/[^0-9]/g, '_');
        if (clean.endsWith('_')) clean = clean.slice(0, -1);
        if (clean.startsWith('_')) clean = clean.slice(1);
        return clean.replace(/_+/g, '_');
    },

    /**
     * Processes attachment logic: checks for images, maps to shortcode (preserving date), cleans up message text
     */
    processAttachment(msg) {
        if (msg.sender === "Sistem") return;
        
        const filename = this.extractFilename(msg.message);
        if (filename) {
            // Filter out GIF files as requested by user
            if (filename.toLowerCase().endsWith(".gif")) {
                return;
            }
            
            let zipPath = null;
            if (AppState.isZipMode && AppState.uploadedZip) {
                zipPath = this.findInZip(AppState.uploadedZip, filename);
            }
            
            // Re-use already processed mappings to avoid renaming duplicates
            if (AppState.renamedImagesMap[filename]) {
                msg.imageCode = AppState.renamedImagesMap[filename].newName;
                msg.message = "[Resim Gönderildi]";
            } else if (zipPath || !AppState.isZipMode) {
                if (AppState.isZipMode) {
                    // Zip Mode: Rename images since we will bundle them in the output zip
                    AppState.imageCounter++;
                    const ext = filename.split('.').pop().toLowerCase();
                    const dateStr = this.cleanDate(msg.date);
                    const newName = `Resim_${dateStr}_${AppState.imageCounter}.${ext}`;
                    
                    AppState.renamedImagesMap[filename] = {
                        zipPath: zipPath,
                        newName: newName
                    };
                    msg.imageCode = newName;
                } else {
                    // Text Mode: Keep original filename so the user can easily search it in their local folder!
                    msg.imageCode = filename;
                }
                msg.message = "[Resim Gönderildi]";
            }
        }
    },

    /**
     * Case-insensitive file lookups inside ZIP archives
     */
    findInZip(zip, filename) {
        let foundPath = null;
        const lowerName = filename.toLowerCase();
        zip.forEach((relativePath) => {
            const basename = relativePath.split('/').pop().toLowerCase();
            if (basename === lowerName) {
                foundPath = relativePath;
            }
        });
        return foundPath;
    }
};


// ==========================================================================
// 3. FILE EXPORTER LAYER
// ==========================================================================

const FileExporter = {
    /**
     * Entry point for downloading files. Branches according to Zip or Text upload mode.
     */
    export() {
        if (AppState.parsedData.length === 0) {
            DOMManager.showToast("Aktarılacak sohbet verisi bulunamadı!", "error");
            return;
        }

        if (!AppState.isZipMode) {
            this.exportExcelDirect();
            return;
        }

        this.exportZipPackage();
    },

    /**
     * Generates a ZIP archive containing the Excel spreadsheet and a 'resimler' folder with renamed images
     */
    exportZipPackage() {
        DOMManager.showToast("Zip paketi hazırlanıyor, lütfen bekleyin...", "success");
        
        try {
            const excelBuffer = this.buildExcelBuffer();
            const newZip = new JSZip();
            
            // Add the Excel table
            newZip.file("sohbet_listesi.xlsx", excelBuffer);
            
            // Create a subfolder inside the ZIP and extract/add images to it asynchronously
            const imgFolder = newZip.folder("resimler");
            const copyPromises = [];

            Object.keys(AppState.renamedImagesMap).forEach(key => {
                const imgInfo = AppState.renamedImagesMap[key];
                if (imgInfo.zipPath) {
                    const promise = AppState.uploadedZip.file(imgInfo.zipPath).async("arraybuffer")
                        .then((buffer) => {
                            imgFolder.file(imgInfo.newName, buffer);
                        });
                    copyPromises.push(promise);
                }
            });

            // Trigger the download once all files are successfully copied
            Promise.all(copyPromises)
                .then(() => newZip.generateAsync({ type: "blob" }))
                .then((blob) => {
                    this.triggerDownload(blob, "whatsapp_sohbet_paketi.zip");
                    DOMManager.showToast("Sohbet paketi (.zip) başarıyla indirildi!", "success");
                })
                .catch((err) => {
                    console.error(err);
                    DOMManager.showToast("Zip paketi oluşturulurken hata meydana geldi!", "error");
                });
                
        } catch (error) {
            console.error(error);
            DOMManager.showToast("Veriler derlenirken hata oluştu!", "error");
        }
    },

    /**
     * Helper to export the spreadsheet directly as an .xlsx file
     */
    exportExcelDirect() {
        try {
            const excelBuffer = this.buildExcelBuffer();
            const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            this.triggerDownload(blob, "whatsapp_sohbet_aktarim.xlsx");
            DOMManager.showToast("Excel dosyası başarıyla indirildi!", "success");
        } catch (error) {
            console.error(error);
            DOMManager.showToast("Excel dosyası oluşturulurken hata meydana geldi!", "error");
        }
    },

    /**
     * Builds SheetJS workbook structure and formats column widths
     */
    buildExcelBuffer() {
        const wsData = AppState.parsedData.map(item => ({
            "Tarih": item.date,
            "Saat": item.time,
            "Gönderici": item.sender,
            "Mesaj": item.message,
            "Görsel Kodu": item.imageCode || ""
        }));
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(wsData);
        
        // Define clean, readable grid widths
        ws['!cols'] = [
            { wch: 14 }, // Tarih
            { wch: 12 }, // Saat
            { wch: 22 }, // Gönderici
            { wch: 50 }, // Mesaj
            { wch: 18 }  // Görsel Kodu
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, "Sohbet Mesajları");
        return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    },

    /**
     * Utility to trigger native browser file download
     */
    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};


// ==========================================================================
// 4. UI & DOM LAYER (DOMManager)
// ==========================================================================

const DOMManager = {
    toastTimeout: null,

    /**
     * Initializer: binds events, setups dropzone behaviors and click handlers
     */
    init() {
        const dropZone = document.getElementById("drop-zone-container");
        const fileInput = document.getElementById("file-input");
        
        // Ensure browser file cache is cleared on page load
        fileInput.value = "";
        
        // Let drop-zone click trigger file explorer input
        dropZone.addEventListener("click", () => fileInput.click());
        
        // Load files upon input selection change
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) this.handleFileSelection(e.target.files[0]);
        });

        // Drag and drop events
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });
        dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            if (e.dataTransfer.files.length > 0) this.handleFileSelection(e.dataTransfer.files[0]);
        });
    },

    /**
     * Switches instruction tabs between iOS and Android
     */
    switchTab(platform) {
        const iosBtn = document.getElementById("btn-tab-ios");
        const androidBtn = document.getElementById("btn-tab-android");
        const iosContent = document.getElementById("tab-content-ios");
        const androidContent = document.getElementById("tab-content-android");
        
        if (platform === "ios") {
            iosBtn.classList.add("active");
            androidBtn.classList.remove("active");
            iosContent.classList.remove("hidden");
            androidContent.classList.add("hidden");
        } else {
            androidBtn.classList.add("active");
            iosBtn.classList.remove("active");
            androidContent.classList.remove("hidden");
            iosContent.classList.add("hidden");
        }
    },

    /**
     * Resets application state and clears results view to start fresh
     */
    clearResults() {
        AppState.reset();
        document.getElementById("file-input").value = "";
        document.getElementById("preview-tbody").innerHTML = "";
        
        // Hide the results panel
        document.getElementById("results-section").classList.add("hidden");
        this.updateExportButton(false);
        
        // Scroll back to the top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.showToast("Uygulama sıfırlandı. Yeni bir sohbet yükleyebilirsiniz.", "success");
    },

    /**
     * Receives file selection and decides whether to decompress zip or parse text
     */
    handleFileSelection(file) {
        AppState.reset();
        this.updateExportButton(false); // Reset export button display to single excel mode

        const filenameLower = file.name.toLowerCase();
        if (filenameLower.endsWith(".txt")) {
            const reader = new FileReader();
            reader.onload = (e) => this.processAndDisplay(e.target.result);
            reader.onerror = () => this.showToast("Dosya okunurken bir hata oluştu!", "error");
            reader.readAsText(file, "UTF-8");
        } else if (filenameLower.endsWith(".zip")) {
            AppState.isZipMode = true;
            this.showToast("Zip arşivi yükleniyor, lütfen bekleyin...", "success");
            
            JSZip.loadAsync(file)
                .then((zip) => {
                    AppState.uploadedZip = zip;
                    let txtFileName = null;
                    
                    // Locate the chat text file inside the zip archive
                    zip.forEach((relativePath) => {
                        if (relativePath.toLowerCase().endsWith(".txt") && !relativePath.includes("__MACOSX")) {
                            txtFileName = relativePath;
                        }
                    });

                    if (!txtFileName) throw new Error("Zip arşivinde sohbet metni (.txt) bulunamadı!");
                    
                    return zip.file(txtFileName).async("string");
                })
                .then((text) => {
                    this.updateExportButton(true); // Switch layout to zip package export
                    this.processAndDisplay(text);
                })
                .catch((err) => {
                    console.error(err);
                    this.showToast(err.message || "Zip dosyası açılırken hata oluştu!", "error");
                });
        } else {
            this.showToast("Desteklenmeyen dosya formatı! Lütfen .txt veya .zip yükleyin.", "error");
        }
    },

    /**
     * Invokes parser, updates metrics, renders the preview table, and scrolls result panel into view
     */
    processAndDisplay(text) {
        AppState.parsedData = ChatParser.parse(text);
        
        if (AppState.parsedData.length === 0) {
            this.showToast("Dosyada geçerli mesaj bulunamadı!", "error");
            return;
        }

        // Render dashboard statistics
        document.getElementById("val-total-messages").textContent = AppState.parsedData.length.toLocaleString();
        
        const participants = new Set(AppState.parsedData.map(m => m.sender).filter(s => s !== "Sistem"));
        document.getElementById("val-total-participants").textContent = participants.size;
        
        const firstDate = AppState.parsedData[0].date;
        const lastDate = AppState.parsedData[AppState.parsedData.length - 1].date;
        document.getElementById("val-date-range").textContent = `${firstDate} - ${lastDate}`;

        // Populate table preview (limit view to first 15 entries)
        const tbody = document.getElementById("preview-tbody");
        tbody.innerHTML = "";
        
        const limit = Math.min(15, AppState.parsedData.length);
        for (let i = 0; i < limit; i++) {
            const msg = AppState.parsedData[i];
            const row = document.createElement("tr");
            
            const cells = [msg.date, msg.time, msg.sender, msg.message, msg.imageCode || ""];
            cells.forEach((val, idx) => {
                const td = document.createElement("td");
                td.textContent = val;
                
                // Visual indicators for metadata cells
                if (idx === 2 && val === "Sistem") {
                    td.style.color = "#ffd166";
                    td.style.fontStyle = "italic";
                }
                if (idx === 4 && val) {
                    td.style.color = "#00a884";
                    td.style.fontWeight = "600";
                }
                row.appendChild(td);
            });
            tbody.appendChild(row);
        }

        // Display results panel
        document.getElementById("results-section").classList.remove("hidden");
        this.showToast(`Sohbet dosyası başarıyla işlendi! ${AppState.parsedData.length} satır yüklendi.`, "success");
        
        // Scroll smoothly to results view
        setTimeout(() => {
            document.getElementById("results-section").scrollIntoView({ behavior: 'smooth' });
        }, 100);
    },

    /**
     * Updates export download button text and icon dynamically
     */
    updateExportButton(isZip) {
        const btnText = document.getElementById("btn-export-text");
        const btnIcon = document.getElementById("btn-export-icon");
        if (isZip) {
            btnText.textContent = "Excel & Resimleri İndir (.zip)";
            btnIcon.className = "fas fa-file-zipper";
        } else {
            btnText.textContent = "Excel (.xlsx) Olarak İndir";
            btnIcon.className = "fas fa-file-excel";
        }
    },

    /**
     * Notification popups helper
     */
    showToast(message, type = "success") {
        const toast = document.getElementById("toast-notification");
        const toastMsg = document.getElementById("toast-message");
        const toastIcon = toast.querySelector(".toast-icon");
        
        toastMsg.textContent = message;
        toast.className = "toast";
        toastIcon.className = "toast-icon fas";
        
        if (type === "success") {
            toast.classList.add("toast-success");
            toastIcon.classList.add("fa-check-circle");
        } else {
            toast.classList.add("toast-error");
            toastIcon.classList.add("fa-triangle-exclamation");
        }
        
        toast.classList.remove("hidden");
        
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => toast.classList.add("hidden"), 4000);
    }
};


// ==========================================================================
// 5. APPLICATION INITIALIZATION HOOKS
// ==========================================================================

// Bind DOM event listeners on load
DOMManager.init();

// Binding trigger functions for HTML onclick attributes
function loadDemoData() {
    AppState.reset();
    DOMManager.updateExportButton(false);
    DOMManager.processAndDisplay(DEMO_CHAT_DATA);
}

function exportZipPackage() {
    FileExporter.export();
}

function switchTab(platform) {
    DOMManager.switchTab(platform);
}

function clearData() {
    DOMManager.clearResults();
}
