import { defaultData } from './App';

/**
 * Extracts raw textual array blocks from DOCX or PDF payloads.
 */
async function extractRawText(file, onProgress) {
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (extension === '.docx' || extension === '.doc') {
        if (onProgress) onProgress("Parsing Word Document...");
        const { default: mammoth } = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return { textStr: result.value || "", rawOcrText: "", isOcrTriggered: false };
    }

    if (extension === '.pdf') {
        if (onProgress) onProgress("Extracting PDF Text Layer...");
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;

        const numPages = pdf.numPages;
        let textStr = "";

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            let lastY = -1;
            let pageText = "";

            for (let item of textContent.items) {
                if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 4) {
                    pageText += "\n";
                } else if (lastY !== -1 && item.str.trim() !== '') {
                    pageText += " ";
                }
                pageText += item.str.trim();
                lastY = item.transform[5];
            }
            textStr += pageText + "\n";
        }

        const totalWords = textStr.split(/\s+/).filter(Boolean).length;
        const singleChars = (textStr.match(/\b[A-Za-z]\b/g) || []).length;

        let isPoorExtraction = false;
        if (textStr.trim().length < 250) isPoorExtraction = true;
        if (totalWords > 0 && (singleChars / totalWords) > 0.35) isPoorExtraction = true;

        if (isPoorExtraction) {
            try {
                if (onProgress) onProgress("Initializing Optical Character Recognition (OCR)...");
                const { createWorker } = await import('tesseract.js');
                const worker = await createWorker('eng');
                let ocrText = "";

                for (let i = 1; i <= numPages; i++) {
                    if (onProgress) onProgress(`OCR Processing Page ${i} / ${numPages}...`);
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d", { willReadFrequently: true });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;

                    const { data: { text } } = await worker.recognize(canvas);
                    ocrText += text + "\n";
                }

                if (onProgress) onProgress("Terminating OCR Worker...");
                await worker.terminate();

                if (ocrText.trim().length > textStr.trim().length) {
                    if (onProgress) onProgress("Merging Advanced Extraction...");
                    return { textStr: ocrText, rawOcrText: ocrText, isOcrTriggered: true };
                }
            } catch (err) {
                console.warn("OCR Fallback failed, returning native text.", err);
            }
        }

        if (onProgress) onProgress("Analyzing Native Data...");
        return { textStr: textStr, rawOcrText: "", isOcrTriggered: false };
    }

    throw new Error("Unsupported file format for pure extraction.");
}

function formatOcrText(rawText) {
    if (!rawText) return "";
    let clean = rawText
        .split('\n')
        .map(l => l.trimEnd()) // Keep some leading spaces for bullets occasionally, mainly trim trailing
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^(PROFESSIONAL EXPERIENCE|EXPERIENCE|WORK HISTORY|EMPLOYMENT|EDUCATION|ACADEMIC|SKILLS|TECHNICAL SKILLS|PROJECTS|CERTIFICATIONS|LANGUAGES|SUMMARY|PROFILE|ACHIEVEMENTS)[\s\n]*$/gmi, '\n\n$1\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return clean;
}

/**
 * Maps raw multi-page string into a structured internal JSON mapped precisely against the defaultData template schema.
 * Operates purely using highly deterministic Regex heuristics without calling any LLM API endpoints.
 */
export async function parseResumeFile(file, onProgress) {
    const { textStr: rawText, rawOcrText, isOcrTriggered } = await extractRawText(file, onProgress);
    const data = JSON.parse(JSON.stringify(defaultData()));
    const confidence = { personal: {}, experience: [], education: [], skills: 'low', projects: 'low', certifications: 'low', languages: 'low', achievements: 'low', extractionQuality: 0, mappingQuality: 0 };

    if (!rawText || !rawText.trim()) throw new Error("Document completely empty or OCR failed to extract meaningful text tokens.");

    const rawLines = rawText.split('\n').map(l => l.replace(/\s{2,}/g, '  ').replace(/\s{2,}/g, ' ').trim()).filter(l => l);
    // De-duplication logic
    const lines = [...new Set(rawLines)];
    const text = lines.join('\n'); // Line separated for safer RegEx block testing

    const nameRegex = /^[A-Z][A-Za-z.\-']+(\s[A-Z][A-Za-z.\-']+)+$/;
    const nameLine = lines.slice(0, 10).find(l => nameRegex.test(l) && l.length < 40 && l.length > 5);

    if (nameLine) {
        data.personal.fullName = nameLine;
        confidence.personal.fullName = 'high';
    } else {
        confidence.personal.fullName = 'unmapped';
    }

    // Extract Job Title isolated from the Name constraint
    const titleLine = lines.slice(0, 10).find(l => /(Engineer|Developer|Manager|Designer|Analyst|Consultant|Architect|Specialist|Director|Lead|Scientist|Administrator)/i.test(l) && l.length < 60);
    if (titleLine && titleLine !== data.personal.fullName) {
        data.personal.title = titleLine;
    }

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
        data.personal.email = emailMatch[1];
        confidence.personal.email = 'high';
    } else {
        confidence.personal.email = 'unmapped';
    }

    const phoneRegex = /(?:\+?(\d{1,3}))?[\s-]?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
        let code = phoneMatch[1] || "1";
        data.personal.phone.number = phoneMatch[0].trim();
        confidence.personal.phone = 'high';
    } else {
        confidence.personal.phone = 'unmapped';
    }

    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|linkedin\.com\/[^\s]+|github\.com\/[^\s]+)/gi;
    const urlMatches = text.match(urlRegex) || [];
    if (urlMatches.length) {
        data.personal.linkedin = urlMatches.find(u => u.toLowerCase().includes('linkedin')) || urlMatches[0];
        const githubMatch = urlMatches.find(u => u.toLowerCase().includes('github'));
        if (githubMatch) data.personal.github = githubMatch;
        confidence.personal.linkedin = 'high';
    } else {
        confidence.personal.linkedin = 'unmapped';
    }

    // Extended Section Aliasing
    const sectionHeaders = /^(EXPERIENCE|EMPLOYMENT|WORK HISTORY|PROFESSIONAL EXPERIENCE|EDUCATION|ACADEMIC|SKILLS|TECHNICAL SKILLS|PROJECTS|CERTIFICATIONS|SUMMARY|PROFILE|LANGUAGES|ACHIEVEMENTS|PUBLICATIONS|INTERESTS|VOLUNTEERING)$/i;

    let currentSection = "SUMMARY";
    const sections = { SUMMARY: [], EXPERIENCE: [], EDUCATION: [], SKILLS: [], PROJECTS: [], CERTIFICATIONS: [], LANGUAGES: [], ACHIEVEMENTS: [], UNMAPPED: [] };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        let match = line.trim().match(sectionHeaders);
        if (match && line.length < 50) {
            let hdr = match[1].toUpperCase();
            if (['EMPLOYMENT', 'WORK HISTORY', 'PROFESSIONAL EXPERIENCE'].includes(hdr)) hdr = 'EXPERIENCE';
            if (['PROFILE'].includes(hdr)) hdr = 'SUMMARY';
            if (['TECHNICAL SKILLS'].includes(hdr)) hdr = 'SKILLS';
            if (['ACADEMIC'].includes(hdr)) hdr = 'EDUCATION';
            if (!sections[hdr]) sections[hdr] = [];
            currentSection = hdr;
            continue;
        }

        // Ignore top-level contact lines from being pushed randomly
        if (i < 8 && (line === data.personal.fullName || emailRegex.test(line) || phoneRegex.test(line))) continue;

        if (sections[currentSection]) {
            sections[currentSection].push(line);
        } else {
            sections.UNMAPPED.push(line);
        }
    }

    if (sections.SUMMARY.length) {
        data.summary = sections.SUMMARY.join(" ");
        confidence.summary = 'high';
    } else {
        confidence.summary = 'unmapped';
    }

    if (sections.SKILLS && sections.SKILLS.length) {
        const skillList = sections.SKILLS.join("\n").split(/[,•|·\n]+/).map(s => s.trim()).filter(s => s.length > 1);
        const uniqueSkills = [...new Set(skillList)];

        data.skillGroups = [{
            id: crypto.randomUUID(),
            name: "Core Competencies",
            skills: uniqueSkills
        }];
        confidence.skills = 'high';
    }

    // Add explicit fallback handlers for arrays to be loaded into text fields on App.jsx side
    if (sections.PROJECTS && sections.PROJECTS.length) {
        data.projects = [{ id: crypto.randomUUID(), name: "Imported Projects", description: sections.PROJECTS.join("\n"), url: "" }];
        confidence.projects = 'low';
    }

    if (sections.CERTIFICATIONS && sections.CERTIFICATIONS.length) {
        data.certifications = [{ id: crypto.randomUUID(), name: "Imported Certifications", issuer: "", date: "", url: "", description: sections.CERTIFICATIONS.join("\n") }];
        confidence.certifications = 'low';
    }

    if (sections.LANGUAGES && sections.LANGUAGES.length) {
        const langList = sections.LANGUAGES.join(",").split(/[,•|·\n]+/).map(s => s.trim()).filter(s => s.length > 1);
        data.Languages = langList.map(l => ({ id: crypto.randomUUID(), language: l, proficiency: "" }));
        confidence.languages = 'high';
    }

    if (sections.ACHIEVEMENTS && sections.ACHIEVEMENTS.length) {
        data.achievements = [{ id: crypto.randomUUID(), title: "Imported Achievements", description: sections.ACHIEVEMENTS.join("\n"), date: "", issuer: "" }];
        confidence.achievements = 'low';
    }

    // Advanced Normalization for Dates
    const dateBoundPattern = /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|20\d{2}|19\d{2})\s*(?:-|–|to)\s*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|20\d{2}|19\d{2}|Present|Current)/i;
    const yearOnlyPattern = /(20\d{2}|19\d{2})\s*(?:-|–|to)\s*(20\d{2}|19\d{2}|Present)/i;

    if (sections.EXPERIENCE && sections.EXPERIENCE.length) {
        let currentExp = null;
        let conf = {};

        sections.EXPERIENCE.forEach((line) => {
            const hasBound = line.match(dateBoundPattern) || line.match(yearOnlyPattern);
            const isTitleOrCompany = line.length > 3 && line.length < 60 && !line.includes('•') && !line.includes('·');

            if (hasBound || (!currentExp && isTitleOrCompany) || (isTitleOrCompany && currentExp && currentExp.description.length > 30)) {
                if (currentExp && (currentExp.title || currentExp.company || currentExp.description)) {
                    data.experience.push(currentExp);
                    confidence.experience.push(conf);
                }
                currentExp = { id: crypto.randomUUID(), title: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" };
                conf = { company: 'low', title: 'low', dates: 'unmapped', desc: 'unmapped' };

                if (hasBound) {
                    const dates = hasBound[0].split(/[–-]|(?:to\s)/i);
                    currentExp.startDate = (dates[0] || "").trim();
                    currentExp.endDate = (dates[1] || "").trim();

                    if (currentExp.endDate.toLowerCase().includes('present') || currentExp.endDate.toLowerCase().includes('current')) {
                        currentExp.current = true;
                        currentExp.endDate = "";
                    }
                    conf.dates = 'high';

                    const textWithoutDate = line.replace(hasBound[0], "").replace(/^[,|-]/, '').trim();
                    if (textWithoutDate) {
                        currentExp.company = textWithoutDate;
                    }
                } else {
                    currentExp.company = line;
                }
            } else if (currentExp) {
                if (!currentExp.company) { currentExp.company = line; conf.company = 'high'; }
                else if (!currentExp.title && line.length < 60 && !line.includes('•')) { currentExp.title = line; conf.title = 'high'; }
                else {
                    currentExp.description += line + "\n";
                    conf.desc = 'high';
                }
            }
        });
        if (currentExp && (currentExp.title || currentExp.company || currentExp.description)) {
            data.experience.push(currentExp);
            confidence.experience.push(conf);
        }
    }

    if (sections.EDUCATION && sections.EDUCATION.length) {
        let currentEdu = null;
        let conf = {};
        const degreeKeywords = /(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D|Bachelor|Master|Doctorate|B\.?Tech|M\.?Tech|Diploma|Certification)/i;
        const uniKeywords = /(University|College|Institute|Academy|School)/i;

        sections.EDUCATION.forEach(line => {
            const hasBound = line.match(dateBoundPattern) || line.match(yearOnlyPattern);
            const isNewBlock = hasBound || line.match(uniKeywords) || line.match(degreeKeywords);

            if (isNewBlock || !currentEdu) {
                if (currentEdu && (currentEdu.institution || currentEdu.degree || currentEdu.description)) {
                    data.education.push(currentEdu);
                    confidence.education.push(conf);
                }
                currentEdu = { id: crypto.randomUUID(), degree: "", fieldOfStudy: "", institution: "", location: "", startDate: "", endDate: "", current: false, description: "" };
                conf = { institution: 'low', degree: 'low' };

                if (hasBound) {
                    const dates = hasBound[0].split(/[–-]|(?:to\s)/i);
                    currentEdu.startDate = (dates[0] || "").trim();
                    currentEdu.endDate = (dates[1] || "").trim();
                }

                let textWithoutDate = hasBound ? line.replace(hasBound[0], "").replace(/,/g, "").trim() : line.trim();

                if (textWithoutDate.match(uniKeywords)) { currentEdu.institution = textWithoutDate; conf.institution = 'high'; }
                else if (textWithoutDate.match(degreeKeywords)) {
                    conf.degree = 'high';
                    if (textWithoutDate.includes(" in ")) {
                        const parts = textWithoutDate.split(" in ");
                        currentEdu.degree = parts[0].trim();
                        currentEdu.fieldOfStudy = parts[1].trim();
                    } else {
                        currentEdu.degree = textWithoutDate;
                    }
                }
                else if (!hasBound && textWithoutDate) {
                    currentEdu.institution = textWithoutDate;
                }
            } else if (currentEdu) {
                if (!currentEdu.degree && line.match(degreeKeywords)) {
                    conf.degree = 'high';
                    if (line.includes(" in ")) {
                        const parts = line.split(" in ");
                        currentEdu.degree = parts[0].trim();
                        currentEdu.fieldOfStudy = parts[1].trim();
                    } else {
                        currentEdu.degree = line;
                    }
                }
                else if (!currentEdu.institution && line.match(uniKeywords)) { currentEdu.institution = line; conf.institution = 'high'; }
                else {
                    currentEdu.description += line + "\n";
                }
            }
        });
        if (currentEdu && (currentEdu.institution || currentEdu.degree || currentEdu.description)) {
            data.education.push(currentEdu);
            confidence.education.push(conf);
        }
    }

    // Dump unmapped lines into unmapped custom area for UI review component
    const unmappedText = (sections.UNMAPPED || []).join("\n").trim();
    if (unmappedText) {
        data.customFields = [{
            id: crypto.randomUUID(),
            title: "Unmapped Recovery",
            description: unmappedText,
            bullets: []
        }];
    }

    // Extraction Quality Scoring
    const countWords = (str) => typeof str === 'string' ? str.trim().split(/\s+/).filter(Boolean).length : 0;
    const allWordsList = text.split(/\s+/).filter(Boolean);
    const totalWords = allWordsList.length;
    let mappedWords = 0;

    mappedWords += countWords(data.personal.fullName);
    mappedWords += countWords(data.personal.title);
    mappedWords += countWords(data.personal.email);
    mappedWords += countWords(data.personal.linkedin);
    mappedWords += countWords(data.summary);

    data.experience.forEach(e => mappedWords += countWords(e.company) + countWords(e.title) + countWords(e.description));
    data.education.forEach(e => mappedWords += countWords(e.institution) + countWords(e.degree) + countWords(e.description));
    data.skillGroups.forEach(g => g.skills.forEach(s => mappedWords += countWords(s)));
    data.projects?.forEach(p => mappedWords += countWords(p.name) + countWords(p.description));
    data.certifications?.forEach(c => mappedWords += countWords(c.name) + countWords(c.description));

    const validAlphanumericWords = allWordsList.filter(w => /[A-Za-z0-9]{3,}/.test(w)).length;

    const mappingQualityRaw = totalWords > 0 ? (mappedWords / totalWords) * 100 : 0;
    const extractionQualityRaw = totalWords > 0 ? (validAlphanumericWords / totalWords) * 100 : 0;

    confidence.mappingQuality = Math.min(100, Math.round(mappingQualityRaw));
    confidence.extractionQuality = Math.min(100, Math.round(extractionQualityRaw * 1.2)); // Factor in numbers/symbols

    if (onProgress) onProgress("Ready!");
    return {
        parsedData: data,
        confidence,
        textDump: text,
        rawOcrText,
        isOcrTriggered,
        rawExtractedText: rawText,
        formattedOcrText: formatOcrText(rawText)
    };
}
